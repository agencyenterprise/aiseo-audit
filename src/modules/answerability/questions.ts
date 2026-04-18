const INTERROGATIVES =
  "what|how|why|when|where|who|whom|whose|which|can|could|should|would|will|is|are|was|were|am|do|does|did|has|have|had|may|might|must";

const MAX_QUESTION_LENGTH = 160;

const interrogativeLedSentenceEndingInQuestionMark = new RegExp(
  `\\b(?:${INTERROGATIVES})\\b[^.!?\\n]{1,${MAX_QUESTION_LENGTH}}?\\?`,
  "gi",
);

export function extractQuestions(text: string): string[] {
  const matches =
    text.match(interrogativeLedSentenceEndingInQuestionMark) ?? [];
  return matches.map(normalizeWhitespace).filter(isWithinQuestionLengthRange);
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function isWithinQuestionLengthRange(text: string): boolean {
  return text.length >= 5 && text.length <= MAX_QUESTION_LENGTH;
}
