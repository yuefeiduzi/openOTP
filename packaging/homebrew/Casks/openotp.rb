# Source of truth for the cask in the `yuefeiduzi/homebrew-openotp` tap.
#
# .github/workflows/homebrew.yml copies this file into the tap on every published
# release and stamps `version` and `sha256` with that release's real values; CI runs
# `ruby -c` on it so a syntax error here cannot reach users. Edit the cask here, not in
# the tap — the workflow overwrites the tap copy (docs/HOMEBREW.md).
cask "openotp" do
  # Placeholders. Nothing installs from this copy: the tap gets the stamped version.
  version "0.0.0"
  sha256 :no_check

  url "https://github.com/yuefeiduzi/openOTP/releases/download/v#{version}/OpenOTP_#{version}_universal.dmg"
  name "OpenOTP"
  desc "Local-only TOTP authenticator"
  homepage "https://github.com/yuefeiduzi/openOTP"

  # One universal DMG covers both architectures. Homebrew itself needs Big Sur, and the
  # arm64 slice is built for macOS 11 anyway, so macOS-only is the whole requirement.
  depends_on :macos

  app "OpenOTP.app"

  # The bundle is ad-hoc signed rather than signed with a Developer ID, so macOS
  # quarantines the download and Gatekeeper blocks the first launch. Strip the flag on
  # install and on every upgrade, so Homebrew users never have to run xattr by hand.
  postflight_steps do
    run "/usr/bin/xattr", args: ["-dr", "com.apple.quarantine", "{{appdir}}/OpenOTP.app"]
  end

  # Quit a running app before Homebrew replaces the bundle on upgrade or uninstall.
  uninstall quit: "com.openotp.desktop"

  zap trash: [
    "~/Library/Application Support/com.openotp.desktop",
    "~/Library/Caches/com.openotp.desktop",
    "~/Library/Preferences/com.openotp.desktop.plist",
  ]
end
