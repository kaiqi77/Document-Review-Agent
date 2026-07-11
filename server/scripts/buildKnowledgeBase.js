import { buildKnowledgeBase } from "../lib/indexer.js";

const index = await buildKnowledgeBase();
console.log(`Built knowledge base: ${index.document.chunkCount} chunks`);
console.log(`Source: ${index.document.sourceFile}`);
