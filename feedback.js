(function () {
  "use strict";
  const app = window.YIJISHU_APP;
  if (!app) return;
  const $ = (id) => document.getElementById(id);
  const dialog = $("feedback-dialog");
  const form = $("feedback-form");
  const currentView = () => document.body.dataset.currentView || document.querySelector(".nav-button.is-active")?.dataset.view || "tasks";
  const device = () => window.matchMedia("(max-width:700px)").matches ? "手机" : window.matchMedia("(max-width:1180px)").matches ? "平板" : "电脑";
  const kindLabels = { bug: "功能异常", layout: "界面布局", data: "数据或同步", idea: "想法建议" };
  const severityLabels = { normal: "一般", blocking: "影响使用", minor: "细节问题" };
  const baseReplaceState = app.replaceState;
  app.replaceState = (next, options) => baseReplaceState({ ...next, feedback: Array.isArray(next.feedback) ? next.feedback : (app.getState().feedback || []) }, options);
  function renderHistory() {
    const history = $("feedback-history");
    const list = (app.getState().feedback || []).slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);
    $("feedback-count").textContent = list.length + " 条";
    history.replaceChildren(...(list.length ? list.map((item) => {
      const article = document.createElement("article");
      article.className = "feedback-item";
      const date = new Date(item.createdAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
      const head = document.createElement("div");
      head.innerHTML = "<strong>" + (kindLabels[item.kind] || "反馈") + "</strong><span>" + (severityLabels[item.severity] || "一般") + "</span>";
      const text = document.createElement("p");
      text.textContent = item.message;
      const meta = document.createElement("small");
      meta.textContent = date + " · " + (item.device || "未记录设备") + " · " + (item.view || "今日任务");
      article.append(head, text, meta);
      return article;
    }) : [Object.assign(document.createElement("p"), { className: "feedback-empty", textContent: "还没有反馈，遇到卡点就从这里留下。" })]));
  }
  function updateContext() { $("feedback-context").textContent = "当前：" + device() + " · " + currentView() + " · " + window.innerWidth + "×" + window.innerHeight; }
  function open() { updateContext(); renderHistory(); dialog.showModal(); }
  $("feedback-button").addEventListener("click", open);
  $("close-feedback").addEventListener("click", () => dialog.close());
  $("cancel-feedback").addEventListener("click", () => dialog.close());
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const item = { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), kind: $("feedback-kind").value, severity: $("feedback-severity").value, message: $("feedback-message").value.trim(), createdAt: Date.now() };
    if ($("feedback-include-context").checked) Object.assign(item, { device: device(), view: currentView(), viewport: window.innerWidth + "×" + window.innerHeight, userAgent: navigator.userAgent.slice(0, 160) });
    if (!item.message) return;
    const state = app.getState();
    state.feedback = [...(state.feedback || []), item].slice(-100);
    app.saveState();
    form.reset();
    $("feedback-include-context").checked = true;
    renderHistory();
    app.showToast("反馈已保存，后续会随同步带到其他设备");
  });
  window.addEventListener("yijishu:statechange", renderHistory);
})();
