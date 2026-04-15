use std::{sync::Arc, time::Duration};

use ak_client::{
    apis::{configuration::Configuration, outposts_api::outposts_instances_list},
    models::Outpost as OutpostModel,
};
use ak_common::{Tasks, api, config};
use arc_swap::ArcSwap;
use eyre::{Error, Result, eyre};
use tokio_retry2::{Retry, RetryError, strategy::FixedInterval};
use tracing::{debug, error};
use url::Url;
use uuid::Uuid;

pub(crate) mod event;
#[cfg(feature = "proxy")]
pub(crate) mod proxy;

pub(crate) trait Outpost: Send + Sync + Sized {
    type Cli: Send + Sync;

    async fn new(controller: Arc<OutpostController>) -> Result<Self>;

    fn refresh(&self) -> impl Future<Output = Result<()>> + Send;

    fn end_session(&self, event: event::EventSessionEnd)
    -> impl Future<Output = Result<()>> + Send;
}

#[derive(Debug)]
pub(crate) struct OutpostController {
    api_config: Configuration,
    outpost: ArcSwap<OutpostModel>,
    instance_uuid: Uuid,
    ak_host: Url,
    ak_token: String,
    ak_insecure: bool,
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

    async fn new(ak_host: String, ak_token: String, ak_insecure: bool) -> Result<Self> {
        let api_config = api::make_config()?;
        let outpost = Self::get_outpost(&api_config).await?;

        Ok(Self {
            api_config,
            outpost: ArcSwap::from_pointee(outpost),
            instance_uuid: Uuid::new_v4(),
            ak_host: ak_host.parse()?,
            ak_token,
            ak_insecure,
        })
    }

    async fn refresh(&self) -> Result<()> {
        let outpost = Self::get_outpost(&self.api_config).await?;
        self.outpost.swap(Arc::new(outpost));
        Ok(())
    }
}

pub(crate) async fn run<O: Outpost + 'static>(_cli: O::Cli, tasks: &mut Tasks) -> Result<()> {
    let ak_host = config::get()
        .host
        .clone()
        .ok_or_else(|| eyre!("environment variable `AUTHENTIK_HOST` not set"))?;
    let ak_token = config::get()
        .token
        .clone()
        .ok_or_else(|| eyre!("environment variable `AUTHENTIK_TOKEN` not set"))?;
    let ak_insecure = config::get().insecure.clone().unwrap_or(false);

    let controller = Arc::new(OutpostController::new(ak_host, ak_token, ak_insecure).await?);
    let outpost = Arc::new(O::new(Arc::clone(&controller)).await?);

    event::run(tasks, controller, outpost)?;

    Ok(())
}
