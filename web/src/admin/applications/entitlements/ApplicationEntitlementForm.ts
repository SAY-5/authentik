import "#elements/forms/HorizontalFormElement";
import "#elements/forms/Radio";
import "#elements/forms/SearchSelect/index";

import { DEFAULT_CONFIG } from "#common/api/config";

import { ModelForm } from "#elements/forms/ModelForm";

import { renderObjectAttributes } from "#admin/object-attributes/renderAttributes";

import { ApplicationEntitlement, CoreApi, ModelEnum, ObjectAttribute } from "@goauthentik/api";

import { msg } from "@lit/localize";
import { CSSResult, html, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import PFContent from "@patternfly/patternfly/components/Content/content.css";

@customElement("ak-application-entitlement-form")
export class ApplicationEntitlementForm extends ModelForm<ApplicationEntitlement, string> {
    @state()
    objAttributes: ObjectAttribute[] = [];

    async load() {
        const [app, model] = ModelEnum.AuthentikCoreApplicationentitlement.split(".");
        this.objAttributes = (
            await new CoreApi(DEFAULT_CONFIG).coreObjectAttributesList({
                objectTypeAppLabel: app,
                objectTypeModel: model,
            })
        ).results;
    }

    async loadInstance(pk: string): Promise<ApplicationEntitlement> {
        return new CoreApi(DEFAULT_CONFIG).coreApplicationEntitlementsRetrieve({
            pbmUuid: pk,
        });
    }

    @property()
    targetPk?: string;

    getSuccessMessage(): string {
        if (this.instance?.pbmUuid) {
            return msg("Successfully updated entitlement.");
        }
        return msg("Successfully created entitlement.");
    }

    static styles: CSSResult[] = [...super.styles, PFContent];

    send(data: ApplicationEntitlement): Promise<unknown> {
        if (this.targetPk) {
            data.app = this.targetPk;
        }
        if (this.instance?.pbmUuid) {
            return new CoreApi(DEFAULT_CONFIG).coreApplicationEntitlementsUpdate({
                pbmUuid: this.instance.pbmUuid || "",
                applicationEntitlementRequest: data,
            });
        }
        return new CoreApi(DEFAULT_CONFIG).coreApplicationEntitlementsCreate({
            applicationEntitlementRequest: data,
        });
    }

    protected override renderForm(): TemplateResult {
        return html` <ak-form-element-horizontal label=${msg("Name")} required name="name">
                <input
                    type="text"
                    value="${this.instance?.name ?? ""}"
                    class="pf-c-form-control"
                    required
                />
            </ak-form-element-horizontal>
            ${renderObjectAttributes(this.objAttributes, this.instance)}`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "ak-application-entitlement-form": ApplicationEntitlementForm;
    }
}
