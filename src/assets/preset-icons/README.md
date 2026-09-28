# 预设品牌图标

图标选择器的「预设」标签页直接收集本目录的 `*.svg`（见 `src/utils/presetIcons.ts` 的
`import.meta.glob`），**文件名即图标名**：它既是 UI 里的标题，也用于导入 andOTP 备份时
按 `thumbnail` 字段匹配（`src/utils/andotp.ts`）。

## 约定

- `viewBox="0 0 24 24"`，`width` / `height` 为 24，不带 `<title>`
- 单色 `fill="#333"`；深浅色主题的处理方式与既有图标保持一致，不要改成品牌彩色
- 文件名用小写品牌名，并尽量与 andOTP 的 `thumbnail` 对齐，例如
  `electronicarts.svg` 对应 `ElectronicArts`、`bitbucket.svg` 对应 `BitBucket`，
  这样用户导入 andOTP 备份时能自动命中

## 来源

- `ubisoft` `epicgames` `firefox` `bitbucket` `v2ex` `nvidia` `electronicarts` `jetbrains`
  `cloudflare` `notion` `bitwarden`：取自 [Simple Icons](https://simpleicons.org) v16.33.0
  （图标文件为 CC0-1.0），其中 `electronicarts.svg` 对应上游的 `ea`
- 其余 12 个为项目原有图标，来源未记录（`github` 等与 Simple Icons 路径一致）
- 缺少干净来源的品牌（如网易邮箱 163）没有收录；商标归各自所有者，此处仅用于在本地
  应用中标识账号