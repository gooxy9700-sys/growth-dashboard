(() => {
  "use strict";
  const POMODORO_STORAGE_KEY = "yijishu-pomodoro-v1";
  const app = window.YIJISHU_APP;
  if (!app) {
    const current = document.currentScript?.src || "";
    if (!current.includes("pomodoro-retry=1")) {
      window.setTimeout(() => {
        const retry = document.createElement("script");
        retry.src = current + (current.includes("?") ? "&" : "?") + "pomodoro-retry=1";
        document.head.append(retry);
      }, 0);
    }
    return;
  }
  let state = app.getState();
  state.ui = state.ui || {};
  if (!state.settings.pomodoroDefaultsMigrated && state.settings.focusMinutes === 50 && state.settings.breakMinutes === 10) {
    state.settings.focusMinutes = 25;
    state.settings.breakMinutes = 5;
    state.settings.pomodoroDefaultsMigrated = true;
    app.saveState();
  }
  // A reload cannot resume an in-memory timer, so never leave the page locked behind a stale focus mask.
  state.ui.focusMode = false;
  app.saveState();
  function restorePomodoroSessions() {
    try {
      const cached = JSON.parse(localStorage.getItem(POMODORO_STORAGE_KEY) || "null");
      const sessions = Array.isArray(cached?.sessions) ? cached.sessions : [];
      const known = new Set((state.focusSessions || []).map((item) => item.id));
      let restored = false;
      sessions.forEach((item) => { if (item?.id && !known.has(item.id)) { state.focusSessions.push(item); restored = true; } });
      if (restored) app.saveState();
    } catch { /* Invalid independent focus cache should not block the dashboard. */ }
  }
  function persistPomodoroSessions() {
    const sessions = (state.focusSessions || []).filter((item) => item.pomodoros != null || item.completedPomodoros != null || item.timer === "pomodoro");
    localStorage.setItem(POMODORO_STORAGE_KEY, JSON.stringify({ version: 1, updatedAt: Date.now(), sessions }));
  }
  restorePomodoroSessions();
  const q = (selector) => document.querySelector(selector);
  const byId = (id) => document.getElementById(id);
  const escText = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const day = () => (state.ui.scheduleDate || new Date().toISOString().slice(0, 10));
  const sessions = (date) => (state.focusSessions || []).filter((item) => item.date === date);
  const pomCount = (item) => Number(item.pomodoros == null ? (item.completedPomodoros || 0) : item.pomodoros);
  const scheduleCount = (taskId, date) => sessions(date || day()).reduce((sum, item) => sum + (item.taskId === taskId ? pomCount(item) : 0), 0);
  const scheduleItemsFor = (date) => app.scheduleItems ? app.scheduleItems(date) : [];
  const labelFor = (type) => app.scheduleTypeLabel ? app.scheduleTypeLabel(type) : "事项";
  const format = (date) => app.formatDate ? app.formatDate(date) : date;
  const save = () => { app.saveState(); };
  const render = () => { customRenderSchedule(); customRenderFocus(); customRenderWeek(); customRenderProgress(); };

  function stats(date) {
    const list = sessions(date || day());
    const subjects = {};
    list.forEach((item) => { const key = item.category || "未分类"; subjects[key] = (subjects[key] || 0) + Number(item.minutes || 0); });
    return { minutes: list.reduce((sum, item) => sum + Number(item.minutes || 0), 0), pomodoros: list.reduce((sum, item) => sum + pomCount(item), 0), subjects };
  }

  function customRenderProgress() {
    const items = scheduleItemsFor(day());
    const done = items.filter((item) => item.done).length;
    const rate = items.length ? Math.round(done / items.length * 100) : 0;
    const ring = byId("completion-ring");
    if (ring) { ring.style.setProperty("--completion-angle", (rate * 3.6) + "deg"); ring.setAttribute("aria-label", "当日完成率 " + rate + "%"); }
    if (byId("completion-ring-value")) byId("completion-ring-value").textContent = rate + "%";
    if (byId("schedule-completion")) byId("schedule-completion").textContent = "完成率 " + rate + "%";
    const dates = app.weekDates ? app.weekDates(day()) : [day()];
    const all = dates.reduce((result, date) => result.concat(scheduleItemsFor(date)), []);
    const totalDone = all.filter((item) => item.done).length;
    const totalRate = all.length ? Math.round(totalDone / all.length * 100) : 0;
    if (byId("week-total-progress")) byId("week-total-progress").textContent = totalRate + "%";
    if (byId("week-total-bar")) byId("week-total-bar").style.width = totalRate + "%";
    if (byId("week-total-count")) byId("week-total-count").textContent = totalDone + " / " + all.length + " 项";
    [["math", "math"], ["english", "english"], ["sport", "sport"]].forEach(([key, type]) => {
      const group = all.filter((item) => item.type === type);
      const value = group.length ? Math.round(group.filter((item) => item.done).length / group.length * 100) : 0;
      if (byId("week-" + key + "-progress")) byId("week-" + key + "-progress").textContent = value + "%";
      if (byId("week-" + key + "-bar")) byId("week-" + key + "-bar").style.width = value + "%";
    });
  }

  function customRenderWeek() {
    const host = byId("week-days");
    if (!host) return;
    const start = app.weekStart ? app.weekStart(new Date(day() + "T12:00:00")) : day();
    const base = new Date(start + "T12:00:00");
    host.replaceChildren();
    for (let index = 0; index < 7; index += 1) {
      const date = new Date(base); date.setDate(base.getDate() + index);
      const value = date.toISOString().slice(0, 10);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "week-day" + (value === day() ? " is-active" : "") + (value === new Date().toISOString().slice(0, 10) ? " is-today" : "");
      button.disabled = Boolean(state.ui.focusMode);
      button.innerHTML = "<span>周" + ["日", "一", "二", "三", "四", "五", "六"][date.getDay()] + "</span><strong>" + String(date.getDate()).padStart(2, "0") + "</strong>";
      button.addEventListener("click", () => { if (state.ui.focusMode) return; state.ui.scheduleDate = value; save(); render(); });
      host.append(button);
    }
  }

  function card(item) {
    const article = document.createElement("article");
    const count = scheduleCount(item.id, day());
    article.className = "schedule-item schedule-" + item.type + (item.rigid ? " is-rigid" : " is-flexible") + (item.done ? " is-done" : "");
    article.dataset.scheduleId = item.id;
    article.innerHTML = '<div class="schedule-card-time">' + escText(item.start) + ' - ' + escText(item.end) + '</div>' +
      '<div class="schedule-body"><div class="schedule-title-row"><h3>' + escText(item.title) + '</h3><span class="schedule-tag">' + escText(labelFor(item.type)) + '</span>' + (count ? '<span class="pomodoro-count" title="今日已完成番茄">🍅 ' + count + '</span>' : '') + '</div><p>' + escText(item.detail) + '</p></div>' +
      '<div class="schedule-item-actions"><label class="schedule-check" title="标记完成"><input type="checkbox" ' + (item.done ? 'checked' : '') + ' aria-label="完成 ' + escText(item.title) + '"></label>' + (item.rigid ? '' : '<button type="button" class="schedule-focus-button" title="启动番茄钟" aria-label="为' + escText(item.title) + '启动番茄钟">🍅</button>') + '</div>';
    article.querySelector("input").addEventListener("change", (event) => {
      const checked = event.target.checked;
      const allState = app.getState();
      if (String(item.id).startsWith("schedule-")) {
        const key = item.id.replace("schedule-" + item.date + "-", "");
        allState.scheduleOverrides[item.date + "-" + key] = { ...(allState.scheduleOverrides[item.date + "-" + key] || {}), done: checked };
      } else item.done = checked;
      save();
      if (checked) {
        article.classList.add("is-done", "is-celebrating");
        setTimeout(render, 260);
      } else { render(); }
    });
    const start = article.querySelector(".schedule-focus-button");
    if (start) start.addEventListener("click", (event) => { event.stopPropagation(); openForSchedule(item); });
    return article;
  }

  function customRenderSchedule() {
    const list = byId("schedule-list");
    if (!list) return;
    const items = scheduleItemsFor(day());
    list.className = "schedule-list schedule-agenda";
    list.replaceChildren.apply(list, items.map(card));
    if (!list.dataset.checkProxy) {
      list.dataset.checkProxy = "1";
      list.addEventListener("click", (event) => {
        const label = event.target.closest(".schedule-check");
        if (!label) return;
        const input = label.querySelector("input");
        if (!input) return;
        event.preventDefault();
        input.checked = !input.checked;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
    }
    if (byId("schedule-date-title")) byId("schedule-date-title").textContent = format(day()) + " · 今日安排";
    if (byId("schedule-empty")) byId("schedule-empty").hidden = items.length > 0;
    customRenderProgress();
  }

  const pomTimer = { remaining: 1500, total: 1500, mode: "focus", taskId: "", taskTitle: "", category: "", running: false, startedAt: 0, handle: null };
  function updateClock() {
    const min = Math.floor(pomTimer.remaining / 60); const sec = pomTimer.remaining % 60;
    if (byId("focus-clock")) byId("focus-clock").textContent = String(min).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
    const ring = byId("focus-clock-ring");
    if (ring) ring.style.setProperty("--timer-progress", ((pomTimer.remaining / Math.max(1, pomTimer.total)) * 360) + "deg");
    if (byId("focus-status")) byId("focus-status").textContent = pomTimer.running ? (pomTimer.mode === "break" ? "休息中" : "专注中") : (pomTimer.mode === "break" ? "准备休息" : "待开始");
    if (byId("focus-start")) byId("focus-start").disabled = pomTimer.running;
    if (byId("focus-pause")) byId("focus-pause").disabled = !pomTimer.running;
    if (byId("focus-finish")) byId("focus-finish").disabled = !(pomTimer.startedAt && pomTimer.mode === "focus");
    renderOverlay();
  }
  function renderFocusStats() {
    const data = stats(new Date().toISOString().slice(0, 10));
    if (byId("focus-today-minutes")) byId("focus-today-minutes").textContent = data.minutes;
    if (byId("focus-today-pomodoros")) byId("focus-today-pomodoros").textContent = data.pomodoros;
    if (byId("focus-today-copy")) byId("focus-today-copy").textContent = data.minutes + " 分钟 · " + data.pomodoros + " 个番茄";
    const host = byId("focus-subject-breakdown");
    const entries = Object.entries(data.subjects).sort((a, b) => b[1] - a[1]);
    const palette = ["#4caf50", "#42a5f5", "#ab47bc", "#ff9800", "#90a4ae"];
    const pie = byId("focus-subject-pie");
    if (pie) { let angle = 0; const segments = entries.map(([, value], index) => { const next = angle + (data.minutes ? value / data.minutes * 360 : 0); const segment = palette[index % palette.length] + " " + angle + "deg " + next + "deg"; angle = next; return segment; }); pie.style.setProperty("--pie-slices", segments.length ? segments.join(",") : "#e8f1e9 0deg 360deg"); pie.setAttribute("aria-label", entries.length ? entries.map(([name, value]) => name + " " + Math.round(value / data.minutes * 100) + "%").join("，") : "暂无专注记录"); }
    if (host) { host.replaceChildren(); entries.forEach(([name, value], index) => { const row = document.createElement("div"); row.className = "focus-subject-row"; row.innerHTML = '<span>' + escText(name) + '</span><i style="width:' + (data.minutes ? value / data.minutes * 100 : 0) + '%;background:' + palette[index % palette.length] + '"></i><small>' + value + ' 分钟</small>'; host.append(row); }); }
  }
  function customRenderFocus() {
    const select = byId("focus-task-select");
    if (select && !pomTimer.running) { const keep = pomTimer.taskId; select.replaceChildren(new Option("不关联任务", "")); scheduleItemsFor(day()).filter((item) => !item.rigid).forEach((item) => select.append(new Option(item.title, item.id))); state.tasks.filter((item) => !item.done).slice(0, 40).forEach((item) => select.append(new Option(item.title, item.id))); if (keep && ![...select.options].some((option) => option.value === keep)) select.append(new Option(pomTimer.taskTitle || "当前课程", keep)); select.value = keep; }
    updateClock(); renderFocusStats();
    document.body.classList.toggle("focus-mode", Boolean(state.ui.focusMode));
    if (byId("focus-mode-toggle")) byId("focus-mode-toggle").textContent = state.ui.focusMode ? "退出专注模式" : "进入专注模式";
    if (byId("focus-sound-toggle")) { byId("focus-sound-toggle").textContent = state.settings.whiteNoise ? "静音" : "声音"; byId("focus-sound-toggle").setAttribute("aria-pressed", String(Boolean(state.settings.whiteNoise))); }
  }
  function ensureOverlay() {
    let overlay = byId("pomodoro-overlay");
    if (overlay) return overlay;
    overlay = document.createElement("section");
    overlay.id = "pomodoro-overlay";
    overlay.className = "pomodoro-overlay";
    overlay.hidden = true;
    overlay.innerHTML = '<div class="pomodoro-overlay-backdrop"></div><div class="pomodoro-overlay-card" role="dialog" aria-modal="true" aria-labelledby="pomodoro-overlay-title"><button type="button" class="pomodoro-close" aria-label="关闭番茄钟">×</button><p>番茄专注</p><h2 id="pomodoro-overlay-title"></h2><span id="pomodoro-overlay-status">待开始</span><div id="pomodoro-overlay-ring" class="pomodoro-overlay-ring"><strong id="pomodoro-overlay-clock">25:00</strong></div><div class="pomodoro-overlay-controls"><button type="button" id="pomodoro-overlay-start" class="primary-button">开始专注</button><button type="button" id="pomodoro-overlay-pause" class="secondary-button">暂停</button><button type="button" id="pomodoro-overlay-finish" class="secondary-button">结束本次</button></div><button type="button" id="pomodoro-overlay-mode" class="text-button">进入专注模式</button></div>';
    overlay.querySelector(".pomodoro-overlay-backdrop").addEventListener("click", () => { if (!pomTimer.running) overlay.hidden = true; });
    overlay.querySelector(".pomodoro-close").addEventListener("click", () => { if (pomTimer.running) return app.showToast && app.showToast("请先暂停计时再关闭"); overlay.hidden = true; });
    overlay.querySelector("#pomodoro-overlay-start").addEventListener("click", start);
    overlay.querySelector("#pomodoro-overlay-pause").addEventListener("click", pause);
    overlay.querySelector("#pomodoro-overlay-finish").addEventListener("click", manualFinish);
    overlay.querySelector("#pomodoro-overlay-mode").addEventListener("click", () => { if (!pomTimer.running) return app.showToast && app.showToast("请先开始番茄钟"); state.ui.focusMode = !state.ui.focusMode; save(); customRenderFocus(); customRenderWeek(); renderOverlay(); });
    document.body.append(overlay);
    return overlay;
  }
  function renderOverlay() {
    const overlay = byId("pomodoro-overlay");
    if (!overlay || overlay.hidden) return;
    const minutes = Math.floor(pomTimer.remaining / 60);
    const seconds = pomTimer.remaining % 60;
    overlay.querySelector("#pomodoro-overlay-title").textContent = pomTimer.taskTitle || "未关联任务";
    overlay.querySelector("#pomodoro-overlay-clock").textContent = String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
    overlay.querySelector("#pomodoro-overlay-status").textContent = pomTimer.running ? (pomTimer.mode === "break" ? "休息中" : "专注中") : (pomTimer.mode === "break" ? "准备休息" : "待开始");
    overlay.querySelector("#pomodoro-overlay-ring").style.setProperty("--pomodoro-angle", (pomTimer.remaining / Math.max(1, pomTimer.total) * 360) + "deg");
    overlay.querySelector("#pomodoro-overlay-start").disabled = pomTimer.running;
    overlay.querySelector("#pomodoro-overlay-pause").disabled = !pomTimer.running;
    overlay.querySelector("#pomodoro-overlay-finish").disabled = !(pomTimer.startedAt && pomTimer.mode === "focus");
    overlay.querySelector("#pomodoro-overlay-mode").textContent = state.ui.focusMode ? "退出专注模式" : "进入专注模式";
  }
  function openForSchedule(item) { pomTimer.taskId = item.id; pomTimer.taskTitle = item.title; pomTimer.category = item.type; pomTimer.mode = "focus"; pomTimer.total = Number(state.settings.focusMinutes || 25) * 60; pomTimer.remaining = pomTimer.total; pomTimer.startedAt = 0; const overlay = ensureOverlay(); overlay.hidden = false; renderOverlay(); }
  function record(minutes, completed) { if (!minutes) return; const task = state.tasks.find((item) => item.id === pomTimer.taskId); state.focusSessions.push({ id: window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), date: new Date().toISOString().slice(0, 10), taskId: pomTimer.taskId, title: pomTimer.taskTitle || task && task.title || "未关联任务", category: task && task.category || pomTimer.category || "未分类", minutes: minutes, pomodoros: completed ? 1 : 0, timer: "pomodoro", endedAt: Date.now() }); persistPomodoroSessions(); save(); }
  let audioContext = null;
  function tone(frequency, volume, duration) {
    if (!state.settings.whiteNoise || !window.AudioContext) return;
    audioContext = audioContext || new AudioContext();
    if (audioContext.state === "suspended") audioContext.resume();
    const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain();
    oscillator.type = "sine"; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, audioContext.currentTime + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + duration + 0.02);
  }
  function softTone(frequency) { tone(frequency, 0.025, 0.28); }
  function softTick() { tone(pomTimer.mode === "break" ? 440 : 520, 0.006, 0.055); }
  function runTimer() { pomTimer.running = true; pomTimer.handle = setInterval(() => { pomTimer.remaining -= 1; if (pomTimer.remaining <= 0) finishRound(); else { softTick(); updateClock(); } }, 1000); updateClock(); }
  function finishRound() { const wasFocus = pomTimer.mode === "focus"; clearInterval(pomTimer.handle); pomTimer.handle = null; pomTimer.running = false; if (wasFocus) { record(Number(state.settings.focusMinutes || 25), true); pomTimer.mode = "break"; pomTimer.total = Number(state.settings.breakMinutes || 5) * 60; pomTimer.remaining = pomTimer.total; pomTimer.startedAt = Date.now(); softTone(660); if (app.showToast) app.showToast("番茄完成，已自动开始休息"); runTimer(); } else { pomTimer.mode = "focus"; pomTimer.total = Number(state.settings.focusMinutes || 25) * 60; pomTimer.remaining = pomTimer.total; pomTimer.startedAt = 0; softTone(880); if (app.showToast) app.showToast("休息结束，可以继续专注"); updateClock(); } customRenderFocus(); customRenderSchedule(); }
  function start() { if (pomTimer.running) return; const select = byId("focus-task-select"); if (select && select.value) pomTimer.taskId = select.value; if (!pomTimer.taskTitle) { const found = scheduleItemsFor(day()).find((item) => item.id === pomTimer.taskId) || state.tasks.find((item) => item.id === pomTimer.taskId); pomTimer.taskTitle = found && found.title || "未关联任务"; pomTimer.category = found && (found.type || found.category) || "未分类"; } pomTimer.startedAt = Date.now(); runTimer(); }
  function pause() { clearInterval(pomTimer.handle); pomTimer.handle = null; pomTimer.running = false; updateClock(); }
  function reset() { clearInterval(pomTimer.handle); pomTimer.handle = null; pomTimer.running = false; pomTimer.mode = "focus"; pomTimer.total = Number(state.settings.focusMinutes || 25) * 60; pomTimer.remaining = pomTimer.total; pomTimer.startedAt = 0; updateClock(); }
  function manualFinish() { if (!pomTimer.startedAt || pomTimer.mode !== "focus") return; const elapsed = Math.max(1, Math.round((pomTimer.total - pomTimer.remaining) / 60)); clearInterval(pomTimer.handle); pomTimer.handle = null; pomTimer.running = false; record(elapsed, false); pomTimer.startedAt = 0; reset(); if (window.showToast) window.showToast("已记录 " + elapsed + " 分钟专注"); customRenderFocus(); }

  function stopFirst(event) { event.preventDefault(); event.stopImmediatePropagation(); }
  const startButton = byId("focus-start"); if (startButton) startButton.addEventListener("click", (event) => { stopFirst(event); start(); }, true);
  const pauseButton = byId("focus-pause"); if (pauseButton) pauseButton.addEventListener("click", (event) => { stopFirst(event); pause(); }, true);
  const resetButton = byId("focus-reset"); if (resetButton) resetButton.addEventListener("click", (event) => { stopFirst(event); reset(); }, true);
  const finishButton = byId("focus-finish"); if (finishButton) finishButton.addEventListener("click", (event) => { stopFirst(event); manualFinish(); }, true);
  const focusMinutes = byId("focus-minutes"); if (focusMinutes) focusMinutes.addEventListener("change", () => { if (!pomTimer.running) { state.settings.focusMinutes = Math.max(1, Number(focusMinutes.value) || 25); reset(); save(); } });
  const breakMinutes = byId("break-minutes"); if (breakMinutes) breakMinutes.addEventListener("change", () => { state.settings.breakMinutes = Math.max(1, Number(breakMinutes.value) || 5); save(); });
  const modeButton = byId("focus-mode-toggle"); if (modeButton) modeButton.addEventListener("click", () => { if (!pomTimer.running) return app.showToast && app.showToast("请先开始番茄钟"); state.ui.focusMode = !state.ui.focusMode; save(); customRenderFocus(); customRenderWeek(); });
  const soundButton = byId("focus-sound-toggle"); if (soundButton) soundButton.addEventListener("click", () => { state.settings.whiteNoise = !state.settings.whiteNoise; save(); customRenderFocus(); });
  ["week-prev", "week-next", "week-today"].forEach((id) => { const button = byId(id); if (!button) return; button.addEventListener("click", () => { if (state.ui.focusMode) return app.showToast && app.showToast("专注模式中不能切换日期"); const delta = id === "week-prev" ? -7 : id === "week-next" ? 7 : 0; const date = id === "week-today" ? new Date() : new Date(day() + "T12:00:00"); date.setDate(date.getDate() + delta); state.ui.scheduleDate = date.toISOString().slice(0, 10); save(); render(); }); });
  window.addEventListener("yijishu:statechange", () => { state = app.getState(); state.ui = state.ui || {}; state.ui.focusMode = Boolean(state.ui.focusMode); render(); });
  render();
})();
