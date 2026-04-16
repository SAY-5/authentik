use std::sync::Arc;

use ak_client::apis::outposts_api::outposts_proxy_list;
use ak_common::Tasks;
use argh::FromArgs;
use eyre::Result;
use tracing::{instrument, warn};

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

    async fn refresh(&self) -> Result<()> {
        let providers =
            outposts_proxy_list(&self.controller.api_config, None, None, None, None, None)
                .await?
                .results;
        if providers.is_empty() {
            warn!(
                "no providers assigned to this outpost, check outpost configuration in authentik"
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
