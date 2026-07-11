import { mkdir, readFile, writeFile } from "node:fs/promises";
import { PDFParse } from "pdf-parse";
import { indexPath, knowledgeDir, sourcePdfPath } from "./paths.js";

const STOPWORDS = new Set([
  "的", "了", "和", "及", "与", "或", "在", "对", "为", "应", "应当", "可以", "不得", "有关", "规定", "进行", "其", "该", "本", "由", "向", "并", "等", "中", "上", "下",
]);

export async function buildKnowledgeBase() {
  await mkdir(knowledgeDir, { recursive: true });
  const pdfBuffer = await readFile(sourcePdfPath);
  const parser = new PDFParse({ data: pdfBuffer });
  const parsed = await parser.getText();
  await parser.destroy();

  const cleaned = normalizeText(parsed.text);
  const articleChunks = splitByArticle(cleaned);
  const chunks = articleChunks.flatMap((article, articleIndex) => chunkArticle(article, articleIndex + 1));
  const index = {
    document: {
      title: "化妆品监督管理条例",
      source: "中国政府网 / 食品药品监管",
      sourceFile: "化妆品监督管理条例_食品药品监管_中国政府网.pdf",
      builtAt: new Date().toISOString(),
      chunkCount: chunks.length,
    },
    chunks: chunks.map((chunk) => ({
      ...chunk,
      terms: extractTerms(`${chunk.title} ${chunk.text}`),
    })),
  };

  await writeFile(indexPath, JSON.stringify(index, null, 2), "utf8");
  return index;
}

export async function loadKnowledgeBase() {
  try {
    return JSON.parse(await readFile(indexPath, "utf8"));
  } catch {
    return buildKnowledgeBase();
  }
}

function normalizeText(text) {
  return text
    .replace(/\r/g, "\n")
    .replace(/2026\/6\/15[^\n]*\n/g, "\n")
    .replace(/https?:\/\/[^\s]+/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .replace(/[⻝⽹⽉⽇⼀⼆⼗⽣⽤⽬⼈⺠]/g, (char) => ({
      "⻝": "食", "⽹": "网", "⽉": "月", "⽇": "日", "⼀": "一", "⼆": "二", "⼗": "十", "⽣": "生", "⽤": "用", "⽬": "目", "⼈": "人", "⺠": "民",
    })[char] || char)
    .trim();
}

function splitByArticle(text) {
  const start = text.indexOf("第一条");
  const body = start >= 0 ? text.slice(start) : text;
  const matches = [...body.matchAll(/第[一二三四五六七八九十百零〇]+条/g)];
  if (matches.length === 0) return [body];

  return matches.map((match, index) => {
    const next = matches[index + 1];
    return body.slice(match.index, next?.index).trim();
  }).filter(Boolean);
}

function chunkArticle(article, articleIndex) {
  const title = article.match(/^第[一二三四五六七八九十百零〇]+条/)?.[0] || `法规片段 ${articleIndex}`;
  if (article.length <= 900) {
    return [{ id: `COS-${String(articleIndex).padStart(3, "0")}-01`, article: title, title, text: article }];
  }

  const sentences = article.split(/(?<=[。；])/).filter(Boolean);
  const chunks = [];
  let current = "";
  for (const sentence of sentences) {
    if (current.length + sentence.length > 900 && current) {
      chunks.push(current);
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current) chunks.push(current);

  return chunks.map((text, index) => ({
    id: `COS-${String(articleIndex).padStart(3, "0")}-${String(index + 1).padStart(2, "0")}`,
    article: title,
    title: index === 0 ? title : `${title}（续 ${index}）`,
    text,
  }));
}

export function extractTerms(text) {
  const normalized = text.toLowerCase();
  const latinTerms = normalized.match(/[a-z0-9_\-]{2,}/g) || [];
  const chineseTerms = normalized.match(/[\u4e00-\u9fff]{2,}/g) || [];
  const terms = [];

  for (const term of [...latinTerms, ...chineseTerms]) {
    if (!STOPWORDS.has(term)) terms.push(term);
    if (/^[\u4e00-\u9fff]+$/.test(term)) {
      for (let size of [2, 3, 4]) {
        for (let i = 0; i <= term.length - size; i += 1) {
          const token = term.slice(i, i + size);
          if (!STOPWORDS.has(token)) terms.push(token);
        }
      }
    }
  }

  return [...new Set(terms)];
}
