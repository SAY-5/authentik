use ak_client::apis::outposts_api::outposts_proxy_list;
use eyre::Result;
use std::sync::Arc;

use argh::FromArgs;

use crate::outpost::Outpost;
use crate::outpost::OutpostController;
use tracing::warn;

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

    async fn new(controller: Arc<OutpostController>) -> Result<Self> {
        Ok(Self { controller })
    }

    async fn refresh(&self) -> Result<()> {
        let providers =
            outposts_proxy_list(&self.controller.api_config, None, None, None, None, None)
                .await?
                .results;
        if providers.is_empty() {
            warn!(
                "No providers assigned to this outpost, check outpost configuration in authentik"
            );
        }

        Ok(())
    }
}
