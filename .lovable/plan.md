

## Fix Google Maps and Apple Maps Links

### Problem
The `target="_blank"` anchor links are likely being blocked by the preview iframe's sandbox policy, preventing them from opening in a new tab.

### Solution
**File: `src/components/MapComponent.tsx`**

Replace the `<a>` tags with `<button>` elements that use `window.open()` on click. This approach works reliably inside sandboxed iframes where `target="_blank"` anchors may be blocked.

```tsx
<button onClick={() => window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')}>
  Google Maps
</button>
```

Same pattern for the Apple Maps link. Styling stays identical (just swap `<a>` for `<button>`).

