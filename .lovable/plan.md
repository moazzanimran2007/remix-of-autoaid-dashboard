

## Fix Visual Inspection: Save Photos, Add Retry, Fix Race Condition

### Issues Found
1. **Photos not saved to `photos` array**: `uploadPhoto` in `api.ts` uploads to storage and returns the URL, but never appends it to the job's `photos` column. The `analyze-photo` edge function also doesn't update the `photos` array.
2. **Race condition**: The edge function reads `photo_analysis`, then writes back the merged array. Concurrent uploads can overwrite each other.
3. **No retry logic**: If the AI call fails, the entire flow fails silently.
4. **Storage bucket**: Already public with correct RLS policies — no changes needed here.

### Changes

**File: `src/lib/api.ts` — `uploadPhoto` method**
- After uploading to storage, append the public URL to the job's `photos` array using a read-then-update pattern client-side (acceptable here since uploads are user-initiated and sequential per session).

**File: `supabase/functions/analyze-photo/index.ts`**
1. **Also save photo URL to `photos` array**: When updating with analysis, also append `imageUrl` to the `photos` column to handle the WhatsApp flow where `uploadPhoto` isn't called.
2. **Fix race condition**: Use a PostgreSQL `jsonb_concat` approach — or simpler: use `array_append` for `photos` and a raw SQL update via RPC. Since we can't add RPCs easily, use `select` then `update` but with a single atomic update using `|| jsonb_build_array(...)` pattern. Actually, the simplest fix: read both `photos` and `photo_analysis` in one query, then update both atomically in one update call.
3. **Add retry logic**: Wrap the AI gateway call in a retry loop (up to 2 retries with backoff) for 5xx errors and network failures.

**File: `src/pages/JobDetails.tsx`**
- Remove the separate `uploadPhoto` + `analyzePhoto` two-step call. Instead, call `uploadPhoto` (which now saves the URL), then call `analyzePhoto`. The photo will appear in the UI immediately after upload via query invalidation.

### Detailed approach

**`src/lib/api.ts`** — update `uploadPhoto`:
```typescript
uploadPhoto: async (jobId: string, file: File): Promise<string> => {
  // upload to storage (existing)
  // get public URL (existing)
  // NEW: append URL to job's photos array
  const { data: job } = await supabase.from('jobs').select('photos').eq('id', jobId).single();
  const currentPhotos = (job?.photos as string[]) || [];
  await supabase.from('jobs').update({ photos: [...currentPhotos, publicUrl] }).eq('id', jobId);
  return publicUrl;
}
```

**`supabase/functions/analyze-photo/index.ts`**:
- Add retry wrapper for AI call (2 retries, 1s/2s backoff)
- In the DB update step: read both `photos` and `photo_analysis`, append to both atomically in a single `.update()` call
- This ensures WhatsApp-uploaded photos also appear in the photos array

