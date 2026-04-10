use ak_client::apis::root_api::root_config_retrieve;
use ak_client::apis::{configuration::Configuration, outposts_api::outposts_instances_list};
use ak_client::models::Config;
use ak_common::{Tasks, config};
use eyre::{Result, eyre};
use std::time::Duration;
use tokio_retry2::strategy::FixedInterval;
use tokio_retry2::{Retry, RetryError};
use tracing::{debug, error, warn};

#[cfg(feature = "proxy")]
pub(crate) mod proxy;

pub(crate) trait Outpost {
    type Cli;
}

#[derive(Debug)]
struct OutpostController {
    api_config: Configuration,
    root_config: Config,
}

fn retry_notify_new(
    err: &ak_client::apis::Error<ak_client::apis::outposts_api::OutpostsInstancesListError>,
    _duration: Duration,
) {
    warn!(
        ?err,
        "Failed to fetch outpost configuration, retrying in 3 seconds"
    );
}

impl OutpostController {
    async fn new(ak_host: String, ak_token: String) -> Result<Self> {
        let api_config = Configuration {
            base_path: format!("{ak_host}/api/v3"),
            bearer_access_token: Some(ak_token),
            ..Default::default()
        };

        let outposts = {
            let retry_strategy = FixedInterval::new(Duration::from_secs(3));
            let retrieve_outposts = async || {
                outposts_instances_list(
                    &api_config,
                    None,
                    None,
                    None,
                    None,
                    None,
                    None,
                    None,
                    None,
                    None,
                    None,
                    None,
                    None,
                )
                .await
                .map_err(RetryError::transient)
            };
            let retry_notify = |err: &ak_client::apis::Error<
                ak_client::apis::outposts_api::OutpostsInstancesListError,
            >,
                                _duration| {
                error!(
                    ?err,
                    "Failed to fetch outpost configuration, retrying in 3 seconds"
                );
            };
            Retry::spawn_notify(retry_strategy, retrieve_outposts, retry_notify).await?
        };

        let Some(outpost) = outposts.results.first() else {
            return Err(eyre!(
                "No outposts found with given token, ensure the given token corresponds to an authentik Outpost"
            ));
        };
        debug!(name = outpost.name, "fetched outpost configuration");

        let root_config = root_config_retrieve(&api_config).await.map_err(|err| {
            error!(?err, "Failed to fetch global configuration");
            err
        })?;
        debug!("Fetched global configuration");

        Ok(Self {
            api_config,
            root_config,
        })
    }
}

pub(crate) async fn run<O: Outpost>(_cli: O::Cli, _tasks: &mut Tasks) -> Result<()> {
    let ak_host = config::get()
        .host
        .clone()
        .ok_or_else(|| eyre!("environment variable `AUTHENTIK_HOST` not set"))?;
    let ak_token = config::get()
        .token
        .clone()
        .ok_or_else(|| eyre!("environment variable `AUTHENTIK_TOKEN` not set"))?;

    let controller = OutpostController::new(ak_host, ak_token).await?;
    dbg!(controller);
    Ok(())
}
