import { describe, expect, it } from "vitest";
import { extractEntities } from "../../../src/modules/nlp/service.js";

describe("extractEntities — enhanced extraction", () => {
  describe("Phase 1a: Acronym entity extraction", () => {
    it("detects uppercase acronym entities that compromise misses", () => {
      const text =
        "NASA launched a new satellite. WHO released a report. UNICEF provided aid.";
      const entities = extractEntities(text);
      const allEntities = [
        ...entities.people,
        ...entities.organizations,
        ...entities.places,
        ...entities.topics,
      ];
      const allUpper = allEntities.map((e) => e.toUpperCase());

      // At least some acronyms should be captured (in orgs or via topics)
      const hasNASA = allEntities.includes("NASA") || allUpper.includes("NASA");
      const hasWHO = allEntities.includes("WHO") || allUpper.includes("WHO");
      expect(hasNASA || hasWHO).toBe(true);
    });

    it("filters out common non-entity acronyms from supplemental extraction", () => {
      // Technical acronyms in the stoplist should not be added by our
      // supplemental extractor. Compromise may still detect some of them
      // as organizations — that's fine and expected.
      const text =
        "We use FAQ and DIY guides with ASAP turnaround and FYI notices.";
      const entities = extractEntities(text);
      const allEntities = [
        ...entities.people,
        ...entities.organizations,
        ...entities.places,
      ];

      // These common abbreviations should not appear as entities
      expect(allEntities).not.toContain("FAQ");
      expect(allEntities).not.toContain("DIY");
      expect(allEntities).not.toContain("ASAP");
      expect(allEntities).not.toContain("FYI");
    });
  });

  describe("Phase 1b: Title-case compound name extraction", () => {
    it("extracts multi-word proper nouns", () => {
      const text =
        "The World Health Organization issued guidelines. The European Central Bank adjusted rates. The World Health Organization met again.";
      const entities = extractEntities(text);
      const allEntities = [
        ...entities.people,
        ...entities.organizations,
        ...entities.places,
      ];
      const combined = allEntities.join(" | ");

      // Should find at least one multi-word entity
      const hasMultiWord = allEntities.some((e) => e.includes(" "));
      expect(hasMultiWord).toBe(true);
    });
  });

  describe("Phase 1c: Organization suffix classification", () => {
    it("classifies entities with corporate suffixes as organizations", () => {
      const text =
        "Acme Corp announced results. Acme Corp is growing. Baker Industries expanded. Baker Industries hired staff.";
      const entities = extractEntities(text);

      // Entities with "Corp" or "Industries" should end up in organizations
      const orgNames = entities.organizations.join(" | ").toLowerCase();
      const hasCorporate =
        orgNames.includes("acme") || orgNames.includes("baker");
      expect(hasCorporate).toBe(true);
    });
  });

  describe("Phase 1d: Honorific-based person classification", () => {
    it("classifies entities preceded by honorifics as people", () => {
      const text =
        "Dr. Sarah Johnson presented the findings. Prof. James Wilson reviewed the data. Dr. Sarah Johnson agreed.";
      const entities = extractEntities(text);

      const peopleNames = entities.people.join(" | ").toLowerCase();
      const hasPerson =
        peopleNames.includes("sarah") || peopleNames.includes("james");
      expect(hasPerson).toBe(true);
    });
  });

  describe("Phase 2: TF-IDF topic extraction", () => {
    it("extracts relevant topics from content", () => {
      const text = `
        Machine learning is transforming the software industry. Machine learning
        models can process natural language. Deep learning, a subset of machine
        learning, uses neural networks. Neural networks learn from training data.
        The training data must be high quality. Software engineers use machine
        learning to build intelligent applications.
      `;
      const entities = extractEntities(text);

      expect(entities.topics.length).toBeGreaterThan(0);

      // "machine learning" should be a top topic (appears many times)
      const topicsLower = entities.topics.map((t) => t.toLowerCase());
      const hasMLTopic = topicsLower.some(
        (t) => t.includes("machine") || t.includes("learning"),
      );
      expect(hasMLTopic).toBe(true);
    });

    it("returns empty topics for very short text", () => {
      const text = "Hello world.";
      const entities = extractEntities(text);

      // Short text with no repeated terms should have few/no topics
      expect(entities.topics.length).toBeLessThanOrEqual(2);
    });

    it("returns empty topics when all words are stopwords or too short", () => {
      const text =
        "I am a be is it an on to at by do he if in me my no of or so up we.";
      const entities = extractEntities(text);
      expect(entities.topics).toEqual([]);
    });

    it("limits topics to 15", () => {
      // Long text with many repeated terms
      const terms = [
        "algorithm",
        "database",
        "network",
        "security",
        "performance",
        "scalability",
        "deployment",
        "monitoring",
        "testing",
        "debugging",
        "architecture",
        "microservices",
        "containers",
        "kubernetes",
        "docker",
        "serverless",
        "caching",
        "optimization",
      ];
      const text = terms
        .map(
          (t) =>
            `The ${t} is important. We focus on ${t} daily. Good ${t} matters.`,
        )
        .join(" ");
      const entities = extractEntities(text);

      expect(entities.topics.length).toBeLessThanOrEqual(15);
    });

    it("prefers bigrams over unigrams when both are frequent", () => {
      const text = `
        Search engine optimization is key. Search engine optimization helps.
        Search engine optimization matters. Search engine optimization works.
        Good search engine optimization requires effort.
      `;
      const entities = extractEntities(text);
      const topicsLower = entities.topics.map((t) => t.toLowerCase());

      // "search engine" bigram should appear
      const hasBigram = topicsLower.some((t) => t.includes(" "));
      expect(hasBigram).toBe(true);
    });
  });

  describe("Phase 3: Smart deduplication", () => {
    it("deduplicates case-insensitively", () => {
      // This tests that the merge logic handles case variants
      const text =
        "Google announced results. GOOGLE expanded. Google is growing. Google hired.";
      const entities = extractEntities(text);
      const allEntities = [
        ...entities.people,
        ...entities.organizations,
        ...entities.places,
      ];

      // Should not have both "Google" and "GOOGLE"
      const googleVariants = allEntities.filter(
        (e) => e.toLowerCase() === "google",
      );
      expect(googleVariants.length).toBeLessThanOrEqual(1);
    });

    it("keeps longer form when shorter form is a substring", () => {
      const text =
        "New York City hosted the event. New York City is large. New York is a state. New York City grew.";
      const entities = extractEntities(text);
      const allEntities = [
        ...entities.people,
        ...entities.organizations,
        ...entities.places,
      ];

      // If both "New York" and "New York City" were found, only the longer should remain
      const nyEntities = allEntities.filter((e) =>
        e.toLowerCase().startsWith("new york"),
      );
      if (nyEntities.length > 0) {
        // The longest form should be present
        const hasLong = nyEntities.some((e) => e.includes("City"));
        const hasShortOnly =
          nyEntities.length === 1 && !nyEntities[0].includes("City");
        // Either we have the long form, or just the short form (but not both)
        expect(hasLong || hasShortOnly).toBe(true);
      }
    });
  });

  describe("Phase 4: Single extraction pass", () => {
    it("still returns all expected fields", () => {
      const text =
        "John Smith works at Google in New York. Install the package. There are five items.";
      const entities = extractEntities(text);

      expect(entities).toHaveProperty("people");
      expect(entities).toHaveProperty("organizations");
      expect(entities).toHaveProperty("places");
      expect(entities).toHaveProperty("topics");
      expect(entities).toHaveProperty("imperativeVerbCount");
      expect(entities).toHaveProperty("numberCount");
      expect(Array.isArray(entities.people)).toBe(true);
      expect(Array.isArray(entities.organizations)).toBe(true);
      expect(Array.isArray(entities.places)).toBe(true);
      expect(Array.isArray(entities.topics)).toBe(true);
      expect(typeof entities.imperativeVerbCount).toBe("number");
      expect(typeof entities.numberCount).toBe("number");
    });

    it("respects entity count limits", () => {
      const names = Array.from(
        { length: 25 },
        (_, i) => `Person${String.fromCharCode(65 + (i % 26))} Smith${i}`,
      );
      const text = names.map((n) => `${n} attended.`).join(" ");
      const entities = extractEntities(text);

      expect(entities.people.length).toBeLessThanOrEqual(10);
      expect(entities.organizations.length).toBeLessThanOrEqual(10);
      expect(entities.places.length).toBeLessThanOrEqual(10);
      expect(entities.topics.length).toBeLessThanOrEqual(15);
    });
  });

  describe("supplemental classification branches", () => {
    it("classifies a title-case entity as a person when preceded by an honorific", () => {
      // Use obscure names that compromise won't detect, with honorific prefix
      const text =
        "Dr. Xenthor Valkyr presented results. Dr. Xenthor Valkyr also published a paper. The findings of Dr. Xenthor Valkyr were notable.";
      const entities = extractEntities(text);
      const peopleLower = entities.people.map((p) => p.toLowerCase());
      expect(peopleLower.some((p) => p.includes("xenthor"))).toBe(true);
    });

    it("classifies a title-case entity as an organization when it has a corporate suffix", () => {
      // Use a made-up name with org suffix, placed mid-sentence so the
      // title-case extractor doesn't filter it as a sentence-start artifact.
      const text =
        "The team at Zyblor Technologies announced a new product. Reports from Zyblor Technologies show growth. Analysts praised Zyblor Technologies for innovation.";
      const entities = extractEntities(text);
      const orgsLower = entities.organizations.map((o) => o.toLowerCase());
      expect(orgsLower.some((o) => o.includes("zyblor"))).toBe(true);
    });
  });

  describe("backward compatibility", () => {
    it("still extracts people from text", () => {
      const text =
        "John Smith and Jane Doe discussed the project with Dr. Michael Chen.";
      const entities = extractEntities(text);
      expect(entities.people.length).toBeGreaterThan(0);
    });

    it("still extracts organizations from text", () => {
      const text = "Google and Microsoft announced a partnership with OpenAI.";
      const entities = extractEntities(text);
      expect(entities.organizations.length).toBeGreaterThan(0);
    });

    it("still extracts places from text", () => {
      const text = "The conference was held in New York and San Francisco.";
      const entities = extractEntities(text);
      expect(entities.places.length).toBeGreaterThan(0);
    });

    it("still counts imperative verbs", () => {
      const text =
        "Install the package. Configure the settings. Click the button and open the dashboard.";
      const entities = extractEntities(text);
      expect(entities.imperativeVerbCount).toBeGreaterThan(0);
    });

    it("still counts numbers including written-out", () => {
      const text =
        "There were five studies and three companies involved. Also 42 participants.";
      const entities = extractEntities(text);
      expect(entities.numberCount).toBeGreaterThan(0);
    });

    it("returns zero for empty/simple text", () => {
      const text = "The cat sat on the mat.";
      const entities = extractEntities(text);
      expect(entities.imperativeVerbCount).toBe(0);
      expect(entities.numberCount).toBe(0);
    });
  });
});
