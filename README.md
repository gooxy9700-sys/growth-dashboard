# 考研成长自律看板

公开部署用的个人学习效率 PWA，使用原生 HTML、CSS 和 JavaScript。包含周日期导航、07:00-23:30 时间轴、打卡、番茄专注、运动健康、ECharts 统计和可选 Supabase 同步。

本仓库只包含网页运行文件，不包含私人规划、项目记忆、个人日历、训练饮食或真实健康数据。

## 本地运行

```powershell
python -m http.server 4173
```

## 云端配置

编辑 `supabase-config.js` 填写项目 URL 和 publishable/anon key，执行 `supabase-schema.sql`。禁止使用 service_role key。
