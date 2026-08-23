# 考研成长自律看板

这是一个纯 HTML、CSS 和原生 JavaScript 实现的个人学习效率 PWA。它提供周日期导航、日程时间轴、任务打卡、番茄专注、运动健康记录、统计图表和可选的 Supabase 同步。

## 公开部署边界

本仓库只包含网页运行代码、静态资源和通用部署文档，不包含个人姓名、院校、校区、私人日历、训练饮食计划、项目记忆或真实健康记录。

## 本地运行

```powershell
python -m http.server 4173
```

访问 `http://127.0.0.1:4173/`。

## Supabase

编辑 `supabase-config.js` 填写项目 URL 和 publishable/anon key，然后在 Supabase SQL Editor 执行 `supabase-schema.sql`。不要放入 service_role key。

## Pages

`.github/workflows/pages.yml` 用于 GitHub Pages 自动部署。公开仓库中只应保留可公开内容；用户数据通过 Supabase RLS 按账号隔离。
