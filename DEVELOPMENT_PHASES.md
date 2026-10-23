# Clovars — Phased Development Plan (Frontend + Backend)

This plan breaks the roadmap into phases where **each phase delivers matching frontend (desktop) and backend (server) work**, with a verification checklist so progress can be checked phase by phase.

**Legend:** `[ ]` not started · `[~]` in progress · `[x]` done

---

## Phase 0 — Foundation & Contracts
**Goal:** Both apps run locally and share a stable API contract.

**Backend (`server/`)**
- [x] Express app, env validation, DB connection, error shape, middleware (auth, validation, sanitize, rate limit, CSRF)
- [x] Auth routes skeleton (`/api/auth/*`)
- [~] Add missing route modules as features land (workspaces ✅, clients ✅, projects ✅, tasks ✅, tags ✅, time entries ✅, reports ✅)
- [x] Keep CORS origins aligned with desktop dev (`http://localhost:5173`)

**Frontend (`desktop/`)**
- [x] Electron + Vite + React + TypeScript scaffold
- [x] API client layer (base URL from `VITE_API_URL`, cookie/CSRF handling)
- [x] Shared TypeScript types mirroring backend DTOs
- [x] Basic app shell (navigation, layout, auth guard)

**Verification**
- [x] `cd server && npm run dev` → `Server listening on port 5000`
- [x] `cd desktop && npm run dev` → renderer at `http://localhost:5173`, Electron window opens
- [x] `GET /` returns `test production!`; `/api/auth/*` responds without 404

---

## Phase 1 — Authentication & Account
**Goal:** Users can register, verify email, log in, reset password, and view profile.

**Backend**
- [x] Register / verify / resend verification
- [x] Login / refresh / logout
- [x] Forgot / verify reset code / resend reset code / reset password
- [x] Change password / `/me`
- [x] Seed admin script works (`npm run seed:admin`)

**Frontend**
- [x] Register screen + email verification flow
- [x] Login screen
- [x] Forgot/reset password screens
- [x] Profile / change password screen
- [x] Persist session (refresh token) and auto-login
- [x] Logout

**Verification**
- [x] Register a new user → verification email received → account verified
- [x] Login with verified user → `/api/auth/me` returns user
- [x] Refresh token rotates; logout revokes session
- [x] Password reset end-to-end works
- [x] Unauthenticated access to protected route returns 401 with error shape

---

## Phase 2 — Workspaces, Roles & Invites
**Goal:** Users can create/join workspaces and permissions are enforced server-side.

**Backend**
- [x] Workspace model + CRUD (create, list mine, get, update, delete)
- [x] Membership model with roles: Owner, Admin, Member
- [x] Invite by email + invite code (create, accept, revoke, list)
- [x] Role-based authorization middleware (Owner/Admin/Member checks)
- [x] All permission checks on server only

**Frontend**
- [x] Workspace switcher / create workspace flow
- [x] Invite teammates (email + invite code) UI
- [x] Accept invite flow
- [x] Member list with role badges
- [x] Role-gated UI (hide actions not permitted, still server-enforced)

**Verification**
- [x] Create workspace → appears in list; creator is Owner
- [x] Invite by email/code → invitee joins as Member
- [x] Admin can invite/manage members; Member cannot
- [x] Cross-workspace data access returns 403/404

---

## Phase 3 — Clients, Projects, Tasks & Tags
**Goal:** Organize work entities per workspace.

**Backend**
- [x] Client model + CRUD (workspace-scoped)
- [x] Project model + CRUD (linked to client, optional)
- [x] Task model + CRUD (linked to project)
- [x] Tag model + CRUD (workspace-scoped)
- [x] Validation DTOs (Zod) for all bodies

**Frontend**
- [x] Clients screen (list + create/edit/delete)
- [x] Projects screen (list + create/edit/delete, filter by client)
- [x] Tasks screen (list + create/edit/delete, filter by project)
- [x] Tags management (create/edit/delete, color)
- [x] Selectors reused across time-entry forms (data + selects ready; wire into time-entry forms in Phase 4)

**Verification**
- [x] CRUD for each entity persists and is workspace-scoped
- [x] Deleting a client/project handles linked data (cascade or block) as designed
- [x] Validation errors return `400` with `code`/`message`

---

## Phase 4 — Time Tracking (Timer + Manual Entry)
**Goal:** Users can track time via tray timer and manual entries.

**Backend**
- [x] TimeEntry model + CRUD (start/stop timer, manual entry)
- [x] Timer endpoints: start, stop, get running
- [x] Manual entry create/update/delete with duration validation
- [x] Entries linked to workspace/project/task/tags/member
- [x] Prevent overlapping running timers per user

**Frontend**
- [x] System tray timer (start/stop, show running duration)
- [x] Manual time entry form (project/task/tags, start/end or duration)
- [x] Time entries list (edit/delete)
- [x] Running timer indicator in app window
- [x] IPC between main process (tray) and renderer

**Verification**
- [x] Start timer → running entry created; stop → duration stored
- [x] Manual entry with valid range saves correctly
- [x] Overlapping timer attempt rejected
- [x] Entries only visible within own workspace

---

## Phase 5 — Reports & CSV Export
**Goal:** Time reports are generated automatically from tracked entries — members never submit or send a report. Members see their own time; workspace Admins/Owners automatically see all members' time.

**Access model**
- Members only track time; there is no "send report" action.
- Reports are generated on demand from `TimeEntry` data.
- Member → own reports only.
- Admin/Owner → every member's reports in that workspace, automatically.

**Backend**
- [x] Report aggregation endpoint (group by project / member / date), role-scoped by membership
- [x] Filters: date range, project, member (Admin/Owner only), tag
- [x] Totals and per-group durations
- [x] CSV export endpoint (streamed file) with the same role scoping

**Frontend**
- [x] Reports screen with grouping selector and filters
- [x] Admin/Owner view shows all workspace members automatically; Member view shows own time only
- [x] Summary table + totals
- [x] Export to CSV (download/save dialog)
- [x] Empty state and loading states
- [x] Reports refresh automatically from time entries (no submit/send action)

**Verification**
- [x] Report totals match sum of time entries
- [x] Member sees only own reports; Admin/Owner sees all workspace members automatically
- [x] Grouping by project/member/date produces correct buckets
- [x] CSV opens correctly and matches on-screen data

---

## Phase 6 — Weekly Timesheets & Approvals (Planned)
**Goal:** Weekly reports are generated automatically. Admins/Owners review and approve them; members do not submit timesheets manually.

**Backend**
- [ ] Weekly timesheet auto-generation from time entries (week range, status: open/approved/rejected)
- [ ] Admin/Owner approve / reject endpoints (no member "submit" endpoint)
- [ ] Approval permissions (Admin/Owner)
- [ ] Notifications (email) on approve/reject

**Frontend**
- [ ] Weekly timesheet view, auto-populated from tracked time
- [ ] Admin/Owner inbox with members' weekly reports already available
- [ ] No "Submit for approval" action for members
- [ ] Status badges and history

**Verification**
- [ ] Weekly timesheet appears automatically for members and Admins/Owners
- [ ] Admin approves/rejects → status updates + email sent
- [ ] Approved timesheet locks edits (or versioning) as designed

---

## Phase 7 — Hardening, Polish & Release
**Goal:** Production-ready desktop app + hosted API.

**Backend**
- [ ] Tests (Jest + Supertest) for auth and core flows
- [x] Lint/typecheck clean
- [x] Env/docs aligned (canonical names)
- [ ] Deploy to Vercel; MongoDB Atlas prod DB

**Frontend**
- [x] Typecheck/lint clean
- [ ] Installers (Windows/macOS/Linux) via electron-builder
- [ ] Auto-update (if applicable) and tray behavior
- [ ] Error handling + offline messaging

**Verification**
- [ ] `npm run build` succeeds for both apps
- [ ] Installers run and connect to deployed API
- [ ] Smoke test: register → track time → view report → export CSV

---

## How to check progress
For each phase, both the **Backend** and **Frontend** checklists must be complete, and all **Verification** items must pass before moving to the next phase. Track status by updating `[ ]` → `[x]` in this file.