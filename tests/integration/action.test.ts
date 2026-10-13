import { execFileSync } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("GitHub Action argument forwarding", () => {
  it("passes file, baseline, date, and regression inputs without shell expansion", async () => {
    const directory = await mkdtemp(join(tmpdir(), "aiseo-action-"));
    try {
      const action = await readFile(
        new URL("../../action.yml", import.meta.url),
        "utf8",
      );
      const script = action
        .split("      run: |\n")[1]
        .split("\n    - name:")[0]
        .replace(/^        /gm, "");
      await writeFile(join(directory, "run.sh"), script);
      await writeFile(
        join(directory, "npx"),
        '#!/bin/bash\nprintf "%s\\0" "$@" > "$CAPTURE_PATH"\nprintf \'{"overallScore":75,"grade":"C"}\' > aiseo-result.json\n',
      );
      await chmod(join(directory, "npx"), 0o755);
      execFileSync("bash", [join(directory, "run.sh")], {
        cwd: directory,
        env: {
          ...process.env,
          PATH: `${directory}:${process.env.PATH}`,
          CAPTURE_PATH: join(directory, "args"),
          GITHUB_OUTPUT: join(directory, "outputs"),
          INPUT_URL: "https://example.com/guide",
          INPUT_VERSION: "2.1.0",
          INPUT_FILE: "build output/$(do-not-run).html",
          INPUT_BASELINE: "baseline report.json",
          INPUT_EVALUATION_DATE: "2026-01-01",
          INPUT_FAIL_ON_REGRESSION: "true",
          INPUT_FAIL_ON_NEW_BLOCKER: "true",
        },
      });
      const args = (await readFile(join(directory, "args"), "utf8"))
        .split("\0")
        .filter(Boolean);
      expect(args).toEqual([
        "--yes",
        "aiseo-audit@2.1.0",
        "https://example.com/guide",
        "--file",
        "build output/$(do-not-run).html",
        "--baseline",
        "baseline report.json",
        "--fail-on-regression",
        "--fail-on-new-blocker",
        "--evaluation-date",
        "2026-01-01",
        "--json",
        "--out",
        "aiseo-result.json",
      ]);
      expect(await readFile(join(directory, "outputs"), "utf8")).toContain(
        "score=75",
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
