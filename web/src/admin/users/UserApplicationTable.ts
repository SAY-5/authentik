import "#elements/AppIcon";
import "#elements/forms/HorizontalFormElement";
import "#elements/forms/SearchSelect/index";
import "@patternfly/elements/pf-tooltip/pf-tooltip.js";

import { DEFAULT_CONFIG } from "#common/api/config";

import { renderModal } from "#elements/dialogs";
import { Form } from "#elements/forms/Form";
import { PaginatedResponse, Table, TableColumn } from "#elements/table/Table";
import { SlottedTemplateResult } from "#elements/types";
import { ifPresent } from "#elements/utils/attributes";

import { applicationListStyle } from "#admin/applications/ApplicationListPage";

import {
    Application,
    CoreApi,
    CoreApplicationsListRequest,
    User,
    UserTypeEnum,
} from "@goauthentik/api";

import { msg } from "@lit/localize";
import { CSSResult, TemplateResult, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

const USER_ATTRIBUTE_AGENT_OWNER_PK = "goauthentik.io/agent/owner-pk";

@customElement("ak-agent-add-application-form")
export class AgentAddApplicationForm extends Form<{ app: string }> {
    public override headline = msg("Add Application");
    public override submitLabel = msg("Add");

    @property({ attribute: false })
    public agent: User | null = null;

    public override getSuccessMessage(): string {
        return msg("Successfully added application.");
    }

    async send(data: { app: string }): Promise<{ app: string }> {
        if (!this.agent) throw new Error("Agent not set");
        await new CoreApi(DEFAULT_CONFIG).coreUsersAgentAllowedAppPartialUpdate({
            id: this.agent.pk,
            patchedUserAgentAllowedAppRequest: { app: data.app, action: "add" },
        });
        return data;
    }

    protected override renderForm(): TemplateResult {
        const ownerPk = this.agent?.attributes?.[USER_ATTRIBUTE_AGENT_OWNER_PK];

        return html`<ak-form-element-horizontal
                label=${msg("Application")}
                required
                name="app"
            >
                <ak-search-select
                    placeholder=${msg("Select an application...")}
                    .fetchObjects=${async (query?: string): Promise<Application[]> => {
                        const args: CoreApplicationsListRequest = {
                            ordering: "name",
                            pageSize: 20,
                            forUser: ownerPk ? Number(ownerPk) : undefined,
                        };
                        if (query) {
                            args.search = query;
                        }
                        const result =
                            await new CoreApi(DEFAULT_CONFIG).coreApplicationsList(args);
                        return result.results;
                    }}
                    .renderElement=${(app: Application): string => app.name}
                    .value=${(app: Application | undefined): string | undefined => app?.pk}
                    .renderDescription=${(app: Application): TemplateResult =>
                        html`${app.group || msg("No group")}`}
                >
                </ak-search-select>
            </ak-form-element-horizontal>`;
    }
}

@customElement("ak-user-application-table")
export class UserApplicationTable extends Table<Application> {
    @property({ attribute: false })
    user?: User;

    static styles: CSSResult[] = [...super.styles, applicationListStyle];

    private get isAgent(): boolean {
        return this.user?.type === UserTypeEnum.Agent;
    }

    async apiEndpoint(): Promise<PaginatedResponse<Application>> {
        return new CoreApi(DEFAULT_CONFIG).coreApplicationsList({
            ...(await this.defaultEndpointConfig()),
            forUser: this.user?.pk,
        });
    }

    protected columns: TableColumn[] = [
        [""],
        [msg("Name"), "name"],
        [msg("Group"), "group"],
        [msg("Provider")],
        [msg("Provider Type")],
        [msg("Actions"), null, msg("Row Actions")],
    ];

    private async removeApplication(app: Application): Promise<void> {
        if (!this.user) return;
        await new CoreApi(DEFAULT_CONFIG).coreUsersAgentAllowedAppPartialUpdate({
            id: this.user.pk,
            patchedUserAgentAllowedAppRequest: { app: String(app.pk), action: "remove" },
        });
        this.fetch();
    }

    protected openAddApplicationModal = () => {
        return renderModal(
            html`<ak-agent-add-application-form
                .agent=${this.user}
            ></ak-agent-add-application-form>`,
        );
    };

    protected override renderToolbar(): SlottedTemplateResult {
        if (!this.isAgent) {
            return super.renderToolbar();
        }
        return html`<button
                class="pf-c-button pf-m-primary"
                @click=${this.openAddApplicationModal}
            >
                ${msg("Add Application")}
            </button>
            ${super.renderToolbar()}`;
    }

    row(item: Application): SlottedTemplateResult[] {
        return [
            html`<ak-app-icon name=${item.name} icon=${ifPresent(item.metaIconUrl)}></ak-app-icon>`,
            html`<a href="#/core/applications/${item.slug}">
                <div>${item.name}</div>
                ${item.metaPublisher ? html`<small>${item.metaPublisher}</small>` : nothing}
            </a>`,
            html`${item.group || msg("-")}`,
            item.provider
                ? html`<a href="#/core/providers/${item.providerObj?.pk}">
                      ${item.providerObj?.name}
                  </a>`
                : html`-`,
            html`${item.providerObj?.verboseName || msg("-")}`,
            html`<div>
                <ak-forms-modal>
                    <span slot="submit">${msg("Save Changes")}</span>
                    <span slot="header">${msg("Update Application")}</span>
                    <ak-application-form slot="form" .instancePk=${item.slug}>
                    </ak-application-form>
                    <button slot="trigger" class="pf-c-button pf-m-plain">
                        <pf-tooltip position="top" content=${msg("Edit")}>
                            <i class="fas fa-edit" aria-hidden="true"></i>
                        </pf-tooltip>
                    </button>
                </ak-forms-modal>
                ${item.launchUrl
                    ? html`<a href=${item.launchUrl} target="_blank" class="pf-c-button pf-m-plain">
                          <pf-tooltip position="top" content=${msg("Open")}>
                              <i class="fas fa-share-square" aria-hidden="true"></i>
                          </pf-tooltip>
                      </a>`
                    : nothing}
                ${this.isAgent
                    ? html`<button
                          class="pf-c-button pf-m-plain"
                          @click=${() => this.removeApplication(item)}
                      >
                          <pf-tooltip position="top" content=${msg("Remove")}>
                              <i class="fas fa-trash" aria-hidden="true"></i>
                          </pf-tooltip>
                      </button>`
                    : nothing}
            </div>`,
        ];
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "ak-user-application-table": UserApplicationTable;
        "ak-agent-add-application-form": AgentAddApplicationForm;
    }
}
