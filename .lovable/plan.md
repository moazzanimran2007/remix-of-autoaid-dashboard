

## Add Geocoding to AI Diagnosis

### What
When the AI extracts a `locationAddress` from the transcript, geocode it to lat/lng using the free **Nominatim** (OpenStreetMap) API and save coordinates to `location_lat`/`location_lng` on the job record. The map will then automatically display the customer's pin.

### Changes

**File: `supabase/functions/ai-diagnosis/index.ts`**

1. Add a `geocodeAddress` helper function that calls `https://nominatim.openstreetmap.org/search?q={address}&format=json&limit=1` with a proper `User-Agent` header (required by Nominatim's usage policy). Returns `{ lat, lng }` or `null`.

2. After Step 1 (extract call info), if `callInfo.locationAddress` exists and is not empty:
   - Call `geocodeAddress(callInfo.locationAddress)`
   - If coordinates are returned, add `location_lat` and `location_lng` to the job update in Step 3

3. Update the Step 3 `updateData` block:
   - Remove the current logic that appends location to `symptoms`
   - Instead, set `location_lat` and `location_lng` when geocoding succeeds
   - Still fall back to appending address text to symptoms if geocoding fails (so the info isn't lost)

### Geocode Function

```typescript
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MechanicApp/1.0' },
    });
    const data = await res.json();
    if (data?.[0]?.lat && data?.[0]?.lon) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch (err) {
    console.error('Geocoding failed:', err);
    return null;
  }
}
```

### No database or UI changes needed
- `location_lat` and `location_lng` columns already exist on the `jobs` table
- `MapComponent` already reads these fields and renders the pin

