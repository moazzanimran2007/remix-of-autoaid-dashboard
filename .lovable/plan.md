

## Harden AI Diagnosis Pipeline

### Changes

**File: `supabase/functions/ai-diagnosis/index.ts`**

1. **Retry logic** — Wrap `callLovableAI` in a `callWithRetry` helper (2 retries, exponential backoff on 5xx/network errors). Apply to both the extraction and diagnosis calls.

2. **Transcript quality gate** — Before processing, check transcript length and content quality:
   - Reject transcripts under 20 characters
   - Use a quick heuristic: count user-spoken turns (lines with "User:" or similar). If < 2 meaningful user turns, mark the job with a warning and set `symptoms` to "Insufficient transcript — manual review needed" instead of running full AI pipeline.
   - Update the job status to reflect the quality issue so it's visible in the dashboard.

3. **Brand alias normalization** — Add a `normalizeBrand()` function that maps common aliases/misspellings to canonical names before the AI extraction step AND after (to catch AI output variations):
   - `"Chevy"` → `"Chevrolet"`, `"Merc"/"Benz"` → `"Mercedes-Benz"`, `"Beemer"/"Beamer"/"Bimmer"` → `"BMW"`, `"VW"` → `"Volkswagen"`, `"Nissan Rogue Sport"` vs `"Nissan Rogue"` (keep as-is but normalize casing), etc.
   - Applied to `callInfo.carMake` after extraction, ensuring consistent KB lookups and parts searches.

4. **Parallel parts search** — Currently parts search is fired after the job update (sequential). Change to fire the parts search in parallel with the job update since they're independent operations. Use `Promise.all` for the DB update and the `search-parts` invocation.

### Technical Details

```text
Current flow:
  Extract → KB+Corrections → Diagnose → Update DB → Fire parts search

Hardened flow:
  Quality gate (reject bad transcripts)
       ↓
  Extract (with retry)
       ↓
  Normalize brand aliases
       ↓
  KB+Corrections (parallel, existing)
       ↓
  Diagnose (with retry)
       ↓
  Update DB + Parts search (parallel via Promise.all)
```

**No other files need changes** — this is entirely within the edge function.

