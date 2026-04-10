import "#elements/forms/FormGroup";
import "#elements/forms/HorizontalFormElement";
import "#elements/forms/Radio";
import "#elements/forms/SearchSelect/index";
import "#components/ak-text-input";
import "#components/ak-switch-input";
import "#components/ak-radio-input";

import { DEFAULT_CONFIG } from "#common/api/config";

import { ModelForm } from "#elements/forms/ModelForm";

import { CoreApi, ModelEnum, ObjectAttribute, ObjectAttributeTypeEnum } from "@goauthentik/api";

import { msg } from "@lit/localize";
import { html, TemplateResult } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("ak-object-attribute-form")
export class ObjectAttributeForm extends ModelForm<ObjectAttribute, string> {
    async loadInstance(pk: string): Promise<ObjectAttribute> {
        return await new CoreApi(DEFAULT_CONFIG).coreObjectAttributesRetrieve({
            attributeId: pk,
        });
    }

    getSuccessMessage(): string {
        return this.instance
            ? msg("Successfully updated attribute.")
            : msg("Successfully created attribute.");
    }

    async send(data: ObjectAttribute): Promise<ObjectAttribute> {
        if (this.instance?.attributeId) {
            return new CoreApi(DEFAULT_CONFIG).coreObjectAttributesUpdate({
                attributeId: this.instance.attributeId,
                objectAttributeRequest: data,
            });
        }
        return new CoreApi(DEFAULT_CONFIG).coreObjectAttributesCreate({
            objectAttributeRequest: data,
        });
    }

    //#region Renders

    protected override renderForm(): TemplateResult {
        return html`<ak-text-input
                name="Label"
                value="${this.instance?.label ?? ""}"
                label=${msg("Identifier")}
                placeholder=${msg("Type a unique identifier...")}
                required
            ></ak-text-input>
            <ak-text-input
                name="Key"
                value="${this.instance?.type ?? ""}"
                label=${msg("Key")}
                placeholder=${msg("Type a unique identifier...")}
                required
            ></ak-text-input>
            <ak-form-element-horizontal label=${msg("Type")} required name="type">
                <ak-radio
                    .options=${[
                        {
                            label: msg("Text"),
                            value: ObjectAttributeTypeEnum.Text,
                            default: true,
                        },
                        {
                            label: msg("Number"),
                            value: ObjectAttributeTypeEnum.Number,
                        },
                    ]}
                    .value=${this.instance?.type}
                >
                </ak-radio>
            </ak-form-element-horizontal>
            <ak-radio-input
                label=${msg("Object type")}
                name="contentType"
                required
                .value=${this.instance?.contentType}
                .options=${[
                    {
                        value: ModelEnum.AuthentikCoreUser,
                        label: msg("User"),
                        default: true,
                    },
                    {
                        value: ModelEnum.AuthentikCoreGroup,
                        label: msg("Group"),
                    },
                ]}
            ></ak-radio-input>

            <ak-switch-input
                name="flagRequired"
                label=${msg("Mark as required")}
                ?checked=${this.instance?.flagRequired}
            ></ak-switch-input>
            <ak-switch-input
                name="flagUnique"
                label=${msg("Mask as unique")}
                ?checked=${this.instance?.flagUnique}
            ></ak-switch-input>`;
    }

    //#endregion
}

declare global {
    interface HTMLElementTagNameMap {
        "ak-object-attribute-form": ObjectAttributeForm;
    }
}
