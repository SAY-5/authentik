use std::sync::Arc;

use ak_common::{Arbiter, Tasks, VERSION, api, authentik_build_hash};
use axum::http::{HeaderValue, header::AUTHORIZATION};
use eyre::{Result, eyre};
use futures::{SinkExt as _, StreamExt as _};
use nix::unistd::gethostname;
use serde::{Deserialize, Serialize};
use serde_repr::{Deserialize_repr, Serialize_repr};
use tokio::time::{Duration, interval, sleep};
use tokio_tungstenite::tungstenite::{Message, client::IntoClientRequest as _};
use tracing::{debug, info, warn};
use url::Url;

use crate::outpost::{Outpost, OutpostController};

#[derive(Serialize_repr, Deserialize_repr, PartialEq)]
#[repr(u8)]
enum EventKind {
    /// Code used to acknowledge a previous message.
    Ack = 0,
    /// Code used to send a healthcheck keepalive.
    Hello = 1,
    /// Code received to trigger a config update.
    TriggerUpdate = 2,
    /// Code received to trigger some provider specific function.
    ProviderSpecific = 3,
    /// Code received to identify the end of a session.
    SessionEnd = 4,
}

#[derive(Serialize, Deserialize)]
struct Event {
    instruction: EventKind,
    args: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub(crate) struct EventSessionEnd {
    session_id: String,
}

fn build_ws_url(mut url: Url, outpost_pk: &str, instance_uuid: &str, attempt: u32) -> Result<Url> {
    let ws_scheme = match url.scheme() {
        "https" => "wss",
        "http" => "ws",
        other => return Err(eyre!("Unsupported scheme for WebSocket URL: {other}")),
    };

    url.set_scheme(ws_scheme)
        .map_err(|()| eyre!("Failed to set URL scheme to {ws_scheme}"))?;
    url.set_path(&format!("{}ws/outpost/{outpost_pk}/", url.path()));
    url.query_pairs_mut()
        .append_pair("instance_uuid", instance_uuid)
        .append_pair("attempt", &attempt.to_string());

    Ok(url)
}

fn hello_args(instance_uuid: &str) -> serde_json::Value {
    let raw_hostname = gethostname().unwrap_or_default();
    let hostname = raw_hostname.to_string_lossy();

    serde_json::json!({
        "version": VERSION,
        "buildHash": authentik_build_hash(None),
        "uuid": instance_uuid,
        // TODO: rust version and AWS-LC versions
        "hostname": hostname,
    })
}

async fn handle_event<O: Outpost>(
    controller: Arc<OutpostController>,
    outpost: Arc<O>,
    event: Event,
) -> Result<()> {
    match event.instruction {
        EventKind::Ack | EventKind::Hello => {}
        EventKind::TriggerUpdate => {
            controller.refresh().await?;
            outpost.refresh().await?;
        }
        EventKind::SessionEnd => {
            let event: EventSessionEnd = serde_json::from_value(event.args)?;
            outpost.end_session(event).await?;
        }
        #[expect(clippy::unimplemented, reason = "this is only relevant for the RAC provider")]
        EventKind::ProviderSpecific => unimplemented!(),
    }
    Ok(())
}

async fn watch_events_inner<O: Outpost>(
    arbiter: Arbiter,
    controller: Arc<OutpostController>,
    outpost: Arc<O>,
    attempt: u32,
) -> Result<()> {
    let server_config = api::ServerConfig::new()?;
    let ws_url = build_ws_url(
        server_config.host,
        &controller.outpost.load().pk.to_string(),
        &controller.instance_uuid.to_string(),
        attempt,
    )?;

    let mut request = ws_url.into_client_request()?;
    let token = controller
        .api_config
        .bearer_access_token
        .as_deref()
        .unwrap_or("");
    request.headers_mut().insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Bearer {token}"))?,
    );

    let (ws_stream, _response) = tokio_tungstenite::connect_async(request).await?;
    let (mut ws_write, mut ws_read) = ws_stream.split();

    info!(
        outpost = controller.outpost.load().name,
        "Connected to WebSocket"
    );

    let mut heartbeat = interval(Duration::from_secs(10));

    loop {
        tokio::select! {
            _ = heartbeat.tick() => {
                let ping = Event {
                    instruction: EventKind::Hello,
                    args: hello_args(&controller.instance_uuid.to_string()),
                };
                ws_write.send(Message::text(serde_json::to_string(&ping)?)).await?;
                debug!("Sent WebSocket hello (heartbeat)");
            },
            msg = ws_read.next() => {
                let Some(msg) = msg else {
                    break;
                };
                let msg = msg?;
                match msg {
                    Message::Text(text) => {
                        let Ok(event): Result<Event, _> = serde_json::from_str(&text) else {
                            warn!(data = text.as_str(), "Failed to parse event");
                            continue;
                        };
                        if let Err(err) = handle_event(Arc::clone(&controller), Arc::clone(&outpost), event).await {
                            warn!(?err, "Failed to handle event");
                        }
                    },
                    Message::Ping(data) => {
                        ws_write.send(Message::Pong(data)).await?;
                    },
                    Message::Close(_) => {
                        break;
                    },
                    _ => {},
                }
            },
            () = arbiter.shutdown() => break,
        }
    }

    Ok(())
}

async fn watch_events<O: Outpost>(
    arbiter: Arbiter,
    controller: Arc<OutpostController>,
    outpost: Arc<O>,
) -> Result<()> {
    const MAX_BACKOFF: Duration = Duration::from_secs(300);
    let mut backoff = Duration::from_secs(1);
    let mut attempt: u32 = 0;

    loop {
        tokio::select! {
            () = arbiter.shutdown() => break,
            res = watch_events_inner(arbiter.clone(), Arc::clone(&controller), Arc::clone(&outpost), attempt) => {
                match res {
                    Ok(()) => debug!("WebSocket disconnected cleanly"),
                    Err(err) => warn!(?err, attempt, "WebSocket error"),
                }

                info!(delay = backoff.as_secs(), "Reconnecting WebSocket in {}s...", backoff.as_secs());

                tokio::select! {
                    () = arbiter.shutdown() => break,
                    () = sleep(backoff) => {}
                }

                backoff = (backoff * 2).min(MAX_BACKOFF);
                attempt += 1;
            }
        }
    }

    info!("stopping event watcher");

    Ok(())
}

pub(crate) fn run<O: Outpost + 'static>(
    tasks: &mut Tasks,
    controller: Arc<OutpostController>,
    outpost: Arc<O>,
) -> Result<()> {
    let arbiter = tasks.arbiter();
    tasks
        .build_task()
        .name(&format!("{}::watch_events", module_path!()))
        .spawn(watch_events(arbiter, controller, outpost))?;

    Ok(())
}
