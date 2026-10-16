# Security Policy

Clovars handles logins and work-hour data, so we take security seriously.

## Supported versions

| Version | Supported |
| ------- | --------- |
| Latest release | Yes |
| Older releases | No |

## Reporting a vulnerability

**Please do not report security issues in public issues, discussions, or pull requests.**

Report privately by either:

- Emailing **joenelsevellejo831@gmail.com** with the subject `Clovars security report`, or
- Using GitHub's [private vulnerability reporting](https://github.com/Tobikun11-Arch/clovars/security/advisories/new) on this repository.

Please include:

- A description of the issue and its impact
- Steps to reproduce (or a proof of concept)
- Affected version or commit
- Any suggested fix

## What to expect

- We aim to acknowledge your report within **5 days**.
- We will keep you updated as we investigate and fix the issue.
- Once a fix is released, we are happy to credit you if you wish.

Please give us reasonable time to fix the problem before disclosing it publicly.

## Scope

In scope:

- The Express API and its authentication, authorization, and role checks
- The Electron desktop app
- Invite and workspace access flows

Out of scope:

- Vulnerabilities in third-party services (Vercel, MongoDB Atlas) themselves
- Social engineering or physical attacks
- Denial-of-service through excessive traffic

## Security principles for contributors

- All permission checks (Owner/Admin/Member) must be enforced **on the server**.
- Never commit secrets, API keys, or real `.env` files.
- Validate and sanitize all input on the server.
- Keep dependencies updated and review new ones before adding.
