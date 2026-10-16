# Contributing to Clovars

Thanks for your interest in Clovars. This guide explains how to set up the project and submit changes.

By participating, you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- Report bugs and suggest features through [issues](https://github.com/Tobikun11-Arch/clovars/issues)
- Improve documentation
- Fix bugs or build features from the roadmap

For security issues, **do not open a public issue**. See [SECURITY.md](SECURITY.md).

## Project layout

```text
desktop/   # Electron app (main + preload + React renderer), appId com.dynamicvars.clovars
server/    # Express API deployed on Vercel (single hosted instance, multi-tenant)
```

The desktop app talks to the Express API over HTTPS/JSON, which stores data in MongoDB Atlas.

## Getting set up

1. Fork the repository and clone your fork.
2. Install Node.js 20 or newer.
3. Create a free MongoDB Atlas cluster for development and use a **separate dev database** (e.g. `clovars_dev`). **Do not use production data. Never point dev tooling or seeds at production.**
4. Set up the backend:
   ```bash
   cd server
   npm install
   # Windows (cmd): copy .env.example .env
   # macOS/Linux: cp .env.example .env
   # fill in your own values (dev database only, canonical names: MONGODB_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET)
   npm run dev
   ```
5. Set up the desktop app:
   ```bash
   cd desktop
   npm install
   # Windows (cmd): copy .env.example .env
   # macOS/Linux: cp .env.example .env
   # set VITE_API_URL=http://localhost:5000 for local dev
   npm run dev
   ```

> `npm start` in `desktop/` runs `electron-vite preview` (a production preview), not the dev server. Use `npm run dev` for development.

## How phases work

Development follows numbered phases (private roadmap). v0.1.0 covers auth and workspaces, invites, clients/projects/tasks/tags, timer and manual entry, reports and CSV export. Weekly timesheets and approvals come after.

- Pick up work from the current phase. Check open issues labeled with the phase.
- For anything outside the current phase, open an issue to discuss before writing code.
- Keep each pull request focused on one change.

## Ground rules

1. **Enforce permissions on the server.** Hiding a button in the desktop app is not security. Every protected route must check the user's role (Owner, Admin, Member) in the Express API.
2. **Never commit secrets.** Real `.env` files, API keys, and database URIs stay out of git. Add new variables to the matching `.env.example` (`server/.env.example` or `desktop/.env.example`) with placeholder values.
3. **Validate input on the server.** Do not trust anything coming from the client.
4. **Think serverless.** The backend runs on Vercel, so don't rely on in-memory state or long-running processes. For example, store a running timer as a start timestamp in the database. (Known tech debt: refresh-token revocation is currently an in-memory blocklist that resets on restart; it must move to persistent storage.)
5. **Keep it simple.** Clovars deliberately has no invoicing or billing. Features outside the roadmap should be discussed first.

## Making changes

1. Create a branch from `main`:
   ```bash
   git checkout -b feat/short-description
   ```
2. Make your changes and test them locally.
3. Commit with clear messages. We recommend [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`).
4. Push to your fork and open a pull request against `main`. Fill in `.github/PULL_REQUEST_TEMPLATE.md`.

## Pull request checklist

- [ ] The change is focused and described clearly
- [ ] It runs locally without errors
- [ ] Permission checks are enforced on the server for any new route
- [ ] No secrets or real `.env` values are included
- [ ] Docs are updated if behavior changed

## Reporting bugs

Use the bug report template (`.github/ISSUE_TEMPLATE/bug_report.md`). Include your OS, app version, steps to reproduce, what you expected, and what happened. Screenshots help.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
