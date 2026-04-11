import "#components/ak-text-input";
import "#components/ak-switch-input";
import "#components/ak-number-input";
import "#elements/forms/FormGroup";
import "#elements/CodeMirror/ak-codemirror";

import { DEFAULT_CONFIG } from "#common/api/config";
import { groupBy } from "#common/utils";

import { ModelForm } from "#elements/forms/ModelForm";

import { CoreApi, ModelEnum, ObjectAttribute, ObjectAttributeTypeEnum } from "@goauthentik/api";

import YAML from "yaml";

import { msg } from "@lit/localize";
import { html, nothing } from "lit-html";
import { state } from "lit/decorators.js";

export interface ObjectAttributeOptions {
    disableRawAttributes: boolean;
}

export type AttributesMixin = {
    attributes?: { [key: string]: unknown };
};

export abstract class ObjectAttributeModelForm<
    T extends object = object,
    PKT extends string | number = string | number,
    D = T,
> extends ModelForm<T, PKT, D> {
    @state()
    objAttributes: ObjectAttribute[] = [];

    public abstract model: ModelEnum;

    async load() {
        const [app, model] = this.model.split(".");
        this.objAttributes = (
            await new CoreApi(DEFAULT_CONFIG).coreObjectAttributesList({
                objectTypeAppLabel: app,
                objectTypeModel: model,
                enabled: true,
            })
        ).results;
    }

    renderObjectAttributes(
        defs: ObjectAttribute[],
        obj: AttributesMixin | null,
        options?: ObjectAttributeOptions,
    ) {
        const attrs = obj?.attributes || {};
        const renderSingleAttribute = (attr: ObjectAttribute) => {
            switch (attr.type) {
                case ObjectAttributeTypeEnum.Text:
                    return html`<ak-text-input
                        name="attributes.${attr.key}"
                        label=${attr.label}
                        autocomplete="off"
                        .value="${attrs[attr.key]}"
                        ?required=${attr.isRequired}
                    ></ak-text-input>`;
                case ObjectAttributeTypeEnum.Number:
                    return html`<ak-number-input
                        name="attributes.${attr.key}"
                        label=${attr.label}
                        .value="${attrs[attr.key]}"
                        ?required=${attr.isRequired}
                    ></ak-number-input>`;
                case ObjectAttributeTypeEnum.Boolean:
                    return html`<ak-switch-input
                        name="attributes.${attr.key}"
                        label=${attr.label}
                        ?checked=${attrs[attr.key]}
                        ?required=${attr.isRequired}
                    >
                    </ak-switch-input>`;
            }
        };
        return html`${groupBy(defs, (def) => def.group || "").map(([group, attrs]) => {
            if (group === "") {
                return html`${attrs.map((attr) => renderSingleAttribute(attr))}`;
            }
            return html`<ak-form-group label=${group}>
                <div class="pf-c-form">${attrs.map((attr) => renderSingleAttribute(attr))}</div>
            </ak-form-group>`;
        })}
        ${options?.disableRawAttributes
            ? nothing
            : html`<ak-form-group label=${msg("Advanced settings")}>
                  <div class="pf-c-form">
                      <ak-form-element-horizontal label=${msg("Attributes")} name="attributes">
                          <ak-codemirror mode="yaml" value="${YAML.stringify(attrs)}">
                          </ak-codemirror>
                          <p class="pf-c-form__helper-text">
                              ${msg("Set custom attributes using YAML or JSON.")}
                          </p>
                      </ak-form-element-horizontal>
                  </div>
              </ak-form-group>`}`;
    }
}
