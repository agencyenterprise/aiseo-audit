import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readPackedFilename } from "./pack-output.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = mkdtempSync(join(tmpdir(), "aiseo-package-"));
try {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const packedFilename = readPackedFilename(
    execFileSync(
      npm,
      ["pack", "--ignore-scripts", "--json", "--pack-destination", temporary],
      { cwd: root, encoding: "utf8" },
    ),
  );
  execFileSync("tar", [
    "-xzf",
    join(temporary, packedFilename),
    "-C",
    temporary,
  ]);
  const packageRoot = join(temporary, "package");
  symlinkSync(
    resolve(root, "node_modules"),
    join(packageRoot, "node_modules"),
    process.platform === "win32" ? "junction" : "dir",
  );
  const consumerRoot = join(temporary, "consumer");
  mkdirSync(join(consumerRoot, "node_modules"), { recursive: true });
  symlinkSync(
    packageRoot,
    join(consumerRoot, "node_modules", "aiseo-audit"),
    process.platform === "win32" ? "junction" : "dir",
  );
  const require = createRequire(join(consumerRoot, "check.cjs"));
  const cjs = require("aiseo-audit");
  const html = readFileSync(
    join(root, "benchmarks/pages/documentation.html"),
    "utf8",
  );
  const options = {
    html,
    url: "https://example.com/guide",
    evaluationDate: "2026-01-01",
  };
  const config = { queries: ["backup retention"] };
  const commonJsResult = cjs.analyzeHtml(options, config);
  const esmResult = JSON.parse(
    execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        'import {analyzeHtml} from "aiseo-audit"; console.log(JSON.stringify(analyzeHtml(JSON.parse(process.env.AUDIT_OPTIONS), {queries:["backup retention"]})));',
      ],
      {
        cwd: consumerRoot,
        env: { ...process.env, AUDIT_OPTIONS: JSON.stringify(options) },
        encoding: "utf8",
      },
    ),
  );
  assert.equal(esmResult.overallScore, commonJsResult.overallScore);
  assert.deepEqual(
    esmResult.rawData.queryAlignment,
    commonJsResult.rawData.queryAlignment,
  );
  assert.ok(esmResult.rawData.queryAlignment.queries.length);
  for (const format of ["--json", "--html", "--md"]) {
    const output = execFileSync(
      process.execPath,
      [
        join(packageRoot, "bin/aiseo-audit.js"),
        "--stdin",
        "--url",
        options.url,
        "--query",
        "backup retention",
        "--evaluation-date",
        options.evaluationDate,
        format,
      ],
      { input: html, encoding: "utf8" },
    );
    assert.ok(output.length > 0);
    if (format === "--json")
      assert.equal(JSON.parse(output).overallScore, esmResult.overallScore);
  }
  console.log(
    "Packed CommonJS, ESM, query analysis, and stdin CLI checks passed.",
  );
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
