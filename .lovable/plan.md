

## Remove Duplicate "Jobs" Route and Fix BottomNav

### Problem
- The routes `/` and `/jobs` both render the same `JobsDashboard` — one is redundant.
- The BottomNav has a bug: it renders `navItems.slice(0, 2)` (Jobs, Mechanics) before the FAB, then `navItems.slice(1)` (Mechanics, KB) after it — causing **Mechanics to appear twice**.

### Changes

**File: `src/App.tsx`**
- Remove the duplicate `/jobs` route. Keep `/` as the single entry point for the jobs dashboard.

**File: `src/components/layout/BottomNav.tsx`**
- Fix the nav item rendering so each item appears exactly once:
  - Left of FAB: Jobs, Mechanics
  - Right of FAB: KB, Team (if owner)
- This means changing `navItems.slice(1)` to `navItems.slice(2)` so KB renders on the right side without duplicating Mechanics.

Two files, two small edits.

