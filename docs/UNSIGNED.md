# macOS 首次打开：添加信任

OpenOTP 的 macOS 包没有代码签名，Gatekeeper 会在首次打开时拦下它。**这不代表包坏了**，
按下面放行一次即可，之后双击就能打开。

## 1. 放行

把 `OpenOTP.app` 拖进「应用程序」，然后照系统给出的那条提示做：

| 系统提示 | 做法 |
|---|---|
| 「无法验证开发者」/「Apple 无法检查它是否包含恶意软件」 | 在「应用程序」里**右键点击** App →「打开」，弹窗里再点一次「打开」 |
| 「已损坏，无法打开，你应该将它移到废纸篓」 | 在终端执行 `xattr -dr com.apple.quarantine /Applications/OpenOTP.app`，然后正常打开 |

两者都是清掉下载时打上的 quarantine 标记，第一次放行后系统会记住这个 App。
不想在终端敲命令的话，等价做法是「系统设置 → 隐私与安全性」底部对本次启动点「仍要打开」。

## 2. 核对下载（可选）

`SHA256SUMS.txt` 与 DMG 一起发布，可用来确认下载完整：

```bash
cd ~/Downloads
shasum -a 256 -c SHA256SUMS.txt
```
