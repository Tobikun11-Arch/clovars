# Clovars — Phased Development Plan (Frontend + Backend)

This plan breaks the roadmap into phases where **each phase delivers matching frontend (desktop) and backend (server) work**, with a verification checklist so progress can be checked phase by phase.

**Legend:** `[ ]` not started · `[~]` in progress · `[x]` done

---

## Phase 0 — Foundation & Contracts
**Goal:** Both apps run locally and share a stable API contract.

**Backend (`server/`)**
- [x] Express app, env validation, DB connection, error shape, middleware (auth, validation, sanitize, rate limit, CSRF)
- [x] Auth routes skeleton (`/api/auth/*`)
- [~] Add missing route modules as features land (workspaces ✅, clients, projects, tasks, tags, time entries, reports)
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
- [ ] Client model + CRUD (workspace-scoped)
- [ ] Project model + CRUD (linked to client, optional)
- [ ] Task model + CRUD (linked to project)
- [ ] Tag model + CRUD (workspace-scoped)
- [ ] Validation DTOs (Zod) for all bodies

**Frontend**
- [ ] Clients screen (list + create/edit/delete)
- [ ] Projects screen (list + create/edit/delete, filter by client)
- [ ] Tasks screen (list + create/edit/delete, filter by project)
- [ ] Tags management (create/edit/delete, color)
- [ ] Selectors reused across time-entry forms

**Verification**
- [ ] CRUD for each entity persists and is workspace-scoped
- [ ] Deleting a client/project handles linked data (cascade or block) as designed
- [ ] Validation errors return `400` with `code`/`message`

---

## Phase 4 — Time Tracking (Timer + Manual Entry)
**Goal:** Users can track time via tray timer and manual entries.

**Backend**
- [ ] TimeEntry model + CRUD (start/stop timer, manual entry)
- [ ] Timer endpoints: start, stop, get running
- [ ] Manual entry create/update/delete with duration validation
- [ ] Entries linked to workspace/project/task/tags/member
- [ ] Prevent overlapping running timers per user

**Frontend**
- [ ] System tray timer (start/stop, show running duration)
- [ ] Manual time entry form (project/task/tags, start/end or duration)
- [ ] Time entries list (edit/delete)
- [ ] Running timer indicator in app window
- [ ] IPC between main process (tray) and renderer

**Verification**
- [ ] Start timer → running entry created; stop → duration stored
- [ ] Manual entry with valid range saves correctly
- [ ] Overlapping timer attempt rejected
- [ ] Entries only visible within own workspace

---

## Phase 5 — Reports & CSV Export
**Goal:** Users can view and export time reports.

**Backend**
- [ ] Report aggregation endpoint (group by project / member / date)
- [ ] Filters: date range, project, member, tag
- [ ] Totals and per-group durations
- [ ] CSV export endpoint (streamed file)

**Frontend**
- [ ] Reports screen with grouping selector and filters
- [ ] Summary table + totals
- [ ] Export to CSV (download/save dialog)
- [ ] Empty state and loading states

**Verification**
- [ ] Report totals match sum of time entries
- [ ] Grouping by project/member/date produces correct buckets
- [ ] CSV opens correctly and matches on-screen data

---

## Phase 6 — Weekly Timesheets & Approvals (Planned)
**Goal:** Weekly submission and approval workflow.

**Backend**
- [ ] Timesheet model (week range, status: draft/submitted/approved/rejected)
- [ ] Submit / approve / reject endpoints
- [ ] Approval permissions (Admin/Owner)
- [ ] Notifications (email) on submit/approve/reject

**Frontend**
- [ ] Weekly timesheet view
- [ ] Submit for approval
- [ ] Approver inbox (approve/reject with comment)
- [ ] Status badges and history

**Verification**
- [ ] Member submits week → status submitted
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