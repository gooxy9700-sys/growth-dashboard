# 与己书部署说明

## 本地运行

在本目录启动静态服务器：

```powershell
& 'C:\Users\Dovoer\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m http.server 4173
```

打开 `http://127.0.0.1:4173/`。

## GitHub Pages

当前仓库：`https://github.com/gooxy9700-sys/kaoyan-growth-dashboard`。预期 Pages 地址：`https://gooxy9700-sys.github.io/kaoyan-growth-dashboard/`。

1. 创建一个仅自己使用的 GitHub 仓库。
2. 将本目录中的 HTML、CSS、JS、图标、`manifest.webmanifest`、`privacy.html`、`supabase-schema.sql` 和文档提交到默认分支。
3. 在仓库 Settings → Pages 中选择 **GitHub Actions** 作为 Source；仓库已经包含 `.github/workflows/pages.yml`。
4. 发布后先访问首页，再检查 manifest、Service Worker 和 `privacy.html` 是否可访问。
5. 若启用 Supabase：编辑根目录的 `supabase-config.js`，填写项目 URL 和 publishable/anon key，并一同提交发布。该 key 是浏览器公开 key，数据保护依赖 RLS；不要填写 service_role key。
6. 在 Supabase SQL Editor 执行 `supabase-schema.sql`，启用邮箱认证，并把站点域名加入认证回调地址；该 SQL 也会把 `growth_snapshots` 加入 Realtime 发布，用于同账号设备间更新。

本项目已包含 `.github/workflows/pages.yml`。推送到 `main`、`master` 或 `codex/growth-planner-pwa` 后，GitHub Actions 会自动构建静态 Pages 站点。若仓库为 Private 且当前 GitHub 计划不允许 Pages，需要改为 Public 或升级计划。

## 安全边界

- 静态网页只允许使用 publishable/anon key。
- 不要把 `service_role` key、密码或真实用户数据提交到 GitHub。
- 每次发布后用无痕窗口检查未登录用户不能读取云端数据。
- 本地开发阶段即使没有 Supabase 配置，也应保持 localStorage 模式可用。
- 云端同步以 `meta.updatedAt` 作为最后写入优先依据；两台设备同时编辑同一份快照时，较晚保存的一方覆盖较早保存的一方。
