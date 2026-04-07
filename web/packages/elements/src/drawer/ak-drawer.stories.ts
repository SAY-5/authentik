import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { html } from "lit";

import "../ak-drawer.js";
import type { Drawer } from "./ak-drawer.component.js";

const contentBlock = html`
    <div style="padding: 1rem;">
        <h2>Main Content</h2>
        <p>
            This is the primary content area of the drawer. When the panel is in overlay mode, this
            content remains in place behind the panel. When the drawer is inline, this content
            resizes to accommodate the panel.
        </p>
        <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus pretium est a
            porttitor vehicula. Quisque vel commodo urna.
        </p>
    </div>
`;

const panelBlock = html`
    <div slot="panel" style="padding: 1rem; background-color: var(--pf-v5-global--BackgroundColor--200, #f0f0f0);">
        <h3>Panel Content</h3>
        <p>This is the side panel. It can contain forms, detail views, or supplementary information.</p>
        <ul>
            <li>Item one</li>
            <li>Item two</li>
            <li>Item three</li>
        </ul>
    </div>
`;

const meta = {
    title: "Components/Drawer",
    component: "ak-drawer",
    tags: ["autodocs"],
    decorators: [
        (story) =>
            html`<div style="min-height: 400px; border: 1px solid #d2d2d2; overflow: hidden;">
                ${story()}
            </div>`,
    ],
    argTypes: {
        expanded: { control: "boolean" },
        position: {
            control: { type: "select" },
            options: ["right", "left", "bottom"],
        },
        inline: { control: "boolean" },
        static: { control: "boolean" },
        resizable: { control: "boolean" },
        width: {
            control: { type: "select" },
            options: ["25", "33", "50", "66", "75", "100"],
        },
    },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Default: Story = {
    render: () => html`
        <ak-drawer>
            ${contentBlock}
            ${panelBlock}
        </ak-drawer>
    `,
};

export const Expanded: Story = {
    render: () => html`
        <ak-drawer expanded>
            ${contentBlock}
            ${panelBlock}
        </ak-drawer>
    `,
};

export const PanelLeft: Story = {
    name: "Panel Left",
    render: () => html`
        <ak-drawer expanded position="left">
            ${contentBlock}
            ${panelBlock}
        </ak-drawer>
    `,
};

export const PanelBottom: Story = {
    name: "Panel Bottom",
    render: () => html`
        <ak-drawer expanded position="bottom">
            ${contentBlock}
            ${panelBlock}
        </ak-drawer>
    `,
};

export const Inline: Story = {
    render: () => html`
        <ak-drawer expanded inline>
            ${contentBlock}
            ${panelBlock}
        </ak-drawer>
    `,
};

export const Static: Story = {
    render: () => html`
        <ak-drawer expanded static>
            ${contentBlock}
            ${panelBlock}
        </ak-drawer>
    `,
};

export const Resizable: Story = {
    render: () => html`
        <ak-drawer expanded resizable>
            ${contentBlock}
            ${panelBlock}
        </ak-drawer>
    `,
};

export const CustomWidth: Story = {
    name: "Custom Width",
    render: () => html`
        <ak-drawer expanded width="33">
            ${contentBlock}
            ${panelBlock}
        </ak-drawer>
    `,
};

export const ResponsiveWidth: Story = {
    name: "Responsive Width",
    render: () => html`
        <ak-drawer expanded width="75-on-xl">
            ${contentBlock}
            ${panelBlock}
        </ak-drawer>
    `,
};

export const Toggle: Story = {
    render: () => {
        const toggle = (e: Event) => {
            const button = e.target as HTMLButtonElement;
            const drawer = button.closest("div")!.querySelector<Drawer>("ak-drawer")!;
            if (drawer.hasAttribute("expanded")) {
                drawer.removeAttribute("expanded");
                button.textContent = "Open Drawer";
            } else {
                drawer.setAttribute("expanded", "");
                button.textContent = "Close Drawer";
            }
        };

        return html`
            <div>
                <div style="padding: 0.5rem;">
                    <button @click=${toggle} style="padding: 0.5rem 1rem; cursor: pointer;">
                        Open Drawer
                    </button>
                </div>
                <ak-drawer>
                    ${contentBlock}
                    ${panelBlock}
                </ak-drawer>
            </div>
        `;
    },
};
