(function () {
  const CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  let client = null;
  let user = null;
  let syncTimer = null;
  let realtimeChannel = null;
  let authMode = "login";
  let reconcilePromise = null;

  const $ = (id) => document.getElementById(id);
  const app = () => window.YIJISHU_APP;
  const configReady = () => {
    const config = window.SUPABASE_CONFIG;
    return config && /^https:\/\/[^\s]+\.supabase\.co$/.test(config.url || "") && config.publishableKey && !String(config.publishableKey).startsWith("YOUR_");
  };
  const setStatus = (text) => { $("sync-status").textContent = text; };
  const toast = (text) => app()?.showToast?.(text);
  const loadScript = (src) => new Promise((resolve, reject) => { const script = document.createElement("script"); script.src = src; script.onload = resolve; script.onerror = reject; document.head.append(script); });

  function openAuth() { $("auth-dialog").showModal(); updateAuthUi(); }
  function updateAuthUi() {
    const signedIn = Boolean(user);
    $("auth-title").textContent = signedIn ? "已连接云端" : authMode === "signup" ? "注册账号" : "登录与同步";
    $("auth-submit").textContent = authMode === "signup" ? "注册" : "登录";
    $("auth-signup").hidden = signedIn;
    $("auth-reset").hidden = signedIn;
    $("auth-email").disabled = signedIn;
    $("auth-password").disabled = signedIn;
    $("auth-submit").hidden = signedIn;
    $("auth-signout").hidden = !signedIn;
    $("auth-hint").textContent = signedIn ? `当前账号：${user.email || "已登录"}，本地数据会自动同步。` : configReady() ? "Supabase 已配置，请登录或注册后开启云端同步。" : "未配置 Supabase 时，数据只保存在本机。";
  }
  function scheduleSync() { if (!user) return; clearTimeout(syncTimer); syncTimer = setTimeout(syncNow, 800); }
  async function syncNow() {
    if (!client || !user || !navigator.onLine) { if (user) setStatus("待联网同步"); return; }
    const state = app().getState();
    const payload = JSON.parse(JSON.stringify(state));
    payload.meta = { ...(payload.meta || {}), updatedAt: payload.meta?.updatedAt || Date.now() };
    setStatus("同步中…");
    const { error } = await client.from("growth_snapshots").upsert({ user_id: user.id, payload, updated_at: new Date().toISOString() });
    if (error) { setStatus("本地保存"); toast(`云端同步失败：${error.message}`); return; }
    setStatus("已同步");
  }
  async function pullOrPush() {
    if (!client || !user || !navigator.onLine) { if (user) setStatus("待联网同步"); return; }
    if (reconcilePromise) return reconcilePromise;
    reconcilePromise = (async () => {
      setStatus("正在检查同步");
    const { data, error } = await client.from("growth_snapshots").select("payload,updated_at").eq("user_id", user.id).maybeSingle();
    if (error) { setStatus("本地保存"); toast(`读取云端失败：${error.message}`); return; }
    const local = app().getState();
    const remote = data?.payload;
    const localTime = Number(local.meta?.updatedAt || 0);
    const remoteTime = Number(remote?.meta?.updatedAt || (data?.updated_at ? Date.parse(data.updated_at) : 0));
    if (remote && remoteTime > localTime) { app().replaceState(remote); setStatus("已同步"); toast("已载入其他设备的较新记录"); return; }
    if (!remote || localTime > remoteTime) await syncNow();
    else setStatus("已同步");
    })();
    try { await reconcilePromise; } finally { reconcilePromise = null; }
  }
  function clearRealtime() { if (realtimeChannel && client) client.removeChannel(realtimeChannel); realtimeChannel = null; }
  function subscribeRealtime() {
    clearRealtime();
    if (!client || !user) return;
    realtimeChannel = client.channel(`growth-snapshot-${user.id}`).on("postgres_changes", { event: "*", schema: "public", table: "growth_snapshots", filter: `user_id=eq.${user.id}` }, payload => {
      const remote = payload.new?.payload;
      if (!remote) return;
      const localTime = Number(app().getState().meta?.updatedAt || 0);
      const remoteTime = Number(remote.meta?.updatedAt || (payload.new?.updated_at ? Date.parse(payload.new.updated_at) : 0));
      if (remoteTime > localTime) { app().replaceState(remote); setStatus("已实时同步"); toast("其他设备的数据已更新"); }
    }).subscribe();
  }
  async function handleAuthSubmit(event) {
    event.preventDefault();
    if (!client) return toast("请先配置 Supabase");
    const email = $("auth-email").value.trim();
    const password = $("auth-password").value;
    const result = authMode === "signup" ? await client.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } }) : await client.auth.signInWithPassword({ email, password });
    if (result.error) return toast(result.error.message);
    if (authMode === "signup") toast("注册请求已发送，请查收邮箱确认"); else { $("auth-dialog").close(); toast("登录成功，正在同步"); }
  }
  async function resetPassword() {
    if (!client) return toast("请先配置 Supabase");
    const email = $("auth-email").value.trim();
    if (!email) return toast("先填写邮箱");
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    toast(error ? error.message : "重置密码邮件已发送");
  }
  async function init() {
    $("auth-button").addEventListener("click", openAuth);
    $("close-auth").addEventListener("click", () => $("auth-dialog").close());
    $("auth-form").addEventListener("submit", handleAuthSubmit);
    $("auth-reset").addEventListener("click", resetPassword);
    $("auth-signup").addEventListener("click", () => { authMode = "signup"; updateAuthUi(); });
    $("auth-signout").addEventListener("click", async () => { clearRealtime(); await client?.auth.signOut(); $("auth-dialog").close(); });
    window.addEventListener("online", pullOrPush);
    window.addEventListener("focus", pullOrPush);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") pullOrPush(); });
    window.addEventListener("yijishu:statechange", scheduleSync);
    if (!configReady()) { setStatus("本地保存"); $("auth-hint").textContent = "未配置 Supabase 时，数据只保存在本机。"; return; }
    try { if (!window.supabase) await loadScript(CDN); client = window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.publishableKey); } catch { setStatus("本地保存"); toast("Supabase 客户端加载失败，继续使用本地模式"); return; }
    const session = await client.auth.getSession();
    user = session.data.session?.user || null;
    updateAuthUi();
    if (user) { await pullOrPush(); subscribeRealtime(); } else setStatus("未登录");
    client.auth.onAuthStateChange(async (_event, nextSession) => { clearRealtime(); user = nextSession?.user || null; updateAuthUi(); if (user) { await pullOrPush(); subscribeRealtime(); } else setStatus("未登录"); });
  }
  window.addEventListener("DOMContentLoaded", init, { once: true });
})();
