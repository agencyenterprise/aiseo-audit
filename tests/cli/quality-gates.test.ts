import { describe, expect, it } from "vitest";
import {
  checkRegressionGate,
  checkSitemapGate,
} from "../../src/cli/quality-gates.js";
import { computeDiff } from "../../src/modules/diff/service.js";
import { makeResult, makeStages } from "../helpers/results.js";
import { makeConfig } from "../helpers/config.js";

function comparableDiff() {
  const meta = {
    version: "2.1",
    weights: makeConfig().weights,
    analysisDurationMs: 0,
  };
  return computeDiff(makeResult({ meta }), makeResult({ meta }));
}

describe("regression quality gates", () => {
  it("requires an existing comparable baseline", () => {
    expect(checkRegressionGate(null, { failOnRegression: true }).code).toBe(2);
    expect(
      checkRegressionGate(
        {
          ...comparableDiff(),
          comparison: {
            comparable: false,
            reasons: ["Weights changed"],
            warnings: [],
          },
        },
        { failOnRegression: true },
      ).code,
    ).toBe(2);
  });
  it("fails on score or query regression and permits unchanged results", () => {
    expect(
      checkRegressionGate(comparableDiff(), { failOnRegression: true }).code,
    ).toBe(0);
    expect(
      checkRegressionGate(
        { ...comparableDiff(), overallDelta: -1 },
        { failOnRegression: true },
      ).code,
    ).toBe(1);
    expect(
      checkRegressionGate(
        {
          ...comparableDiff(),
          queryDeltas: [
            {
              query: "backup",
              currentCoverage: 0,
              baselineCoverage: 1,
              delta: -1,
              regressed: true,
            },
          ],
        },
        { failOnRegression: true },
      ).code,
    ).toBe(1);
  });
  it("detects newly introduced blockers independently of total score", () => {
    const meta = {
      version: "2.1",
      weights: makeConfig().weights,
      analysisDurationMs: 0,
    };
    const baseline = makeResult({ meta, stages: makeStages() });
    const stages = makeStages();
    stages.technicalEligibility.status = "fail";
    stages.technicalEligibility.blockers = ["AI Crawler Access"];
    const current = makeResult({ meta, stages });
    const diff = computeDiff(current, baseline);
    expect(diff.newBlockers).toEqual(["AI Crawler Access"]);
    expect(checkRegressionGate(diff, { failOnNewBlocker: true }).code).toBe(1);
    expect(
      checkRegressionGate(
        { ...diff, newBlockers: [] },
        { failOnNewBlocker: true },
      ).code,
    ).toBe(0);
  });
});

describe("sitemap failure policy", () => {
  const partial = {
    succeededCount: 1,
    failedCount: 5,
    averageScore: 100,
  } as Parameters<typeof checkSitemapGate>[0];
  it("fails an incomplete audit even if the remaining pages score 100", () => {
    expect(checkSitemapGate(partial, { failUnder: 70 }).code).toBe(2);
    expect(
      checkSitemapGate(partial, { failedPages: "ignore", failUnder: 70 }).code,
    ).toBe(0);
  });
  it("never passes an audit with no successful pages", () => {
    expect(
      checkSitemapGate(
        { ...partial, succeededCount: 0 },
        { failedPages: "ignore" },
      ).code,
    ).toBe(2);
  });
});
