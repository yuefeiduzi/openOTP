# homebrew-openotp

Homebrew tap for [OpenOTP](https://github.com/yuefeiduzi/openOTP) — an open-source, local-only
two-factor authenticator (TOTP).

```sh
brew install --cask yuefeiduzi/openotp/openotp
```

One command is enough: Homebrew adds the tap and trusts that single cask. The equivalent
longer form, if you prefer to add the tap yourself:

```sh
brew trust --tap yuefeiduzi/openotp
brew tap yuefeiduzi/openotp
brew install --cask openotp
```

Upgrade and remove:

```sh
brew upgrade --cask openotp
brew uninstall --cask openotp          # keeps your accounts and settings
brew uninstall --cask --zap openotp    # removes ~/Library/Application Support/com.openotp.desktop too
```

## Note on signing

OpenOTP has no Apple Developer ID and is not notarised, so macOS quarantines the download. The cask
clears the quarantine flag automatically on every install and update (`postflight_steps`), so
**you never need to run `xattr` by hand** when installing through Homebrew.

If you download the DMG from [Releases](https://github.com/yuefeiduzi/openOTP/releases) instead,
macOS will quarantine it and you need to clear the flag once yourself:

```sh
xattr -dr com.apple.quarantine "/Applications/OpenOTP.app"
```

## Requirements

A universal DMG (arm64 + x86_64). Homebrew itself requires macOS Big Sur or newer, which is the
effective floor; the app's own minimum is macOS 11 on Apple silicon and 10.13 on Intel.

## Automation

`version` and `sha256` are stamped automatically by the release workflow in the
[main repository](https://github.com/yuefeiduzi/openOTP) whenever a release is published.
The cask and this README are copied from `packaging/homebrew/` there — please do not edit them
here.
