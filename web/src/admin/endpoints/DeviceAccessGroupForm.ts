import "#components/ak-text-input";
import "#elements/forms/HorizontalFormElement";

import { DEFAULT_CONFIG } from "#common/api/config";

import { ModelForm } from "#elements/forms/ModelForm";
import { WithBrandConfig } from "#elements/mixins/branding";

import { renderObjectAttributes } from "#admin/object-attributes/renderAttributes";

import {
    CoreApi,
    DeviceAccessGroup,
    DeviceAccessGroupRequest,
    EndpointsApi,
    ModelEnum,
    ObjectAttribute,
} from "@goauthentik/api";

import { msg } from "@lit/localize";
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";

/**
 * Device Access Group Form
 *
 * @prop {string} instancePk - The primary key of the instance to load.
 */
@customElement("ak-endpoints-device-access-groups-form")
export class DeviceAccessGroupForm extends WithBrandConfig(ModelForm<DeviceAccessGroup, string>) {
    @state()
    objAttributes: ObjectAttribute[] = [];

    async load() {
        const [app, model] = ModelEnum.AuthentikEndpointsDeviceaccessgroup.split(".");
        this.objAttributes = (
            await new CoreApi(DEFAULT_CONFIG).coreObjectAttributesList({
                objectTypeAppLabel: app,
                objectTypeModel: model,
            })
        ).results;
    }

    loadInstance(pk: string): Promise<DeviceAccessGroup> {
        return new EndpointsApi(DEFAULT_CONFIG).endpointsDeviceAccessGroupsRetrieve({
            pbmUuid: pk,
        });
    }

    getSuccessMessage(): string {
        return this.instance
            ? msg("Successfully updated group.")
            : msg("Successfully created group.");
    }

    async send(data: DeviceAccessGroup): Promise<DeviceAccessGroup> {
        if (this.instance) {
            return new EndpointsApi(DEFAULT_CONFIG).endpointsDeviceAccessGroupsPartialUpdate({
                pbmUuid: this.instance.pbmUuid,
                patchedDeviceAccessGroupRequest: data,
            });
        }
        return new EndpointsApi(DEFAULT_CONFIG).endpointsDeviceAccessGroupsCreate({
            deviceAccessGroupRequest: data as unknown as DeviceAccessGroupRequest,
        });
    }

    renderForm() {
        return html`<ak-text-input
                name="name"
                placeholder=${msg("Group name...")}
                label=${msg("Group name")}
                value=${ifDefined(this.instance?.name)}
                required
            ></ak-text-input>
            ${renderObjectAttributes(this.objAttributes, this.instance)}`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "ak-endpoints-device-access-groups-form": DeviceAccessGroupForm;
    }
}
