import "#admin/endpoints/connectors/ConnectorWizard";
import "#admin/endpoints/connectors/agent/AgentConnectorForm";
import "#admin/endpoints/connectors/fleet/FleetConnectorForm";
import "#admin/endpoints/connectors/gdtc/GoogleChromeConnectorForm";
import "#elements/forms/DeleteBulkForm";
import "#elements/forms/ModalForm";

import { DEFAULT_CONFIG } from "#common/api/config";

import { IconEditButtonByTagName } from "#elements/dialogs";
import { PaginatedResponse, TableColumn } from "#elements/table/Table";
import { TablePage } from "#elements/table/TablePage";
import { SlottedTemplateResult } from "#elements/types";

import { AKEndpointConnectorWizard } from "#admin/endpoints/connectors/ConnectorWizard";

import { Connector, EndpointsApi } from "@goauthentik/api";

import { msg } from "@lit/localize";
import { html } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("ak-endpoints-connectors-list")
export class ConnectorsListPage extends TablePage<Connector> {
    public pageIcon = "pf-icon pf-icon-data-source";
    public pageTitle = msg("Connectors");
    public pageDescription = msg(
        "Configure how devices connect with authentik and ingest external device data.",
    );

    protected searchEnabled: boolean = true;
    protected columns: TableColumn[] = [
        [msg("Name"), "name"],
        [msg("Type")],
        [msg("Actions"), null, msg("Row Actions")],
    ];

    checkbox = true;

    async apiEndpoint(): Promise<PaginatedResponse<Connector>> {
        return new EndpointsApi(DEFAULT_CONFIG).endpointsConnectorsList(
            await this.defaultEndpointConfig(),
        );
    }

    row(item: Connector): SlottedTemplateResult[] {
        return [
            html`<a href="#/endpoints/connectors/${item.connectorUuid}">${item.name}</a>`,
            item.verboseName,
            html`<div class="ak-c-table__actions">
                ${IconEditButtonByTagName(item.component, item.connectorUuid, item.verboseName)}
            </div>`,
        ];
    }

    protected override renderObjectCreate(): SlottedTemplateResult {
        return html`<button
            class="pf-c-button pf-m-primary"
            type="button"
            aria-description="${msg("Open the wizard to create a new connector.")}"
            ${AKEndpointConnectorWizard.asModalInvoker()}
        >
            ${msg("New Connector")}
        </button>`;
    }

    protected override renderToolbarSelected() {
        const disabled = this.selectedElements.length < 1;
        return html`<ak-forms-delete-bulk
            object-label=${msg("Connector(s)")}
            .objects=${this.selectedElements}
            .metadata=${(item: Connector) => {
                return [{ key: msg("Name"), value: item.name }];
            }}
            .usedBy=${(item: Connector) => {
                return new EndpointsApi(DEFAULT_CONFIG).endpointsConnectorsUsedByList({
                    connectorUuid: item.connectorUuid!,
                });
            }}
            .delete=${(item: Connector) => {
                return new EndpointsApi(DEFAULT_CONFIG).endpointsConnectorsDestroy({
                    connectorUuid: item.connectorUuid!,
                });
            }}
        >
            <button ?disabled=${disabled} slot="trigger" class="pf-c-button pf-m-danger">
                ${msg("Delete")}
            </button>
        </ak-forms-delete-bulk>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "ak-endpoints-connectors-list": ConnectorsListPage;
    }
}
