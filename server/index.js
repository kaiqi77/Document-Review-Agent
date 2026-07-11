import "dotenv/config";
import express from "express";
import cors from "cors";
import { buildKnowledgeBase, loadKnowledgeBase } from "./lib/indexer.js";
import { retrieve } from "./lib/retriever.js";
import { reviewWithRag } from "./lib/ragService.js";

const app = express();
const port = Number(process.env.RAG_PORT || process.env.PORT || 3001);
const sharePointSessions = new Map();
const badcases = [];

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/rag/health", async (_req, res) => {
  try {
    const index = await loadKnowledgeBase();
    res.json({
      ok: true,
      document: index.document,
      sampleChunks: index.chunks.slice(0, 5).map(({ terms, ...chunk }) => ({ ...chunk, termCount: terms.length })),
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/rag/reindex", async (_req, res) => {
  try {
    const index = await buildKnowledgeBase();
    res.json({ ok: true, document: index.document });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/rag/search", async (req, res) => {
  try {
    const { query, topK } = req.body || {};
    if (!query || typeof query !== "string") {
      res.status(400).json({ ok: false, error: "query is required" });
      return;
    }
    const chunks = await retrieve(query, { topK: Number(topK) || 5 });
    res.json({ ok: true, chunks });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/rag/review", async (req, res) => {
  try {
    const { taskId, fileName, fileType, pages, submitTime, content, apiConfig, reviewConfig } = req.body || {};
    if (!taskId || !fileName) {
      res.status(400).json({ ok: false, error: "taskId and fileName are required" });
      return;
    }

    const result = await reviewWithRag({
      taskId,
      fileName,
      fileType: fileType || "TXT",
      pages: Number(pages) || 1,
      submitTime: submitTime || new Date().toISOString(),
      content: content || "",
      apiConfig: sanitizeApiConfig(apiConfig),
      reviewConfig: sanitizeReviewConfig(reviewConfig),
    });

    res.json({ ok: true, result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/rag/badcases", (_req, res) => {
  res.json({ ok: true, badcases: badcases.slice().reverse() });
});

app.post("/api/rag/badcases", (req, res) => {
  const input = req.body || {};
  if (!input.taskId || !input.fileName) {
    res.status(400).json({ ok: false, error: "taskId and fileName are required" });
    return;
  }

  const badcase = {
    id: `BADCASE-${String(badcases.length + 1).padStart(4, "0")}`,
    taskId: String(input.taskId),
    fileName: String(input.fileName),
    label: typeof input.label === "string" ? input.label : "needs_escalation",
    originalSnippet: typeof input.originalSnippet === "string" ? input.originalSnippet.slice(0, 800) : "",
    systemResult: typeof input.systemResult === "string" ? input.systemResult.slice(0, 1200) : "",
    confidence: Number(input.confidence) || 0,
    matchedRuleOrAnomaly: typeof input.matchedRuleOrAnomaly === "string" ? input.matchedRuleOrAnomaly.slice(0, 800) : "",
    reviewerCorrection: typeof input.reviewerCorrection === "string" ? input.reviewerCorrection.slice(0, 1200) : "",
    rootCause: typeof input.rootCause === "string" ? input.rootCause.slice(0, 800) : "",
    createdAt: new Date().toISOString(),
  };

  badcases.push(badcase);
  res.json({ ok: true, badcase });
});

app.post("/api/sharepoint/connect", async (req, res) => {
  try {
    const connection = sanitizeSharePointConnection(req.body || {});
    if (!connection.siteUrl) {
      res.status(400).json({ ok: false, connected: false, error: "siteUrl is required" });
      return;
    }

    const key = sharePointKey(connection);
    const now = Date.now();
    sharePointSessions.set(key, {
      connection,
      createdAt: now,
      demoFiles: buildDemoSharePointFiles(connection, now),
    });

    res.json({
      ok: true,
      connected: true,
      cursor: String(now),
      files: [],
      message: `Connected to ${connection.libraryName}${connection.folderPath ? `:${connection.folderPath}` : ""}. Monitoring is active.`,
    });
  } catch (error) {
    res.status(500).json({ ok: false, connected: false, error: error.message });
  }
});

app.post("/api/sharepoint/changes", async (req, res) => {
  try {
    const connection = sanitizeSharePointConnection(req.body || {});
    if (!connection.siteUrl) {
      res.status(400).json({ ok: false, connected: false, error: "siteUrl is required" });
      return;
    }

    const key = sharePointKey(connection);
    const now = Date.now();
    const session = sharePointSessions.get(key) || {
      connection,
      createdAt: now,
      demoFiles: buildDemoSharePointFiles(connection, now),
    };
    sharePointSessions.set(key, session);

    const since = Number(req.body?.cursor) || session.createdAt;
    const files = session.demoFiles
      .filter((file) => file.uploadedAtMs > since && file.uploadedAtMs <= now)
      .map(({ uploadedAtMs, ...file }) => file);

    res.json({
      ok: true,
      connected: true,
      cursor: String(now),
      files,
      message: files.length ? `${files.length} new SharePoint upload(s) detected.` : "No new SharePoint uploads detected.",
    });
  } catch (error) {
    res.status(500).json({ ok: false, connected: false, error: error.message });
  }
});

app.listen(port, async () => {
  const index = await loadKnowledgeBase();
  console.log(`[rag] API server listening on http://localhost:${port}`);
  console.log(`[rag] Loaded ${index.document.chunkCount} chunks from ${index.document.sourceFile}`);
});

function sanitizeApiConfig(apiConfig) {
  if (!apiConfig || typeof apiConfig !== "object") return undefined;
  return {
    baseUrl: typeof apiConfig.baseUrl === "string" ? apiConfig.baseUrl : undefined,
    apiKey: typeof apiConfig.apiKey === "string" ? apiConfig.apiKey : undefined,
    model: typeof apiConfig.model === "string" ? apiConfig.model : undefined,
  };
}

function sanitizeReviewConfig(reviewConfig) {
  if (!reviewConfig || typeof reviewConfig !== "object") return undefined;
  return {
    highConfidence: clamp01(Number(reviewConfig.highConfidence)),
    mediumConfidence: clamp01(Number(reviewConfig.mediumConfidence)),
    ruleEngineEnabled: reviewConfig.ruleEngineEnabled !== false,
    anomalyEngineEnabled: reviewConfig.anomalyEngineEnabled !== false,
    badcaseCollectionEnabled: reviewConfig.badcaseCollectionEnabled !== false,
  };
}

function clamp01(value) {
  if (!Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(1, value));
}

function sanitizeSharePointConnection(input) {
  return {
    siteUrl: typeof input.siteUrl === "string" ? input.siteUrl.trim() : "",
    libraryName: typeof input.libraryName === "string" && input.libraryName.trim() ? input.libraryName.trim() : "Documents",
    folderPath: typeof input.folderPath === "string" && input.folderPath.trim() ? input.folderPath.trim() : "/",
    pollSeconds: Math.max(5, Number(input.pollSeconds) || 8),
  };
}

function sharePointKey(connection) {
  return [connection.siteUrl, connection.libraryName, connection.folderPath].join("|").toLowerCase();
}

function buildDemoSharePointFiles(connection, startTime) {
  const folderUrl = `${connection.siteUrl.replace(/\/$/, "")}/${connection.libraryName}/${connection.folderPath.replace(/^\//, "")}`;
  return [
    {
      id: `${sharePointKey(connection)}|cosmetic-label-review.pdf|${startTime}`,
      name: "Cosmetic_Label_Claims_Review.pdf",
      size: "1.8 MB",
      type: "pdf",
      uploadedBy: "sharepoint.user@contoso.com",
      uploadedAt: new Date(startTime + 2500).toLocaleString(),
      uploadedAtMs: startTime + 2500,
      sourceUrl: `${folderUrl}/Cosmetic_Label_Claims_Review.pdf`,
    },
    {
      id: `${sharePointKey(connection)}|supplier-formula-declaration.docx|${startTime}`,
      name: "Supplier_Formula_Declaration.docx",
      size: "940 KB",
      type: "docx",
      uploadedBy: "supplier.portal@contoso.com",
      uploadedAt: new Date(startTime + 14000).toLocaleString(),
      uploadedAtMs: startTime + 14000,
      sourceUrl: `${folderUrl}/Supplier_Formula_Declaration.docx`,
    },
  ];
}
