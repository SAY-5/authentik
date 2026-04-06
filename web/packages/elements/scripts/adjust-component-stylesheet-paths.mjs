import fs from "node:fs";
import path from "node:path";

/* ------------ Config ------------------------------------------------------- */

const buildDir = "./dist";

/* Source code should always be from source; encapsulates which `glob` we use. */
const globDist = (glob) => fs.globSync(glob, { cwd: buildDir });
const readFile = (path) => fs.readFileSync(path, { encoding: "utf8" });
const writeFile = (path, content) => fs.writeFileSync(path, content, { encoding: "utf8" });

const componentFiles = globDist(["**/*.component.js"]).toSorted();

const stylingLineRe = /^(import [^ ]* from "\.\/component)\.(scss|css)";/;

/* ------------ Build Steps ------------------------------------------------- */

function checkIsInPackageRoot() {
    if (!fs.existsSync("./package.json")) {
        console.log("This script must be run from the package root.");
        process.exit();
    }
}

function adjustPaths(componentFile) {
    const componentPath = path.join(buildDir, componentFile);
    const componentSource = readFile(componentPath);
    const componentLines = componentSource.split(/\r?\n/);
    const results = componentLines.map((l) => l.replace(stylingLineRe, (_, p1) => `${p1}.css.js`));
    writeFile(componentPath, results.join("\n"));
}

/* ------------ Main --------------------------------------------------------- */

/* This script must be run from the project root folder */
checkIsInPackageRoot();

for (const source of componentFiles) {
    adjustPaths(source);
}
