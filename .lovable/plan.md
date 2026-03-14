

## Fix: Auth Race Condition

### Problem
The `useAuth` hook has a race condition. `onAuthStateChange` can fire with a `null` session before `getSession()` restores the persisted session from storage. When this happens, `loading` is set to `false` with no session, and `ProtectedRoute` redirects to `/auth` — even though the user is logged in.

Your database already has the correct profile and role data. The login itself succeeds (confirmed in auth logs). The app just doesn't wait for the session to restore properly.

### Fix (`src/hooks/useAuth.tsx`)

Restructure the `useEffect` so:
1. `getSession()` runs first and sets the initial session + `loading = false`
2. `onAuthStateChange` only handles **subsequent** auth events (sign-in, sign-out, token refresh)
3. Add a `mounted` flag to prevent state updates after unmount

Replace the current `useEffect` (lines 51-84) with:

```typescript
useEffect(() => {
  let mounted = true;

  // Restore session from storage FIRST
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!mounted) return;
    setSession(session);
    setUser(session?.user ?? null);
    if (session?.user) {
      fetchProfile(session.user.id);
      fetchRoles(session.user.id);
    }
    setLoading(false);
  });

  // THEN listen for subsequent auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
          fetchRoles(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
      setLoading(false);
    }
  );

  return () => {
    mounted = false;
    subscription.unsubscribe();
  };
}, []);
```

### Also: Attach the missing trigger

The `handle_new_user` function exists but has **no trigger** attached. A migration is needed to create it so future signups auto-create profiles and roles:

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### Files Changed
1. **`src/hooks/useAuth.tsx`** — Fix race condition in auth initialization
2. **New migration** — Attach `handle_new_user` trigger to `auth.users`

