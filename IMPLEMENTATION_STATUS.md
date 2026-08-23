# 与己书实现验收状态

最后更新：2026-08-23。

| 范围 | 状态 | 当前证据或边界 |
|---|---|---|
| 每日计划与教学周 | 已实现 | 周循环模板；2026-08-31 为第 1 教学周；实验周/考试周整周生效；全休日按日期生效。 |
| 预览与执行模式 | 已实现 | 2026-08-30 前仅预览，不计入正式统计。 |
| 任务管理 | 已实现 | 勾选、取消、新增、编辑、删除均保存到本地快照。 |
| 番茄专注 | 已实现 | 45+10、30+5、25+5、自定义、暂停、结束本次、白噪音/雨声、音量、通知、屏幕常亮。 |
| 运动健康 | 已实现 | 60 km 跑步目标、每周 5 次/单次 3 km 规则、推拉腿核心、训练分钟、组数次数重量、体重记录。 |
| 统计 | 已实现 | 日/周/月、ECharts 优先与 Canvas 回退、实际专注分钟占比、体重和活动趋势、月度目标状态。 |
| PWA 与静态交付 | 已实现 | Manifest、Service Worker、隐私页、部署文档均在本地 HTTP 200 验证。 |
| GitHub 仓库推送 | 已实现 | `https://github.com/gooxy9700-sys/kaoyan-growth-dashboard`，`main` 与 `codex/growth-planner-pwa` 已推送。 |
| GitHub Pages 发布 | 已实现 | `https://gooxy9700-sys.github.io/growth-dashboard/`、`manifest.webmanifest` 和公开 workflow 均已 HTTP 200 验证；目录真实名称为 `.github/workflows`。 |
| Supabase 代码接入 | 已实现 | 邮箱注册/登录/重置、RLS 快照、离线本地优先、联网重试、Realtime 订阅、最后写入优先。 |
| Supabase 真实验收 | 部分完成 | 项目表、RLS、Realtime、publishable key 和已登录同步已确认；线上注册/邮箱确认/密码重置仍需确认 Redirect URL 并完成闭环测试。 |
| 华为 Health Kit | 预留接口 | `health-kit-adapter.js` 仅定义适配边界，MVP 不请求任何第三方健康数据。 |
