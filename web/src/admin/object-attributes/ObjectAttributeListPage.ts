import "#admin/rbac/ObjectPermissionModal";
import "#admin/object-attributes/ObjectAttributeForm";
import "#elements/forms/DeleteBulkForm";
import "#elements/forms/ModalForm";
import "@patternfly/elements/pf-tooltip/pf-tooltip.js";

import { DEFAULT_CONFIG } from "#common/api/config";

import { PaginatedResponse, TableColumn } from "#elements/table/Table";
import { TablePage } from "#elements/table/TablePage";
import { SlottedTemplateResult } from "#elements/types";

import { CoreApi, ObjectAttribute, ObjectAttributeTypeEnum } from "@goauthentik/api";

import { msg } from "@lit/localize";
import { html, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";

export function objectAttributeTypeToLabel(type?: ObjectAttributeTypeEnum): string {
    if (!type) return "";
    switch (type) {
        case ObjectAttributeTypeEnum.Text:
            return msg("Text");
        case ObjectAttributeTypeEnum.Number:
            return msg("Number");
        case ObjectAttributeTypeEnum.Boolean:
            return msg("Boolean");
    }
    return msg("Unknown type");
}

@customElement("ak-object-attribute-list")
export class ObjectAttributeListPage extends TablePage<ObjectAttribute> {
    protected override searchEnabled = true;
    public pageTitle = msg("Object attributes");
    public pageDescription = "Configure attributes on objects such as users and groups.";
    public pageIcon = "pf-icon pf-icon-flavor";

    protected override rowLabel(item: ObjectAttribute): string | null {
        return item.pk ?? null;
    }

    checkbox = true;
    clearOnRefresh = true;

    @property()
    order = "key";

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
        [msg("Actions"), null, msg("Row Actions")],
    ];

    renderToolbarSelected(): TemplateResult {
        const disabled = this.selectedElements.length < 1;
        return html`<ak-forms-delete-bulk
            object-label=${msg("Object Attribute(s)")}
            .objects=${this.selectedElements}
            .metadata=${(item: ObjectAttribute) => {
                return [
                    { key: msg("Label"), value: item.label },
                    { key: msg("Key"), value: item.key },
                ];
            }}
            .delete=${(item: ObjectAttribute) => {
                return new CoreApi(DEFAULT_CONFIG).coreObjectAttributesDestroy({
                    attributeId: item.pk,
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
            html`<code>${item.key}</code>`,
            html`${objectAttributeTypeToLabel(item.type)}`,
            html`${item.objectTypeObj.verboseNamePlural}`,
            html`<ak-forms-modal>
                <span slot="submit">${msg("Save Changes")}</span>
                <span slot="header">${msg("Update Attribute")}</span>
                <ak-object-attribute-form
                    slot="form"
                    .instancePk=${item.pk}
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
