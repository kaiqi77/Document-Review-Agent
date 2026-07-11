# Automated Document Review Agent

## Table of Contents

- [Overview](#overview)
- [Product Requirements](#product-requirements)
- [User Needs](#user-needs)
- [Scenario Analysis](#scenario-analysis)
- [Use Cases](#use-cases)
- [Full Process Design](#full-process-design)
  - [User Scenario Analysis](#user-scenario-analysis)
  - [Interaction Flow](#interaction-flow)
  - [Functional Mechanisms](#functional-mechanisms)
- [Performance Evaluation](#performance-evaluation)
- [Core Value](#core-value)
- [Future Enhancements](#future-enhancements)
- [Setup](#setup)
- [Running the Project](#running-the-project)
- [Scripts](#scripts)
- [RAG Demo Agent](#rag-demo-agent)
- [LLM Configuration](#llm-configuration)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Notes](#notes)
- [Appendix: UI Pages and Copy](#appendix-ui-pages-and-copy)

## Overview

- Modern Vite + React front-end interface
- Local RAG service for document retrieval and Q&A
- Document upload, task tracking, result display, and knowledge base search
- Configurable LLM API settings in the system UI
- Knowledge base demo based on `化妆品监督管理条例_食品药品监管_中国政府网.pdf`

## Product Requirements

- Provide a unified platform for compliance review and document management
- Offer a fast workflow from document upload to audit result analysis
- Support local knowledge retrieval without requiring model retraining
- Allow users to configure custom LLM API endpoints
- Deliver a demo-ready RAG pipeline using regulatory documents

## User Needs

- Quickly create and manage compliance review tasks to reduce manual paperwork
- Automatically match regulatory requirements with business documents to improve risk detection accuracy
- View and track task status, review outcomes, and knowledge base results in one place
- Use local knowledge retrieval and Q&A capabilities without additional model training
- Connect enterprise-grade LLM services through customizable settings

## Scenario Analysis

- Compliance Review: compliance teams need to match regulations, standards, and document content quickly and accurately
- Document Management: QA, audit, legal, and compliance teams need a centralized task and result management solution
- Knowledge Lookup: when regulations change, users need to retrieve relevant historical documentation and regulatory requirements
- Product Evaluation: product teams can evaluate whether new documents meet regulatory requirements via the local RAG service

## Use Cases

1. Create a new review task
   - Upload PDF, Word, TXT, or email text
   - Automatically generate a compliance review task
   - Review task status and audit results in the dashboard

2. View task list
   - Display task ID, file name, submission time, status, and actions
   - Support detail view and report export

3. Analyze review results
   - Show file metadata, compliance findings, and detected risk details
   - Provide risk labels like High Risk, Normal Risk, and Compliant

4. Manage knowledge base
   - Upload regulatory documents and sync vector index
   - Search policy clauses and supporting text via local RAG
   - Regenerate the knowledge index after rule or document updates

## Full Process Design

This section details the end‑to‑end design, covering how user scenarios translate into a concrete interaction flow and how the underlying functional mechanisms (rule engine + RAG knowledge base) power the entire review process.

### User Scenario Analysis

Based on the scenarios identified above, we abstract four primary user personas and their goals:

- **Compliance Officer** – needs to quickly verify that new product documents or marketing materials comply with the latest regulations. They value accuracy, traceability, and audit trails.
- **QA / Auditor** – requires batch processing of multiple documents, clear risk flags, and exportable reports for internal or external audits.
- **Legal Counsel** – frequently searches historical regulatory texts to interpret clauses; they need precise retrieval and citation of original sources.
- **Product Manager** – wants to understand whether a draft specification meets regulatory standards before investing in development; they need fast feedback and actionable insights.

These personas drive the design of a streamlined, role‑agnostic workflow that minimises clicks while maximising transparency.

### Visual Workflow & Interaction Diagrams

To better illustrate the system's internal logic and user-system handshakes, below are the core architectural and sequential diagrams.

#### 1. System Architecture Workflow (Overall Pipeline)
This diagram outlines the high-level data flow from document ingestion to report generation.

![alt text](<System Architecture Workflow.png>)

### Interaction Flow

The system implements a four‑stage pipeline, each corresponding to a distinct user action and system response:

![alt text](<User-System Interaction Sequence.png>)

1. **Upload (Document Ingestion)**
   - **User Action**: Navigate to the `Document Upload` page, select one or multiple files (PDF, Word, TXT, or paste email text), and optionally add a task name or description.
   - **System Response**:
     - Validates file format and size.
     - Extracts raw text content using appropriate parsers.
     - Creates a new review task record with status `Processing` and stores the document in a temporary workspace.
     - Returns a task ID and immediately transitions to the next stage.

2. **Automatic Review (Compliance Checking)**
   - **User Action**: No direct intervention – the system automatically starts the review pipeline upon successful upload.
   - **System Response**:
     - **Rule Engine**: Applies a predefined set of compliance rules (keyword patterns, forbidden terms, threshold checks) to perform a fast, deterministic scan. This generates an initial risk map and flags obvious violations.
     - **RAG Knowledge Base**: For ambiguous or complex clauses, the system performs semantic retrieval against the indexed regulatory documents (e.g., the cosmetics regulation). Retrieved passages are combined with the document context to form a prompt for the LLM (if configured) to generate a reasoned judgement.
     - Both results are aggregated, normalised, and persisted with the task record. The status is updated to `Completed` or `Risk Detected` based on findings.

3. **Exception Alert (Risk Notification)**
   - **User Action**: Depending on the configured notification preference, users may receive an in‑app popup, an email, or see a dashboard alert.
   - **System Response**:
     - When the review identifies high‑severity risks, a `Risk Alert Popup` appears (in the UI) with a summary of non‑compliant content.
     - The dashboard’s metrics and the task list reflect the risk status (e.g., red badge for high risk).
     - Users can click `View Details` to jump directly to the detailed result page or `Later` to dismiss the alert (the alert remains accessible from the task list).

4. **Report Export (Audit & Documentation)**
   - **User Action**: From the `Result Detail` page or the task list, click the `Export Report` button.
   - **System Response**:
     - Generates a structured report (PDF or DOCX) that includes:
       - File metadata (name, upload time, task ID)
       - Compliance check results (passed/failed items)
       - Detailed risk items with severity labels, relevant clauses from the knowledge base, and the system’s reasoning (if LLM was used)
       - A summary of action items or recommended corrections
     - The report is downloaded to the user’s local machine and can be shared or archived.

This linear flow ensures that every review follows the same rigorous process, while allowing users to intervene at key decision points (e.g., viewing alerts or exporting reports).

### Functional Mechanisms

The system’s intelligence relies on two complementary engines that work in tandem:

![alt text](<Functional Mechanism.png>)

- **Rule Engine (Deterministic Layer)**
  - **Purpose**: Provide immediate, predictable, and explainable results for well‑known compliance patterns.
  - **Implementation**: A configurable set of rules expressed as regular expressions, keyword dictionaries, or simple logical conditions (e.g., “product claim contains ‘cure’ → high risk”). These rules are authored by domain experts and stored in a lightweight JSON/JS format.
  - **Execution**: Runs synchronously during the automatic review phase. Each rule yields a pass/fail outcome and a severity label. The engine aggregates all rule results and assigns an overall risk level.
  - **Advantages**: Low latency, fully transparent, easy to update without retraining models.

- **RAG Knowledge Base (Semantic Layer)**
  - **Purpose**: Handle nuanced or unseen phrasing, retrieve supporting regulatory text, and generate human‑readable explanations.
  - **Implementation**:
    - **Indexing**: Regulatory documents (e.g., the provided PDF) are split into chunks, embedded using a local embedding model (or a cloud API), and stored as a vector index at `knowledge-base/cosmetics-regulation.index.json`.
    - **Retrieval**: During review, if the rule engine cannot confidently classify a section, the system constructs a query from the document text and performs a similarity search against the index. The top‑k relevant chunks are returned.
    - **LLM Integration**: If an external LLM endpoint is configured (via `.env` or UI settings), the retrieved chunks are injected into a prompt together with the user’s document content. The LLM is asked to generate a compliance opinion, cite sources, and propose corrective measures. If no LLM is available, the system falls back to a rule‑based summarisation of the retrieved passages.
  - **Advantages**: Enables adaptation to new regulations without code changes, provides rich context, and supports open‑ended Q&A through the knowledge base search interface.

The two mechanisms are orchestrated as follows:
1. The rule engine runs first and flags all clear violations.
2. For sections that are not clearly matched (or for which the user explicitly requests a deeper analysis), the RAG pipeline is invoked.
3. Results from both engines are merged: the final risk label is the highest severity among all findings, and the detailed view displays both rule‑based alerts and RAG‑generated commentary.

This hybrid approach balances speed, accuracy, and explainability, making the system suitable for real‑world compliance workflows.

## Performance Evaluation

- Startup speed: front end and local RAG API should launch within a few seconds, depending on machine performance
- Retrieval latency: knowledge base search responses are typically under 200ms
- Review accuracy: normalized term matching plus RAG reasoning improves risk detection precision
- Usability: users can complete the upload-to-result flow in three actions, supporting fast business iteration

## Core Value

- Improves compliance review efficiency and reduces manual work
- Lowers document query costs and avoids redundant research
- Supports visual task tracking and report export
- Enables integration with existing LLM services for smarter enterprise workflows

## Future Enhancements

- Add multilingual document support and automatic translation
- Add document version control and historical comparison
- Support more knowledge sources, such as databases and third-party document libraries
- Add customizable audit rules and model fine-tuning entry points

## Setup

1. Navigate to the project root:

```bash
cd "e://Document Review Agent"
```

2. Install dependencies:

```bash
npm install
```

3. Copy the environment configuration file if you want to use an LLM:

```bash
copy .env.example .env
```

## Running the Project

### Start frontend and backend together

```bash
npm run dev
```

This starts:

- RAG API: `http://localhost:3001`
- Vite frontend: usually `http://localhost:5173`

### Start frontend only

```bash
npm run dev:web
```

### Start backend only

```bash
npm run dev:api
```

## Scripts

- `npm run dev`: development mode, starts frontend and local RAG API
- `npm run dev:web`: starts Vite front-end only
- `npm run dev:api`: starts local backend only
- `npm run build`: builds the production bundle
- `npm run rag:index`: rebuilds the local knowledge base index

## RAG Demo Agent

This project includes a local RAG demo agent built from `化妆品监督管理条例_食品药品监管_中国政府网.pdf`.

- Knowledge base index path: `knowledge-base/cosmetics-regulation.index.json`

If you replace the source PDF, run:

```bash
npm run rag:index
```

## LLM Configuration

To connect to an external OpenAI-compatible endpoint, set the following in `.env`:

```env
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=your-api-key
LLM_MODEL=gpt-4o-mini
RAG_PORT=3001
```

If `LLM_API_KEY` is not provided, the RAG service will fall back to a local rule-based engine.

The UI also supports local API configuration:

- Open `System Settings` → `API Keys`
- Set `LLM Base URL`, `LLM API Key`, and `LLM Model`
- Click `Save Changes`

Saved settings are sent to the local RAG API when a new review task is created.

## Project Structure

- `src/`: front-end source code
- `server/`: backend API and RAG service implementation
- `knowledge-base/`: local knowledge base index files
- `dist/`: production build output
- `package.json`: npm scripts and dependency definitions
- `vite.config.ts`: Vite configuration

## API Endpoints

- `GET /api/rag/health`
- `POST /api/rag/search`
- `POST /api/rag/review`

## Notes

- If dependencies fail, delete `node_modules` and run `npm install` again
- If the source PDF changes, regenerate the index using `npm run rag:index`

---

## Appendix: UI Pages and Copy
 The original Figma design source is available at: https://www.figma.com/design/PFnb9e5JfsOqDj9SvEuRh7/Dashboard-and-Document-Management


### Figma Page Names

- `Dashboard_Overview`
- `Document_Upload`
- `Task_List`
- `Result_Detail`
- `Risk_Alert_Popup`
- `Knowledge_Base_Manage`
- `System_Setting`

### Main Page

1. Dashboard Overview
   - Title: `PAL - Automated Document Review Agent`
   - Metrics:
     - Average Review Time: Original `180min` → Current `30min` (`83%` Efficiency Improved)
     - Processing Throughput: `0.33 docs/h` → `2.00 docs/h`
     - Annual Labor Hours Saved: `150,000+ Hours`
   - Action Entrance: `New Review Task` | `Task List` | `Knowledge Base`

2. Document Upload Page
   - Title: `Create New Compliance Review Task`
   - Text: `Upload files or import business emails`
   - Supported Formats: `PDF`, `Word`, `TXT`, `Email Text`
   - Buttons: `Select Files` | `Batch Upload` | `Start Review` | `Reset`
   - Tip: `The AI agent will automatically complete compliance verification.`

3. Task List
   - Header: `Task ID`, `File Name`, `Submit Time`, `Status`, `Operation`
   - Status: `Processing` | `Completed` | `Risk Detected`
   - Action: `View Detail` | `Export Report`

4. Result Detail
   - Title: `Review Result Detail`
   - Sections: `File Info`, `Compliance Check Result`, `Risk Details`
   - Text: `Total detected risk items: N`
   - Tags: `High Risk` | `Normal Risk` | `Compliant`
   - Buttons: `Export Report` | `Back`

5. Risk Alert Popup
   - Title: `Non-compliant Content Detected`
   - Content: `Please check and revise the risky content.`
   - Buttons: `View Details` | `Later`

6. Knowledge Base Management
   - Title: `Compliance Knowledge Base Management`
   - Buttons: `Add Document` | `Edit` | `Delete` | `Sync Index`
   - Tip: `Rules will be vectorized and activated automatically after update.`

