<!--
这份说明由 release.yml 原样 cat 进每个 Release 正文的开头，是用户看到的第一段内容，
所以改这里就够了，不要再往 workflow 里复制一份。背景与决策见 docs/RELEASE.md。
-->

# 未签名版本：放行与校验

这个包没有代码签名，也没有公证（notarization）：本项目的发行者没有 Apple Developer 账号，
而 Developer ID 证书与公证都要求付费会员资格，因此 macOS 会用 Gatekeeper 拦下它。
**这不代表包坏了。**

## 1. 首次打开

把 `OpenOTP.app` 拖进「应用程序」，然后照系统给的那条提示做：

| 系统提示 | 做法 |
|---|---|
| 「无法验证开发者」/「Apple 无法检查它是否包含恶意软件」 | 在「应用程序」里**右键点击** App →「打开」，弹窗里再点一次「打开」 |
| 「已损坏，无法打开，你应该将它移到废纸篓」 | 在终端执行 `xattr -dr com.apple.quarantine /Applications/OpenOTP.app`，然后正常打开 |

两者都是绕过下载时被打上的 quarantine 标记，第一次放行后系统会记住这个 App，之后双击即可。
不放心这条命令的话，等价做法是「系统设置 → 隐私与安全性」底部对本次启动点「仍要打开」。

## 2. 校验下载完好

```bash
cd ~/Downloads
shasum -a 256 -c SHA256SUMS.txt   # 与 DMG 一起发布
```

没有签名时，这是唯一能确认「下载到的字节 = 发布出去的字节」的办法。哈希本身来自发布流程，
仍以 GitHub 发布页上的 `SHA256SUMS.txt` 为准。

## 3. 为什么可以放心

- **源码全在这里**：MIT 许可，构建方式也没有藏东西（`.github/workflows/release.yml`
  就是产出这份包的那套流程）
- **纯本地**：验证码在本地算，账号与密钥不上传；安全策略（`tauri.conf.json` 的 CSP）
  只允许本地 ipc 通信，源码里也没有任何对外请求
- **可以自己构建**：`pnpm install && pnpm tauri:build` —— 需要 Rust 与 Node，产物与本页下载的
  一样（同样未签名），但每个字节都是你自己编译的

## 4. 什么时候会有签名

等有 Apple Developer 账号（99 USD/年）之后：Developer ID 证书 + `notarytool` 公证接进发布流程。
做法写在仓库的 `docs/RELEASE.md` 里（不在这里放链接：Release 正文的相对链接解析不确定，
免得点开是 404）。在那之前，每个版本的正文都会带上这段说明。
