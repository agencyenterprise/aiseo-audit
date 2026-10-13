import { describe, expect, it } from "vitest";
import { readPackedFilename } from "../../scripts/pack-output.mjs";

describe("npm pack output compatibility", () => {
  const filename = "aiseo-audit-2.1.0.tgz";

  it("reads the npm 11 array format", () => {
    const output = JSON.stringify([{ name: "aiseo-audit", filename }]);
    expect(readPackedFilename(output)).toBe(filename);
  });

  it("reads the npm 12 object keyed by package name", () => {
    const output = JSON.stringify({
      "aiseo-audit": { name: "aiseo-audit", filename },
    });
    expect(readPackedFilename(output)).toBe(filename);
  });

  it.each([[], {}, null, [{ filename: "" }], [{ name: "aiseo-audit" }]])(
    "reports unusable output clearly: %j",
    (result) => {
      expect(() => readPackedFilename(JSON.stringify(result))).toThrow(
        "npm pack did not return exactly one package with a filename.",
      );
    },
  );

  it("rejects multiple packages instead of testing an arbitrary one", () => {
    const output = JSON.stringify({
      first: { filename: "first.tgz" },
      second: { filename: "second.tgz" },
    });
    expect(() => readPackedFilename(output)).toThrow(
      "npm pack did not return exactly one package with a filename.",
    );
  });
});
