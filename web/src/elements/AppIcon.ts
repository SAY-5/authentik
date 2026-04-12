import { PFSize } from "#common/enums";

import Styles from "#elements/AppIcon.css";
import { AKElement } from "#elements/Base";
import { FontAwesomeProtocol, resolveThemedUrl, ThemedImage } from "#elements/utils/images";

import type { ThemedUrls } from "@goauthentik/api";

import { msg, str } from "@lit/localize";
import { CSSResult, html, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";

export interface IAppIcon {
    name?: string | null;
    icon?: string | null;
    iconThemedUrls?: ThemedUrls | null;
    size?: PFSize | null;
}

@customElement("ak-app-icon")
export class AppIcon extends AKElement implements IAppIcon {
    public static readonly FontAwesomeProtocol = FontAwesomeProtocol;

    static styles: CSSResult[] = [Styles];

    @property({ type: String })
    public name: string | null = null;

    @property({ type: String })
    public icon: string | null = null;

    @property({ type: Object })
    public iconThemedUrls: ThemedUrls | null = null;

    @property({ reflect: true })
    public size: PFSize = PFSize.Medium;

    #wrap(icon: TemplateResult): TemplateResult {
        // Keep the icon wrapped so image and font-based variants share the same layout box.
        return html`<span class="icon-wrapper">${icon}</span>`;
    }

    override render(): TemplateResult {
        const applicationName = this.name ?? msg("Application");
        const label = msg(str`${applicationName} Icon`);
        const resolvedIcon = resolveThemedUrl(this.icon, this.iconThemedUrls, this.activeTheme);
        const part = resolvedIcon?.startsWith(AppIcon.FontAwesomeProtocol)
            ? "icon font-awesome"
            : "icon image";

        if (resolvedIcon) {
            return this.#wrap(
                html`${ThemedImage({
                    "aria-label": label,
                    "alt": this.name?.charAt(0).toUpperCase() ?? "�",
                    "className": "icon",
                    part,
                    "role": "img",
                    "src": resolvedIcon,
                    "theme": this.activeTheme,
                })}`,
            );
        }

        const insignia = this.name?.charAt(0).toUpperCase() ?? "�";

        // Fallback to first letter insignia
        return this.#wrap(
            html`<span part="icon insignia" role="img" aria-label=${label} class="icon"
                >${insignia}</span
            >`,
        );
    }
}

export default AppIcon;

declare global {
    interface HTMLElementTagNameMap {
        "ak-app-icon": AppIcon;
    }
}
