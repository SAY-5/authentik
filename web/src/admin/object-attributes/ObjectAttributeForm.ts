import "#elements/forms/FormGroup";
import "#elements/forms/HorizontalFormElement";
import "#elements/forms/Radio";
import "#elements/forms/SearchSelect/index";
import "#components/ak-text-input";
import "#components/ak-switch-input";

import { DEFAULT_CONFIG } from "#common/api/config";

import { ModelForm } from "#elements/forms/ModelForm";

import {
    AdminApi,
    AdminModelsListRequest,
    App,
    CoreApi,
    ObjectAttribute,
    ObjectAttributeTypeEnum,
} from "@goauthentik/api";

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
        data.regex = data.regex !== "" ? data.regex : undefined;
        if (this.instance?.pk) {
            return new CoreApi(DEFAULT_CONFIG).coreObjectAttributesUpdate({
                attributeId: this.instance.pk,
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
                name="label"
                value="${this.instance?.label ?? ""}"
                label=${msg("Label")}
                placeholder=${msg("Type a human-readable name...")}
                required
            ></ak-text-input>
            <ak-text-input
                name="key"
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
                        {
                            label: msg("Boolean"),
                            value: ObjectAttributeTypeEnum.Boolean,
                        },
                    ]}
                    .value=${this.instance?.type}
                >
                </ak-radio>
            </ak-form-element-horizontal>
            <ak-form-element-horizontal label="Object type" name="objectType" required>
                <ak-search-select
                    .fetchObjects=${async (): Promise<App[]> => {
                        const args: AdminModelsListRequest = {
                            filterHasAttributes: true,
                        };
                        return await new AdminApi(DEFAULT_CONFIG).adminModelsList(args);
                    }}
                    .renderElement=${(app: App): string => {
                        return app.label;
                    }}
                    .value=${(app: App | undefined): string | undefined => {
                        return app?.name;
                    }}
                    .selected=${(app: App): boolean => {
                        return app.name === this.instance?.objectTypeObj.fullyQualifiedModel;
                    }}
                >
                </ak-search-select>
            </ak-form-element-horizontal>

            <ak-form-group label=${msg("Validation")} open>
                <div class="pf-c-form">
                    <ak-switch-input
                        name="flagRequired"
                        label=${msg("Attribute is required")}
                        ?checked=${this.instance?.flagRequired}
                        help=${msg("Value of the attribute cannot be empty.")}
                    ></ak-switch-input>
                    <ak-switch-input
                        name="flagUnique"
                        label=${msg("Attribute is unique")}
                        ?checked=${this.instance?.flagUnique}
                        help=${msg(
                            "Value of the attribute must be unique across all instances of the selected object type.",
                        )}
                    ></ak-switch-input>
                    <ak-text-input
                        name="regex"
                        value="${this.instance?.regex ?? ""}"
                        label=${msg("RegEx")}
                        input-hint="code"
                        placeholder=${msg("Enter a regex for validation...")}
                    ></ak-text-input>
                </div>
            </ak-form-group>`;
    }

    //#endregion
}

declare global {
    interface HTMLElementTagNameMap {
        "ak-object-attribute-form": ObjectAttributeForm;
    }
}
