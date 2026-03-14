

## Production Readiness Assessment

After a thorough review of the codebase, security scan, database schema, and RLS policies, here is the assessment. **The app is not production-ready** due to several critical security vulnerabilities and functional gaps.

---

### CRITICAL: Security Vulnerabilities (4 errors found)

The security scan found **4 error-level** and **5 warning-level** findings:

1. **Customer data is fully public** — The `jobs` table (customer names, phone numbers, GPS coordinates, full call transcripts, photos, diagnoses) is readable AND writable by **unauthenticated users**. Anyone on the internet can read or overwrite any job record.

2. **Call recordings are publicly accessible** — The `call_logs` table exposes phone numbers and recording URLs to unauthenticated users.

3. **Mechanic phone numbers exposed** — The `mechanics` table is publicly readable.

4. **Notification injection** — The "Service can insert notifications" policy applies to `{public}` with `WITH CHECK (true)`, allowing anyone to inject fake notifications into any user's inbox.

5. **Leaked password protection is disabled** — Users can sign up with known-compromised passwords.

**Fix**: Replace all `{public}` RLS policies on `jobs`, `call_logs`, `mechanics`, and `notifications` with `{authenticated}` policies scoped by role. Keep `INSERT` on `jobs` public only for the webhook (service role key), or use `anon` with a specific check.

---

### HIGH: Functional Issues

6. **Mock distance data** — `getMechanics()` returns `Math.floor(Math.random() * 15) + 1` for distance. Every page load shows random distances. This needs real geolocation or removal.

7. **Race condition on upvotes** — `upvoteKnowledgeBase` reads then increments, which loses votes under concurrency. Should use a database function with `UPDATE ... SET upvotes = upvotes + 1`.

8. **Diagnosis not running on existing job** — The sample job (Toyota Hilux) has a transcript but `diagnosis` is `null`, suggesting the AI diagnosis pipeline failed silently or was never triggered.

9. **No file size limit on uploads** — Users can upload arbitrarily large files. Should validate file size client-side (e.g., max 10MB).

---

### MEDIUM: Code Quality

10. **No React error boundary** — An uncaught error in any component crashes the entire app with a blank screen.

11. **No `onError` handlers on mutations** — `assignMutation` and `completeJobMutation` don't show error toasts on failure.

12. **`config.toml` is minimal** — No `verify_jwt` settings for edge functions. The vapi-webhook and whatsapp-webhook need `verify_jwt = false` explicitly, while other functions should require JWT.

---

### Recommended Fix Plan (Priority Order)

**Phase 1 — Security (must fix before any real users)**
- Tighten RLS: `jobs` SELECT/UPDATE to `{authenticated}`, INSERT to service role only
- Tighten RLS: `call_logs` to `{authenticated}` for SELECT, service role for INSERT
- Tighten RLS: `mechanics` to `{authenticated}`
- Fix notifications INSERT to `{authenticated}` or service role
- Enable leaked password protection
- Add `verify_jwt` config for edge functions

**Phase 2 — Reliability**
- Create a DB function for atomic upvote increment
- Add file size validation (10MB cap) on photo uploads
- Add error toasts to all mutations
- Add a React error boundary wrapper

**Phase 3 — Production Polish**
- Remove mock distance from mechanics or implement real geolocation
- Investigate why AI diagnosis didn't run on the existing job
- Add rate limiting consideration for edge functions

Would you like me to implement the security fixes first?

