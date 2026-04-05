

## Fix MapComponent Location Display

### Problems Found

1. **No marker on the map** — The OSM embed URL (`/export/embed.html`) does not support the `&marker=` parameter. The map renders but shows no pin, so the location appears wrong/empty.

2. **Numeric columns returned as strings** — Supabase returns `numeric` columns (`location_lat`, `location_lng`) as strings. The code doesn't parse them to numbers, which can cause `toFixed()` and arithmetic operations to produce wrong results or NaN.

### Solution

**File: `src/lib/api.ts`** — Parse lat/lng to floats in `mapJobFromDb`:
```typescript
location: dbJob.location_lat && dbJob.location_lng
  ? { lat: parseFloat(dbJob.location_lat), lng: parseFloat(dbJob.location_lng) }
  : undefined,
```

**File: `src/components/MapComponent.tsx`** — Replace the broken OSM embed with a proper static map that shows a visible marker:
- Use the **OSM static map** approach: render a Leaflet-based iframe with a proper marker, or simpler — use a tile-based static image with a CSS marker overlay
- Best approach: embed an OpenStreetMap iframe pointed at the correct coordinates with a `#map=zoom/lat/lng` hash (which does center correctly), and overlay a CSS pin icon centered on the map div
- This ensures the pin is always visible at the center of the map

The component will:
1. Build the URL as `https://www.openstreetmap.org/export/embed.html?bbox=...&layer=mapnik` (no fake `&marker=`)
2. Add a positioned CSS pin overlay (`absolute` center of the map container) using the existing `MapPin` icon from lucide
3. Keep the Google Maps / Apple Maps buttons unchanged

### No database changes needed

