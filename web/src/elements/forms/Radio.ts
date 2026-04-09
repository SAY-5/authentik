import { FormAssociatedElement } from "#elements/forms/form-associated-element";
import Styles from "#elements/forms/Radio.css";
import { SlottedTemplateResult } from "#elements/types";
import { ifPresent } from "#elements/utils/attributes";

import { IDGenerator } from "@goauthentik/core/id";

import { Jsonifiable } from "type-fest";

import { msg } from "@lit/localize";
import { CSSResult, html, nothing, PropertyValues } from "lit";
import { ref } from "lit-html/directives/ref.js";
import { customElement, property } from "lit/decorators.js";
import { map } from "lit/directives/map.js";

import PFForm from "@patternfly/patternfly/components/Form/form.css";
import PFRadio from "@patternfly/patternfly/components/Radio/radio.css";

export interface RadioOption<T extends Jsonifiable | undefined> {
    label: string;
    description?: SlottedTemplateResult;
    className?: string;
    default?: boolean;
    value: T;
    disabled?: boolean;
}

export interface RadioChangeEventDetail<T> {
    value: T;
}

@customElement("ak-radio")
export class Radio<T extends Jsonifiable = never> extends FormAssociatedElement<string, T | null> {
    public static styles: CSSResult[] = [
        // ---
        PFRadio,
        PFForm,
        Styles,
    ];

    /**
     * Options to display in the radio group.
     *
     * Can be either an array of RadioOption<T> or a function returning such an array.
     */
    @property({ attribute: false })
    public options!: RadioOption<T>[] | (() => RadioOption<T>[]);

    #value: T | null = null;

    @property()
    public set value(nextValue: T) {
        if (!nextValue) {
            return;
        }

        this.#value = nextValue;

        this.#syncValidity();
    }

    /**
     * The stringified value of the currently selected radio option.
     */
    public get value(): string {
        return typeof this.#value === "string" ? this.#value : JSON.stringify(this.#value);
    }

    #syncValidity() {
        this.internals.setFormValue(this.value);

        let message: string | undefined;
        const flags: ValidityStateFlags = {};

        if (this.required && !this.#value) {
            message = msg("This field is required.");
            flags.valueMissing = true;
        }

        this.internals.setValidity(flags, message, this.anchorRef.value);
    }

    /**
     * The raw value of the currently selected radio option.
     *
     * This is the value that will be submitted with the form when serialized.
     */
    public toJSON(): T | null {
        return this.#value;
    }

    #fieldID: string = this.name || IDGenerator.randomID();

    #optionsArray(): RadioOption<T>[] {
        return typeof this.options === "function" ? this.options() : this.options;
    }

    public override connectedCallback(): void {
        super.connectedCallback();

        if (this.getAttribute("tabindex") === null) {
            this.setAttribute("tabindex", "0");
        }

        this.addEventListener("focus", this.#delegateFocusListener);

        this.role ||= "group";
    }

    public override disconnectedCallback(): void {
        super.disconnectedCallback();

        this.removeEventListener("focus", this.#delegateFocusListener);
    }

    #delegateFocusListener = () => {
        this.anchorRef?.value?.focus();
    };

    // Set the value if it's not set already. Property changes inside the `willUpdate()` method do
    // not trigger an element update.
    public override willUpdate(changedProperties: PropertyValues<this>): void {
        super.willUpdate(changedProperties);

        if (!this.value) {
            const maybeDefault = this.#optionsArray().filter((opt) => opt.default);
            if (maybeDefault.length > 0) {
                this.value = maybeDefault[0].value;
            }
        }
    }

    public override firstUpdated(changedProperties: PropertyValues<this>): void {
        super.firstUpdated(changedProperties);
        this.#syncValidity();
    }

    // When a user clicks on `type="radio"`, *two* events happen in rapid succession: the original
    // radio loses its setting, and the selected radio gains its setting. We want radio buttons to
    // present a unified event interface, so we prevent the event from triggering if the value is
    // already set.
    #buildChangeListener = (option: RadioOption<T>) => {
        return (event: Event) => {
            // This is a controlled input. Stop the native event from escaping or affecting the
            // value. We'll do that ourselves.
            event.preventDefault();
            event.stopPropagation();

            if (option.disabled) {
                return;
            }

            this.value = option.value;

            this.dispatchEvent(
                new CustomEvent<RadioChangeEventDetail<T>>("change", {
                    detail: { value: option.value },
                    bubbles: true,
                    composed: true,
                }),
            );

            this.dispatchEvent(
                new CustomEvent<RadioChangeEventDetail<T>>("input", {
                    detail: { value: option.value },
                    bubbles: true,
                    composed: true,
                }),
            );
        };
    };

    #renderRadio = (option: RadioOption<T>, index: number) => {
        const id = `${this.#fieldID}-${index}`;

        const changeListener = this.#buildChangeListener(option);

        return html`<div
            class="pf-c-radio ${option.disabled ? "pf-m-disabled" : ""}"
            @click=${changeListener}
        >
            <input
                ${index === 0 ? ref(this.anchorRef) : nothing}
                class="pf-c-radio__input"
                type="radio"
                name=${ifPresent(this.name)}
                aria-label=${option.label}
                id=${id}
                .checked=${option.value === this.value}
                .disabled=${!!option.disabled}
                ?required=${this.required}
            />
            <label class="pf-c-radio__label ${option.className ?? ""}" for=${id}
                >${option.label}</label
            >
            ${option.description
                ? html`<span class="pf-c-radio__description">${option.description}</span>`
                : nothing}
        </div>`;
    };

    render() {
        return html`<div class="pf-c-form__group-control pf-m-stack" ${ref(this.anchorRef)}>
            ${map(this.#optionsArray(), this.#renderRadio)}
        </div>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "ak-radio": Radio<never>;
    }
}

export default Radio;
