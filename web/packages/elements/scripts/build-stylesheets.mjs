import fs from "node:fs";
import path from "node:path";

import prettierConfig from "@goauthentik/prettier-config";

import { globSync } from "glob";
import * as prettier from "prettier";
import * as sass from "sass";
import { create as sassAlias } from "sass-alias";

const SOURCE_DIR = "./src";
const BUILD_DIR = "./dist";

const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";

const writeFile = (path, content) => fs.writeFileSync(path, content, { encoding: "utf8" });
const globSrc = (glob) => globSync(glob, { cwd: SOURCE_DIR });

function checkIsInPackageRoot() {
    if (!fs.existsSync("./package.json")) {
        console.log("This script must be run from the package root.");
        process.exit();
    }
}

const sassAliases = {
    "@scss": path.join(SOURCE_DIR, "scss"),
};

const SASS_OPTS = {
    loadPaths: [path.resolve(process.cwd(), SOURCE_DIR)],
    importers: [sassAlias(sassAliases)],
    style: isProduction ? "compressed" : "expanded",
    sourceMap: !isProduction,
    silenceDeprecations: ["import", "if-function"],
};

// This script, which must be run from the project root folder, copies or processes the files that shoud be
// left *as CSS* in the target folder.
checkIsInPackageRoot();

const SOURCE_FILES = globSrc(["**/*.scss", "**/*.css"]);

const hostEitherRe = /\.s?css$/;

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
async function transformSrc(source) {
    const sourcePath = path.join(SOURCE_DIR, source);
    const compiled = sass.compile(sourcePath, SASS_OPTS);
    const destPath = path.join(BUILD_DIR, source.replace(hostEitherRe, ".css"));
    const destMapPath = path.join(BUILD_DIR, source.replace(hostEitherRe, ".css.map"));
    const { css, sourceMap } = compiled;

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    writeFile(
        destPath,
        isProduction ? css : await prettier.format(css, { ...prettierConfig, parser: "css" })
    );

    // @ts-expect-error There's a type-disconnect between verions of source-map.
    writeSourceMap(destMapPath, sourceMap);
}

for (const source of SOURCE_FILES) {
    await transformSrc(source);
}
