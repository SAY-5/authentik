import fs from "node:fs";
import path from "node:path";

import prettierConfig from "@goauthentik/prettier-config";

import * as prettier from "prettier";
import * as sass from "sass";
import { create as sassAlias } from "sass-alias";

/* ------------ Config ------------------------------------------------------- */

const sourceDir = "./src";
const buildDir = "./dist";
const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";
const globalCssSourcePath = "./scss/globals.scss";
const hostEitherRe = /\.s?css$/;

/* Source code should always be from source; encapsulates which `glob` we use. */
const globSrc = (glob) => fs.globSync(glob, { cwd: sourceDir });

const componentCssSourceFiles = globSrc(["**/component.scss", "**/component.css"]).toSorted();
const componentCssPropertyFiles = globSrc(["**/root.scss", "**/root.css"]).toSorted();

/* Easy to forget the "utf-8" part; this ensures that we don't. */
const writeFile = (path, content) => fs.writeFileSync(path, content, { encoding: "utf8" });
const appendFile = (path, content) => fs.appendFileSync(path, content, { encoding: "utf8" });

const sassAliases = {
    "@scss": path.join(sourceDir, "scss"),
};

const sassOpts = {
    loadPaths: [path.resolve(process.cwd(), sourceDir)],
    importers: [sassAlias(sassAliases)],
    style: isProduction ? "compressed" : "expanded",
    sourceMap: !isProduction,
    silenceDeprecations: ["import", "if-function"],
};

/* ------------ Templates ---------------------------------------------------- */

function litTemplate(content) {
    return `import { css } from "lit";
//
/* This is a generated file. Do not edit directly. */
//
export const styles = css\`
${content}
\`;
//
export default styles;
`;
}
//
function dtsTemplate() {
    return `/* This is a generated file. Do not edit directly. */
//
export declare const styles: import("lit").CSSResult;
`;
}

function appendWithTemplate(component, css) {
    // Note extra space at end:
    const title = `CSS Custom Properties for ${component} `;
    // 80 chars wide; this gives room for title, terminator, and padding.
    const padding = 60 - title.length;
    return `

/* ----------- ${title} ${"-".repeat(padding)} */

${css}

`;
}

/* ------------ Helper Functions --------------------------------------------- */

function checkIsInPackageRoot() {
    if (!fs.existsSync("./package.json")) {
        console.log("This script must be run from the package root.");
        process.exit();
    }
}

function writeSourceMap(destMapPath, sourceMap) {
    if (isProduction || !sourceMap) {
        return;
    }
    const cwd = process.cwd();
    const sources = sourceMap.sources
        .map((s) => s.replace("file://", ""))
        .map((s) => s.replace(cwd, "../.."));
    writeFile(
        destMapPath,
        JSON.stringify({
            ...sourceMap,
            sources,
        })
    );
}

function deriveGlobalCssDestinationPaths() {
    const globalCssSourceFilename = path.basename(globalCssSourcePath);
    const destRoot = path.join(buildDir, globalCssSourceFilename);
    const destPath = destRoot.replace(hostEitherRe, ".css");
    const destMapPath = path.join(
        buildDir,
        globalCssSourceFilename.replace(hostEitherRe, ".css.map")
    );
    return { globalCssSourceFilename, destRoot, destPath, destMapPath };
}

function compileSass(path) {
    const { css, sourceMap } = sass.compile(path, sassOpts);
    return { compiledCss: css, sourceMap };
}

async function formatCss(css) {
    return isProduction ? css : await prettier.format(css, { ...prettierConfig, parser: "css" });
}

/* ------------ Build Steps ------------------------------------------------- */

/*
 * Build the component's CSS custom properties and append them to the global stylesheet.
 */
async function appendComponentGlobalCss(sourcePath) {
    const component = path
        .basename(path.dirname(sourcePath))
        .replace(hostEitherRe, "")
        .toUpperCase();
    const { compiledCss } = compileSass(path.join(sourceDir, sourcePath));
    const { destPath } = deriveGlobalCssDestinationPaths();
    appendFile(destPath, appendWithTemplate(component, await formatCss(compiledCss)));
}

/*
 * A component specific litCSS file is one that has been wrapped in the `css\`\`` syntax.
 */
async function buildComponentSpecificLitCss(sourcePath) {
    const { compiledCss, sourceMap } = compileSass(path.join(sourceDir, sourcePath));
    const destPath = path.join(buildDir, sourcePath).replace(hostEitherRe, ".css.js");
    const destTypeFile = path.join(buildDir, sourcePath.replace(hostEitherRe, ".css.d.ts"));
    const destMapPath = path.join(buildDir, sourcePath.replace(hostEitherRe, ".css.js.map"));
    // `content:` property values can have content with symbols that need to be escaped
    const litCss = compiledCss.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    writeFile(destPath, litTemplate(await formatCss(litCss)));
    writeFile(destTypeFile, dtsTemplate());
    writeSourceMap(destMapPath, sourceMap);
}

/*
 * The initial global css file contains the initial reset, the CSS Custom Properties, and the font
 * and icon files.  A later build step finds all of the component root files and concatenates them
 * into the global CSS.
 */
async function buildGlobalCss() {
    const { compiledCss, sourceMap } = compileSass(path.join(sourceDir, globalCssSourcePath));
    const { destPath, destMapPath } = deriveGlobalCssDestinationPaths();
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    writeFile(destPath, await formatCss(compiledCss));
    writeSourceMap(destMapPath, sourceMap);
}

/* ------------ Main --------------------------------------------------------- */

/* This script must be run from the project root folder */
checkIsInPackageRoot();

await buildGlobalCss();

for (const source of componentCssSourceFiles) {
    await buildComponentSpecificLitCss(source);
}

for (const source of componentCssPropertyFiles) {
    await appendComponentGlobalCss(source);
}
