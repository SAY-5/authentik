import "#admin/rbac/ObjectPermissionModal";
import "#admin/object-attributes/ObjectAttributeForm";
import "#components/ak-status-label";
import "#elements/buttons/Dropdown";
import "#elements/buttons/TokenCopyButton/index";
import "#elements/forms/DeleteBulkForm";
import "#elements/forms/ModalForm";
import "@patternfly/elements/pf-tooltip/pf-tooltip.js";

import { DEFAULT_CONFIG } from "#common/api/config";

import { PaginatedResponse, TableColumn } from "#elements/table/Table";
import { TablePage } from "#elements/table/TablePage";
import { SlottedTemplateResult } from "#elements/types";

import { CoreApi, ObjectAttribute, Token } from "@goauthentik/api";

import { msg } from "@lit/localize";
import { html, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("ak-object-attribute-list")
export class ObjectAttributeListPage extends TablePage<ObjectAttribute> {
    protected override searchEnabled = true;
    public pageTitle = msg("Object attributes");
    public pageDescription = "TODO";
    public pageIcon = "pf-icon pf-icon-security";

    protected override rowLabel(item: ObjectAttribute): string | null {
        return item.attributeId ?? null;
    }

    checkbox = true;
    clearOnRefresh = true;

    @property()
    order = "expires";

    async apiEndpoint(): Promise<PaginatedResponse<ObjectAttribute>> {
        return new CoreApi(DEFAULT_CONFIG).coreObjectAttributesList(
            await this.defaultEndpointConfig(),
        );
    }

    protected columns: TableColumn[] = [
        [msg("Label"), "Label"],
        [msg("Key"), "key"],
        [msg("Type"), "type"],
        [msg("Object type"), "object_type"],
    ];

    renderToolbarSelected(): TemplateResult {
        const disabled = this.selectedElements.length < 1;
        return html`<ak-forms-delete-bulk
            object-label=${msg("Token(s)")}
            .objects=${this.selectedElements}
            .metadata=${(item: Token) => {
                return [{ key: msg("Identifier"), value: item.identifier }];
            }}
            .usedBy=${(item: Token) => {
                return new CoreApi(DEFAULT_CONFIG).coreTokensUsedByList({
                    identifier: item.identifier,
                });
            }}
            .delete=${(item: Token) => {
                return new CoreApi(DEFAULT_CONFIG).coreTokensDestroy({
                    identifier: item.identifier,
                });
            }}
        >
            <button ?disabled=${disabled} slot="trigger" class="pf-c-button pf-m-danger">
                ${msg("Delete")}
            </button>
        </ak-forms-delete-bulk>`;
    }

    renderObjectCreate(): TemplateResult {
        return html`
            <ak-forms-modal>
                <span slot="submit">${msg("Create")}</span>
                <span slot="header">${msg("New Attribute")}</span>
                <ak-object-attribute-form slot="form"> </ak-object-attribute-form>
                <button slot="trigger" class="pf-c-button pf-m-primary">${msg("Create")}</button>
            </ak-forms-modal>
        `;
    }

    row(item: ObjectAttribute): SlottedTemplateResult[] {
        return [
            html`${item.label}`,
            html`${item.key}`,
            html`${item.type}`,
            html`${item.objectType}`,
            html`<ak-forms-modal>
                <span slot="submit">${msg("Save Changes")}</span>
                <span slot="header">${msg("Update Attribute")}</span>
                <ak-object-attribute-form
                    slot="form"
                    .instancePk=${item.attributeId}
                ></ak-object-attribute-form>
                <button slot="trigger" class="pf-c-button pf-m-plain">
                    <pf-tooltip position="top" content=${msg("Edit")}>
                        <i class="fas fa-edit" aria-hidden="true"></i>
                    </pf-tooltip>
                </button>
            </ak-forms-modal> `,
        ];
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "ak-object-attribute-list": ObjectAttributeListPage;
    }
}
