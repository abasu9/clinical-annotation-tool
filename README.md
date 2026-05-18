# Clinical Multimodal Annotation Tool

A lean, **serverless** web app for expert annotation of multimodal clinical
posts (text + images). Designed for small expert teams who need a clean
interface, structured outputs, and zero backend ops.

Each sample can produce two annotation outputs (when summarization is required):

1. **Objective Image Description** — what is literally visible in the image
2. **Final Multimodal Clinical Summary** — clinician-grade synthesis of post + image

> **Live app:** [https://clinical-annotation-tool.abhishek-basu2010.workers.dev](https://clinical-annotation-tool.abhishek-basu2010.workers.dev)  
> **Source:** [github.com/abasu9/clinical-annotation-tool](https://github.com/abasu9/clinical-annotation-tool)

---

## Highlights

- **Single-page React app** — no backend server; Supabase + R2 from the browser.
- **Two roles:**
  - **Annotators** — enter an **annotator ID** (stored in `localStorage`).
  - **Admins** — **username + password** to import datasets, view progress, export, and delete.
- **Annotation layout** — image (left) and original post (right); annotation form below.
- **Summarization gate** — *Does this question require summarization?* (Yes / No); if **No**, a **Reason** is required; if **Yes**, both task fields are required on submit.
- **In-portal annotation viewer** — filter by status / annotator / search; expand rows; export filtered or full CSV/JSONL.
- **Annotation guidelines** — PDF link in the header and on the login screen (`public/annotation_guidelines.pdf`).
- **Dataset prep script** — expand multi-image local folders and rewrite paths to public R2 URLs.
- **Cloudflare Workers** hosting with Git-connected deploy (`wrangler.jsonc`).

---

## User roles

| Role | How to access | What they can do |
|------|----------------|------------------|
| **Annotator** | Enter annotator ID on the home screen | Pick a dataset, annotate samples, save draft / submit / skip |
| **Admin** | Click **Admin** → sign in | Import CSV/JSONL, view annotations, download exports, delete datasets |

**Default admin credentials** (override with env vars before production):

- Username: `admin`
- Password: `admin123`

Admin unlock lasts about **8 hours** per browser tab (`sessionStorage`). Use **Logout** in the admin panel to lock again immediately.

Annotators do **not** need a password — only a unique annotator ID (shown on exports).

---

## Architecture

```
 ┌─────────────────────────────────────────────┐
 │  Browser (React + TypeScript + Tailwind)    │
 │                                             │
 │   ┌───────────────┐    ┌──────────────────┐ │
 │   │ Annotator UI  │    │ Admin Panel      │ │
 │   │ (annotator ID)│    │ (username/pw)    │ │
 │   │ Annotate      │    │ Import / Export  │ │
 │   └───────┬───────┘    └────────┬─────────┘ │
 │           │                     │           │
 │           ▼                     ▼           │
 │   ┌─────────────────────────────────────┐   │
 │   │ Supabase JS client (REST)           │   │
 │   └────────────────┬────────────────────┘   │
 └────────────────────┼────────────────────────┘
                      │                     ▲
   ┌──────────────────▼──────────────┐      │ images (HTTPS)
   │ Supabase Postgres               │      │
   │  • datasets / samples /         │      │
   │    annotations (RLS off in       │      │
   │    prototype)                   │      │
   └─────────────────────────────────┘      │
                                            │
                              ┌─────────────┴──────────────┐
                              │ Cloudflare R2               │
                              │  • public image URLs        │
                              └─────────────────────────────┘
```

| Layer            | Choice                                                   |
| ---------------- | -------------------------------------------------------- |
| Frontend         | React 18 + TypeScript + Tailwind CSS (Vite 6)            |
| Database         | Supabase Postgres (browser client)                       |
| Image storage    | Cloudflare R2 (public URLs in dataset file)              |
| Hosting          | Cloudflare Workers static assets (recommended)           |
| Backend          | **None**                                                 |
| Export           | CSV / JSONL from Supabase via the admin UI               |

> **Privacy.** The prototype uses the Supabase **anon key** in the browser with RLS **disabled**. Do not upload identifiable patient data without IRB / project approval. For production, enable RLS and stronger admin auth.

---

## Quick start (local dev)

```bash
git clone https://github.com/abasu9/clinical-annotation-tool.git
cd clinical-annotation-tool
npm install
cp .env.example .env    # add Supabase URL + anon key (admin creds optional)
npm run dev             # http://localhost:3000
```

| Command            | Purpose                                |
| ------------------ | -------------------------------------- |
| `npm run dev`      | Dev server with HMR                    |
| `npm run build`    | Type-check + production `dist/`        |
| `npm run preview`  | Build + local Wrangler preview         |
| `npm run deploy`   | Build + `wrangler deploy` (needs login)|
| `npm run typecheck`| Type-check only                        |

---

## Setup

### 1. Supabase project

1. [supabase.com](https://supabase.com) → **New Project**.
2. **Project Settings → API** → copy **Project URL** and **anon public key**.

### 2. Database schema

In the Supabase **SQL editor**, run [`supabase/schema.sql`](supabase/schema.sql).

Creates `datasets`, `samples`, `annotations` (with `summarization_reason`), indexes, `updated_at` trigger, and **disables RLS** for the prototype.

If your project predates `summarization_reason`, also run
[`supabase/migrations/add_summarization_reason.sql`](supabase/migrations/add_summarization_reason.sql).

### 3. Cloudflare R2 (images)

1. **R2 → Create bucket** (e.g. `clinical-annotation-images`).
2. Enable a **public dev URL** (`pub-*.r2.dev`) or attach a custom domain.
3. Upload images (dashboard, `rclone`, `wrangler`, or AWS CLI against the R2 endpoint).

The app does **not** upload images — only stores HTTPS URLs in the dataset file.

### 4. Dataset file format

Required columns:

| Column                          | Notes                        |
| ------------------------------- | ---------------------------- |
| `post_id`                       | Unique per row               |
| `question`                      | Full post text               |
| `image_urls` or `image_paths`   | See formats below            |

`image_urls` may be a single URL, semicolon-separated URLs, a JSON array string, or (JSONL) a native array.

**CSV example:**

```csv
post_id,question,image_urls
DEMO_001,"Synthetic placeholder post","https://pub-xxxx.r2.dev/images_sample_100/DEMO_001_0.jpg"
```

**JSONL example:**

```json
{"post_id":"DEMO_001","question":"Synthetic placeholder post","image_urls":["https://pub-xxxx.r2.dev/images_sample_100/DEMO_001_0.jpg"]}
```

> **XLSX** is not supported — convert to CSV or JSONL first.

### 5. Prepare local data for R2 (optional)

If rows have `local_path` / `local_paths` and your folder has `_0.jpg`, `_1.jpg`, …:

```bash
node scripts/prepare-dataset.mjs \
  --input  "/abs/path/data_sample_100.jsonl" \
  --images "/abs/path/images_sample_100" \
  --base   "https://pub-xxxx.r2.dev/images_sample_100" \
  --output "Dataset/data_sample_100.prepared.jsonl"
```

Import the **prepared** JSONL in Admin — not the raw file with local paths.

Reference file in repo: `Dataset/data_sample_100.prepared.jsonl` (100 rows, one image per post).

### 6. Environment variables

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY

# Optional — defaults to admin / admin123 if omitted
VITE_ADMIN_USERNAME=admin
VITE_ADMIN_PASSWORD=admin123
```

Restart `npm run dev` after changing `.env`.

Vite inlines `VITE_*` at **build time**. On Cloudflare, set them under **Settings → Build → Variables and Secrets** (not runtime-only vars).

> Admin credentials are also compiled into the JS bundle (prototype-only security). Change them before a public launch.

### 7. Deploy

**Cloudflare (recommended)**

1. **Workers & Pages → Connect to Git** → this repo.
2. Build: `npm run build` → output `dist` → deploy `npx wrangler deploy` (or use dashboard defaults + `wrangler.jsonc`).
3. Build variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and optionally `VITE_ADMIN_USERNAME` / `VITE_ADMIN_PASSWORD`.
4. Push to `main` to redeploy.

**CLI**

```bash
npm run deploy   # requires wrangler login or CLOUDFLARE_API_TOKEN
```

Other static hosts (Vercel, Netlify, GitHub Pages) work if `VITE_*` vars are set at build time and `base: "./"` in `vite.config.ts` is kept.

---

## Annotation workflow (annotators)

1. Open the app → enter **annotator ID** → **Start Annotating**.
2. Select a **dataset**.
3. For each sample:
   - Read the **post** (right) and view **image(s)** (left).
   - **Does this question require summarization?** → **Yes** or **No**.
   - If **No** → choose **Reason** (required for draft and submit).
   - If **Yes** → complete **Task 1** (objective image description) and **Task 2** (clinical summary); guidelines appear in scrollable boxes above each field.
4. **Save Draft**, **Skip**, **Submit & Next**, or **Previous / Next**.

**Submit validation**

| Field | Rule |
| ----- | ---- |
| Requires summarization? | Required (Yes or No) |
| Reason | Required when answer is **No** |
| Task 1 & Task 2 | Required when answer is **Yes**; each must be **at least 20 words** |

**Draft validation** — summarization choice required; if **No**, reason required; if **Yes**, both tasks need 20+ words before save or submit.

---

## Admin workflow

1. **Admin** → sign in (`admin` / `admin123` by default).
2. **Import** — dataset name + `.csv` or `.jsonl`.
3. **View** — in-portal browser with filters and filtered export.
4. **CSV / JSONL** — full-dataset download per row.
5. **Delete** — remove a dataset and all its samples/annotations.
6. **Logout** — locks admin for this tab.

Exported rows include:

```json
{
  "dataset_id": "…",
  "post_id": "DEMO_001",
  "original_question": "…",
  "image_urls": ["…"],
  "image_status": "Yes",
  "summarization_reason": null,
  "objective_image_description": "…",
  "final_multimodal_clinical_summary": "…",
  "annotator_id": "expert_001",
  "status": "submitted",
  "created_at": "…",
  "updated_at": "…"
}
```

(`image_status` stores Yes/No for “requires summarization”; legacy values may still appear in old rows.)

---

## Project layout

```
clinical-annotation-tool/
├─ src/
│  ├─ App.tsx
│  ├─ main.tsx
│  ├─ lib/
│  │   ├─ supabase.ts
│  │   ├─ adminGate.ts           # Admin username/password + session
│  │   ├─ data.ts
│  │   ├─ importDataset.ts
│  │   ├─ guidelines.ts
│  │   ├─ csv.ts / jsonl.ts
│  └─ components/
│      ├─ AnnotatorLogin.tsx
│      ├─ AdminPasswordGate.tsx
│      ├─ AdminPanel.tsx
│      ├─ AnnotationsViewer.tsx
│      ├─ AnnotationPage.tsx
│      ├─ AnnotationForm.tsx
│      ├─ DatasetSelector.tsx
│      ├─ Header.tsx
│      ├─ ImageViewer.tsx
│      ├─ PostPanel.tsx
│      └─ ProgressBar.tsx
├─ public/
│  └─ annotation_guidelines.pdf
├─ supabase/
│  ├─ schema.sql
│  └─ migrations/add_summarization_reason.sql
├─ scripts/prepare-dataset.mjs
├─ Dataset/                      # prepared JSONL (example)
├─ wrangler.jsonc
├─ vite.config.ts
└─ .env.example
```

---

## Data model

```
datasets
  id, name, uploaded_filename, total_samples, created_at

samples
  id, dataset_id → datasets, post_id, question, image_urls (jsonb), created_at

annotations
  id, sample_id → samples, dataset_id, post_id, annotator_id
  image_status              -- "Yes" | "No" (requires summarization)
  summarization_reason      -- set when image_status = "No"
  objective_image_description
  final_multimodal_clinical_summary
  status                    -- draft | submitted | skipped
  created_at, updated_at
  UNIQUE (sample_id, annotator_id)
```

Saves use **upsert** on `(sample_id, annotator_id)`.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Supabase not configured banner | Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at **build** time; redeploy. |
| Images broken after import | Import **prepared** JSONL with `https://` R2 URLs, not local paths. |
| Admin login fails | Default `admin` / `admin123`; or set `VITE_ADMIN_*` in `.env` and restart dev / redeploy. |
| Import: no valid rows | Check `post_id`, `question`, and `image_urls` / `image_paths`. |
| `permission denied for table` | RLS was re-enabled — add policies or disable RLS (see `schema.sql`). |
| Blank page on host | Env vars must be build-time; keep `base: "./"` in Vite config. |

---

## License

[MIT](LICENSE)

## Acknowledgments

Supabase, Cloudflare R2 + Workers, Vite, React, Tailwind CSS.
