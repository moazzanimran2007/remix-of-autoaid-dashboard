

## Improve MapComponent with Google Maps / Apple Maps Links

### Changes

**File: `src/components/MapComponent.tsx`**

Add a row of two small buttons below the map iframe:
- **"Open in Google Maps"** — links to `https://www.google.com/maps?q={lat},{lng}` with `target="_blank"`
- **"Open in Apple Maps"** — links to `https://maps.apple.com/?q={lat},{lng}` with `target="_blank"`

These link to the **customer location** when available, otherwise the user's own location. Use the existing `ExternalLink` or `Navigation` icon from lucide-react alongside compact outline buttons styled consistently with the rest of the UI (`rounded-xl border-foreground/15 text-xs`).

