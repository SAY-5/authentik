import { ResolvedUITheme } from "#common/theme";

import type { LitFC } from "#elements/types";
import { ifPresent } from "#elements/utils/attributes";

import type { ThemedUrls } from "@goauthentik/api";

import { spread } from "@open-wc/lit-helpers";
import { ImgHTMLAttributes } from "react";

import { html, nothing, TemplateResult } from "lit";

export const FontAwesomeProtocol = "fa://";

export interface VariantUrls {
    fallback?: string | null;
    [key: string]: string | null | undefined;
}

export function resolveVariantUrl(
    variantUrls: VariantUrls | undefined | null,
    theme: ResolvedUITheme | undefined,
): string | undefined | null {
    if (!variantUrls) {
        return undefined;
    }

    if (theme && variantUrls[theme]) {
        return variantUrls[theme];
    }

    if (variantUrls.fallback) {
        return variantUrls.fallback;
    }

    return Object.values(variantUrls).find((url) => !!url);
}

export function resolveThemedUrl(
    src: string | undefined | null,
    themedUrls: ThemedUrls | undefined | null,
    theme: ResolvedUITheme | undefined,
): string | undefined | null {
    const variantUrls = themedUrls ? { ...themedUrls } : {};
    if (src !== undefined && src !== null) {
        variantUrls.fallback = src;
    }
    return resolveVariantUrl(variantUrls, theme);
}

export interface ThemedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
    /**
     * The image path (base URL, may contain %(theme)s for display purposes only)
     */
    src: string;
    theme: ResolvedUITheme;
    /**
     * Pre-resolved URLs for each theme variant from backend.
     * When provided, these are used instead of src.
     */
    themedUrls?: ThemedUrls | null;
    part?: string;
    role?: string;
}

export interface RenderIconOptions {
    alt?: string;
    ariaHidden?: boolean;
    ariaLabel?: string;
    className?: string;
    fallback?: TemplateResult | typeof nothing;
    part?: string;
}

export interface RenderDynamicIconOptions extends RenderIconOptions {
    urls: VariantUrls | undefined | null;
    theme: ResolvedUITheme | undefined;
}

export const ThemedImage: LitFC<ThemedImageProps> = ({
    src,
    className,
    theme,
    themedUrls,
    ...props
}) => {
    if (!src) {
        return nothing;
    }

    // Handle Font Awesome icons
    if (src.startsWith(FontAwesomeProtocol)) {
        const classes = [className, "font-awesome", "fas", src.slice(FontAwesomeProtocol.length)]
            .filter(Boolean)
            .join(" ");

        return html`<i part="icon font-awesome" role="img" class=${classes} ${spread(props)}></i>`;
    }

    // Use themed URL if available, otherwise use src directly
    const resolvedSrc = resolveThemedUrl(src, themedUrls, theme);
    if (!resolvedSrc) {
        return nothing;
    }

    return html`<img src=${resolvedSrc} class=${ifPresent(className)} ${spread(props)} />`;
};

export function renderIcon(
    src: string | undefined | null,
    themedUrls: ThemedUrls | undefined | null,
    theme: ResolvedUITheme | undefined,
    {
        alt = "",
        ariaHidden = false,
        ariaLabel,
        className,
        fallback = nothing,
        part,
    }: RenderIconOptions = {},
): TemplateResult | typeof nothing {
    const resolvedSrc = resolveThemedUrl(src, themedUrls, theme);
    if (!resolvedSrc) {
        return fallback;
    }

    return html`${ThemedImage({
        "src": resolvedSrc,
        alt,
        "aria-hidden": ariaHidden,
        "aria-label": ariaLabel,
        className,
        part,
        "role": ariaHidden ? undefined : "img",
        "theme": theme ?? "light",
    })}`;
}

export function renderDynamicIcon(
    { urls, theme, ...options }: RenderDynamicIconOptions,
): TemplateResult | typeof nothing {
    const resolvedSrc = resolveVariantUrl(urls, theme);
    return renderIcon(resolvedSrc, null, theme, options);
}

export function isDefaultAvatar(path?: string | null): boolean {
    return !!path?.endsWith("user_default.png");
}
