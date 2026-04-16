use std::sync::Arc;

use ak_client::apis::outposts_api::outposts_proxy_list;
use ak_common::{Tasks, api::fetch_all};
use argh::FromArgs;
use eyre::Result;
use tracing::{debug, error, instrument, warn};

use crate::outpost::{Outpost, OutpostController};

#[derive(Debug, Default, FromArgs, PartialEq, Eq)]
/// Run the authentik proxy outpost.
#[argh(subcommand, name = "proxy")]
#[expect(
    clippy::empty_structs_with_brackets,
    reason = "argh doesn't support unit structs"
)]
pub(crate) struct Cli {}

pub(crate) struct ProxyOutpost {
    controller: Arc<OutpostController>,
}

impl Outpost for ProxyOutpost {
    type Cli = Cli;

    const OUTPOST_TYPE: &'static str = "proxy";

    #[instrument(skip_all)]
    async fn new(controller: Arc<OutpostController>) -> Result<Self> {
        Ok(Self { controller })
    }

    fn start(&self, _tasks: &mut Tasks) -> Result<()> {
        Ok(())
    }

    #[instrument(skip_all)]
    async fn refresh(&self) -> Result<()> {
        let providers = fetch_all(
            |page| {
                outposts_proxy_list(
                    &self.controller.api_config,
                    None,
                    None,
                    Some(page),
                    Some(100),
                    None,
                )
            },
            |r| &r.pagination,
            |r| r.results,
        )
        .await
        .map_err(|err| {
            error!(?err, "failed to fetch providers");
            err
        })?;
        if providers.is_empty() && !self.controller.is_embedded() {
            warn!(
                "no providers assigned to this outpost, check outpost configuration in authentik"
            );
        }

        for provider in providers {
            debug!(
                name = provider.name,
                external_host = provider.external_host,
                assigned_to_app = provider.assigned_application_name,
                "provider details"
            );
        }

        Ok(())
    }

    async fn end_session(&self, _event: super::event::EventSessionEnd) -> Result<()> {
        // todo!()
        warn!(?_event, "removing session");
        Ok(())
    }
}
