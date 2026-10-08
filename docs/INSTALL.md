# 安装与首次打开（macOS）

OpenOTP 目前只发布 macOS 包：一个 universal DMG（arm64 + x86_64 两种架构合一，macOS 11 起）。
包**没有 Apple 开发者签名**：直接下载 DMG 会被 Gatekeeper 拦一次（不代表包坏了，放行一次即可，
见方式二）；走 Homebrew 则由 cask 自动清掉这个标记，装完直接就能打开。

## 方式一：Homebrew（推荐）

```bash
brew install --cask yuefeiduzi/openotp/openotp
```

一条命令就够：Homebrew 会自动加上我们的 tap，并且**只信任这一个 cask**（不必先 `brew trust`）。
cask 在每次安装与升级后都会自动清掉 quarantine 标记，所以不会遇到 Gatekeeper 拦截，也不用
手敲 `xattr`。

```bash
brew upgrade --cask openotp          # 升级
brew uninstall --cask openotp        # 卸载，保留账号数据
brew uninstall --cask --zap openotp  # 卸载并删掉账号数据（不可恢复）
```

想先加 tap、再用短名安装也可以（等价写法）：

```bash
brew trust --tap yuefeiduzi/openotp
brew tap yuefeiduzi/openotp
brew install --cask openotp
```

`yuefeiduzi/openotp` 是我们自建的**第三方 tap**（仓库
[yuefeiduzi/homebrew-openotp](https://github.com/yuefeiduzi/homebrew-openotp)）。Homebrew 6 起
默认不加载未信任的来源：上面第一种写法只信任这一个 cask，第二种写法信任整个 tap。少了这一步，
Homebrew 会明确报错：

```
Error: Refusing to load cask yuefeiduzi/openotp/openotp from untrusted tap yuefeiduzi/openotp.
```

报 `No Cask with this name exists` 时先 `brew update` 再试（本机 Homebrew 的索引太旧）。

## 方式二：下载 DMG

1. 到 [Releases](https://github.com/yuefeiduzi/openOTP/releases) 下载
   `OpenOTP_<版本>_universal.dmg`，双击挂载，把 `OpenOTP.app` 拖进「应用程序」。
2. 照系统给出的那条提示放行一次：

| 系统提示 | 做法 |
|---|---|
| 「无法验证开发者」/「Apple 无法检查它是否包含恶意软件」 | 在「应用程序」里**右键点击** App →「打开」，弹窗里再点一次「打开」 |
| 「已损坏，无法打开，你应该将它移到废纸篓」 | 在终端执行 `xattr -dr com.apple.quarantine /Applications/OpenOTP.app`，然后正常打开 |

两者都是清掉下载时打上的 quarantine 标记，第一次放行后系统会记住这个 App。
不想在终端敲命令的话，等价做法是「系统设置 → 隐私与安全性」底部对本次启动点「仍要打开」。

## 核对下载（可选）

`SHA256SUMS.txt` 与 DMG 一起发布，可用来确认下载完整：

```bash
cd ~/Downloads
shasum -a 256 -c SHA256SUMS.txt
```

## 数据放在哪里

账号、设置与 PIN 都在 `~/Library/Application Support/com.openotp.desktop/`（`data.json`、
`settings.json`、`password.dat`）。`brew uninstall --cask --zap` 删掉的就是这个目录；只想换版本
就先用普通 `brew uninstall`，或者直接覆盖安装。

Homebrew 这条分发路径怎么维护（tap 内容从哪来、发布时怎么自动同步），见
[HOMEBREW.md](HOMEBREW.md)。
