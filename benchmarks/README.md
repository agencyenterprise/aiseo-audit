# Annotated audit benchmark

This MIT-licensed, synthetic corpus is a reproducible regression benchmark for
specific findings. It contains eight pages: documentation, a product with a price,
a product without a price, technical writing, Spanish, Japanese, keyword padding,
and off-topic padding with canned answer phrases.

Run `npm run benchmark`. The command builds the package and prints a JSON report
with each annotation, observed outcome, finding precision and recall, and total
applicability matches. It exits nonzero if an annotated expectation changes.
The same corpus runs in the ordinary test suite.

`corpus.json` records each page's identity, queries, optional domain, evaluation date,
rule ID, expected result, and a plain-language rationale. Labels mean:

- `issue`: the rule should produce a warning or error.
- `clear`: the rule should be scored without a warning or error.
- `unscored`: the rule does not apply or is an unscored diagnostic.

Precision and recall use only the explicitly labeled issue/clear decisions. Applicability
is checked separately through the total matched annotations. Unlabeled findings are
not counted as correct. Missing rules fail their annotation. This small corpus does not
establish overall accuracy, human usefulness, citation probability, or ranking effects.

The padded examples test specific failure modes: excessive repetition and off-topic
query coverage. They do not establish resistance to every form of score gaming.
Technical writing is checked for false positives on short sentences and explicit topic
coverage; it is not required to attain a high composite grade.

## Contribute a case

1. Add a self-contained, synthetic or compatibly licensed HTML fixture under `pages`.
2. Add its provenance/license if it is not original synthetic content.
3. Choose a URL, relevant queries, and only the rules you can label independently.
4. Give every label a rationale based on observable page content, not the current score.
5. Run the benchmark and inspect disagreements before changing a label or a rule.
6. Include counterexamples and unsupported-language cases when proposing a new heuristic.

Keep fixtures small, avoid live network dependencies, and avoid fitting thresholds to
these eight pages. Expand the corpus with independent contributors before making
population-level accuracy claims. Actual engine outcome calibration remains separate
research described in [Future phases](../docs/FUTURE_PHASES.md).
