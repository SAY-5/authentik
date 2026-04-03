import {
    adoptStyles as adoptStyleSheetsShim,
    css,
    CSSResult,
    CSSResultGroup,
    CSSResultOrNative,
    LitElement,
} from "lit";

/**
 * Create a lazy-loaded `CSSResult` compatible with Lit's
 * element lifecycle.
 *
 * @throw {@linkcode TypeError} if the input cannot be converted to a `CSSStyleSheet`
 *
 * @remarks
 *
 * Storybook's `build` does not currently have a coherent way of importing
 * CSS-as-text into CSSStyleSheet.
 *
 * It works well when Storybook is running in `dev`, but in `build` it fails.
 * Storied components will have to map their textual CSS imports.
 *
 * @see {@linkcode createStyleSheetUnsafe} to create a `CSSStyleSheet` from the given input.
 */
export function createCSSResult(input: string | CSSModule | CSSResultOrNative): CSSResultOrNative {
    if (typeof input !== "string") return input;

    const inputTemplate = [input] as unknown as TemplateStringsArray;
    const result = css(inputTemplate, []);
    return result;
}

/**
 * Create a `CSSStyleSheet` from the given input, if it is not already a `CSSStyleSheet`.
 *
 * @throw {@linkcode TypeError} if the input cannot be converted to a `CSSStyleSheet`
 *
 * @see {@linkcode createCSSResult} for the lazy-loaded `CSSResult` normalization.
 */
export function createStyleSheetUnsafe(
    input: string | CSSModule | CSSResultOrNative
): CSSStyleSheet {
    const result = typeof input === "string" ? createCSSResult(input) : input;
    if (result instanceof CSSStyleSheet) return result;
    if (result.styleSheet) return result.styleSheet;

    const styleSheet = new CSSStyleSheet();

    styleSheet.replaceSync(result.cssText);
    return styleSheet;
}

export function isStyleRoot(input: StyleRoot): input is ShadowRoot {
    // Sanity check - Does the input have the right shape?
    if (!input || typeof input !== "object") return false;
    if (!("adoptedStyleSheets" in input) || !input.adoptedStyleSheets) return false;
    if (typeof input.adoptedStyleSheets !== "object") return false;

    // We avoid `Array.isArray` because the adopted stylesheets property
    // is defined as a proxied array.
    // All we care about is that it's shaped like an array.
    if (!("length" in input.adoptedStyleSheets)) return false;

    return typeof input.adoptedStyleSheets.length === "number";
}

export function setAdoptedStyleSheets(styleRoot: StyleRoot, styleSheets: StyleSheetsAction): void {
    let changed = false;

    const currentSheets = isStyleRoot(styleRoot) ? [...styleRoot.adoptedStyleSheets] : [];
    const result = typeof styleSheets === "function" ? styleSheets(currentSheets) : styleSheets;

    const nextAdoptedStyleSheets: CSSStyleSheet[] = [];

    for (const [idx, styleSheet] of Array.from(result).entries()) {
        const previousStyleSheet = currentAdoptedStyleSheets[idx];

        changed ||= previousStyleSheet !== styleSheet;

        if (nextAdoptedStyleSheets.includes(styleSheet)) continue;
        nextAdoptedStyleSheets.push(styleSheet);
    }

    changed ||= nextAdoptedStyleSheets.length !== currentAdoptedStyleSheets.length;
    if (!changed) return;

    if (styleRoot === document) {
        document.adoptedStyleSheets = nextAdoptedStyleSheets;
        return;
    }

    adoptStyleSheetsShim(styleRoot as unknown as ShadowRoot, nextAdoptedStyleSheets);
}

export class AkLitElement extends LitElement {
    public static styles?: Array<CSSResult | CSSModule>;

    /**
     * Host styles are styles that are applied to the element's render root,
     * but are not scoped to the element itself.
     *
     * @remarks
     *
     * This is useful if the element is a wrapper around a third-party component
     * that requires styles to be applied to the host, such as Patternfly's modals.
     */
    public static hostStyles?: Array<CSSResult | CSSModule>;

    private static hostStyleSheets: CSSStyleSheet[] | null = null;

    protected static override finalizeStyles(styles: CSSResultGroup = []): CSSResultOrNative[] {
        this.hostStyleSheets = this.hostStyles ? this.hostStyles.map(createStyleSheetUnsafe) : null;

        const elementStyles = [
            ...([styles] as Array<unknown>).flat(Infinity),
        ] as CSSResultOrNative[];

        // Remove duplicates in reverse order to preserve last-insert-wins semantics of CSS. See:
        // https://github.com/lit/lit/blob/main/packages/reactive-element/src/reactive-element.ts#L945
        const elementSet = new Set(elementStyles.reverse());

        // Reverse again because the return type is an array, and process as a CSSResult
        return Array.from(elementSet).reverse().map(createCSSResult);
    }
}
