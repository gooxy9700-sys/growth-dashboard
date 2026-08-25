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
    const facts = {tasks: [items.length + " 个日程", done + " 项完成", "今日课程"], focus: [focusMinutes + " 分钟", (state.focusSessions || []).filter((item) => item.date === today()).length + " 个番茄", "专注记录"], run: [runKm.toFixed(1) + " km", "目标 60 km", (state.runs || []).filter((item) => item.date >= date).length + " 次记录"], gym: [gymCount + " 次", (state.workouts || []).length + " 次累计", "训练档案"], stats: [String(taskRate) + "%", tasks.length + " 项任务", "本日结构"]};
    Object.entries(facts).forEach(([view, entries]) => { const node = document.querySelector("[data-facts-for=\"" + view + "\"]"); if (node) node.replaceChildren(...entries.map((entry) => { const span = document.createElement("span"); span.textContent = entry; return span; })); });
  }

  function setCurrent(view) {
    cards.forEach((card) => card.classList.toggle("is-current", card.dataset.view === view));
    document.body.dataset.boardOpen = view;
    cards.forEach((card) => card.setAttribute("aria-expanded", card.dataset.view === view ? "true" : "false"));
  }

  function ensureDetails() {
    const copy = {
      tasks: ["课程、进度和执行清单一屏安排", "查看今日安排"],
      focus: ["给最重要的一件事留出完整时间", "进入番茄专注"],
      run: ["记录本周步伐，向学期目标靠近", "进入校园跑"],
      gym: ["动作、组数和训练感受持续留档", "进入健身记录"],
      stats: ["用趋势复盘，不用当天状态评判自己", "进入数据统计"]
    };
    cards.forEach((card) => {
      if (card.querySelector(".board-module-detail")) return;
      const view = card.dataset.view;
      const detail = document.createElement("span");
      detail.className = "board-module-detail";
      const description = document.createElement("em");
      description.textContent = copy[view][0];
      const action = document.createElement("button");
      action.type = "button";
      action.className = "board-module-action";
      action.textContent = copy[view][1];
      action.addEventListener("click", (event) => {
        event.stopPropagation();
        app.showView(view);
        if (view === "tasks") byId("schedule-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      detail.append(description, action);
      const facts = document.createElement("div");
      facts.className = "board-module-facts";
      facts.dataset.factsFor = view;
      detail.before(facts);
      card.append(detail);
    });
  }

  cards.forEach((card) => card.addEventListener("click", () => {
    const view = card.dataset.view;
    if (window.matchMedia("(max-width: 1180px)").matches) {
      app.showView(view);
      return;
    }
    if (document.body.dataset.boardOpen === view) {
      app.showView(view);
      return;
    }
    setCurrent(view);
  }));
  document.querySelectorAll(".nav-button[data-view]").forEach((button) => button.addEventListener("click", () => setCurrent(button.dataset.view), true));
  const baseShowView = app.showView;
  app.showView = (view) => { const result = baseShowView(view); document.body.dataset.currentView = view; setCurrent(view); refresh(); return result; };
  ensureDetails();
  document.body.dataset.currentView = "tasks";
  refresh();
  setCurrent("tasks");
  window.setInterval(refresh, 30000);
})();
