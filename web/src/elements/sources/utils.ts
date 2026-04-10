import { PolicyBindingCheckTarget } from "#common/policies/utils";
import { ResolvedUITheme } from "#common/theme";

import { renderDynamicIcon } from "#elements/utils/images";
import type { VariantUrls } from "#elements/utils/images";

import { msg } from "@lit/localize";
import { html, nothing, TemplateResult } from "lit";

export function renderSourceIcon(
    name: string,
    iconUrl: VariantUrls | undefined | null,
    theme?: ResolvedUITheme,
): TemplateResult {
    const fallback = html`<i
        part="source-icon"
        role="img"
        class="fas fa-share-square"
        title="${name}"
    ></i>`;
    const icon = renderDynamicIcon({
        urls: iconUrl,
        theme,
        alt: name,
        ariaLabel: name,
        fallback,
        part: "source-icon",
    });
    return icon === nothing ? fallback : icon;
}

export function sourceBindingTypeNotices() {
    return [
        {
            type: PolicyBindingCheckTarget.Group,
            notice: msg(
                "Group mappings can only be checked if a user is already logged in when trying to access this source.",
            ),
        },
        {
            type: PolicyBindingCheckTarget.User,
            notice: msg(
                "User mappings can only be checked if a user is already logged in when trying to access this source.",
            ),
        },
    ];
}
