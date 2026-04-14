use std::{sync::Arc, time::Duration};

use ak_client::{
    apis::{
        configuration::Configuration, outposts_api::outposts_instances_list,
        root_api::root_config_retrieve,
    },
    models::{Config, Outpost as OutpostModel},
};
use ak_common::{Tasks, config};
use arc_swap::ArcSwap;
use eyre::{Error, Result, eyre};
use tokio_retry2::{Retry, RetryError, strategy::FixedInterval};
use tracing::{debug, error};

#[cfg(feature = "proxy")]
pub(crate) mod proxy;

pub(crate) trait Outpost: Send + Sync + Sized {
    type Cli: Send + Sync;

    async fn new(controller: Arc<OutpostController>) -> Result<Self>;

    async fn controller(&self) -> Arc<OutpostController>;

    async fn refresh(&self) -> Result<()>;
}

#[derive(Debug)]
pub(crate) struct OutpostController {
    api_config: Configuration,
    outpost: ArcSwap<OutpostModel>,
    ak_host: String,
    ak_token: String,
}

impl OutpostController {
    pub(crate) fn is_embedded(&self) -> bool {
        self.outpost
            .load()
            .managed
            .as_ref()
            .and_then(|m| m.as_deref())
            .is_some_and(|m| m == "goauthentik.io/outposts/embedded")
    }

    async fn get_outpost(api_config: &Configuration) -> Result<OutpostModel> {
        let outposts = outposts_instances_list(
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
        .await?;

        let Some(outpost) = outposts.results.into_iter().next() else {
            return Err(eyre!(
                "No outposts found with given token, ensure the given token corresponds to an \
                 authentik Outpost"
            ));
        };
        debug!(name = outpost.name, "fetched outpost configuration");

        Ok(outpost)
    }

    async fn new(ak_host: String, ak_token: String) -> Result<Self> {
        let api_config = Configuration {
            base_path: format!("{ak_host}/api/v3"),
            bearer_access_token: Some(ak_token.clone()),
            ..Default::default()
        };

        let outpost = {
            let retry_strategy = FixedInterval::new(Duration::from_secs(3));
            let retrieve_outposts = async || {
                Self::get_outpost(&api_config)
                    .await
                    .map_err(RetryError::transient)
            };
            let retry_notify = |err: &Error, _duration| {
                error!(
                    ?err,
                    "Failed to fetch outpost configuration, retrying in 3 seconds"
                );
            };
            Retry::spawn_notify(retry_strategy, retrieve_outposts, retry_notify).await?
        };

        Ok(Self {
            api_config,
            outpost: ArcSwap::from_pointee(outpost),
            ak_host,
            ak_token,
        })
    }

    async fn refresh(&self) -> Result<()> {
        let outpost = Self::get_outpost(&self.api_config).await?;
        self.outpost.swap(Arc::new(outpost));
        Ok(())
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
