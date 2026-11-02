type ActivityType = "post" | "moment" | "comment";

interface ActivityCounter {
  post: number;
  moment: number;
  comment: number;
  total: number;
}

interface CalendarState {
  currentYear: number;
  currentMonth: number;
  todayKey: string;
  hoverDefaultText: string;
  minMonthIndex: number;
  maxMonthIndex: number;
  activityMap: Map<string, ActivityCounter>;
}

const MIN_LOOKBACK_MONTHS = 12;

const createCounter = (): ActivityCounter => ({
  post: 0,
  moment: 0,
  comment: 0,
  total: 0,
});

const pad2 = (value: number) => String(value).padStart(2, "0");

const isActivityType = (value: string | undefined): value is ActivityType =>
  value === "post" || value === "moment" || value === "comment";

const toDateKey = (input: string | Date): string | null => {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const increaseCounter = (counter: ActivityCounter, type: ActivityType) => {
  counter.total += 1;
  if (type === "post") counter.post += 1;
  if (type === "moment") counter.moment += 1;
  if (type === "comment") counter.comment += 1;
};

const buildActivityMap = (widget: HTMLElement): Map<string, ActivityCounter> => {
  const map = new Map<string, ActivityCounter>();
  const items = widget.querySelectorAll<HTMLElement>(".activity-source [data-activity-type][data-activity-time]");

  items.forEach((item) => {
    const type = item.dataset.activityType;
    const time = item.dataset.activityTime;
    if (!isActivityType(type) || !time) return;

    const dateKey = toDateKey(time);
    if (!dateKey) return;

    const counter = map.get(dateKey) ?? createCounter();
    increaseCounter(counter, type);
    map.set(dateKey, counter);
  });

  return map;
};

const getLevel = (count: number, maxCount: number): number => {
  if (count <= 0) return 0;
  if (maxCount <= 1) return 4;

  const ratio = count / maxCount;
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
};

const updateSummary = (widget: HTMLElement, year: number, month: number, activityMap: Map<string, ActivityCounter>) => {
  const summaryEl = widget.querySelector<HTMLElement>("[data-calendar-summary]");
  if (!summaryEl) return;

  const prefix = `${year}-${pad2(month + 1)}-`;
  const summary = createCounter();

  activityMap.forEach((counter, dateKey) => {
    if (!dateKey.startsWith(prefix)) return;
    summary.post += counter.post;
    summary.moment += counter.moment;
    summary.comment += counter.comment;
    summary.total += counter.total;
  });

  summaryEl.textContent = `本月：文章 ${summary.post} · 瞬间 ${summary.moment} · 评论 ${summary.comment}`;
};

const getMonthIndex = (year: number, month: number): number => year * 12 + month;

const getHoverDefaultText = (state: CalendarState): string =>
  `${state.currentYear}年${state.currentMonth + 1}月：悬浮某天查看当天活跃`;

const createDayCell = (options: {
  year: number;
  month: number;
  day: number;
  isToday?: boolean;
  level?: number;
  counter?: ActivityCounter;
}): HTMLDivElement => {
  const cell = document.createElement("div");
  cell.className = "calendar-day";
  if (options.isToday) cell.classList.add("is-today");
  if ((options.level ?? 0) > 0) {
    cell.classList.add("active", `level-${options.level}`);
  }

  const dateKey = `${options.year}-${pad2(options.month + 1)}-${pad2(options.day)}`;
  const counter = options.counter ?? createCounter();
  cell.dataset.dateKey = dateKey;
  cell.dataset.total = String(counter.total);
  cell.dataset.post = String(counter.post);
  cell.dataset.moment = String(counter.moment);
  cell.dataset.comment = String(counter.comment);
  cell.setAttribute("role", "gridcell");
  cell.setAttribute("aria-label", `${dateKey}，文章 ${counter.post}，瞬间 ${counter.moment}，评论 ${counter.comment}`);
  cell.title = `${dateKey}\n文章 ${counter.post} · 瞬间 ${counter.moment} · 评论 ${counter.comment}`;

  const number = document.createElement("span");
  number.className = "day-number";
  number.textContent = String(options.day);
  cell.appendChild(number);

  const dot = document.createElement("i");
  dot.className = "day-dot";
  cell.appendChild(dot);

  return cell;
};

const createEmptyCell = (): HTMLDivElement => {
  const cell = document.createElement("div");
  cell.className = "calendar-day empty";
  cell.setAttribute("aria-hidden", "true");
  return cell;
};

const bindHoverTips = (widget: HTMLElement, state: CalendarState) => {
  const hoverEl = widget.querySelector<HTMLElement>("[data-calendar-hover]");
  if (!hoverEl) return;

  const dayCells = widget.querySelectorAll<HTMLElement>(".calendar-day[data-date-key]");
  dayCells.forEach((cell) => {
    cell.addEventListener("mouseenter", () => {
      const dateKey = cell.dataset.dateKey ?? "";
      const total = Number(cell.dataset.total ?? 0);
      const post = Number(cell.dataset.post ?? 0);
      const moment = Number(cell.dataset.moment ?? 0);
      const comment = Number(cell.dataset.comment ?? 0);
      hoverEl.textContent = `${dateKey}：活跃 ${total}（文章 ${post} · 瞬间 ${moment} · 评论 ${comment}）`;
    });
    cell.addEventListener("mouseleave", () => {
      hoverEl.textContent = state.hoverDefaultText;
    });
  });
};

const renderCalendar = (widget: HTMLElement, state: CalendarState) => {
  const grid = widget.querySelector<HTMLElement>("[data-calendar-grid]");
  const label = widget.querySelector<HTMLElement>("[data-calendar-label]");
  if (!grid || !label) return;

  const { currentYear, currentMonth, todayKey, activityMap } = state;
  label.textContent = `${currentYear}年 ${currentMonth + 1}月`;

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const monthPrefix = `${currentYear}-${pad2(currentMonth + 1)}-`;
  let maxCount = 0;
  activityMap.forEach((counter, dateKey) => {
    if (!dateKey.startsWith(monthPrefix)) return;
    if (counter.total > maxCount) maxCount = counter.total;
  });

  grid.innerHTML = "";

  for (let i = 0; i < firstDay; i += 1) {
    grid.appendChild(createEmptyCell());
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${currentYear}-${pad2(currentMonth + 1)}-${pad2(day)}`;
    const counter = activityMap.get(dateKey) ?? createCounter();
    const level = getLevel(counter.total, maxCount);
    grid.appendChild(
      createDayCell({
        year: currentYear,
        month: currentMonth,
        day,
        counter,
        level,
        isToday: dateKey === todayKey,
      }),
    );
  }

  const trailingEmptyCount = (7 - ((firstDay + daysInMonth) % 7)) % 7;
  for (let i = 0; i < trailingEmptyCount; i += 1) {
    grid.appendChild(createEmptyCell());
  }

  updateSummary(widget, currentYear, currentMonth, activityMap);
  bindHoverTips(widget, state);
};

const updateNavState = (widget: HTMLElement, state: CalendarState) => {
  const prevBtn = widget.querySelector<HTMLButtonElement>("[data-calendar-nav='prev']");
  const nextBtn = widget.querySelector<HTMLButtonElement>("[data-calendar-nav='next']");
  const currentMonthIndex = getMonthIndex(state.currentYear, state.currentMonth);

  if (prevBtn) {
    prevBtn.disabled = currentMonthIndex <= state.minMonthIndex;
  }
  if (nextBtn) {
    nextBtn.disabled = currentMonthIndex >= state.maxMonthIndex;
  }
};

const switchMonth = (state: CalendarState, offset: number) => {
  const currentMonthIndex = getMonthIndex(state.currentYear, state.currentMonth);
  const targetMonthIndex = currentMonthIndex + offset;
  if (targetMonthIndex < state.minMonthIndex || targetMonthIndex > state.maxMonthIndex) {
    return;
  }

  const next = new Date(state.currentYear, state.currentMonth + offset, 1);
  state.currentYear = next.getFullYear();
  state.currentMonth = next.getMonth();
  state.hoverDefaultText = getHoverDefaultText(state);
};

export const initActivityCalendar = () => {
  const widgets = document.querySelectorAll<HTMLElement>("[data-activity-calendar='true']");
  if (!widgets.length) return;

  widgets.forEach((widget) => {
    if (widget.dataset.activityCalendarInited === "true") return;

    const activityMap = buildActivityMap(widget);
    const now = new Date();
    const todayKey = toDateKey(now) ?? "";

    const state: CalendarState = {
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth(),
      todayKey,
      hoverDefaultText: "",
      minMonthIndex: getMonthIndex(now.getFullYear(), now.getMonth()) - MIN_LOOKBACK_MONTHS,
      maxMonthIndex: getMonthIndex(now.getFullYear(), now.getMonth()),
      activityMap,
    };
    state.hoverDefaultText = getHoverDefaultText(state);

    renderCalendar(widget, state);

    const hoverEl = widget.querySelector<HTMLElement>("[data-calendar-hover]");
    if (hoverEl) {
      hoverEl.textContent = state.hoverDefaultText;
    }

    const prevBtn = widget.querySelector<HTMLButtonElement>("[data-calendar-nav='prev']");
    const nextBtn = widget.querySelector<HTMLButtonElement>("[data-calendar-nav='next']");

    prevBtn?.addEventListener("click", () => {
      switchMonth(state, -1);
      renderCalendar(widget, state);
      updateNavState(widget, state);
      const hover = widget.querySelector<HTMLElement>("[data-calendar-hover]");
      if (hover) hover.textContent = state.hoverDefaultText;
    });

    nextBtn?.addEventListener("click", () => {
      switchMonth(state, 1);
      renderCalendar(widget, state);
      updateNavState(widget, state);
      const hover = widget.querySelector<HTMLElement>("[data-calendar-hover]");
      if (hover) hover.textContent = state.hoverDefaultText;
    });

    updateNavState(widget, state);
    widget.dataset.activityCalendarInited = "true";
  });
};
