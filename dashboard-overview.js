(function () {
  "use strict";
  const app = window.YIJISHU_APP;
  if (!app) return;
  const byId = (id) => document.getElementById(id);
  const cards = [...document.querySelectorAll(".board-module[data-view]")];
  const today = () => new Date().toISOString().slice(0, 10);
  function refresh() {
    const state = app.getState();
    const date = state.ui && state.ui.scheduleDate || today();
    const items = app.scheduleItems ? app.scheduleItems(date) : [];
    const done = items.filter((item) => item.done).length;
    const completion = items.length ? Math.round(done / items.length * 100) : 0;
    const focusMinutes = (state.focusSessions || []).filter((item) => item.date === today()).reduce((sum, item) => sum + Number(item.minutes || 0), 0);
    const runKm = (state.runs || []).reduce((sum, item) => sum + Number(item.km || 0), 0);
    const gymCount = (state.workouts || []).filter((item) => item.date === today()).length;
    const tasks = (state.tasks || []).filter((item) => item.date === date);
    const taskDone = tasks.filter((item) => item.done).length;
    const taskRate = tasks.length ? Math.round(taskDone / tasks.length * 100) : completion;
    const values = {"board-today-value": String(completion) + "%", "board-today-meta": items.length ? done + " / " + items.length + " 项已完成" : "今天还没有安排", "board-focus-value": focusMinutes + " 分钟", "board-run-value": runKm.toFixed(1) + " / 60 km", "board-gym-value": gymCount + " 次", "board-stats-value": String(taskRate) + "%"};
    Object.entries(values).forEach(([id, value]) => { const node = byId(id); if (node) node.textContent = value; });
  }
  function setCurrent(view) { cards.forEach((card) => card.classList.toggle("is-current", card.dataset.view === view)); document.body.dataset.currentView = view; }
  cards.forEach((card) => card.addEventListener("click", () => { setCurrent(card.dataset.view); app.showView(card.dataset.view); }));
  document.querySelectorAll(".nav-button[data-view]").forEach((button) => button.addEventListener("click", () => setCurrent(button.dataset.view), true));
  const baseShowView = app.showView;
  app.showView = (view) => { const result = baseShowView(view); setCurrent(view); refresh(); return result; };
  refresh();
  setCurrent("tasks");
  window.setInterval(refresh, 30000);
})();
