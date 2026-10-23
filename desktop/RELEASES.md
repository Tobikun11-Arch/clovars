# Clovars Desktop - Release Guide

To release a new version:
# 1. Update version in package.json (npm i)
# 2. Commit and push
git add package.json
git commit -m "chore: bump version to 1.0.1"
git push
 
# 3. Release
npm run release

This guide explains how to release new versions of the Clovars Electron desktop app to GitHub with automatic updates.

## Prerequisites

1. **GitHub Personal Access Token**
   - Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate a new token with `repo` scope
   - Set as environment variable: `set GH_TOKEN=your_token_here`

2. **GitHub Repository**
   - Ensure code is pushed to `https://github.com/Tobikun11-Arch/clovars`
   - Repository must be public or have the token with appropriate access

3. **Update Package Metadata**
   - `package.json` should have correct author and homepage

## Release Process

### Step 1: Update Version Number

Edit `desktop/package.json`:

```json
{
  "version": "1.0.1"
}
```

**Version format:** `MAJOR.MINOR.PATCH`
- Increment MAJOR for breaking changes
- Increment MINOR for new features
- Increment PATCH for bug fixes

### Step 2: Commit Version Change

```bash
cd desktop
git add package.json
git commit -m "chore: bump version to 1.0.1"
git push
```

### Step 3: Build and Release

```bash
npm run release
```

This command will:
- Run type checking
- Build the Electron app
- Create Windows installers (NSIS + Portable)
- Create a GitHub Release
- Upload installers to the release
- Tag the commit with the version number

### Step 4: Verify Release

1. Go to `https://github.com/Tobikun11-Arch/clovars/releases`
2. Verify the new release appears
3. Check that installers are uploaded:
   - `Clovars-x.x.x-setup.exe` (NSIS installer with auto-update)
   - `Clovars-x.x.x-portable.exe` (portable version)
   - `latest.yml` (update manifest)

## Build Commands

### Local Testing (No GitHub Release)

```bash
# Build for local testing only
npm run build:win

# Output: dist/Clovars-1.0.0-setup.exe and dist/Clovars-1.0.0-portable.exe
```

### Release to GitHub

```bash
# Full release with GitHub publishing
npm run release

# Output: GitHub release + installers uploaded
```

### Build Without Publishing

```bash
# Build but don't publish to GitHub
npm run build:win --publish never
```

## Automatic Updates

### How It Works

1. Users install the app via the NSIS installer (not portable)
2. On app startup, it checks for updates from GitHub releases
3. If a new version is available, it downloads in the background
4. On next restart, the update is installed automatically

### Update Frequency

- Updates are checked on every app startup
- Users are notified when an update is available
- Download happens silently in the background

### Testing Updates

To test automatic updates:

1. Install version 1.0.0
2. Release version 1.0.1
3. Restart the app
4. The app should detect and download version 1.0.1

## Configuration Files

### electron-builder.yml

Controls how the app is built and published:

```yaml
publish:
  provider: github
  owner: Tobikun11-Arch
  repo: clovars
```

### package.json

Contains version and build scripts:

```json
{
  "version": "1.0.0",
  "scripts": {
    "release": "npm run build && electron-builder --win --publish always"
  }
}
```

## Troubleshooting

### Error: "GH_TOKEN not found"

**Solution:** Set the GitHub token as environment variable:
```bash
set GH_TOKEN=your_token_here
```

### Error: "Repository not found"

**Solution:** Verify the GitHub username and repo name in `electron-builder.yml` match exactly.

### Error: "GitHub API rate limit"

**Solution:** Wait an hour or generate a new token.

### Updates not downloading

**Solution:** Ensure users installed via NSIS installer, not portable version.

### Build fails with TypeScript errors

**Solution:** Run typecheck first:
```bash
npm run typecheck
```

## Release Checklist

Before releasing:

- [ ] Version number updated in `package.json`
- [ ] Changes committed and pushed to GitHub
- [ ] GH_TOKEN environment variable set
- [ ] Tested locally with `npm run build:win`
- [ ] Changelog updated (optional)
- [ ] No sensitive data in build

After releasing:

- [ ] Verify release on GitHub
- [ ] Check installers are uploaded
- [ ] Test the installer on a clean machine
- [ ] Verify auto-updates work

## Changelog

### Version 1.0.0
- Initial release
- Mini timer with glassmorphism effect
- Running timer editing support
- Inline task creation
- Custom resizable mini timer window
- Windows installer with auto-update support

### Version 1.0.1
- [Add your changes here]
