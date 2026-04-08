import { AkDrawer } from "./drawer/ak-drawer.component.js";

export { AkDrawer };

window.customElements.define("ak-drawer", AkDrawer);

declare global {
    interface HTMLElementTagNameMap {
        "ak-drawer": AkDrawer;
    }
}
