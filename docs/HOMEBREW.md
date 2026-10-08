# Homebrew 分发

> 结论：**官方 `homebrew/cask` 现在进不去**（未公证 + 关注度门槛，见文末「为什么进不了官方」），
> 可行路径是**自建 tap** `yuefeiduzi/homebrew-openotp`。tap 里的 cask 由本仓
> `packaging/homebrew/` 派生，发布后由 [`.github/workflows/homebrew.yml`](../.github/workflows/homebrew.yml)
> 自动同步版本号与 sha256。
>
> 用户侧的安装说明写在 [INSTALL.md](INSTALL.md)，这里只讲怎么维护这条分发路径。

## tap 仓库结构

| 仓库 | 内容 |
|---|---|
| `yuefeiduzi/homebrew-openotp` | `Casks/openotp.rb`、`README.md` —— 两个文件都由主仓同步，别手改 |

主仓 `packaging/homebrew/` 是**唯一来源**：

- `Casks/openotp.rb` —— cask 全文。里面的 `version "0.0.0"` / `sha256 :no_check` 是占位值，
  每次发布由 workflow 用这一版的真实版本号与 DMG 校验和盖章后写进 tap。
- `README.md` —— tap 仓库首页（安装命令、签名说明）。

改 cask 就改主仓这份（CI 会跑 `ruby -c` 验语法）；直接改 tap 里的文件会在下一次发布时被覆盖
（workflow 发现内容不一致会打 warning，但不阻止）。

### 一次性设置（**待办，需要你操作**）

1. 建仓库：`yuefeiduzi/homebrew-openotp`（空仓库即可，内容由 workflow 写入）
2. 建一个 fine-grained PAT：只授权这一个仓库，权限 `Contents: Read and write`
3. 存成主仓的 Actions secret：`HOMEBREW_TAP_TOKEN`
4. 验证一遍：Actions → **Homebrew tap** → Run workflow，填一个**已发布**的 tag（如 `v0.3.1`）。
   跑完 tap 里应出现 `Casks/openotp.rb`，`version` / `sha256` 是这一版的真值；
   随后在任意机器上 `brew install --cask yuefeiduzi/openotp/openotp` 应能装出能直接打开的应用

在 1–3 完成前：`homebrew.yml` 只会打 warning 跳过，发布流程照旧，但
[INSTALL.md](INSTALL.md) / README 里的 `brew install` 命令指向的 tap 还不存在。

## 用户怎么装（已实测）

```bash
# 一条命令：自动 tap，且只信任这一个 cask
brew install --cask yuefeiduzi/openotp/openotp

# 等价写法：先信任整个 tap，再按短名装
brew trust --tap yuefeiduzi/openotp
brew tap yuefeiduzi/openotp
brew install --cask openotp
```

- 没信任就按短名装会明确失败（不会误装别的东西）：
  `Error: Refusing to load cask yuefeiduzi/openotp/openotp from untrusted tap yuefeiduzi/openotp.`
- `brew trust --tap <tap>` 在 tap 还没 clone 下来时也能用（信任记录写在 `~/.homebrew/trust.json`），
  所以 [INSTALL.md](INSTALL.md) 里先 trust 再 tap 的顺序是成立的
- 升级 / 卸载：`brew upgrade --cask openotp` · `brew uninstall --cask openotp`（`--zap` 连同
  `~/Library/Application Support/com.openotp.desktop` 一起删）

## 发布时自动发生什么

`.github/workflows/homebrew.yml`：

| 触发 | 说明 |
|---|---|
| `release: published` | **Release 被 Publish 时**才会触发 —— 草稿的资产匿名用户下载不到，brew 也就取不到 |
| `workflow_dispatch` | 手动补跑，填一个已发布的 tag |

每一步：

1. 下载该 Release 的 `OpenOTP_<版本>_universal.dmg`，**自己算 sha256**（不信 `SHA256SUMS.txt`：
   它只证明「上传时是什么」，不证明「现在还是什么」）
2. 用主仓模板生成 tap 的 `Casks/openotp.rb`，替换 `version` / `sha256` 两行（各必须恰好命中一次，
   否则直接失败）
3. clone tap（`x-access-token:$TAP_TOKEN`）→ 写 cask 与 README → 内容有变化就 commit（`openotp <版本>`）并 push

兜底：不想跑 workflow 时，手动把 `packaging/homebrew/Casks/openotp.rb` 拷进 tap，改那两行即可。
没配 `HOMEBREW_TAP_TOKEN` 只打 warning 不失败，方便在 tap 建起来之前照常发布。

## 实测记录（Homebrew 7.0.8 / macOS，2026-10）

在本机用临时 tap（`brew tap-new yuefeiduzi/openotp --no-git`，测完 `brew untap`）验证过这条链路：

- cask 指向真实的 v0.3.1 Release DMG，`brew install --cask yuefeiduzi/openotp/openotp` 装成功，
  输出里有 `==> Trusted cask yuefeiduzi/openotp/openotp`
- 装完 `xattr -r -l` 只剩 `com.apple.provenance`，**没有** `com.apple.quarantine`；`codesign -dv`
  仍是 `Signature=adhoc`。也就是说：真正让 App 能打开的是 cask 里这一步清标记，而
  `spctl -a -vvv -t exec` 依旧判定 `rejected / source=no usable signature`
- 直接跑装出来的那份（用临时 HOME 隔离数据目录）：进程正常存活，Gatekeeper 没有拦；
  确认启动后没有动 `~/Library/Application Support/com.openotp.desktop/`
- `postflight_steps` 的 `run "/usr/bin/xattr"` 在 Homebrew 的沙箱里可用；`xattr -dr` 在没有该标记
  时也返回 0，所以不需要 `must_succeed: false`
- `verified:` 在 url stanza 里已被 Homebrew 7 弃用（会打 warning），模板里不用
- 官方 cask / formula 里**没有** `openotp` 这个名字（查过 formulae.brew.sh 的 cask.json 与
  formula.json），短名不冲突

未验证 / 待验证：

- tap 仓库还没建，上面的验证是本地临时 tap；真实远端 tap 上的自动同步与
  `release: published` 触发**没跑过**
- 未在 Intel Mac 上装过。DMG 是 universal：x86_64 slice 最低 10.13，arm64 slice 最低 11.0
  （`vtool -show-build` 实测），而 Homebrew 自己就要求 Big Sur —— 所以 cask 里只写
  `depends_on :macos`（macOS-only 标记），不再声明更高的最低版本

## 为什么进不了官方 homebrew/cask

两条硬门槛，都不是「提交一次试试」能绕过的（依据：Homebrew 7.0.8 自带的
[Acceptable Casks](https://docs.brew.sh/Acceptable-Casks)、
[Package Acceptance Policy](https://docs.brew.sh/Package-Acceptance-Policy)、
[Homebrew Security and Supply Chain](https://docs.brew.sh/Homebrew-Security-and-Supply-Chain) 文档）：

1. **Gatekeeper 审计**：官方要求「Gatekeeper 能评估的 macOS 产物必须在默认 macOS 配置下通过」，
   而且明确**不接受**绕过 —— 官方 cask 会保留 quarantine 让 Gatekeeper 检查，而我们的包是 ad-hoc
   签名、未公证（`spctl` 判 `rejected: no usable signature`）。官方对这类 cask 的处理方式是
   deprecate → disable → 移除，所以现状下连提交资格都没有。
   **解法**：Apple Developer 账号（99 USD/年）做 Developer ID 签名 + 公证，见
   [RELEASE.md](RELEASE.md) 的缺口一。这一步做完，官方 cask 的门就只剩第 2 条。
2. **关注度**：仓库所有者自荐需要 `225 stars` / `90 forks` / `90 watchers` 之一（非自荐是 75/30/30）。
   这个仓库现在是 1 star / 0 fork（2026-10 查）。官方也留了「有独立可验证的公众关注、且有多人
   请求收录」的例外口子，但那是评审裁量，不能当成计划。

名称方面不用担心：官方 cask / formula 里 `openotp` 没被占用，将来正式提交时可以直接用这个 token。
