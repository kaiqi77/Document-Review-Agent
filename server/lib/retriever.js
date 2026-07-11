import { extractTerms, loadKnowledgeBase } from "./indexer.js";

export async function retrieve(query, options = {}) {
  const topK = options.topK || 5;
  const index = await loadKnowledgeBase();
  const queryTerms = extractTerms(query);
  const termSet = new Set(queryTerms);

  const scored = index.chunks.map((chunk) => {
    let score = 0;
    const matchedTerms = [];
    for (const term of chunk.terms) {
      if (termSet.has(term)) {
        score += term.length >= 4 ? 3 : 1;
        matchedTerms.push(term);
      }
    }

    const direct = queryTerms.filter((term) => chunk.text.includes(term) || chunk.title.includes(term));
    score += direct.length * 2;

    return { ...chunk, score, matchedTerms: [...new Set([...matchedTerms, ...direct])].slice(0, 12) };
  });

  return scored
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ terms, ...chunk }) => chunk);
}

export function buildContext(chunks) {
  return chunks.map((chunk, index) => (
    `[${index + 1}] ${chunk.article} / ${chunk.id}\n${chunk.text}`
  )).join("\n\n");
}
