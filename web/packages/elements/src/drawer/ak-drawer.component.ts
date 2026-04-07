import PFDrawer from "./component.scss";

import { html, LitElement, nothing } from "lit";
import { property } from "lit/decorators.js";

export class Drawer extends LitElement {
    static readonly styles = [PFDrawer];

    @property({ type: Boolean, reflect: true })
    public resizable = false;

    public open() {
        this.setAttribute("open", "");
    }

    public close() {
        this.removeAttribute("open");
    }

    render() {
        return html`
            <div class="pf-v5-c-drawer">
                <div class="pf-v5-c-drawer__main">
                    <div class="pf-v5-c-drawer__content">
                        <div class="pf-v5-c-drawer__body">
                            <slot></slot>
                        </div>
                    </div>
                    <div class="pf-v5-c-drawer__panel">
                        ${this.resizable
                            ? html` <div
                                  class="pf-v5-c-drawer__splitter"
                                  role="separator"
                                  tabindex="0"
                              >
                                  <div
                                      class="pf-v5-c-drawer__splitter-handle"
                                      aria-hidden="true"
                                  ></div>
                              </div>`
                            : nothing}
                        <div class="pf-v5-c-drawer__panel-main">
                            <slot name="panel"></slot>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}
