import '#components/ak-text-input';
import '#components/ak-switch-input';
import '#components/ak-number-input';

import { ObjectAttribute, ObjectAttributeTypeEnum } from '#packages/client-ts/dist';

import { html } from 'lit-html';

export type AttributesMixin = {
    attributes?: { [key: string]: unknown };
};

export function renderObjectAttributes(defs: ObjectAttribute[], obj?: AttributesMixin) {
    const attrs = obj?.attributes || {};
    return html`${defs.map((attr) => {
        switch (attr.type) {
            case ObjectAttributeTypeEnum.Text:
                return html`<ak-text-input
                    name="attributes.${attr.key}"
                    label=${attr.label}
                    autocomplete="off"
                    .value="${attrs[attr.key]}"
                    ?required=${attr.flagRequired}
                ></ak-text-input>`;
            case ObjectAttributeTypeEnum.Number:
                return html`<ak-number-input
                    name="attributes.${attr.key}"
                    label=${attr.label}
                    .value="${attrs[attr.key]}"
                    ?required=${attr.flagRequired}
                ></ak-number-input>`;
            case ObjectAttributeTypeEnum.Boolean:
                return html`<ak-switch-input
                    name="attributes.${attr.key}"
                    label=${attr.label}
                    ?checked=${attrs[attr.key]}
                    ?required=${attr.flagRequired}
                >
                </ak-switch-input>`;
        }
        return html``;
    })}`;
}
