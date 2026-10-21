import { addDays, addMonths, eachDayOfInterval, endOfWeek, startOfWeek } from "date-fns";

export type Priority = "high" | "medium" | "low";
export type Repeat = "none" | "daily" | "weekdays" | "weekly" | "monthly";
export type ViewId = "today" | "calendar" | "board" | "all" | "focus" | "more";
export type FilterId =
  | "open"
  | "today"
  | "upcoming"
  | "overdue"
  | "unscheduled"
  | "completed"
  | "pinned";

export type TaskList = {
  id: string;
  name: string;
  order: number;
};

export type Task = {
  id: string;
  title: string;
  notes: string;
  listId: string;
  dueDate: string | null;
  dueTime: string | null;
  priority: Priority;
  tags: string[];
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  order: number;
  parentId: string | null;
  estimateMin: number | null;
  trackedMin: number;
  repeat: Repeat;
  pinned: boolean;
};

export type FocusState = {
  taskId: string | null;
  phase: "idle" | "focus" | "break";
  running: boolean;
  endsAt: number | null;
  remainingMs: number;
  focusMin: number;
  breakMin: number;
  loggedDate: string;
  loggedMin: number;
};

export const DEFAULT_LISTS: TaskList[] = [
  { id: "inbox", name: "Inbox", order: 0 },
  { id: "personal", name: "Personal", order: 1 },
  { id: "work", name: "Work", order: 2 },
];

export function uid(): string {
  return crypto.randomUUID();
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayKey(now = new Date()): string {
  return toDateKey(now);
}

export function parseKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function dayDiff(later: string, earlier: string): number {
  return Math.round((parseKey(later).getTime() - parseKey(earlier).getTime()) / 86400000);
}

export function formatNice(key: string | null, now = new Date()): string {
  if (!key) return "No date";
  const today = todayKey(now);
  if (key === today) return "Today";
  if (key === toDateKey(addDays(now, 1))) return "Tomorrow";
  if (key === toDateKey(addDays(now, -1))) return "Yesterday";
  return parseKey(key).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatLong(now = new Date()): string {
  return now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function monthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const start = startOfWeek(first, { weekStartsOn: 0 });
  const end = endOfWeek(last, { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end }).map((date) => ({
    date,
    key: toDateKey(date),
    inMonth: date.getMonth() === month,
  }));
}

export function nextRepeatDate(dateKey: string, repeat: Repeat): string | null {
  if (repeat === "none") return null;
  const start = parseKey(dateKey);
  if (repeat === "daily") return toDateKey(addDays(start, 1));
  if (repeat === "weekly") return toDateKey(addDays(start, 7));
  if (repeat === "monthly") return toDateKey(addMonths(start, 1));
  let cursor = start;
  do {
    cursor = addDays(cursor, 1);
  } while (cursor.getDay() === 0 || cursor.getDay() === 6);
  return toDateKey(cursor);
}

export function fmtMinutes(min: number): string {
  const rounded = Math.max(0, Math.round(min));
  if (rounded < 60) return `${rounded}m`;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function fmtClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function defaultFocus(now = new Date()): FocusState {
  return {
    taskId: null,
    phase: "idle",
    running: false,
    endsAt: null,
    remainingMs: 25 * 60_000,
    focusMin: 25,
    breakMin: 5,
    loggedDate: todayKey(now),
    loggedMin: 0,
  };
}

export function focusLogged(focus: FocusState, now = new Date()): number {
  return focus.loggedDate === todayKey(now) ? focus.loggedMin : 0;
}

export function remainingMs(focus: FocusState, now = Date.now()): number {
  if (focus.running && focus.endsAt != null) return Math.max(0, focus.endsAt - now);
  return Math.max(0, focus.remainingMs);
}

const PRIORITIES = new Set<Priority>(["high", "medium", "low"]);
const REPEATS = new Set<Repeat>(["none", "daily", "weekdays", "weekly", "monthly"]);

export function coerceTask(raw: unknown, index: number): Task | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const title = String(record.title ?? record.name ?? "").trim();
  if (!title) return null;
  const priorityRaw = String(record.priority ?? "medium").toLowerCase();
  const priority: Priority = PRIORITIES.has(priorityRaw as Priority)
    ? (priorityRaw as Priority)
    : "medium";
  let dueDate: string | null = null;
  const dueRaw = record.dueDate ?? record.due ?? null;
  if (typeof dueRaw === "string" && /^\d{4}-\d{2}-\d{2}/.test(dueRaw)) {
    const sliced = dueRaw.slice(0, 10);
    const [year, month, day] = sliced.split("-").map(Number);
    const parsed = new Date(year, month - 1, day);
    if (parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day) {
      dueDate = sliced;
    }
  }
  const repeatRaw = String(record.repeat ?? "none");
  const repeat: Repeat = REPEATS.has(repeatRaw as Repeat) ? (repeatRaw as Repeat) : "none";
  const tags = Array.isArray(record.tags)
    ? record.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
    : typeof record.tag === "string" && record.tag.trim()
      ? [record.tag.trim()]
      : [];
  let dueTime: string | null = null;
  if (typeof record.dueTime === "string" && /^\d{2}:\d{2}/.test(record.dueTime)) {
    dueTime = record.dueTime.slice(0, 5);
  } else if (typeof record.time === "string" && /^\d{2}:\d{2}/.test(record.time)) {
    dueTime = record.time.slice(0, 5);
  }
  return {
    id: typeof record.id === "string" && record.id ? record.id : uid(),
    title,
    notes: String(record.notes ?? record.description ?? ""),
    listId: typeof record.listId === "string" && record.listId ? record.listId : "inbox",
    dueDate,
    dueTime,
    priority,
    tags,
    completed: Boolean(record.completed ?? record.done),
    completedAt: typeof record.completedAt === "string" ? record.completedAt : null,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : new Date().toISOString(),
    order: typeof record.order === "number" && Number.isFinite(record.order) ? record.order : index,
    parentId: typeof record.parentId === "string" ? record.parentId : null,
    estimateMin:
      typeof record.estimateMin === "number" && record.estimateMin > 0
        ? Math.round(record.estimateMin)
        : null,
    trackedMin: typeof record.trackedMin === "number" && record.trackedMin > 0 ? Math.round(record.trackedMin) : 0,
    repeat,
    pinned: Boolean(record.pinned),
  };
}

export function coerceList(raw: unknown, index: number): TaskList | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const id = String(record.id ?? "").trim();
  const name = String(record.name ?? "").trim();
  if (!id || !name) return null;
  return {
    id,
    name,
    order: typeof record.order === "number" ? record.order : index,
  };
}

export type IncomingData = {
  tasks: Task[];
  lists: TaskList[];
  scratch: string;
};

export function normalizeIncoming(raw: unknown): IncomingData | { error: string } {
  try {
    let tasksRaw: unknown[] | null = null;
    let listsRaw: unknown[] = [];
    let scratch = "";
    if (Array.isArray(raw)) {
      tasksRaw = raw;
    } else if (raw && typeof raw === "object") {
      const record = raw as Record<string, unknown>;
      if (Array.isArray(record.tasks)) tasksRaw = record.tasks;
      else if (Array.isArray(record.data)) tasksRaw = record.data;
      else return { error: "This file has no task list." };
      if (Array.isArray(record.lists)) listsRaw = record.lists;
      if (typeof record.scratch === "string") scratch = record.scratch;
    } else {
      return { error: "This file is not a backup." };
    }
    const tasks = tasksRaw
      .map((item, index) => coerceTask(item, index))
      .filter((task): task is Task => task !== null);
    if (tasksRaw.length > 0 && tasks.length === 0) return { error: "No valid tasks in this file." };
    const lists = listsRaw
      .map((item, index) => coerceList(item, index))
      .filter((list): list is TaskList => list !== null);
    for (const task of tasks) {
      if (!lists.some((list) => list.id === task.listId)) {
        lists.push({ id: task.listId, name: task.listId === "inbox" ? "Inbox" : task.listId, order: lists.length });
      }
    }
    if (!lists.some((list) => list.id === "inbox")) {
      lists.unshift({ id: "inbox", name: "Inbox", order: 0 });
    }
    return { tasks, lists, scratch };
  } catch {
    return { error: "Could not read this file." };
  }
}

export type QuickDraft = {
  title: string;
  priority: Priority;
  tags: string[];
  listId: string | null;
  dueDate: string | null;
  dueTime: string | null;
  estimateMin: number | null;
};

export function parseQuickAdd(input: string, lists: TaskList[], now = new Date()): QuickDraft | null {
  let text = input.trim();
  if (!text) return null;
  let priority: Priority = "medium";
  const tags: string[] = [];
  let listId: string | null = null;
  let dueDate: string | null = null;
  let dueTime: string | null = null;
  let estimateMin: number | null = null;

  text = text.replace(/!(high|medium|med|low)\b/gi, (_, token: string) => {
    const value = token.toLowerCase();
    priority = value.startsWith("h") ? "high" : value.startsWith("l") ? "low" : "medium";
    return " ";
  });
  text = text.replace(/#([\p{L}\p{N}_-]+)/gu, (_, tag: string) => {
    tags.push(tag);
    return " ";
  });
  text = text.replace(/@([\p{L}\p{N}_-]+)/gu, (_, name: string) => {
    const match = lists.find(
      (list) => list.name.toLowerCase() === name.toLowerCase() || list.id.toLowerCase() === name.toLowerCase(),
    );
    if (match) listId = match.id;
    return " ";
  });
  text = text.replace(/~(\d+)\s*(m|min|h|hr)?/i, (_, amount: string, unit?: string) => {
    const value = Number(amount);
    estimateMin = unit && unit.toLowerCase().startsWith("h") ? value * 60 : value;
    return " ";
  });
  text = text.replace(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i, (_, hourText: string, minuteText: string | undefined, ap: string) => {
    let hour = Number(hourText) % 12;
    if (ap.toLowerCase() === "pm") hour += 12;
    dueTime = `${String(hour).padStart(2, "0")}:${minuteText ?? "00"}`;
    return " ";
  });
  text = text.replace(/\b([01]?\d|2[0-3]):([0-5]\d)\b/, (_, hourText: string, minuteText: string) => {
    if (!dueTime) dueTime = `${String(Number(hourText)).padStart(2, "0")}:${minuteText}`;
    return " ";
  });
  if (/\btomorrow\b/i.test(text)) {
    dueDate = toDateKey(addDays(now, 1));
    text = text.replace(/\btomorrow\b/i, " ");
  } else if (/\btoday\b/i.test(text)) {
    dueDate = todayKey(now);
    text = text.replace(/\btoday\b/i, " ");
  } else {
    const names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    for (let index = 0; index < names.length; index += 1) {
      const pattern = new RegExp(`\\b${names[index]}\\b`, "i");
      if (!pattern.test(text)) continue;
      let delta = (index - now.getDay() + 7) % 7;
      if (delta === 0) delta = 7;
      dueDate = toDateKey(addDays(now, delta));
      text = text.replace(pattern, " ");
      break;
    }
  }
  text = text.replace(/\b(\d{4}-\d{2}-\d{2})\b/, (_, iso: string) => {
    dueDate = iso;
    return " ";
  });
  const title = text.replace(/\s+/g, " ").trim();
  if (!title) return null;
  return { title, priority, tags, listId, dueDate, dueTime, estimateMin };
}

export function tasksToCsv(tasks: Task[], lists: TaskList[]): string {
  const headers = [
    "title",
    "notes",
    "list",
    "dueDate",
    "dueTime",
    "priority",
    "completed",
    "tags",
    "repeat",
    "estimateMin",
    "trackedMin",
    "order",
  ];
  const lines = [headers.join(",")];
  for (const task of tasks) {
    const listName = lists.find((list) => list.id === task.listId)?.name ?? task.listId;
    const columns = [
      task.title,
      task.notes,
      listName,
      task.dueDate ?? "",
      task.dueTime ?? "",
      task.priority,
      String(task.completed),
      task.tags.join(" "),
      task.repeat,
      task.estimateMin == null ? "" : String(task.estimateMin),
      String(task.trackedMin),
      String(task.order),
    ];
    lines.push(columns.map((value) => `"${value.replace(/"/g, '""')}"`).join(","));
  }
  return lines.join("\n");
}

export function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function nextOrder(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  return Math.max(...tasks.map((task) => task.order)) + 1;
}

export function isOverdue(task: Task, today = todayKey()): boolean {
  return !task.completed && Boolean(task.dueDate) && (task.dueDate as string) < today;
}
