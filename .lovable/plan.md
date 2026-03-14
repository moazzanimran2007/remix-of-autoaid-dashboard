

## Add Loading Skeleton for Photo Analysis

**File: `src/pages/JobDetails.tsx`**

When `uploadingPhoto` is true, append a skeleton card below the existing photo analysis results (or in place of the empty state). The skeleton mimics the layout of an analysis result: a gray image placeholder on the left + pulsing text lines on the right with an "AI Vision" chip.

- Import `Skeleton` from `@/components/ui/skeleton`
- After the existing photo analysis entries (or replacing the empty state when uploading), render a skeleton block:
  - 80x64px rounded rectangle (image placeholder)
  - "AI Vision" chip (static)
  - 3 skeleton text lines of varying widths
- Condition: show skeleton when `uploadingPhoto` is `true`

Single file change, ~15 lines added.

