

## Diagnostic Knowledge Base for Prompt Enrichment

### What We're Building
A `diagnostic_knowledge_base` table that stores verified, mechanic-approved diagnoses indexed by make/model/symptom. The `ai-diagnosis` edge function will query this table before calling the AI, injecting matching past diagnoses into the prompt for better accuracy.

### Database Changes

**New table: `diagnostic_knowledge_base`**
- `id` (uuid, PK)
- `car_make` (text, not null, indexed)
- `car_model` (text, not null, indexed)
- `car_year` (text, nullable — for year-specific issues)
- `symptom_keywords` (text, not null — searchable symptom description)
- `verified_diagnosis` (text, not null — the confirmed root cause)
- `fix_description` (text — how it was resolved)
- `parts_used` (jsonb — array of parts that were actually needed)
- `actual_time` (text — real repair duration)
- `severity` (job_severity enum)
- `verified_by` (uuid, references auth.users — mechanic who verified)
- `source_job_id` (uuid, references jobs — original job if applicable)
- `created_at` (timestamptz, default now())
- `upvotes` (int, default 0 — community validation count)

RLS: Authenticated users can SELECT; admins/shop_owners can INSERT/UPDATE.

Composite index on `(car_make, car_model)` for fast lookups.

### Edge Function Changes (`ai-diagnosis/index.ts`)

Before calling the diagnosis AI (Step 2), query the knowledge base:

```
SELECT verified_diagnosis, fix_description, parts_used, severity, upvotes
FROM diagnostic_knowledge_base
WHERE car_make ILIKE $make AND car_model ILIKE $model
  AND symptom_keywords ILIKE '%keyword%'
ORDER BY upvotes DESC
LIMIT 5
```

Inject matches into the system prompt as "VERIFIED PAST DIAGNOSES" context block so the AI can reference real mechanic-verified fixes.

### Frontend Changes

**DiagnosisPanel.tsx** — Add a "Verify & Save to Knowledge Base" button on completed jobs. When clicked, saves the current diagnosis (with optional mechanic edits) to the knowledge base table.

**New component: `KnowledgeBasePanel.tsx`** — Simple searchable list in Settings or a new nav item where mechanics can browse/search verified diagnoses by make/model.

### Summary of Files to Change
1. **Migration SQL** — Create `diagnostic_knowledge_base` table with RLS policies
2. **`supabase/functions/ai-diagnosis/index.ts`** — Query knowledge base before AI call, inject into prompt
3. **`src/components/DiagnosisPanel.tsx`** — Add "Verify & Save" button
4. **`src/components/KnowledgeBasePanel.tsx`** (new) — Browse/search knowledge base
5. **`src/pages/JobDetails.tsx`** — Wire up the verify action
6. **`src/lib/api.ts`** — Add knowledge base CRUD helpers

