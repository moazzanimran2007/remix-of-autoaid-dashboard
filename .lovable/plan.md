

## Diagnosis Feedback System

### What We're Building
A feedback mechanism where mechanics can correct/edit AI diagnoses inline before saving to the knowledge base. Corrections are stored in a new `diagnosis_corrections` table and fed back into the AI prompt via RAG, improving future diagnoses.

### Database Changes

**New table: `diagnosis_corrections`**
- `id` (uuid, PK)
- `job_id` (uuid, references jobs, not null)
- `original_diagnosis` (jsonb — snapshot of AI output)
- `corrected_issue` (text — mechanic's corrected issue description)
- `corrected_root_cause` (text)
- `corrected_severity` (job_severity enum)
- `corrected_parts` (jsonb — actual parts needed)
- `corrected_time` (text — actual repair time)
- `mechanic_feedback` (text — free-form notes on what AI got wrong)
- `accuracy_rating` (int, 1-5 — how accurate was the AI)
- `corrected_by` (uuid, references auth.users)
- `created_at` (timestamptz, default now())

RLS: Authenticated can SELECT; mechanics/admins/shop_owners can INSERT.

### AI Prompt Enrichment (`ai-diagnosis/index.ts`)

Add a second RAG query alongside the existing knowledge base lookup — fetch recent corrections for the same make/model and inject them as "MECHANIC CORRECTIONS" context so the AI learns from mistakes.

### Frontend Changes

**DiagnosisPanel.tsx** — Add a "Correct Diagnosis" button that opens an inline edit form with:
- Pre-filled fields from AI diagnosis (issue, root cause, severity, estimated time)
- Editable text areas for corrections
- Accuracy rating (1-5 stars)
- Free-form feedback field
- Submit saves to `diagnosis_corrections` AND to the knowledge base (with corrected data)

### Files to Change
1. **Migration SQL** — Create `diagnosis_corrections` table with RLS
2. **`src/components/DiagnosisPanel.tsx`** — Add "Correct Diagnosis" button + inline correction form
3. **`src/lib/api.ts`** — Add `submitCorrection` API helper
4. **`supabase/functions/ai-diagnosis/index.ts`** — Query corrections table and inject into prompt

