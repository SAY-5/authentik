use ak_client::apis::root_api::root_config_retrieve;
use ak_client::apis::{configuration::Configuration, outposts_api::outposts_instances_list};
use ak_client::models::Config;
use ak_client::models::Outpost as OutpostModel;
use ak_common::{Tasks, config};
use eyre::{Result, eyre};
use std::sync::Arc;
use std::time::Duration;
use tokio_retry2::strategy::FixedInterval;
use tokio_retry2::{Retry, RetryError};
use tracing::{debug, error};

#[cfg(feature = "proxy")]
pub(crate) mod proxy;

pub(crate) trait Outpost: Sized {
    type Cli;

    async fn new(controller: Arc<OutpostController>) -> Result<Self>;

    async fn refresh(&self) -> Result<()>;
}

#[derive(Debug)]
pub(crate) struct OutpostController {
    api_config: Configuration,
    root_config: Config,
    outpost: OutpostModel,
    ak_host: String,
}

impl OutpostController {
    pub(crate) fn is_embedded(&self) -> bool {
        self.outpost
            .managed
            .as_ref()
            .and_then(|m| m.as_deref())
            .is_some_and(|m| m == "goauthentik.io/outposts/embedded")
    }

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

        let Some(outpost) = outposts.results.into_iter().next() else {
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
            outpost,
            ak_host,
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

    let controller = Arc::new(OutpostController::new(ak_host, ak_token).await?);
    let outpost = Arc::new(O::new(Arc::clone(&controller)).await?);
    outpost.refresh().await?;

    Ok(())
}
