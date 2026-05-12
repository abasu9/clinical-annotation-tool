# Clinical Multimodal Annotation Tool

A lean, **serverless** web app for expert annotation of multimodal clinical
posts (text + images). Designed for small expert teams who need a clean
interface, structured outputs, and zero backend ops.

Each sample produces two outputs:

1. **Objective Image Description** — what is literally visible in the image
2. **Final Multimodal Clinical Summary** — clinician-grade synthesis of post + image

> **Live demo:** [https://clinical-annotation-tool.abhishek-basu2010.workers.dev](https://clinical-annotation-tool.abhishek-basu2010.workers.dev)
> **Source:** [github.com/abasu9/clinical-annotation-tool](https://github.com/abasu9/clinical-annotation-tool)

---

## Highlights

- **Single-page React app** — no backend code, no servers to babysit.
- **Per-annotator workflow** — login by ID, resume across refreshes (`localStorage`).
- **In-portal annotation viewer** — filter by status / annotator / free-text
  search; expand any row to see the full question and annotation text.
- **Two-click CSV / JSONL export** of the entire dataset, or just the
  currently filtered subset.
- **Real-time progress** counters (submitted · draft · skipped · remaining)
  per dataset.
- **Multi-image viewer** with zoom, navigation, and a graceful broken-image
  placeholder.
- **Optional dataset preparation script** that fans out multi-image posts
  and rewrites local paths to public R2 URLs.

---

## Architecture

```
 ┌─────────────────────────────────────────────┐
 │  Browser (React + TypeScript + Tailwind)    │
 │                                             │
 │   ┌───────────────┐    ┌──────────────────┐ │
 │   │ Annotator UI  │    │ Admin Panel      │ │
 │   │ Login         │    │ Import dataset   │ │
 │   │ Annotate      │    │ View / Download  │ │
 │   └───────┬───────┘    └────────┬─────────┘ │
 │           │                     │           │
 │           ▼                     ▼           │
 │   ┌─────────────────────────────────────┐   │
 │   │ Supabase JS client (REST + Auth)    │   │
 │   └────────────────┬────────────────────┘   │
 └────────────────────┼────────────────────────┘
                      │                     ▲
   ┌──────────────────▼──────────────┐      │ images
   │ Supabase Postgres               │      │ (HTTPS)
   │  • datasets / samples /         │      │
   │    annotations (RLS off in      │      │
   │    prototype)                   │      │
   └─────────────────────────────────┘      │
                                            │
                              ┌─────────────┴──────────────┐
                              │ Cloudflare R2 (S3-compat.)  │
                              │  • images_sample_100/*.jpg  │
                              └─────────────────────────────┘
```

| Layer            | Choice                                                   |
| ---------------- | -------------------------------------------------------- |
| Frontend         | React 18 + TypeScript + Tailwind CSS (Vite 6)            |
| Database         | Supabase Postgres (called directly from the browser)     |
| Image storage    | Cloudflare R2 (public or signed URLs)                    |
| Hosting          | Cloudflare Workers (static assets), Pages, Vercel, etc.  |
| Backend          | **None** — purely client-side                            |
| Export           | Browser exports CSV / JSONL directly from Supabase data  |

> **Privacy notice.** The prototype uses the Supabase **public anon key** in
> the browser with Row Level Security **disabled**. Treat the deployed URL
> as confidential. Do **not** upload identifiable patient data unless it is
> covered by your IRB / project policy. For production, enable RLS in
> `supabase/schema.sql` and add real authentication.

---

## Quick start (local dev, ~5 minutes)

```bash
git clone https://github.com/abasu9/clinical-annotation-tool.git
cd clinical-annotation-tool
npm install
cp .env.example .env       # then fill in your Supabase URL + anon key
npm run dev                # http://localhost:3000
```

That's enough to log in, open the Admin Panel, and import a dataset. You'll
need Supabase set up (next section) for anything to actually save.

### Available scripts

| Command           | Purpose                                                  |
| ----------------- | -------------------------------------------------------- |
| `npm run dev`     | Vite dev server with HMR on `http://localhost:3000`      |
| `npm run build`   | Type-check (`tsc -b`) and produce a production `dist/`   |
| `npm run preview` | Serve the production bundle locally                      |
| `npm run typecheck` | Type-check without emitting                            |

---

## 1. Create the Supabase project

1. Sign in at [supabase.com](https://supabase.com) → **New Project**.
2. Once provisioned, go to **Project Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

## 2. Run the schema

In the Supabase **SQL editor**, paste the contents of
[`supabase/schema.sql`](supabase/schema.sql) and click **Run**. This creates:

- `datasets` — one row per imported batch.
- `samples` — one row per post (`post_id`, `question`, `image_urls jsonb`).
- `annotations` — one row per `(sample, annotator)` pair, with an
  `(sample_id, annotator_id)` unique index for clean upserts.
- An `updated_at` trigger and the necessary indexes.
- RLS is **disabled** in the prototype. Re-enable it before production.

## 3. Create a Cloudflare R2 bucket

1. Cloudflare dashboard → **R2 → Create bucket**
   (e.g. `clinical-annotation-images`).
2. Choose how images will be served:
   - **Public dev URL** — turn on the `pub-*.r2.dev` subdomain. Rate-limited
     but fine for prototypes. Cloudflare blocks non-browser user agents on
     these domains, so `<img>` tags work but `curl` may not.
   - **Custom domain** — recommended for sharing widely. Attach a Cloudflare
     domain in the bucket settings.
   - **Private + signed URLs** — keep the bucket private and pre-sign URLs
     out-of-band before importing.

## 4. Upload images to R2

Use whichever tool you like — Cloudflare's dashboard, `rclone`, `wrangler`,
or the AWS CLI pointed at the S3-compatible endpoint:

```bash
aws s3 cp ./images_sample_100/ s3://YOUR_BUCKET/images_sample_100/ \
  --recursive \
  --endpoint-url https://<account-id>.r2.cloudflarestorage.com
```

The app does **not** upload images itself — it only references existing URLs.

## 5. Put R2 URLs in the dataset file

Three columns are required:

| Column                          | Type                          |
| ------------------------------- | ----------------------------- |
| `post_id`                       | text, unique per row          |
| `question`                      | text (full post body)         |
| `image_urls` *or* `image_paths` | image references (see below)  |

`image_urls` may be:

- a single URL: `https://r2.example.com/A.jpg`
- semicolon-separated: `https://.../A.jpg;https://.../B.jpg`
- a JSON-array string: `["https://.../A.jpg","https://.../B.jpg"]`
- in JSONL, a native JSON array

### Minimal examples

CSV:

```csv
post_id,question,image_urls
DEMO_001,"Synthetic placeholder post","https://r2.example.com/DEMO_001_0.jpg;https://r2.example.com/DEMO_001_1.jpg"
```

JSONL:

```json
{"post_id":"DEMO_001","question":"Synthetic placeholder post","image_urls":["https://r2.example.com/DEMO_001_0.jpg"]}
```

> **XLSX is not supported** in the importer to keep the bundle small.
> Convert XLSX to CSV/JSONL first (Excel → *Save As* → CSV).

### Preparing a local dataset with multiple images per post

If your source file uses a single `local_path` per row (e.g. only `_0.jpg`)
but the matching folder on disk also has `_1.jpg`, `_2.jpg`, …, the helper
script will fan them out and rewrite to R2 URLs:

```bash
node scripts/prepare-dataset.mjs \
  --input  "/abs/path/data_sample_100.jsonl" \
  --images "/abs/path/images_sample_100" \
  --base   "https://r2.example.com/images_sample_100" \
  --output "Dataset/data_sample_100.prepared.jsonl"
```

The script:

- Accepts any of `image_urls / image_paths / image_path / local_path / local_paths`.
- Scans the images folder and expands each `post_id` into all `_0..N` files.
- Rewrites filenames as `<base>/<filename>` so the browser fetches them
  directly from R2.
- Outputs a clean JSONL ready for the Admin importer.

> **Sensitive content check.** The reference 100-sample file contains
> long-form posts that read like real medical descriptions (age, sex,
> medications, conditions). Confirm de-identification / IRB coverage before
> importing into a Supabase project where the anon key is public.

## 6. Configure environment variables

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

Vite inlines `VITE_*` values at **build time** — they must exist *before*
`npm run build` (or before any CI build). They are baked into the JS bundle
that ships to the browser. The anon key is designed to be public, but is
only safe if RLS is enabled and configured.

---

## 7. Deploy

> The repo ships with a [`wrangler.jsonc`](wrangler.jsonc) so it deploys
> cleanly under Cloudflare's unified Workers + Static Assets flow without
> any extra config.

### Cloudflare (recommended — same account as R2)

1. **Workers & Pages → Create → Connect to Git**, choose this repo.
2. Build settings (auto-detected from `package.json` and `wrangler.jsonc`):
   - **Build command** — `npm run build`
   - **Build output directory** — `dist`
   - **Deploy command** — `npx wrangler deploy`
3. **Settings → Build → Variables and Secrets** — add as **build-time**
   variables (not runtime — the SPA inlines them at build):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. **Save & deploy.** You get a stable URL such as
   `https://<project>.<account>.workers.dev`.

Push to `main` → new build → new deployment, automatically.

### Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. Framework auto-detects as **Vite** — leave defaults.
3. **Settings → Environment Variables** — add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` for **Production + Preview + Development**.
4. Deploy. *(Note: Vercel's Hobby plan is "non-commercial use only".)*

### Netlify

1. New site from Git → pick this repo.
2. Build command `npm run build`, publish directory `dist`.
3. **Site settings → Environment variables** — add both `VITE_*` vars.
4. Deploy.

### GitHub Pages

1. Set repo **Settings → Pages → Source = GitHub Actions**.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as **repository
   Actions secrets**.
3. Add a workflow that runs `npm ci && npm run build` with those secrets
   exposed as `env:` and publishes `dist/` to Pages. The `base: "./"` in
   `vite.config.ts` makes the build work under any subpath.

### Anywhere else

Any static host that serves the `dist/` folder works (S3 + CloudFront, Fly,
Render static, etc.). The only requirement is that the two `VITE_*`
variables are set in the **build environment**, not at runtime.

---

## 8. Admin: import a dataset

1. Open the app → **Go to Admin Panel**.
2. Enter a **dataset name** and pick a `.csv` or `.jsonl` file matching the
   schema above.
3. Click **Import**. The browser parses the file, creates a `datasets` row,
   and inserts samples in batches into `samples`. Progress is shown live.
4. The new dataset appears in the table with submitted / draft / skipped /
   remaining counters that update as annotators work.

## 9. Admin: view & download results — *all from the portal*

In the Datasets table, each row has **View · CSV · JSONL**:

- **View** opens the in-portal annotation viewer (a full-screen modal):
  - Filter by **Status** (all / submitted / draft / skipped).
  - Filter by **Annotator** (auto-populated from saved rows).
  - Free-text **search** across `post_id`, question, and annotation text.
  - Expand any row to see the full original question, image URLs, and the
    complete annotation fields.
  - **Download CSV / JSONL** from inside the viewer to export only the
    rows currently visible (filename gets an `_all` or `_filtered` tag).
- **CSV / JSONL** next to each dataset row downloads the full annotation
  set for that dataset in one click.

Each exported row contains:

```json
{
  "dataset_id": "…",
  "post_id": "DEMO_001",
  "original_question": "…",
  "image_urls": ["…"],
  "image_status": "Image available",
  "objective_image_description": "…",
  "final_multimodal_clinical_summary": "…",
  "annotator_id": "expert_001",
  "status": "submitted",
  "created_at": "…",
  "updated_at": "…"
}
```

The CSV variant has the same columns; `image_urls` is joined with `;`.

If two annotators annotated the same `post_id`, you get **two rows** for
that sample (one per annotator) — useful for inter-annotator agreement.

## 10. Annotators: use the link

Send annotators the deployed URL. They:

1. Enter an **annotator ID** (saved in `localStorage` so a refresh keeps
   the session).
2. Pick a **dataset**.
3. Work through the **next pending sample** for that ID — drafts stay
   pending; submitted / skipped move on.
4. Use **Save Draft** to come back later, **Skip** to mark unscorable,
   **Submit & Next** to advance, or **Previous / Next** to jog around.

### Validation enforced on submit

- `image_status` is **required**.
- `final_multimodal_clinical_summary` is **required**.
- `objective_image_description` is **required** when `image_status` is
  *Image available* or *No medical finding visible*.
- When `image_status` is *Image not assessable* or *Image link broken*,
  the form auto-fills `objective_image_description` with
  **"Image not assessable."** if left empty.

Saving a draft only requires that **Image Status** be selected; other
fields can be incomplete.

---

## Project layout

```
clinical-annotation-tool/
├─ src/
│  ├─ App.tsx
│  ├─ main.tsx
│  ├─ index.css
│  ├─ lib/
│  │   ├─ supabase.ts          # Supabase client + row types
│  │   ├─ csv.ts               # CSV parse/unparse + file download
│  │   ├─ jsonl.ts             # JSONL parse/serialize
│  │   ├─ importDataset.ts     # Parse file → insert dataset + samples
│  │   └─ data.ts              # Queries + upsert + export helpers
│  └─ components/
│      ├─ Header.tsx
│      ├─ AnnotatorLogin.tsx
│      ├─ AdminPanel.tsx
│      ├─ AnnotationsViewer.tsx  # In-portal annotation browser + filtered download
│      ├─ DatasetSelector.tsx
│      ├─ AnnotationPage.tsx
│      ├─ PostPanel.tsx
│      ├─ ImageViewer.tsx
│      ├─ AnnotationForm.tsx
│      └─ ProgressBar.tsx
├─ supabase/
│  └─ schema.sql                # Tables, indexes, trigger, RLS toggle
├─ scripts/
│  ├─ prepare-dataset.mjs       # Fan out + R2-URL-ify a local dataset
│  └─ push-to-github.sh         # First-time push helper (safety checks)
├─ sample_data/                 # Template / reference files (gitignored if real)
├─ Dataset/                     # User-prepared JSONLs (gitignored)
├─ wrangler.jsonc               # Cloudflare static-assets deploy config
├─ vite.config.ts               # base: "./" so the build works anywhere
├─ tailwind.config.js
├─ postcss.config.js
├─ tsconfig.json
├─ .env.example
└─ README.md
```

---

## Data model (Supabase)

```
datasets
  id (uuid, pk)
  name (text)
  uploaded_filename (text, null)
  total_samples (int)
  created_at (timestamptz)

samples
  id (uuid, pk)
  dataset_id (uuid, fk → datasets.id, on delete cascade)
  post_id (text)
  question (text)
  image_urls (jsonb)            -- array of strings
  created_at (timestamptz)

annotations
  id (uuid, pk)
  sample_id (uuid, fk → samples.id, on delete cascade)
  dataset_id (uuid)
  post_id (text)
  annotator_id (text)
  image_status (text)
  objective_image_description (text, null)
  final_multimodal_clinical_summary (text, null)
  status (text: 'draft' | 'submitted' | 'skipped')
  created_at, updated_at (timestamptz)
  UNIQUE (sample_id, annotator_id)
```

Every save in the UI is an `UPSERT` keyed on
`(sample_id, annotator_id)` — re-saving the same sample updates the row in
place rather than creating duplicates.

---

## Troubleshooting

| Symptom | Try |
| --- | --- |
| Yellow **"Supabase not configured"** banner | `VITE_*` env vars weren't set at build time. On Cloudflare: **Settings → Build → Variables and Secrets** (not the runtime section). Push a no-op commit to trigger a fresh build. |
| `"Missing VITE_SUPABASE_URL…"` in console | Locally: create `.env` and restart `npm run dev`. |
| Import fails with **"No valid rows"** | Confirm `post_id`, `question`, and `image_urls`/`image_paths` columns exist and `post_id` is non-empty. |
| All images show the broken placeholder | Open one URL directly in a browser tab. If it 403s, your R2 bucket isn't public or the signed URL has expired. `curl`-ing `pub-*.r2.dev` URLs may also 403 because Cloudflare blocks non-browser user agents there — open in a real browser. |
| `permission denied for table datasets` | The schema disables RLS; if you re-enabled it, add policies (see the commented section in `supabase/schema.sql`) or temporarily disable RLS again. |
| Build OK locally, blank page on host | Ensure `base: "./"` is in `vite.config.ts` and that env vars were passed at **build time** (CI/host build step), not runtime. |
| Cloudflare build succeeds but env vars not in bundle | Vars are in **runtime** vars, not **build-time**. Move them to *Settings → Build → Variables and Secrets* and push a fresh commit. |
| Wrangler deploy fails: "no wrangler config" | The repo ships `wrangler.jsonc`; make sure it isn't accidentally `.gitignored` and that Cloudflare picked up the latest commit. |

---

## License

[MIT](LICENSE) — do with it what you want, just don't sue.

## Acknowledgments

- [Supabase](https://supabase.com) for the managed Postgres + JS client.
- [Cloudflare R2 + Workers](https://cloudflare.com) for image storage and
  static hosting on a generous free tier.
- [Vite](https://vitejs.dev), [React](https://react.dev), and
  [Tailwind CSS](https://tailwindcss.com) for making the frontend fast and
  pleasant to build.
