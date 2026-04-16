//! Utilities for working with the authentik API client.

use ak_client::apis::configuration::Configuration;
use ak_client::models::Pagination;
use eyre::{Result, eyre};
use url::Url;

use crate::{config, user_agent_outpost};

pub struct ServerConfig {
    pub host: Url,
    pub token: String,
    pub insecure: bool,
}

impl ServerConfig {
    pub fn new() -> Result<Self> {
        let host = config::get()
            .host
            .clone()
            .ok_or_else(|| eyre!("environment variable `AUTHENTIK_HOST` not set"))?;
        let host = if host.ends_with('/') {
            host
        } else {
            format!("{host}/")
        };
        let host = host.parse()?;
        let token = config::get()
            .token
            .clone()
            .ok_or_else(|| eyre!("environment variable `AUTHENTIK_TOKEN` not set"))?;
        let insecure = config::get().insecure.unwrap_or(false);

        Ok(Self {
            host,
            token,
            insecure,
        })
    }
}

/// Return a [`Configuration`] object based on external environment variables.
pub fn make_config() -> Result<Configuration> {
    let server_config = ServerConfig::new()?;

    let base_path = format!("{}api/v3", server_config.host);

    let client = reqwest::ClientBuilder::new()
        .tls_danger_accept_invalid_hostnames(server_config.insecure)
        .tls_danger_accept_invalid_certs(server_config.insecure)
        .build()?;
    let client = reqwest_middleware::ClientBuilder::new(client).build();

    Ok(Configuration {
        base_path,
        client,
        bearer_access_token: Some(server_config.token),
        user_agent: Some(user_agent_outpost()),
        ..Default::default()
    })
}

/// Fetch all pages from a paginated API endpoint, returning all results combined.
///
/// - `fetch`: a function that takes a page number and returns a future resolving to a paginated
/// response.
/// - `get_pagination`: a function that extracts the [`Pagination`] metadata from a response.
/// - `get_results`: a function that extracts the result items from a response.
pub async fn fetch_all<T, R, E, F, Fut>(
    fetch: F,
    get_pagination: impl Fn(&R) -> &Pagination,
    get_results: impl Fn(R) -> Vec<T>,
) -> std::result::Result<Vec<T>, E>
where
    F: Fn(i32) -> Fut,
    Fut: Future<Output = std::result::Result<R, E>>,
{
    let mut page = 1;
    let mut results = Vec::with_capacity(0);

    loop {
        let response = fetch(page).await?;
        let next = get_pagination(&response).next;
        if page == 1 {
            let count = get_pagination(&response).count as usize;
            results.reserve(count);
        }
        results.extend(get_results(response));
        if next > 0.0 {
            page += 1;
        } else {
            break;
        }
    }

    Ok(results)
}
