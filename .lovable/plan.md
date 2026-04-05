

## Multi-Tenant Organisation System

This is a large feature that adds organisation-based multi-tenancy with CEO/mechanic roles. Here is the full plan.

### Database Changes (4 new tables, 2 altered tables, updated RLS)

**New tables:**

1. **`organisations`** — `id (uuid PK)`, `name (text)`, `created_by (uuid)`, `created_at`
2. **`organisation_members`** — `id (uuid PK)`, `organisation_id (uuid FK)`, `user_id (uuid FK)`, `role (text: 'owner' | 'mechanic')`, `joined_at`
3. **`organisation_invites`** — `id (uuid PK)`, `organisation_id (uuid FK)`, `email (text)`, `invited_by (uuid)`, `created_at`. This is the pre-added email list. Unique constraint on `(organisation_id, email)`.

**Altered tables:**

4. **`jobs`** — Add `organisation_id (uuid)` column
5. **`mechanics`** — Add `organisation_id (uuid)` column
6. **`profiles`** — Add `organisation_id (uuid)` column (for quick lookup of which org a user belongs to)

**RLS policy updates:**
- `jobs` SELECT/UPDATE: change from `true` to scoped by user's `organisation_id` via a helper function `get_user_org_id(auth.uid())`
- `mechanics` SELECT: same org scope
- `organisations`: owners can update their own org; members can view their own org
- `organisation_members`: owners can insert/delete for their org; members can view their org's members
- `organisation_invites`: owners can CRUD for their org; viewable by org owner only

**New DB function:** `get_user_org_id(uuid) → uuid` (SECURITY DEFINER) — returns the organisation_id for a user from `organisation_members`.

### Signup Flow Changes

**File: `src/pages/AuthPage.tsx`**

During signup, add a toggle/checkbox: **"I'm registering as a shop owner (CEO)"**
- If checked: show an "Organisation Name" input field. On signup, store org name in user metadata.
- If unchecked: signup is blocked with a message "Ask your shop owner to add your email first" (since mechanics are pre-added only).

**Post-signup trigger (DB function):** `handle_new_user` updated:
- Check if the new user's email exists in `organisation_invites`
  - If yes: create `organisation_member` with role `'mechanic'`, set `profiles.organisation_id`, assign `'mechanic'` role in `user_roles`
  - If no and user metadata has `is_owner = true`: create new `organisation`, create `organisation_member` with role `'owner'`, set `profiles.organisation_id`, assign `'shop_owner'` role in `user_roles`
  - If no and not owner: the signup should have been blocked client-side, but as a safety net, still create the user with no org

### CEO Management Page

**New file: `src/pages/TeamManagement.tsx`**

A page accessible only to users with role `'shop_owner'` or `'admin'`:
- Shows org name at the top
- Lists current team members (from `organisation_members` joined with `profiles`)
- "Add Mechanic" form: email input + button. Inserts into `organisation_invites` and also inserts into `mechanics` table with the email as placeholder
- Remove member button (removes from `organisation_members` and `organisation_invites`)

### Navigation Update

**File: `src/components/layout/BottomNav.tsx`** and **`src/components/layout/Sidebar.tsx`**
- Add "Team" nav link (visible to shop_owner/admin roles only)

### Auth Hook Update

**File: `src/hooks/useAuth.tsx`**
- Add `organisationId: string | null` to context
- Fetch from `profiles.organisation_id` alongside existing profile fetch

### API Layer Update

**File: `src/lib/api.ts`**
- `getJobs`, `getMechanics`, and other queries automatically scoped by RLS (no code change needed if RLS is correct)
- Add `addTeamMember(email)` and `removeTeamMember(memberId)` functions
- Add `getTeamMembers()` function

### Route Addition

**File: `src/App.tsx`**
- Add `/team` route → `<TeamManagement />` wrapped in `<AppLayout>`

### Summary of files changed

| File | Change |
|------|--------|
| DB migration | 3 new tables, alter jobs/mechanics/profiles, new function, updated RLS |
| `handle_new_user` trigger | Auto-join org or create org on signup |
| `src/pages/AuthPage.tsx` | CEO toggle + org name field on signup |
| `src/hooks/useAuth.tsx` | Add `organisationId` to context |
| `src/pages/TeamManagement.tsx` | New page for CEO to manage team |
| `src/lib/api.ts` | Team management API functions |
| `src/App.tsx` | Add `/team` route |
| `src/components/layout/BottomNav.tsx` | Add Team nav link |
| `src/components/layout/Sidebar.tsx` | Add Team nav link |

