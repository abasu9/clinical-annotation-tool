# Clinical Annotation Tool — Technical Handover Document

**Project:** Clinical Annotation Tool  
**Live URL:** https://clinical-annotation-tool.abhishek-basu2010.workers.dev  
**GitHub:** https://github.com/abasu9/clinical-annotation-tool  
**Supabase Project ID:** `gfedxrcmhsoflkzchpng`  
**Last updated:** August 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Database Schema](#4-database-schema)
5. [Authentication & Access Control](#5-authentication--access-control)
6. [User Flows](#6-user-flows)
7. [Dataset Pipeline — End to End](#7-dataset-pipeline--end-to-end)
8. [Annotation System](#8-annotation-system)
9. [Inter-Annotator Agreement (IAA) Rating System](#9-inter-annotator-agreement-iaa-rating-system)
10. [Admin Panel](#10-admin-panel)
11. [Codebase Map](#11-codebase-map)
12. [Environment Variables](#12-environment-variables)
13. [Local Development](#13-local-development)
14. [Deployment](#14-deployment)
15. [Supabase Maintenance](#15-supabase-maintenance)
16. [Current Data State (Pilot)](#16-current-data-state-pilot)
17. [Extending the System](#17-extending-the-system)
18. [Known Limitations & Security](#18-known-limitations--security)
19. [Troubleshooting](#19-troubleshooting)

---

## 1. Overview

The Clinical Annotation Tool is a **serverless web application** for expert annotation of multimodal clinical posts (text + images) from online health forums. It has two main divisions:

1. **Annotation** — Clinicians write structured image descriptions and multimodal clinical summaries for assigned posts.
2. **Rating** — The same clinicians evaluate each other's work using Likert scales (inter-annotator agreement / IAA).

There is **no backend server**. The React frontend talks directly to a Supabase Postgres database and loads images from Cloudflare R2 public URLs. The built static assets are hosted on Cloudflare Workers.

### What the tool produces

For each post where summarization is required (image_status = "Yes"), an annotator produces:

- **Task 1: Objective Image Description** — A factual, standalone description of what is visible in the clinical image(s).
- **Task 2: Final Multimodal Clinical Summary** — A clinician-grade synthesis combining the original post text with what is observed in the image.

For the IAA evaluation, each rater scores another annotator's outputs on 6 Likert criteria (1–5 scale).

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Browser (React SPA)                    │
│                                                          │
│  ┌──────────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │ Login/Auth   │  │ Annotate  │  │ Rate (IAA)       │  │
│  │              │  │ Workspace │  │ Workspace        │  │
│  └──────┬───────┘  └─────┬─────┘  └────────┬─────────┘  │
│         │                │                  │            │
│         ▼                ▼                  ▼            │
│  ┌──────────────────────────────────────────────────┐    │
│  │        Supabase JS Client (REST over HTTPS)      │    │
│  └─────────────────────┬────────────────────────────┘    │
│                        │                                 │
│  ┌─────────────────────┼───────────────┐                 │
│  │ <img src="...">     │               │                 │
│  │ loads from R2 URLs  │               │                 │
│  └──────────┬──────────┘               │                 │
└─────────────┼──────────────────────────┼─────────────────┘
              │                          │
              ▼                          ▼
┌─────────────────────┐    ┌─────────────────────────┐
│  Cloudflare R2      │    │  Supabase Postgres       │
│  (public image URLs)│    │                          │
│                     │    │  Tables:                 │
│  /Multimodal images/│    │  - annotators            │
│    <post_id>_0.jpg  │    │  - datasets              │
│    <post_id>_1.jpg  │    │  - samples               │
│    ...              │    │  - annotations            │
└─────────────────────┘    │  - ratings                │
                           └─────────────────────────┘
                                      ▲
                                      │ Hosted on
                           ┌──────────┴──────────┐
                           │  Cloudflare Workers  │
                           │  (static SPA assets) │
                           └──────────────────────┘
```

### Key architectural decisions

| Decision | Rationale |
|----------|-----------|
| No backend server | Simplifies deployment; Supabase provides REST API + Postgres directly from the browser |
| Cloudflare R2 for images | Free egress, public HTTPS URLs compatible with `<img>` tags, S3-compatible upload |
| Cloudflare Workers hosting | Free tier sufficient, SPA routing via `not_found_handling: single-page-application` |
| RLS disabled (prototype) | The tool uses the Supabase anon key with Row Level Security **off** for simplicity. See [Security section](#18-known-limitations--security) |
| PINs in DB (not hashed) | Prototype-grade; PINs are stored in plaintext in the `annotators` table. See [Security section](#18-known-limitations--security) |

---

## 3. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend framework | React | 18.3 |
| Language | TypeScript | 5.6 |
| Build tool | Vite | 6.x |
| CSS | Tailwind CSS | 3.4 |
| Database | Supabase (Postgres) | — |
| DB client | @supabase/supabase-js | 2.45 |
| CSV parsing | PapaParse | 5.4 |
| Image hosting | Cloudflare R2 | — |
| App hosting | Cloudflare Workers | — |
| Deploy CLI | Wrangler | 4.x |

---

## 4. Database Schema

### Entity-Relationship Diagram

```
annotators              datasets
  id (PK)                 id (PK)
  login_id (UNIQUE)       name
  display_name            uploaded_filename
  pin                     total_samples
  login_aliases[]         assigned_annotator_id ──── references annotators.login_id (logical)
  name_includes[]         created_at
  created_at
                              │ 1
                              │
                              │ N
                          samples
                            id (PK)
                            dataset_id (FK → datasets)
                            post_id
                            question
                            image_urls[]
                            created_at
                              │ 1
                    ┌─────────┴──────────┐
                    │ N                  │ N
              annotations              ratings
                id (PK)                  id (PK)
                sample_id (FK)           sample_id (FK)
                dataset_id (FK)          dataset_id (FK)
                post_id                  post_id
                annotator_id             evaluator_id
                image_status             rated_annotator_id
                summarization_reason     desc_completeness (1-5)
                objective_image_desc.    desc_independence (1-5)
                final_clinical_summary   sum_informativeness (1-5)
                status                   sum_completeness (1-5)
                created_at               sum_combination (1-5)
                updated_at               sum_fluency (1-5)
                                         status
                UNIQUE(sample_id,        created_at
                  annotator_id)          updated_at
                                         UNIQUE(sample_id,
                                           evaluator_id,
                                           rated_annotator_id)
```

### Table Details

#### `annotators` — Who can log in

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Auto-generated |
| `login_id` | text UNIQUE | What the annotator types at login (e.g. `dr naafila`, `Dr Sanchez`) |
| `display_name` | text | Friendly label shown in admin (e.g. `Dr Naafila`) |
| `pin` | text | 6-digit numeric PIN for authentication |
| `login_aliases` | jsonb[] | Alternative login strings that also resolve to this person (e.g. `["dr chadda", "chadda"]`) |
| `name_includes` | jsonb[] | Substrings for legacy dataset-name matching (e.g. `["naafila"]`) |
| `created_at` | timestamptz | Row creation time |

#### `datasets` — Imported dataset collections

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Auto-generated |
| `name` | text | Human-readable name set by admin at import |
| `uploaded_filename` | text | Original file name of the uploaded CSV/JSONL |
| `total_samples` | integer | Count of samples after import |
| `assigned_annotator_id` | text | Login ID of the annotator this dataset is assigned to |
| `created_at` | timestamptz | Row creation time |

#### `samples` — Individual posts within a dataset

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Auto-generated |
| `dataset_id` | uuid FK → datasets | Parent dataset |
| `post_id` | text | Original post identifier from the source data |
| `question` | text | Full post text (or `title + selftext`) |
| `image_urls` | jsonb[] | Array of public HTTPS URLs to clinical images |
| `created_at` | timestamptz | Row creation time |

#### `annotations` — Annotator work on each sample

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Auto-generated |
| `sample_id` | uuid FK → samples | Which sample |
| `dataset_id` | uuid FK → datasets | Denormalized for efficient queries |
| `post_id` | text | Denormalized from sample |
| `annotator_id` | text | Login ID of the annotator who wrote this |
| `image_status` | text | `"Yes"` = needs summarization, `"No"` = does not, `"Not within expertise"` = out of expertise |
| `summarization_reason` | text | Required when image_status = "No" (why summarization is not needed) |
| `objective_image_description` | text | Task 1 output |
| `final_multimodal_clinical_summary` | text | Task 2 output |
| `status` | text | `draft`, `submitted`, `skipped`, or `out_of_expertise` |
| `created_at` | timestamptz | Row creation time |
| `updated_at` | timestamptz | Auto-updated via trigger |

**Unique constraint:** `(sample_id, annotator_id)` — each annotator has exactly one annotation per sample.

#### `ratings` — IAA Likert scores

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Auto-generated |
| `sample_id` | uuid FK → samples | Which sample |
| `dataset_id` | uuid FK → datasets | Denormalized |
| `post_id` | text | Denormalized |
| `evaluator_id` | text | Login ID of the rater |
| `rated_annotator_id` | text | Login ID of the annotator being rated |
| `desc_completeness` | integer 1–5 | Likert: image description completeness |
| `desc_independence` | integer 1–5 | Likert: image description independence |
| `sum_informativeness` | integer 1–5 | Likert: summary informativeness |
| `sum_completeness` | integer 1–5 | Likert: summary completeness |
| `sum_combination` | integer 1–5 | Likert: summary combination of image + post |
| `sum_fluency` | integer 1–5 | Likert: summary fluency |
| `status` | text | `draft` or `submitted` |
| `created_at` | timestamptz | Row creation time |
| `updated_at` | timestamptz | Auto-updated via trigger |

**Unique constraint:** `(sample_id, evaluator_id, rated_annotator_id)` — one rating per evaluator per annotator per sample.

### Indexes

Indexes exist on: `samples(dataset_id)`, `datasets(assigned_annotator_id)`, `annotators(login_id)`, `annotations(dataset_id)`, `annotations(annotator_id)`, `annotations(dataset_id, annotator_id)`, `ratings(dataset_id)`, `ratings(evaluator_id)`, `ratings(dataset_id, evaluator_id)`, `ratings(sample_id)`.

### Triggers

An `updated_at` trigger fires on every `UPDATE` to `annotations` and `ratings`, setting `updated_at = now()`.

---

## 5. Authentication & Access Control

### Three access levels

| Role | How to access | Capabilities |
|------|---------------|--------------|
| **Annotator** | Login ID + 6-digit PIN | Annotate assigned datasets, rate peers (if in IAA pool) |
| **Admin** | Username + password (default `nlp`/`nlp123`) | Import/export/delete datasets, manage annotators, view all data |
| **Public** | No access | The site requires login; no public-facing data |

### How annotator login works

```
User enters Login ID + PIN
        │
        ▼
AnnotatorLogin.tsx → verifyAnnotatorLogin()
        │
        ▼
Fetch all rows from `annotators` table
        │
        ▼
Match login input against login_id or login_aliases (case-insensitive)
        │
   ┌────┴────┐
   │ Found?  │
   │  No → "Unknown annotator ID"
   │  Yes ──→ Compare PIN
   │           │
   │      ┌────┴────┐
   │      │ Match?  │
   │      │  No → "Incorrect PIN"
   │      │  Yes ──→ Store in sessionStorage + localStorage
   │      └─────────┘       │
   └────────────────────────┴──→ Navigate to Mode Select
```

- **localStorage** stores the login ID for session resume (survives tab close)
- **sessionStorage** stores a PIN-unlocked flag (cleared when tab closes)
- On page reload, if both exist, the user is auto-resumed to mode selection

### How admin login works

- Username/password are set via `VITE_ADMIN_USERNAME` and `VITE_ADMIN_PASSWORD` environment variables (compiled into the JS bundle at build time)
- Admin unlock lasts 8 hours per tab (stored in `sessionStorage` with a timestamp)
- Admin and annotator sessions are independent — you can be both

### IAA blind codes

The rating system uses blind codes to prevent annotators from knowing whose work they're rating:

| Blind Code | Real Login ID | Real Name |
|------------|---------------|-----------|
| `nf` | `dr naafila` | Dr Naafila |
| `c` | `dr aditya` | Dr Chadda |
| `sz` | `Dr Sanchez` | Dr Sanchez |
| `s` | `Dr Saja` | Dr Saja |
| `w` | `Dr Wesley` | Dr Wesley |

Blind codes **cannot** be used as login IDs.

---

## 6. User Flows

### 6.1 Overall navigation state machine

```
  ┌─────────┐
  │  LOGIN  │ ──── "Admin access" ───→ ADMIN (password gate → admin panel)
  └────┬────┘
       │ Login ID + PIN verified
       ▼
  ┌──────────┐
  │  MODE    │  "Choose your task"
  │  SELECT  │
  └──┬───┬───┘
     │   │
     │   └── "Rating" ──────────────→ RATE (IAA workspace, no dataset picker)
     │
     └── "Annotation" ──→ DATASET PICKER ──→ ANNOTATE (workspace)
                              │
                              └── "Change task" → back to MODE SELECT
```

### 6.2 Annotation flow (per sample)

```
Sample loaded → Image viewer (left) + Post text (right)
     │
     ▼
"Does this question require summarization?"
     │
     ├── "No" → Reason dropdown required
     │         → Submit saves with image_status="No"
     │
     ├── "Yes" → Task 1: Objective Image Description (min 20 words)
     │         → Task 2: Final Multimodal Clinical Summary (min 20 words)
     │         → Submit validates both fields
     │
     └── "Out of expertise" button → marks sample and auto-advances
```

Actions available per sample:
- **Save Draft** — saves current state without validation
- **Submit & Next** — validates, saves as "submitted", advances to next pending sample
- **Previous / Next** — navigate without saving (warns if unsaved changes)
- **Skip** — marks sample as skipped

### 6.3 Rating flow (IAA)

```
Rating page loads → fetch shared post_ids across 5 pilot datasets
     │
     ▼
For evaluator X: show all post_ids where OTHER annotators have submitted work
     │
     ▼
Per question page:
  - Image + original post at top
  - For each other annotator (shown as blind code only):
      - Their image description + summary (side by side)
      - 6 Likert scales (1-5):
          Description: Completeness, Independence
          Summary: Informativeness, Completeness, Combination, Fluency
     │
     ▼
  - "Save Draft" or "Submit & Next"
```

---

## 7. Dataset Pipeline — End to End

### Step 1: Source data

Start with a JSONL file where each line represents one clinical post:

```json
{"post_id": "abc123", "title": "Red rash on arm", "selftext": "I noticed this rash...", "local_path": "/images/abc123_0.jpg"}
```

### Step 2: Upload images to Cloudflare R2

```bash
export R2_ACCOUNT_ID="your_account_id"
export R2_ACCESS_KEY_ID="your_key"
export R2_SECRET_ACCESS_KEY="your_secret"
export R2_BUCKET="clinical-annotation-tool"
export R2_PREFIX="Multimodal images"
export LOCAL_DIR="/path/to/your/images"

./scripts/upload-images-to-r2.sh
```

This uploads all images to R2 using the S3-compatible API. Images become publicly accessible at:  
`https://pub-xxxxx.r2.dev/Multimodal%20images/<post_id>_0.jpg`

### Step 3: Prepare the dataset file

```bash
node scripts/prepare-dataset.mjs \
  --input  "/path/to/raw_data.jsonl" \
  --images "/path/to/local/images" \
  --base   "https://pub-xxxxx.r2.dev/Multimodal images" \
  --output "Dataset/prepared_data.jsonl"
```

This script:
- Reads each row from the input
- Scans the local images folder for matching `<post_id>_*.jpg` files
- Rewrites local paths to public R2 HTTPS URLs
- Combines `title` + `selftext` into a single `question` field
- Outputs a prepared JSONL ready for import

Output format:
```json
{"post_id":"abc123","question":"Red rash on arm\n\nI noticed this rash...","image_urls":["https://pub-xxxxx.r2.dev/Multimodal%20images/abc123_0.jpg"]}
```

### Step 4: Import in the admin panel

1. Log in as admin
2. Go to **Import dataset** section
3. Enter a **Dataset name** (e.g. `Dr Smith pilot study`)
4. Select the **annotator** to assign it to
5. Choose the prepared `.jsonl` file
6. Click **Import**

The import:
- Creates a row in `datasets` with the name and assigned annotator
- Parses the file and inserts each row into `samples` in batches of 200
- Updates `datasets.total_samples` with the final count

### Step 5: Annotator works on it

The assigned annotator logs in, picks Annotation, sees only their assigned dataset(s), and begins annotating.

### Step 6: Export results

Admin can export annotations as CSV or JSONL per dataset, and ratings as CSV/JSONL per evaluator.

### Dataset file format requirements

| Column | Required | Notes |
|--------|----------|-------|
| `post_id` | Yes | Unique identifier per row |
| `question` | Yes | Post text (or the script builds it from `title` + `selftext`) |
| `image_urls` | Yes | JSON array of HTTPS URLs, or semicolon-separated string |

Accepts `.csv`, `.json`, or `.jsonl` formats.

---

## 8. Annotation System

### Dataset assignment

When an admin imports a dataset, they assign it to an annotator via a dropdown. The assignment is stored in `datasets.assigned_annotator_id`.

When an annotator logs in and picks **Annotation**, the dataset picker:
1. Fetches all datasets from Supabase
2. Fetches all annotator profiles
3. Filters datasets where `assigned_annotator_id` matches the logged-in user
4. **Legacy fallback:** For old datasets without an explicit assignment, matches by checking if the annotator's `name_includes` fragments appear in the dataset name (e.g. `"naafila"` in `"Dr Naafila pilot study"`)

### Annotation statuses

| Status | Meaning | Counts as "done" |
|--------|---------|-------------------|
| `draft` | Saved but not finalized | No (for global stats), Yes (for annotator's remaining count) |
| `submitted` | Finalized and validated | Yes |
| `skipped` | Annotator chose to skip | Yes |
| `out_of_expertise` | Outside annotator's clinical domain | Yes |

### Validation rules (on submit)

| Field | Rule |
|-------|------|
| Summarization gate | Required: "Yes" or "No" |
| Reason | Required when gate = "No" |
| Task 1 (image description) | Required when gate = "Yes"; minimum 20 words |
| Task 2 (clinical summary) | Required when gate = "Yes"; minimum 20 words |

### Dashboard stats

The dataset picker shows two rows of stats:

**Row 1:** Available datasets, Total samples, Your submitted, Your remaining  
**Row 2:** Yes count, No count, Drafted, Skipped

Each dataset card also shows a per-dataset breakdown of Yes/No/Drafted/Skipped.

---

## 9. Inter-Annotator Agreement (IAA) Rating System

### Design

- **5 annotators** in the IAA pool: Naafila, Chadda, Sanchez, Saja, Wesley
- **Excluded:** Mondal (all datasets), Naafila batch 2
- Each annotator rates the **other 4** annotators' work
- Matching is by shared `post_id` across the 5 pilot datasets
- Only annotations with `status = submitted` and `image_status = Yes` are rateable
- Only annotations with non-empty description and summary are included
- AI annotator IDs are excluded (configurable via `VITE_AI_ANNOTATOR_IDS`)

### What the rater sees

For each shared post_id:
1. The original **image(s)** and **post text** at the top
2. For each peer annotator (identified only by blind code):
   - Their **image description** (left column)
   - Their **clinical summary** (right column)
   - **6 Likert scales** (1–5):

| Category | Criterion | Help Text |
|----------|-----------|-----------|
| Description | Completeness | Covers size, shape, location, count, color, texture, border, symmetry, and distribution where visible |
| Description | Independence | Written without reference to the user's question — only what is visible in the image |
| Summary | Informativeness | Clinically useful content that helps answer the concern |
| Summary | Completeness | Nothing important from the image or post is missing |
| Summary | Combination | Image description and user concern are both present and integrated |
| Summary | Fluency | Clear, grammatical, easy to read and concise |

### Included datasets (hardcoded in `iaaAnnotators.ts`)

```
Dr Naafila pilot study
Dr Chadda pilot study
Dr Sanchez pilot study
Dr Saja pilot study
Dr Wesley pilot study
```

### Rating data flow

```
fetchIaaQuestionsForEvaluator(evaluatorCode)
     │
     ├── Fetch datasets by name (IAA_INCLUDED_DATASET_NAMES)
     ├── Fetch submitted annotations from those datasets by IAA annotator IDs
     ├── Filter: status=submitted, image_status=Yes, non-empty desc+summary, not AI
     ├── Remove evaluator's own annotations
     ├── Group by post_id
     ├── Deduplicate by blind code per post
     └── Fetch sample rows for image/question display
```

### Rating export

Admin can export ratings as CSV or JSONL, one file per evaluator:
- `iaa_ratings_nf.csv` — ratings submitted by Dr Naafila
- `iaa_ratings_c.csv` — ratings submitted by Dr Chadda
- etc.

---

## 10. Admin Panel

### Sections (top to bottom)

1. **IAA Ratings** — View ratings browser + export CSV/JSONL per annotator
2. **Dashboard Stats** — Total datasets, total samples, submitted, remaining (global)
3. **Annotators** — List of all registered annotators + "Add annotator" form
4. **Import Dataset** — Name, assign-to dropdown, file upload, import button
5. **Datasets Table** — Name, assigned-to (editable dropdown), file, progress columns (Total, Submitted, Draft, Skipped, Out of expertise, Remaining), View/Export/Delete actions

### Adding a new annotator

From the **Annotators** section:
1. Enter **Display name** (e.g. `Dr Smith`)
2. Enter **Login ID** (e.g. `dr smith`) — what they'll type at login
3. A **PIN** is auto-generated (click "New PIN" to regenerate)
4. Click **Add annotator**

The annotator is stored in the `annotators` table and immediately available for login and dataset assignment.

### Reassigning a dataset

In the Datasets table, each row has an **Assigned to** dropdown. Changing it updates `datasets.assigned_annotator_id` immediately.

---

## 11. Codebase Map

### Directory structure

```
clinical-annotation-tool/
├── src/
│   ├── App.tsx                    # Root: state machine routing all views
│   ├── main.tsx                   # React DOM mount point
│   ├── index.css                  # Tailwind directives + global styles
│   │
│   ├── components/                # React UI components
│   │   ├── AnnotatorLogin.tsx     # Login form (ID + PIN → Supabase verify)
│   │   ├── ModeSelect.tsx         # Choose: Annotation or Rating
│   │   ├── DatasetSelector.tsx    # Dataset picker with progress stats
│   │   ├── AnnotationPage.tsx     # Annotation workspace orchestrator
│   │   ├── AnnotationForm.tsx     # Summarization gate + Task 1/2 fields
│   │   ├── RatingPage.tsx         # IAA rating workspace
│   │   ├── AnnotatorRatingCard.tsx# Per-annotator Likert score card
│   │   ├── LikertScale.tsx        # 1–5 radio button group
│   │   ├── AdminPanel.tsx         # Import/export/manage datasets + annotators
│   │   ├── AdminPasswordGate.tsx  # Admin username/password login
│   │   ├── AnnotatorManager.tsx   # Add annotator form + annotator list
│   │   ├── AnnotationsViewer.tsx  # In-portal annotation browser
│   │   ├── RatingsViewer.tsx      # In-portal ratings browser
│   │   ├── ImageViewer.tsx        # Multi-image viewer with zoom
│   │   ├── PostPanel.tsx          # Original post text display
│   │   ├── Header.tsx             # Top bar: annotator, dataset, status, logout
│   │   ├── ProgressBar.tsx        # Segmented progress bar
│   │   ├── DashboardStatCards.tsx  # Reusable stat card grid
│   │   ├── AnnotationBreakdown.tsx# Yes/No/Draft/Skipped counts
│   │   ├── SampleSearchBar.tsx    # Search by post_id or question text
│   │   ├── TaskGuidelineModal.tsx # Task 1/2 guideline help modals
│   │   ├── AnnotationStatusPill.tsx # Colored status badge
│   │   ├── AppInteriorShell.tsx   # Interior page background
│   │   ├── AuthPageShell.tsx      # Auth page dark background
│   │   ├── AuthPageLayout.tsx     # Two-column auth layout
│   │   ├── AuthPageAside.tsx      # Auth left panel (UIC branding)
│   │   └── AuthFormCard.tsx       # White card wrapper for forms
│   │
│   └── lib/                       # Business logic & data layer
│       ├── supabase.ts            # Supabase client + all TypeScript types
│       ├── data.ts                # All CRUD operations: datasets, samples,
│       │                          #   annotations, ratings, annotators, progress,
│       │                          #   IAA queries, export helpers
│       ├── annotatorAuth.ts       # Login verification (PIN check via Supabase)
│       ├── annotatorDatasets.ts   # Dataset-to-annotator assignment & filtering
│       ├── iaaAnnotators.ts       # IAA pool config: blind codes, PINs,
│       │                          #   included/excluded dataset names
│       ├── ratingCriteria.ts      # Likert criteria definitions, AI exclusion
│       ├── importDataset.ts       # File parsing (CSV/JSON/JSONL) + Supabase import
│       ├── exportRatings.ts       # Per-evaluator rating file downloads
│       ├── adminGate.ts           # Admin username/password check + session
│       ├── annotationStatus.ts    # Status labels + Tailwind pill classes
│       ├── anonymize.ts           # Blind dataset/annotator labels for rating UI
│       ├── errors.ts              # Format unknown errors for display
│       ├── guidelines.ts          # Constants: PDF URL, logo, university name
│       ├── ui.ts                  # Shared Tailwind classes, gradient styles
│       ├── wordCount.ts           # Word count + 20-word minimum validation
│       ├── csv.ts                 # PapaParse wrappers + file download
│       ├── jsonl.ts               # JSONL/JSON parse and serialize
│       └── datasetFields.ts       # Build question from title/selftext, collect image refs
│
├── supabase/
│   ├── schema.sql                 # Full database schema (run on fresh project)
│   └── migrations/                # Incremental migrations for existing DBs
│       ├── add_summarization_reason.sql
│       ├── add_out_of_expertise_status.sql
│       ├── add_ratings.sql
│       ├── add_annotators.sql
│       └── add_dataset_assigned_annotator.sql
│
├── scripts/
│   ├── prepare-dataset.mjs        # Convert raw JSONL → import-ready with R2 URLs
│   ├── upload-images-to-r2.sh     # Bulk upload images to Cloudflare R2
│   ├── classify-radiology-images.py # CLIP classifier: radiology vs non-radiology
│   ├── smoke-rating.mts           # Smoke tests for IAA logic
│   └── push-to-github.sh          # Safe git push (blocks Dataset/ commits)
│
├── Dataset/                       # Local prepared datasets (gitignored)
│   ├── arctic_data.prepared.jsonl           # Full 539-post dataset
│   ├── pilot_non_radiology_*_sample_20.prepared.jsonl  # Per-doctor pilot sets
│   └── pilot_*.json / *.md                  # Manifests and reports
│
├── public/
│   ├── annotation_guidelines.pdf  # Annotator task guidelines
│   └── uic-logo.png              # University branding
│
├── docs/
│   ├── annotator-login-pins.md    # Login credentials reference
│   ├── HANDOVER.md                # This document
│   └── screenshots/               # README UI screenshots
│
├── .env                           # Local secrets (gitignored)
├── .env.example                   # Env template
├── package.json                   # Dependencies + scripts
├── vite.config.ts                 # Vite + Cloudflare plugin config
├── wrangler.jsonc                 # Cloudflare Workers deploy config
├── tailwind.config.js             # Tailwind content paths
├── tsconfig.json                  # TypeScript strict config
└── postcss.config.js              # PostCSS with Tailwind + Autoprefixer
```

---

## 12. Environment Variables

All are `VITE_*` prefixed (Vite inlines them at **build time**):

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL (e.g. `https://gfedxrcmhsoflkzchpng.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public API key |
| `VITE_ADMIN_USERNAME` | No | Admin panel username (default: `nlp`) |
| `VITE_ADMIN_PASSWORD` | No | Admin panel password (default: `nlp123`) |
| `VITE_AI_ANNOTATOR_IDS` | No | Comma-separated annotator IDs to exclude from rating (default: `ai,AI,gpt,claude,chatgpt`) |
| `VITE_IAA_PINS` | No | Override IAA PINs: `nf:194827,c:385601,sz:572913,s:640158,w:819374` |

**Important:** Because these are build-time variables, changing them requires a rebuild and redeploy. On Cloudflare, set them under **Workers → Settings → Variables and Secrets**.

---

## 13. Local Development

### Prerequisites

- Node.js 18+ and npm
- A Supabase project with the schema applied

### Setup

```bash
git clone https://github.com/abasu9/clinical-annotation-tool.git
cd clinical-annotation-tool
npm install
cp .env.example .env
# Edit .env with your Supabase URL and anon key
npm run dev          # Opens http://localhost:5173
```

### Available scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `npm run dev` | `vite` | Dev server with hot module replacement |
| `npm run build` | `tsc -b && vite build` | Type-check + production build to `dist/` |
| `npm run preview` | `npm run build && wrangler dev` | Build + local Cloudflare Workers preview |
| `npm run typecheck` | `tsc -b --noEmit` | Type-check without emitting |
| `npm run deploy` | `npm run build && wrangler deploy` | Build + deploy to Cloudflare Workers |

---

## 14. Deployment

### Cloudflare Workers (current setup)

The app is deployed as a static SPA on Cloudflare Workers:

```bash
npm run deploy    # Requires: wrangler login OR CLOUDFLARE_API_TOKEN env var
```

This:
1. Runs `tsc -b` (TypeScript type-check)
2. Runs `vite build` (produces `dist/`)
3. Runs `wrangler deploy` (uploads `dist/` assets to Cloudflare)

The `wrangler.jsonc` configures SPA fallback routing so all paths return `index.html`.

### Deploy to a new Cloudflare account

1. `npx wrangler login`
2. Update `wrangler.jsonc` with your worker name if desired
3. Set environment variables in Cloudflare dashboard (or `.env` for CLI builds)
4. `npm run deploy`

### Alternative: any static host

Since there's no backend, you can host `dist/` on any static hosting (Vercel, Netlify, GitHub Pages). Just ensure:
- Environment variables are set at build time
- SPA fallback is configured (all routes → `index.html`)

---

## 15. Supabase Maintenance

### Free tier pausing

Supabase free-tier projects **pause after inactivity**. When paused:
- The API returns HTTP 521 ("Web server is down")
- The app shows "Failed to load" errors

**To restore:** Go to https://supabase.com/dashboard → your project → **Restore**.

After restoring, the PostgREST schema cache may be stale. Run in the SQL editor:

```sql
NOTIFY pgrst, 'reload schema';
```

### Setting up a fresh Supabase project

1. Create a project at https://supabase.com
2. Open the **SQL Editor**
3. Paste and run `supabase/schema.sql`
4. Seed pilot annotators by running `supabase/migrations/add_annotators.sql`
5. Copy the **Project URL** and **anon key** from **Settings → API**
6. Set them in `.env` and redeploy

### Running migrations on an existing project

If the project already has older tables:

```
1. add_summarization_reason.sql     (adds summarization_reason column)
2. add_out_of_expertise_status.sql  (extends status check constraint)
3. add_ratings.sql                  (creates ratings table)
4. add_annotators.sql               (creates annotators table + seeds pilot data)
5. add_dataset_assigned_annotator.sql (adds assigned_annotator_id to datasets)
```

Run these in order in the SQL editor. They are all idempotent (safe to re-run).

### Direct database access

If you have the database password, you can connect via `psql`:

```bash
psql -h db.gfedxrcmhsoflkzchpng.supabase.co -U postgres -d postgres
```

The database password is set in Supabase **Project Settings → Database**.

---

## 16. Current Data State (Pilot)

### Datasets in the database (7 total)

| Dataset Name | Samples | Assigned To | Used In Rating? |
|-------------|---------|-------------|-----------------|
| Dr Naafila pilot study | 20 | dr naafila | Yes |
| Dr Naafila pilot study batch 2 | 20 | dr naafila | **No** (excluded) |
| Dr Chadda pilot study | 20 | dr aditya | Yes |
| Dr Sanchez pilot study | 20 | Dr Sanchez | Yes |
| Dr Saja pilot study | 20 | Dr Saja | Yes |
| Dr Wesley pilot study | 20 | Dr Wesley | Yes |
| Dr Mondal pilot study | 20 | dr mondal | **No** (excluded) |

### Pilot annotators (seeded in DB)

| Login ID | Display Name | PIN | IAA Code |
|----------|-------------|-----|----------|
| `dr naafila` | Dr Naafila | `194827` | nf |
| `dr aditya` | Dr Chadda | `385601` | c |
| `Dr Sanchez` | Dr Sanchez | `572913` | sz |
| `Dr Saja` | Dr Saja | `640158` | s |
| `Dr Wesley` | Dr Wesley | `819374` | w |
| `dr mondal` | Dr Mondal | `506281` | — (not in IAA pool) |

**Note:** Login IDs are **case-sensitive in the database** (e.g. `Dr Sanchez` with capital D and S). The login form does case-insensitive matching via `login_aliases`.

### Local dataset files (in `Dataset/`, gitignored)

| File | Description |
|------|-------------|
| `arctic_data.prepared.jsonl` | Full 539-post Arctic dataset (prepared with R2 URLs) |
| `pilot_non_radiology_*_sample_20.prepared.jsonl` | 20-post pilot sets per doctor |
| `arctic_radiology_labels.json` | CLIP classification output for radiology filtering |
| `pilot_*.json` | Batch assignment manifests |
| `pilot_*.md` | Overlap and selection reports |

---

## 17. Extending the System

### Adding a new annotator

**No code changes needed.** In the admin panel:
1. **Annotators** section → fill in Display name, Login ID, PIN
2. Click **Add annotator**
3. Import or reassign a dataset to them
4. Share their login ID and PIN privately

### Adding a new dataset for an existing annotator

1. Prepare the JSONL file (see [Dataset Pipeline](#7-dataset-pipeline--end-to-end))
2. Admin → **Import dataset** → set name, select annotator, upload file
3. The annotator will see it on their next login

### Adding a new annotator to the IAA rating pool

This requires a code change in `src/lib/iaaAnnotators.ts`:

1. Add a new entry to `IAA_ANNOTATORS` array with a new blind code
2. Add the dataset name to `IAA_INCLUDED_DATASET_NAMES`
3. Optionally add a PIN to `DEFAULT_PINS`
4. Rebuild and redeploy

### Adding new Likert criteria

Edit `src/lib/ratingCriteria.ts`:
1. Add the criterion to `DESCRIPTION_CRITERIA` or `SUMMARY_CRITERIA`
2. Add the corresponding score field to the TypeScript interfaces
3. Add a new column to the `ratings` table (migration SQL)
4. Update `UpsertRatingInput` in `data.ts`
5. Update `RatingExportRow` for exports

### Changing admin credentials

Set `VITE_ADMIN_USERNAME` and `VITE_ADMIN_PASSWORD` in `.env`, rebuild, and redeploy.

---

## 18. Known Limitations & Security

### Security warnings (prototype-grade)

| Issue | Impact | Mitigation for production |
|-------|--------|--------------------------|
| **RLS disabled** | Any browser with the anon key can read/write all data | Enable RLS and add row-level policies |
| **PINs in plaintext** | Anyone with DB access can see all PINs | Hash PINs (bcrypt) and compare hashes |
| **Admin credentials in JS bundle** | Anyone can extract username/password from the built JS | Use Supabase Auth or server-side auth |
| **Anon key in browser** | Visible in network requests and source | Normal for Supabase public apps; RLS is the protection layer |
| **No rate limiting** | Unlimited login attempts | Add rate limiting via Cloudflare WAF rules or server-side |
| **No audit logging** | No record of who did what beyond timestamps | Add an audit table or use Supabase's built-in logging |

### Functional limitations

- **No XLSX support** — convert to CSV or JSONL before import
- **No image upload** — images must be pre-uploaded to R2 and referenced by URL
- **Rating pool is hardcoded** — adding/removing IAA annotators requires a code change
- **Single annotation per sample per annotator** — by design (upsert on `sample_id + annotator_id`)
- **No undo** — submitted annotations cannot be reverted to draft from the UI (can be changed in DB)
- **No annotator deletion** — annotators can be added but not removed from the admin UI (can be deleted in DB)

---

## 19. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Failed to load rating data" or "Failed to load datasets" | Supabase project is paused or down | Restore project in Supabase dashboard; run `NOTIFY pgrst, 'reload schema';` in SQL editor |
| "Could not find the table in the schema cache" (PGRST205) | PostgREST cache is stale after restore | Run `NOTIFY pgrst, 'reload schema';` in SQL editor |
| Images not loading | R2 URLs are wrong or R2 public access is disabled | Verify the public dev URL is enabled in R2 settings; check URLs in the dataset JSONL |
| "Unknown annotator ID" on login | Annotator not in the `annotators` table | Admin adds them via the Annotators section |
| "Incorrect PIN" | PIN doesn't match what's in the DB | Admin can check/reset in the DB directly |
| Admin login fails | Wrong username/password or env vars not set at build time | Check `VITE_ADMIN_USERNAME`/`VITE_ADMIN_PASSWORD`; default is `nlp`/`nlp123` |
| Import fails: "No valid rows" | Missing `post_id` or `question` columns in the file | Ensure the file has `post_id`, `question`, and `image_urls` columns |
| Blank page after deploy | Env vars not set at build time | Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` before building |
| `permission denied for table` | RLS was re-enabled | Disable RLS or add appropriate policies (see `schema.sql`) |
| Dataset not showing for annotator | Not assigned or wrong assignment | Check `assigned_annotator_id` in admin panel; reassign if needed |
| Rating page says "not in the rating pool" | Annotator is not one of the 5 IAA doctors | Only nf/c/sz/s/w can access Rating; others see Annotation only |

---

*Document generated for project handover. For questions, refer to the codebase comments or the conversation history in the Cursor agent transcripts.*
