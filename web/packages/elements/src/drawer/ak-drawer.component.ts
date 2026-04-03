import { AkLitElement } from "../akLitElement";
import { classList } from "../directives/class-list";
import Style from "./ak-drawer.css";
import PFDrawer from "./component.scss";
import PFDrawer from "./drawer.scss";

import { html } from "lit";
import { property } from "lit/decorators.js";

export class Drawer extends AkLitElement {
    static readonly styles = [PFDrawer, Style];

    @property({ type: Boolean, reflect: true })
    public open = false;

    render() {
        const open = [(this.open && "pf-m-expanded") || "pf-m-collapsed"];

        return html`
            <div class="pf-v5-c-page__drawer">
                <div class="pf-v5-c-drawer ${classList(open)}" id="flow-drawer">
                    <div class="pf-v5-c-drawer__main">
                        <div class="pf-v5-c-drawer__content">
                            <div class="pf-v5-c-drawer__body">
                                <slot></slot>
                            </div>
                        </div>
                        <div class="pf-v5-c-drawer__panel pf-m-width-33">
                            <slot name="panel"></slot>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}
