# 预设品牌图标

图标选择器的「预设」标签页直接收集本目录的 `*.svg`（见 `src/utils/presetIcons.ts` 的
`import.meta.glob`），**文件名即图标名**：它既是 UI 里的标题，也用于导入 andOTP 备份时
按 `thumbnail` 字段匹配（`src/utils/andotp.ts`）。

## 约定

- `viewBox="0 0 24 24"`，`width` / `height` 为 24，不带 `<title>`
- **用品牌原色**（`fill="#xxxxxx"`）：品牌色本身有区分度，不要统一成单色。多色品牌
  （如 Microsoft 四色方块）逐个元素写各自颜色
- 深色主题的适配是自动的：`presetIcons.ts` 读取图形里的颜色，算出在深色底
  （`--bg-secondary`）上的对比度，整幅过暗（最亮的颜色对比度 < 3:1）的图标会被
  `brightness(0) invert(1)` 压成纯白剪影，其余保持品牌色。因此新增图标时只要把颜色写对，
  不必额外处理主题
- 文件名用小写品牌名，并尽量与 andOTP 的 `thumbnail` 对齐，例如
  `electronicarts.svg` 对应 `ElectronicArts`、`bitbucket.svg` 对应 `BitBucket`，
  这样用户导入 andOTP 备份时能自动命中

## 来源

- `ubisoft` `epicgames` `firefox` `bitbucket` `v2ex` `nvidia` `electronicarts` `jetbrains`
  `cloudflare` `notion` `bitwarden`：取自 [Simple Icons](https://simpleicons.org) v16.33.0
  （图标文件为 CC0-1.0），其中 `electronicarts.svg` 对应上游的 `ea`
- 其余 12 个为项目原有图标（路径形状未记录来源，颜色按 Simple Icons 的品牌色补上）
- 缺少干净来源的品牌（如网易邮箱 163）没有收录；商标归各自所有者，此处仅用于在本地
  应用中标识账号