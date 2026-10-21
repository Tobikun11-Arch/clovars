# Clovars

An open-source desktop app for teams to track work hours by project and see where the time goes.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-in%20development-orange.svg)](#roadmap)

Clovars gives small teams, agencies, and freelancers Clockify-style time tracking without the extras they don't need. There is no invoicing or billing. It covers hours, projects, and reports.

## Features (v0.1.0)

- **Accounts and workspaces:** sign up, log in, and work in a workspace with three roles: Owner, Admin, and Member.
- **Invites:** bring teammates in by email or invite code.
- **Organize work:** clients, projects, tasks, and tags.
- **Time tracking:** a timer (start/stop from the system tray) and manual time entry.
- **Reports:** group by project, member, or date, and export to CSV.

## Roadmap

| Scope | Status |
| ----- | ------ |
| Auth, workspaces, roles, invites, clients/projects/tasks/tags, timer, manual entry, reports, CSV export (**v0.1.0**) | In progress |
| Weekly timesheets and approvals | Planned |

## How it works

```text
Electron desktop app  -->  Express API (hosted on Vercel)  -->  MongoDB Atlas
```

- **Desktop app:** Electron + React + Vite. Installers are published on the [Releases](https://github.com/Tobikun11-Arch/clovars/releases) page. App ID: `com.dynamicvars.clovars`, product name: `Clovars`.
- **Backend:** Express.js, deployed on Vercel as a single hosted instance (one deployment serves many workspaces).
- **Database:** MongoDB Atlas. Development uses a separate dev database; production data is never used for development.

All permission checks (Owner/Admin/Member) are enforced on the server, never only in the desktop app.

## Installation

1. Go to the [Releases](https://github.com/Tobikun11-Arch/clovars/releases) page.
2. Download the installer for your operating system.
3. Run it, then sign up or log in.

## Development setup

**Requirements:** Node.js 20 or newer, npm, and a MongoDB Atlas cluster (a free tier works).

```bash
git clone https://github.com/Tobikun11-Arch/clovars.git
cd clovars
```

**Backend**

```bash
cd server
npm install
# Windows (cmd): copy .env.example .env
# macOS/Linux: cp .env.example .env
# then fill in your own values (dev database only)
npm run dev
```

**Desktop app**

```bash
cd desktop
npm install
# Windows (cmd): copy .env.example .env
# macOS/Linux: cp .env.example .env
# set VITE_API_URL=http://localhost:5000 for local dev
npm run dev
```

> `npm start` in `desktop/` runs `electron-vite preview` (a production preview), not the dev server. Use `npm run dev` for development.

Never commit your real `.env` file or any secrets.

### Environment variables (canonical names)

Server (`server/.env`):

```text
PORT=
NODE_ENV=
MONGODB_URI=            # Atlas connection string (dev database, e.g. .../clovars_dev)
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
SMTP_HOST= SMTP_PORT= SMTP_USER= SMTP_PASS= MAIL_FROM=
CORS_ORIGINS=
```

Desktop (`desktop/.env`):

```text
VITE_API_URL=           # http://localhost:5000 in dev, your deployed Vercel HTTPS URL in production builds
```

> The server code uses the canonical names above (`MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `MAIL_FROM`).

Use a separate Atlas database for development (e.g. `clovars_dev`). Never point dev tooling or seeds at production.

## Project structure

```text
clovars/
├── desktop/             # Electron app (main + preload + React renderer)
├── server/              # Express API (deployed on Vercel)
├── .github/             # Issue templates, PR template, CI
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE
├── README.md
└── SECURITY.md
```

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md) first.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for what changed in each release.

## Security

Please do not open public issues for vulnerabilities. See [SECURITY.md](SECURITY.md) for how to report them privately.

## License

Released under the [MIT License](LICENSE). Copyright (c) 2026 Joenel Sevellejo (Dynamic Vars).
