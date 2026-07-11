
  # Dashboard and Document Management

  This is a code bundle for Dashboard and Document Management. The original project is available at https://www.figma.com/design/PFnb9e5JfsOqDj9SvEuRh7/Dashboard-and-Document-Management.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## RAG demo agent

  This project includes a local RAG service based on `化妆品监督管理条例_食品药品监管_中国政府网.pdf`.

  ### Demo background and product thinking

  This demo was inspired by repetitive legal and compliance review work: legal colleagues often need to read similar documents, check clauses one by one, mark risks, and suggest revisions. The goal is not to fully replace human reviewers with AI, but to wrap model capabilities into a review workspace that business users can understand, verify, and control.

  The first step was prototyping the review report in Figma. The key validation question was: if AI can highlight risk points, cite supporting evidence, and suggest revisions, would that be useful for legal reviewers? After user feedback, the prototype added a confidence indicator such as “Confidence 70%”, so reviewers can distinguish high-certainty conclusions from items that still require human confirmation.

  The implementation follows a RAG pipeline: upload document → extract text → retrieve relevant clauses from the knowledge base → ask the LLM to analyze differences → output structured JSON → display risks, evidence, suggestions, and confidence in the frontend. To make the demo more robust, the system also includes rule matching, anomaly alerts, badcase collection, and confidence-threshold routing.

  ### Key challenges and optimization strategy

  During implementation, the review Agent exposed several typical problems. The demo addresses them with both product design and engineering guardrails:

  - **Long documents exceed token limits**: Long contracts or multi-page materials lose cross-section context after chunking. The optimization is to maintain a global review context that tracks cross-chunk entities, product names, parties, key clauses, and previously detected risks, so each chunk is not judged in isolation.
  - **The model may hallucinate clauses**: When the model cannot find enough evidence in the source text or knowledge base, it may generate plausible but untraceable conclusions. The system constrains this through RAG citations, rule hits, and post-processing checks. If no similar source text or regulation evidence can be found, the item is marked as “manual confirmation required”.
  - **Output format can be unstable**: Review results must be consumed by the frontend and downstream workflows, so they need a stable data structure. The backend requires JSON output, parses the response, normalizes fields, and falls back to local rule-based review when needed. This keeps risk level, clause, evidence, suggestion, confidence, and routing fields predictable.

  The main takeaway is that an Agent is not a magic automation tool. The real value comes from a human-in-the-loop workflow: the model performs first-pass screening, summarization, citation, and suggestion; human reviewers handle low-confidence results, complex interpretation, and final decisions. Confidence, manual review, badcase feedback, and traceable evidence are what turn an AI demo into a usable product.

  ### Rule matching + anomaly alert dual-engine design

  The review workflow uses a “rule matching + anomaly alert” dual-engine design to improve compliance coverage and explainability:

  - **Rule matching engine**: Matches uploaded content against structured rules, keywords, restricted claims, mandatory labeling requirements, and knowledge-base chunks. It is best suited for deterministic checks such as prohibited terms, missing fields, format issues, and regulation-clause references.
  - **Anomaly alert engine**: Detects cases that may still be high risk even when explicit rules do not fully cover them, such as semantic inconsistency, high-risk wording, insufficient evidence, ambiguous claims, or low-confidence results.
  - **Combined decision logic**: Rule hits are treated as strong evidence, while anomaly alerts provide complementary risk signals. The final review result should show matched rules, anomaly reasons, evidence snippets, confidence score, and recommended handling action.

  ### Badcase collection

  To continuously improve review quality, the system collects badcases from human-review feedback:

  - **False positive**: The system flags a risk, but the reviewer confirms that it is compliant.
  - **False negative**: The system misses a risk that is later identified by a reviewer.
  - **Low-quality explanation**: The conclusion is directionally correct, but the evidence, citation, or reasoning is incomplete.
  - **Ambiguous case**: The result requires additional business context or regulatory interpretation.

  Recommended badcase fields:

  - Document ID / task ID
  - Original content snippet
  - System result and confidence score
  - Matched rule or anomaly reason
  - Reviewer correction
  - Final label: accepted, rejected, missed risk, unclear, or needs escalation
  - Root cause and improvement action

  Badcases can be used to refine keyword rules, update the regulation knowledge base, adjust prompt templates, calibrate confidence thresholds, and create regression test cases.

  ### Confidence threshold

  Review results are routed based on confidence score and risk severity:

  - **High confidence**: Display the conclusion and supporting evidence directly when the result is backed by clear rule hits or retrieved regulation chunks.
  - **Medium confidence**: Display the conclusion with a warning badge, but require reviewer confirmation before final approval.
  - **Low confidence**: Trigger manual review, collect the case as a potential badcase, and avoid making a final compliance decision automatically.

  Suggested default thresholds:

  - `confidence >= 0.80`: high confidence
  - `0.50 <= confidence < 0.80`: medium confidence
  - `confidence < 0.50`: low confidence / manual review required

  Thresholds should be configurable in System Settings and regularly reviewed using badcase statistics such as false positive rate, false negative rate, manual override rate, and average correction time.

  ### Operational metrics

  The dashboard tracks human-in-the-loop operating metrics in addition to risk counts:

  - **Task completion rate**: completed review tasks divided by all review tasks.
  - **Average interaction rounds**: average reviewer-Agent turns needed to close a completed task.
  - **User correction rate**: percentage of completed Agent outputs modified by users before acceptance.

  These metrics help evaluate whether the Agent is reducing review friction instead of only generating more findings.

  ### Knowledge base

  The generated vector/keyword index is stored in `knowledge-base/cosmetics-regulation.index.json`.

  Rebuild the knowledge base after replacing the PDF:

  ```bash
  npm run rag:index
  ```

  ### Large language model API

  Copy `.env.example` to `.env`, then configure an OpenAI-compatible endpoint:

  ```env
  LLM_BASE_URL=https://api.openai.com/v1
  LLM_API_KEY=your-api-key
  LLM_MODEL=gpt-4o-mini
  RAG_PORT=3001
  ```

  If `LLM_API_KEY` is not configured, the RAG service still runs with a local rule-based fallback.

  You can also configure the LLM API in the UI:

  - Open `System Settings` → `API Keys`
  - Set `LLM Base URL`, `LLM API Key`, and `LLM Model`
  - Click `Save Changes`

  The browser-saved configuration is sent to the local RAG API when a new review task is created.

  ### Chunking and vector index preview

  Open `Knowledge Base` to view:

  - PDF source and generated chunk count
  - Index build time
  - Sample regulation chunks
  - Search hits with score and matched terms
  - `Rebuild Index` action for regenerating the local knowledge index

  ### Start frontend + RAG API

  ```bash
  npm run dev
  ```

  This starts:

  - RAG API: `http://localhost:3001`
  - Vite frontend: usually `http://localhost:5173`

  Useful API endpoints:

  - `GET /api/rag/health`
  - `POST /api/rag/search`
  - `POST /api/rag/review`
  - `GET /api/rag/badcases`
  - `POST /api/rag/badcases`
  