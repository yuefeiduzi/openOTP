# openOTP

English · **[中文](README.md)**

An open-source, cross-platform, local-only two-factor authenticator (TOTP). Codes are generated on
your machine, accounts and secrets never leave it, and the whole source is open. The desktop app is
Tauri 2 (Rust) with a Vue 3 + TypeScript front end; data lives in local JSON files.

[![CI](https://github.com/yuefeiduzi/openOTP/actions/workflows/ci.yml/badge.svg)](https://github.com/yuefeiduzi/openOTP/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/yuefeiduzi/openOTP)](LICENSE)

## Features

**Codes**

- TOTP (SHA-1 / SHA-256 / SHA-512, RFC 6238); HOTP (counter based) is out of scope, so
  `otpauth://hotp` links are rejected outright rather than half-supported
- Account list with search (name / issuer), drag-and-drop ordering, click-to-copy and a countdown bar
- Accounts for the same site are merged into one entry with the account name on each card, and
  issuer groups collapse

**Adding and importing**

- QR image scanning (jsqr) · `otpauth://` links · manual entry
- Import andOTP backups
- Icons: emoji / initial / 23 bundled brand icons / uploaded image (PNG / SVG)

**Unlocking**

- 6-digit PIN; Touch ID / Face ID on macOS
- Auto-lock (immediately / 1 / 5 minutes) and manual lock

**Desktop integration**

- Menu bar / tray resident mode: click the icon to toggle the code popover; in app mode the same
  click brings the main window forward
- Closing the main window hides it to the tray; quit from the tray menu (Windows / Linux) or the
  popover
- Light and dark themes (system / light / dark); Chinese (default) and English, switched across all
  windows at once

**Backups**

- A standard zip container (`manifest.json` + `accounts.json` + `icons/<id>.<ext>`) that 7-Zip or
  Keka can open directly
- Optional password (WinZip AES-256) or no encryption; detected automatically on import

## Platform support

| Platform | Status | Biometrics |
|---|---|---|
| macOS | ✅ Full support (menu bar mode, Touch ID) | Touch ID / Face ID |
| Windows | ✅ Main window and tray resident mode | None, PIN |
| Linux | ⚠️ Generic desktop tray implementation, not verified on hardware | None, PIN |
| Android | ❌ Project not initialised | Fingerprint planned |
| iOS | ❌ Project not initialised | None, PIN |

## Install

### Download

See [Releases](https://github.com/yuefeiduzi/openOTP/releases): pushing a `v*` tag makes CI build a
universal DMG (arm64 + x86_64) and open a draft release. The build is **unsigned**, so macOS asks
for a manual approval the first time — the steps and checksum verification are in
[docs/UNSIGNED.md](docs/UNSIGNED.md) (a copy also heads every release body; the doc is in Chinese).

### Build from source

Requires Node (pnpm) and Rust:

```bash
pnpm install
pnpm tauri:build      # output in src-tauri/target/release/bundle/
```

## Security notes

The master password is a 6-digit PIN used for **unlock only**; the TOTP secrets in `data.json` are
**plain text**, so security rests on full-disk encryption (FileVault / BitLocker). Backups can be
encrypted, but the zip AES spec only allows PBKDF2-HMAC-SHA1 with 1000 iterations, so backup
passwords must be at least 8 characters. The app makes no outbound network requests. More detail in
[docs/STRUCTURE.md](docs/STRUCTURE.md) (Chinese).

## Development

```bash
pnpm install          # install dependencies (pnpm)
pnpm dev              # front end only (browser on 5173)
pnpm tauri:dev        # desktop dev mode
pnpm build            # type-check + build the front end
pnpm test             # front-end tests (vitest)
pnpm tauri:build      # bundle the desktop app

cd src-tauri
cargo test            # back-end tests
cargo clippy --all-targets -- -D warnings
cargo fmt --check
```

Pushes and PRs run the same checks in [CI](.github/workflows/ci.yml). Clean up dev processes and
ports when you are done — see [docs/DEV_ENVIRONMENT.md](docs/DEV_ENVIRONMENT.md) (Chinese).

## Documentation

The in-repo docs are currently written in Chinese.

| Document | Contents |
|---|---|
| [docs/STRUCTURE.md](docs/STRUCTURE.md) | Features, stack, module layout, data and security, platform support |
| [docs/CODE_CONVENTIONS.md](docs/CODE_CONVENTIONS.md) | Style, testing, commit and i18n rules |
| [docs/DEV_ENVIRONMENT.md](docs/DEV_ENVIRONMENT.md) | Local environment: dev ports, macOS gotchas, scripted unlock / popover regression |
| [docs/RELEASE.md](docs/RELEASE.md) | Release flow, version sync, signing / notarisation / updater status |
| [docs/ICON_STATUS.md](docs/ICON_STATUS.md) | Icon status and regeneration |
| [CHANGELOG.md](CHANGELOG.md) | Version history |
| [TODO.md](TODO.md) | Open decisions and pending work |

## License

MIT