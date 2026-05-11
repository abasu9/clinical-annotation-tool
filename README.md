# Clinical Multimodal Annotation Tool

A frontend-only web app for expert annotation of multimodal posts.
Each sample produces two outputs:

1. **Objective Image Description**
2. **Final Multimodal Clinical Summary**

## Architecture

| Layer            | Choice                                              |
| ---------------- | --------------------------------------------------- |
| Frontend         | React + TypeScript + Tailwind CSS (Vite)            |
| Hosting          | GitHub Pages, Vercel, Netlify, Cloudflare Pages (any static host) |
| Database         | Supabase Postgres (called from the browser)         |
| Image storage    | Cloudflare R2 (public or signed URLs)               |
| Backend          | None                                                |
| Export           | Browser exports CSV/JSONL directly from Supabase    |

> ⚠️ **Privacy notice**
> The first prototype uses Supabase's public anon key in the browser with Row Level Security **disabled**. Do **not** upload identifiable patient data unless approved by your IRB/project policy. For production, enable RLS and add proper authentication (see `supabase/schema.sql`).

---

## 1. Create the Supabase project

1. Sign in at [supabase.com](https://supabase.com) and create a new project.
2. Wait for the project to provision.
3. In the dashboard go to **Project Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

## 2. Run the schema

1. In the Supabase dashboard open the **SQL editor**.
2. Open `supabase/schema.sql` from this repo, copy it in, and **Run**.

This creates the `datasets`, `samples`, and `annotations` tables, indexes, an `updated_at` trigger, and disables RLS for the prototype.

## 3. Create a Cloudflare R2 bucket

1. In the Cloudflare dashboard go to **R2 → Create bucket**.
2. Name the bucket (e.g. `clinical-annotation-images`).
3. To use **public URLs**: enable a custom domain or the R2.dev subdomain for the bucket.
4. To use **private** images: keep the bucket private and generate **signed URLs** with a short expiry (outside this app) for the rows you want to expose.

## 4. Upload images to R2

You can use any of:

- The Cloudflare dashboard upload UI.
- `rclone` with an `r2` remote.
- The AWS CLI configured for R2's S3-compatible endpoint:

  ```bash
  aws s3 cp ./images/ s3://YOUR_BUCKET/images/ \
    --recursive \
    --endpoint-url https://<account-id>.r2.cloudflarestorage.com
  ```

The app does **not** upload images itself in this version.

## 5. Put R2 URLs in the dataset file

The dataset file must contain three columns:

| Column                       | Type                          |
| ---------------------------- | ----------------------------- |
| `post_id`                    | text, unique per row          |
| `question`                   | text (full post body)         |
| `image_urls` *or* `image_paths` | image references (see below)  |

`image_urls` may be:

- a single URL: `https://bucket.example.com/images/A.jpg`
- semicolon-separated: `https://.../A.jpg;https://.../B.jpg`
- a JSON array string: `["https://.../A.jpg","https://.../B.jpg"]`
- in JSONL, a real JSON array

### CSV example (`sample_data/data_sample_100.csv`)

```csv
post_id,question,image_urls
DEMO_001,"[DEMO_001] Synthetic placeholder post text","https://YOUR-R2-BUCKET.example.com/images/DEMO_001_0.jpg;https://YOUR-R2-BUCKET.example.com/images/DEMO_001_1.jpg"
```

### JSONL example (`sample_data/data_sample_100.jsonl`)

```json
{"post_id":"DEMO_001","question":"[DEMO_001] Synthetic placeholder post text","image_urls":["https://YOUR-R2-BUCKET.example.com/images/DEMO_001_0.jpg"]}
```

> XLSX import is **not** included in this prototype to keep the bundle small. Convert XLSX to CSV/JSONL first (Excel: *Save As* → CSV; or use the prepare script below if you have the matching JSONL).

### Working with the 100-sample reference dataset

If your source data uses `local_path` (single relative file per row) and a separate `images_sample_100/` folder where each post has `_0`, `_1`, … files, use the helper script to expand and rewrite URLs before importing:

```bash
node scripts/prepare-dataset.mjs \
  --input  "/absolute/path/to/data_sample_100.jsonl" \
  --images "/absolute/path/to/images_sample_100" \
  --base   "https://YOUR-R2-BUCKET.example.com/images_sample_100" \
  --output "sample_data/data_sample_100.prepared.jsonl"
```

What this does:

- Reads the JSONL and accepts any of `image_urls` / `image_paths` / `image_path` / `local_path` / `local_paths`.
- Scans the images folder and **fans out** each `post_id` into every matching file (so `1r66sgl_0.jpg … 1r66sgl_5.jpg` all appear).
- Rewrites each filename as `<base>/<filename>` so the browser can fetch from R2.
- Writes a clean JSONL with `post_id`, `question`, `image_urls[]` ready for the Admin importer.

Then upload the local images to your R2 bucket so the URLs resolve. Example with `aws s3 sync` against the R2 S3-compatible endpoint:

```bash
aws s3 sync /absolute/path/to/images_sample_100 \
  s3://YOUR_BUCKET/images_sample_100/ \
  --endpoint-url https://<account-id>.r2.cloudflarestorage.com
```

(Substitute `rclone` / `wrangler r2 object put` / the Cloudflare dashboard as you prefer. Match the URL prefix you passed as `--base`.)

> ⚠️ **Sensitive content check.** The reference 100-sample file contains long-form posts that look like real medical descriptions (age, sex, country, medications, conditions). Before pushing anything to Supabase or R2, confirm the dataset is de-identified or covered by IRB/project policy. RLS is disabled in the prototype schema, so anything you import is readable by anyone with the anon key.

## 6. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

## 7. Run locally

```bash
npm install
npm run dev
```

The dev server starts on **http://localhost:3000**.

---

## 8. Deploy

### Vercel

1. Push the repo to GitHub.
2. Import the repo in Vercel.
3. Vercel detects Vite automatically (build: `npm run build`, output: `dist`).
4. Add the two environment variables in **Project Settings → Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy.

### GitHub Pages

1. Build: `npm run build` produces `dist/`.
2. Either push `dist/` to a `gh-pages` branch (`npm i -D gh-pages && npx gh-pages -d dist`) or use a GitHub Actions workflow that builds and publishes Pages.
3. Set repo **Settings → Pages → Source = GitHub Actions** (or the `gh-pages` branch).
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as repo **Actions secrets**, and reference them as `env:` in the build step. The `base: "./"` in `vite.config.ts` makes the bundle work under any subpath (e.g. `https://you.github.io/clinical-annotation-tool/`).

### Other static hosts

Any host that serves the `dist/` folder works (Netlify, Cloudflare Pages, S3 + CloudFront, etc.). Make sure the two env vars are set at build time.

---

## 9. Admin: import a dataset

1. Open the app and click **Go to Admin Panel**.
2. Enter a **dataset name** and choose a `.csv` or `.jsonl` file matching the format above.
3. Click **Import**. The browser:
   - parses the file,
   - creates a `datasets` row,
   - inserts samples in batches into `samples`,
   - updates `total_samples`.
4. The new dataset appears in the table with live progress counters.

## 10. Annotators: use the link

Send annotators the deployed URL. They:

1. Enter an **annotator ID** (saved in `localStorage` so refresh keeps the session).
2. Pick a **dataset**.
3. Work through the **next pending sample** for that ID (drafts stay pending; submitted/skipped move on).
4. Use **Save Draft** to come back later, **Skip** to mark unscorable, **Submit & Next** to advance, or **Previous** / **Next** to navigate.

### Validation enforced on submit

- `image_status` is required.
- `final_multimodal_clinical_summary` is required.
- `objective_image_description` is required when `image_status` is **Image available** or **No medical finding visible**.
- When `image_status` is **Image not assessable** or **Image link broken**, the form auto-fills `objective_image_description` with **"Image not assessable."** if you leave it empty.

Saving a draft requires only that **Image Status** be selected; other fields can be incomplete.

## 11. Export annotations

In the Admin panel, click **CSV** or **JSONL** on any dataset row. Each export contains the full set of annotation rows for that dataset with the original question and image URLs joined in:

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

---

## Project layout

```
clinical-annotation-tool/
  src/
    App.tsx
    main.tsx
    index.css
    lib/
      supabase.ts        # Supabase client + row types
      csv.ts             # CSV parse/unparse + file download
      jsonl.ts           # JSONL parse/serialize
      importDataset.ts   # Parse file → insert dataset + samples
      data.ts            # Queries + upsert + export helpers
    components/
      Header.tsx
      AnnotatorLogin.tsx
      AdminPanel.tsx
      DatasetSelector.tsx
      AnnotationPage.tsx
      PostPanel.tsx
      ImageViewer.tsx
      AnnotationForm.tsx
      ProgressBar.tsx
  supabase/
    schema.sql
  scripts/
    prepare-dataset.mjs    # fan out + R2-URL-ify a local dataset
  sample_data/
    data_sample_100.csv
    data_sample_100.jsonl
  index.html
  package.json
  vite.config.ts
  tailwind.config.js
  postcss.config.js
  tsconfig.json
  .env.example
  README.md
```

## Troubleshooting

| Symptom | Try |
| --- | --- |
| "Missing VITE_SUPABASE_URL…" warning in console | Create `.env` and restart `npm run dev`. |
| Import fails with "No valid rows" | Confirm `post_id`, `question`, and `image_urls`/`image_paths` columns exist and `post_id` is non-empty. |
| All images show the broken placeholder | Open one URL directly in a browser tab. If it 403s, your R2 bucket isn't public or the signed URL has expired. |
| `permission denied for table datasets` | The schema disables RLS; if you later enabled it, add policies (see commented section in `supabase/schema.sql`) or temporarily disable RLS again. |
| Build OK locally, blank page on GitHub Pages | Ensure `base: "./"` is in `vite.config.ts` and that env vars are passed at **build time** (Pages builds inside GitHub Actions). |
