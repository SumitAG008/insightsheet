export const BLOG_CATEGORIES = [
  { id: 'all', label: 'All Posts' },
  { id: 'updates', label: 'Updates' },
  { id: 'tutorials', label: 'Tutorials' },
  { id: 'success-stories', label: 'Success Stories' },
  { id: 'engineering', label: 'Engineering' },
  { id: 'api-docs', label: 'API Documentation' },
];

export function slugify(title) {
  return String(title)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export const DEVELOPERS_BLOG_POSTS = [
  {
    id: 1,
    title: 'Getting Started with Meldra API: Your First Document Conversion',
    slug: slugify('Getting Started with Meldra API: Your First Document Conversion'),
    date: '2026-01-25',
    author: 'Meldra Team',
    category: 'tutorials',
    summary:
      'Learn how to convert PDF to DOC, DOC to PDF, and more using the Meldra API. This guide walks you through authentication, making your first API call, and handling responses.',
    image: '/api-blog-1.jpg',
    readMore: true,
    content: `
# Getting Started with Meldra API: Your First Document Conversion

The Meldra API lets you convert documents (PDF, DOC/DOCX, PPT/PPTX) and clean ZIP archives programmatically.

In this tutorial, you’ll make your first conversion request (PDF → DOCX) and learn the response handling pattern you’ll reuse across endpoints.

## Prerequisites

- A Meldra API key (request one at support@meldra.ai)
- A file to convert (PDF, DOC/DOCX, PPT/PPTX)
- Basic HTTP knowledge

## Step 1: Get your API key

Request an API key by emailing support@meldra.ai. Store it in an environment variable and never commit it to version control.

## Step 2: Make your first request (cURL)

\`\`\`bash
curl -X POST "https://api.developer.meldra.ai/v1/convert/pdf-to-doc" \\
  -H "X-API-Key: your_api_key_here" \\
  -F "file=@document.pdf"
\`\`\`

## Step 3: Save the response

The API returns the converted file as binary. Save it to disk or stream it directly to your user.

## Next steps

- Try DOCX → PDF, PPTX → PDF, and PDF → PPTX
- Add retries for transient network failures
- Add monitoring around response time and error codes
`,
  },
  {
    id: 2,
    title: 'How to Generate and Use Your Meldra API Key',
    slug: slugify('How to Generate and Use Your Meldra API Key'),
    date: '2026-01-24',
    author: 'Meldra Team',
    category: 'tutorials',
    summary:
      'Step-by-step guide to obtaining your API key, authenticating requests, and following best practices for key storage, rotation, and usage monitoring.',
    image: '/api-blog-2.jpg',
    readMore: true,
    content: `
# How to Generate and Use Your Meldra API Key

All Meldra API requests use API-key authentication.

## Getting your API key

### Step 1: Contact support

Email **support@meldra.ai** with the subject: **Meldra API Key Request**.

Include:

- Your name and company
- Your use case
- Expected monthly volume

### Step 2: Receive your key

You’ll receive:

- Your API key (example: \`meldra_xxxxxxxxxxxxx\`)
- Base URL: \`https://api.developer.meldra.ai\`
- Rate limits and quotas

### Step 3: Store securely

**Never commit API keys to version control.** Use environment variables.

\`\`\`bash
export MELDRA_API_KEY="meldra_xxxxxxxxxxxxx"
\`\`\`

## Using your API key

Pass it in the \`X-API-Key\` header.

\`\`\`bash
curl -X POST "https://api.developer.meldra.ai/v1/convert/pdf-to-doc" \\
  -H "X-API-Key: $MELDRA_API_KEY" \\
  -F "file=@document.pdf"
\`\`\`

## Security best practices

1. **Use env vars** (or a secrets manager)
2. **Rotate keys** on a schedule or after any suspected exposure
3. **Scope usage** per environment (dev/staging/prod)
4. **Monitor usage** for unexpected spikes
`,
  },
  {
    id: 3,
    title: 'What Can the Meldra API Do? Complete Feature Overview',
    slug: slugify('What Can the Meldra API Do? Complete Feature Overview'),
    date: '2026-01-23',
    author: 'Meldra Team',
    category: 'api-docs',
    summary:
      'Discover Meldra API capabilities: document conversion (PDF, DOC, PPT), FileName Cleaner, and platform features like authentication, rate limits, and usage tracking.',
    image: '/api-blog-3.jpg',
    readMore: true,
    content: `
# What Can the Meldra API Do? Complete Feature Overview

Meldra API provides document conversion and file-processing endpoints designed for production use.

## Document conversion

### PDF → DOCX
Convert PDFs into editable Word documents while preserving layout as closely as possible.

### DOC/DOCX → PDF
Generate PDFs for distribution, signing, and archival.

### PPT/PPTX → PDF
Share decks without requiring PowerPoint.

### PDF → PPTX
Convert PDFs into slides (typically one slide per page).

## FileName Cleaner

Clean and sanitize file names inside ZIP archives by:

- Removing or replacing invalid characters
- Enforcing filename length limits
- Standardizing naming conventions
- Improving cross-platform compatibility

## Platform features

- API key authentication
- Rate limits per key
- Usage tracking
- Predictable error codes
`,
  },
  {
    id: 4,
    title: 'API v1.0 Released: Document Conversion and ZIP Cleaning Now Available',
    slug: slugify('API v1.0 Released: Document Conversion and ZIP Cleaning Now Available'),
    date: '2026-01-20',
    author: 'Meldra Team',
    category: 'updates',
    summary:
      "We're excited to announce Meldra API v1.0—document conversion endpoints (PDF↔DOCX, PPTX↔PDF, PDF→PPTX) plus FileName Cleaner. Here's what shipped and what's next.",
    image: '/api-blog-4.jpg',
    readMore: true,
    content: `
# API v1.0 Released: Document Conversion and ZIP Cleaning Now Available

We’re shipping **Meldra API v1.0**—a set of endpoints that help teams automate document conversion and ZIP normalization in pipelines, internal tools, and customer-facing workflows.

## What’s included in v1.0

### Document conversion endpoints

- PDF → DOCX
- DOC/DOCX → PDF
- PPT/PPTX → PDF
- PDF → PPTX

### FileName Cleaner endpoint

ZIP archives from customers often contain filenames that break downstream systems (Windows/macOS differences, invalid characters, unicode edge-cases, very long paths). The FileName Cleaner endpoint:

- Normalizes filenames
- Removes or replaces invalid characters
- Applies safe length limits
- Produces a cleaned archive you can reliably process

## Example: Convert PDF → DOCX

\`\`\`bash
curl -X POST "https://api.developer.meldra.ai/v1/convert/pdf-to-doc" \\
  -H "X-API-Key: $MELDRA_API_KEY" \\
  -F "file=@document.pdf" \\
  -o converted.docx
\`\`\`

## What’s next

- More conversion pairs based on demand
- Better diagnostics (job ids, structured errors)
- Usage dashboards + billing automation

If you want early access to upcoming endpoints, email **support@meldra.ai**.
`,
  },
  {
    id: 5,
    title: 'Building a Document Processing Pipeline with Meldra API',
    slug: slugify('Building a Document Processing Pipeline with Meldra API'),
    date: '2026-01-18',
    author: 'Meldra Team',
    category: 'engineering',
    summary:
      'An engineering deep-dive on building reliable pipelines: batching, retries, timeouts, job orchestration, and performance optimization for high-volume document conversion.',
    image: '/api-blog-5.jpg',
    readMore: true,
    content: `
# Building a Document Processing Pipeline with Meldra API

If you’re converting documents at scale, the hard part isn’t the single request—it’s the operational reliability: retries, batching, observability, and predictable failure handling.

## A recommended pipeline architecture

1. Ingest user files
2. Validate type and size
3. Convert via Meldra API
4. Store results in your object store
5. Emit events for downstream steps (indexing, signing, notifications)

## Batching strategy

- Group jobs by file type and size
- Limit concurrency to avoid hitting rate limits
- Prefer async workers (queue + workers) over synchronous web requests

## Retries and timeouts

- Use short client timeouts with retries for network errors
- Do not retry on 4xx validation errors
- Capture and log response codes and request ids

## Observability

Track:

- p50 / p95 conversion duration
- error rates by endpoint
- file size distribution
- throughput per minute

## Performance tips

- Avoid converting already-converted assets
- Cache repeated conversions (same input hash)
- Use streaming uploads/downloads when available
`,
  },
  {
    id: 6,
    title: 'How Company X Automated Their Document Workflow with Meldra',
    slug: slugify('How Company X Automated Their Document Workflow with Meldra'),
    date: '2026-01-15',
    author: 'Meldra Team',
    category: 'success-stories',
    summary:
      'A practical case study: how a team standardized messy customer ZIPs and automated conversion to DOCX/PDF, reducing manual work and turnaround time dramatically.',
    image: '/api-blog-6.jpg',
    readMore: true,
    content: `
# How Company X Automated Their Document Workflow with Meldra

A services company was spending hours per week on:

- Cleaning customer ZIP archives that failed imports
- Converting PDFs into editable DOCX for redlining
- Generating PDFs for signatures and delivery

## The problem

Customer uploads were inconsistent: long filenames, invalid characters, and mixed file types. Manual cleanup delayed processing and created avoidable errors.

## The solution

They implemented a small pipeline:

1. Receive ZIP from customer
2. Clean ZIP filenames via Meldra
3. Convert PDFs → DOCX for editing
4. Convert final DOCX → PDF for signing

## The results

- Faster turnaround (less manual cleanup)
- Fewer failed imports
- More consistent naming conventions

## What you can copy

- Run ZIP cleaning immediately after ingest
- Track conversion success rate by customer
- Add a fallback flow for unsupported files
`,
  },
  {
    id: 7,
    title: 'Introducing meldra ESG insight: Assurance-Ready ESG Reporting Platform (ESG v2)',
    slug: slugify('Introducing meldra ESG insight: Assurance-Ready ESG Reporting Platform (ESG v2)'),
    date: '2026-04-09',
    author: 'Meldra Team',
    category: 'updates',
    summary:
      'A product and architecture overview of meldra ESG insight: framework-agnostic ESG reporting with evidence, approvals, AI-assisted ingestion, and third-party data injection.',
    image: '/api-blog-4.jpg',
    readMore: true,
    content: `
# Introducing meldra ESG insight: Assurance-Ready ESG Reporting Platform (ESG v2)

ESG reporting is increasingly treated like financial reporting: it needs **repeatability**, **controls**, and **audit-ready evidence**. Yet many organizations still run ESG reporting on spreadsheets and email threads, which slows down reporting cycles and increases assurance risk.

**meldra ESG insight** is our platform foundation (ESG v2) for building a modern, framework-agnostic ESG reporting system with evidence linkage, approvals, and governed AI automation.

## Who this is for

- **CFO / Finance**: consistency, controls, reporting cycle efficiency, audit packs
- **Head of Sustainability / ESG**: multi-framework reporting without duplicated work
- **Compliance / Audit / Risk**: evidence-first traceability, approvals, waiver policy, audit logs

## Business objective

- Reduce ESG reporting cycle time
- Improve reliability of ESG metrics through evidence + approvals
- Support multi-framework disclosure from a single ESG dataset
- Lower audit/assurance friction by packaging traceability (what, why, who, source)

## What “ESG v2” means

ESG v2 separates ESG reporting into clear layers:

- **Context**: Project, reporting period, site/entity (optional)
- **Master data**: Frameworks, requirements, metric definitions (KPI library)
- **Transaction data**: Metric values (reported numbers) + status lifecycle
- **Governance**: Evidence links, approvals, waivers, and activity logs

This structure makes ESG reporting scalable across reporting periods, sites, and frameworks.

## Proposed architecture (generalized)

At a high level, meldra ESG insight is composed of:

- **Web UI** for data capture, review, dashboards, and approvals
- **API layer** for auth and domain services (ESG core, evidence ingestion, workflow, export)
- **Data foundation** for master data + metric values + governance
- **Evidence ingestion** (file store + text/OCR extraction + metadata)
- **Workflow engine** to coordinate cross-functional review and approvals
- **AI services** that propose values, mappings, narratives, and checks (with traceability)

### Architecture diagram

\`\`\`mermaid
flowchart TB
  subgraph Personas["Users"]
    CFO["CFO / Finance"]
    ESG["Head of Sustainability / ESG"]
    AUD["Compliance / Audit / Risk"]
  end

  CFO --> UI["meldra ESG insight - Web UI"]
  ESG --> UI
  AUD --> UI

  UI --> API["API Layer - Auth + ESG Services"]
  API --> IAM["Identity & Access - RBAC/ABAC"]
  API --> ESGCore["ESG Core Domain Services"]
  API --> Evidence["Evidence & Ingestion Services"]
  API --> Workflow["Workflow & Controls Engine"]
  API --> Export["Export & Disclosure Services"]
  API --> Integrations["Integration Connectors"]

  ESGCore --> DB["Operational Database"]
  Evidence --> Blob["Document Store"]
  Evidence --> DB
  Workflow --> DB
  Export --> DB

  Evidence --> AI["AI Services - Extraction / Mapping / Narrative"]
  ESGCore --> AI
  AI --> DB

  Integrations --> DB
  Export --> Pack["Audit Packs / Reporting Outputs"]

  ThirdParty["Third-Party Systems - ERP/HR/Utilities/Travel/Procurement"] --> Ingest["Ingestion - File Import / Connectors / Webhooks"]
  Ingest --> Evidence
  Ingest --> ESGCore
\`\`\`

## How AI creates automated workflows from evidence

AI is most useful when it reduces manual effort **without weakening assurance**.

In meldra ESG insight:

1. **Evidence is the trigger** (utility bills, invoices, meter exports, HR reports)
2. AI extracts **structured suggestions** (metric, value, unit, period, site)
3. AI includes **citations** (page refs, excerpts, cell references)
4. The platform generates **workflow tasks** (review, validate, approve)
5. Values become reportable only after **human review + approval gates**

Key principle: **AI proposes; humans approve; evidence remains mandatory**.

## Third-party data injection (connectors, imports, webhooks)

Third-party data can be injected through three channels:

- **File import** (CSV/XLSX)
- **Direct API connectors** (scheduled sync)
- **Webhooks** (event-driven ingestion)

All ingestion paths converge into the same governed pipeline:

**normalize → validate → map → stage → review → approve → export**

This keeps imported and integrated data audit-ready and consistent across frameworks.

## Closing

meldra ESG insight is built to bring finance-grade governance to ESG reporting while enabling sustainability teams to report across frameworks from a single, consistent dataset.
`,
  },
];

export const DEVELOPERS_BLOG_POSTS_BY_ID = new Map(
  DEVELOPERS_BLOG_POSTS.map((p) => [p.id, p])
);

export const DEVELOPERS_BLOG_POSTS_BY_SLUG = new Map(
  DEVELOPERS_BLOG_POSTS.map((p) => [p.slug, p])
);

export function getPostBySlugOrId(slugOrId) {
  const key = String(slugOrId || '').trim();
  if (!key) return null;

  if (/^\d+$/.test(key)) {
    return DEVELOPERS_BLOG_POSTS_BY_ID.get(parseInt(key, 10)) || null;
  }

  return DEVELOPERS_BLOG_POSTS_BY_SLUG.get(key) || null;
}
