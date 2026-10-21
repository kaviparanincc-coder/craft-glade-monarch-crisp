import { i as __toESM } from "../_runtime.mjs";
import { q as require_react, x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { _ as CalendarDays, a as Plus, c as LayoutGrid, d as Ellipsis, f as ChevronUp, g as Check, h as ChevronDown, i as Search, l as House, m as ChevronLeft, o as Play, p as ChevronRight, r as Timer, s as List, t as X, u as GripVertical } from "../_libs/lucide-react.mjs";
import { n as toast, t as Toaster } from "../_libs/sonner.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { a as addDays, i as addMonths, n as eachDayOfInterval, r as startOfWeek, t as endOfWeek } from "../_libs/date-fns.mjs";
import { n as persist, r as create, t as createJSONStorage } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BExHbQJD.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var DEFAULT_LISTS = [
	{
		id: "inbox",
		name: "Inbox",
		order: 0
	},
	{
		id: "personal",
		name: "Personal",
		order: 1
	},
	{
		id: "work",
		name: "Work",
		order: 2
	}
];
function uid() {
	return crypto.randomUUID();
}
function toDateKey(date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function todayKey(now = /* @__PURE__ */ new Date()) {
	return toDateKey(now);
}
function parseKey(key) {
	const [year, month, day] = key.split("-").map(Number);
	return new Date(year, month - 1, day);
}
function dayDiff(later, earlier) {
	return Math.round((parseKey(later).getTime() - parseKey(earlier).getTime()) / 864e5);
}
function formatNice(key, now = /* @__PURE__ */ new Date()) {
	if (!key) return "No date";
	if (key === todayKey(now)) return "Today";
	if (key === toDateKey(addDays(now, 1))) return "Tomorrow";
	if (key === toDateKey(addDays(now, -1))) return "Yesterday";
	return parseKey(key).toLocaleDateString(void 0, {
		weekday: "short",
		month: "short",
		day: "numeric"
	});
}
function formatLong(now = /* @__PURE__ */ new Date()) {
	return now.toLocaleDateString(void 0, {
		weekday: "long",
		month: "long",
		day: "numeric"
	});
}
function monthLabel(year, month) {
	return new Date(year, month, 1).toLocaleDateString(void 0, {
		month: "long",
		year: "numeric"
	});
}
function monthCells(year, month) {
	const first = new Date(year, month, 1);
	const last = new Date(year, month + 1, 0);
	const start = startOfWeek(first, { weekStartsOn: 0 });
	const end = endOfWeek(last, { weekStartsOn: 0 });
	return eachDayOfInterval({
		start,
		end
	}).map((date) => ({
		date,
		key: toDateKey(date),
		inMonth: date.getMonth() === month
	}));
}
function nextRepeatDate(dateKey, repeat) {
	if (repeat === "none") return null;
	const start = parseKey(dateKey);
	if (repeat === "daily") return toDateKey(addDays(start, 1));
	if (repeat === "weekly") return toDateKey(addDays(start, 7));
	if (repeat === "monthly") return toDateKey(addMonths(start, 1));
	let cursor = start;
	do
		cursor = addDays(cursor, 1);
	while (cursor.getDay() === 0 || cursor.getDay() === 6);
	return toDateKey(cursor);
}
function fmtMinutes(min) {
	const rounded = Math.max(0, Math.round(min));
	if (rounded < 60) return `${rounded}m`;
	const hours = Math.floor(rounded / 60);
	const rest = rounded % 60;
	return rest ? `${hours}h ${rest}m` : `${hours}h`;
}
function fmtClock(ms) {
	const total = Math.max(0, Math.ceil(ms / 1e3));
	const minutes = Math.floor(total / 60);
	const seconds = total % 60;
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
function defaultFocus(now = /* @__PURE__ */ new Date()) {
	return {
		taskId: null,
		phase: "idle",
		running: false,
		endsAt: null,
		remainingMs: 15e5,
		focusMin: 25,
		breakMin: 5,
		loggedDate: todayKey(now),
		loggedMin: 0
	};
}
function focusLogged(focus, now = /* @__PURE__ */ new Date()) {
	return focus.loggedDate === todayKey(now) ? focus.loggedMin : 0;
}
function remainingMs(focus, now = Date.now()) {
	if (focus.running && focus.endsAt != null) return Math.max(0, focus.endsAt - now);
	return Math.max(0, focus.remainingMs);
}
var PRIORITIES$1 = /* @__PURE__ */ new Set([
	"high",
	"medium",
	"low"
]);
var REPEATS$1 = /* @__PURE__ */ new Set([
	"none",
	"daily",
	"weekdays",
	"weekly",
	"monthly"
]);
function coerceTask(raw, index) {
	if (!raw || typeof raw !== "object") return null;
	const record = raw;
	const title = String(record.title ?? record.name ?? "").trim();
	if (!title) return null;
	const priorityRaw = String(record.priority ?? "medium").toLowerCase();
	const priority = PRIORITIES$1.has(priorityRaw) ? priorityRaw : "medium";
	let dueDate = null;
	const dueRaw = record.dueDate ?? record.due ?? null;
	if (typeof dueRaw === "string" && /^\d{4}-\d{2}-\d{2}/.test(dueRaw)) {
		const sliced = dueRaw.slice(0, 10);
		const [year, month, day] = sliced.split("-").map(Number);
		const parsed = new Date(year, month - 1, day);
		if (parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day) dueDate = sliced;
	}
	const repeatRaw = String(record.repeat ?? "none");
	const repeat = REPEATS$1.has(repeatRaw) ? repeatRaw : "none";
	const tags = Array.isArray(record.tags) ? record.tags.filter((tag) => typeof tag === "string" && tag.trim().length > 0) : typeof record.tag === "string" && record.tag.trim() ? [record.tag.trim()] : [];
	let dueTime = null;
	if (typeof record.dueTime === "string" && /^\d{2}:\d{2}/.test(record.dueTime)) dueTime = record.dueTime.slice(0, 5);
	else if (typeof record.time === "string" && /^\d{2}:\d{2}/.test(record.time)) dueTime = record.time.slice(0, 5);
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
		createdAt: typeof record.createdAt === "string" ? record.createdAt : (/* @__PURE__ */ new Date()).toISOString(),
		updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : (/* @__PURE__ */ new Date()).toISOString(),
		order: typeof record.order === "number" && Number.isFinite(record.order) ? record.order : index,
		parentId: typeof record.parentId === "string" ? record.parentId : null,
		estimateMin: typeof record.estimateMin === "number" && record.estimateMin > 0 ? Math.round(record.estimateMin) : null,
		trackedMin: typeof record.trackedMin === "number" && record.trackedMin > 0 ? Math.round(record.trackedMin) : 0,
		repeat,
		pinned: Boolean(record.pinned)
	};
}
function coerceList(raw, index) {
	if (!raw || typeof raw !== "object") return null;
	const record = raw;
	const id = String(record.id ?? "").trim();
	const name = String(record.name ?? "").trim();
	if (!id || !name) return null;
	return {
		id,
		name,
		order: typeof record.order === "number" ? record.order : index
	};
}
function normalizeIncoming(raw) {
	try {
		let tasksRaw = null;
		let listsRaw = [];
		let scratch = "";
		if (Array.isArray(raw)) tasksRaw = raw;
		else if (raw && typeof raw === "object") {
			const record = raw;
			if (Array.isArray(record.tasks)) tasksRaw = record.tasks;
			else if (Array.isArray(record.data)) tasksRaw = record.data;
			else return { error: "This file has no task list." };
			if (Array.isArray(record.lists)) listsRaw = record.lists;
			if (typeof record.scratch === "string") scratch = record.scratch;
		} else return { error: "This file is not a backup." };
		const tasks = tasksRaw.map((item, index) => coerceTask(item, index)).filter((task) => task !== null);
		if (tasksRaw.length > 0 && tasks.length === 0) return { error: "No valid tasks in this file." };
		const lists = listsRaw.map((item, index) => coerceList(item, index)).filter((list) => list !== null);
		for (const task of tasks) if (!lists.some((list) => list.id === task.listId)) lists.push({
			id: task.listId,
			name: task.listId === "inbox" ? "Inbox" : task.listId,
			order: lists.length
		});
		if (!lists.some((list) => list.id === "inbox")) lists.unshift({
			id: "inbox",
			name: "Inbox",
			order: 0
		});
		return {
			tasks,
			lists,
			scratch
		};
	} catch {
		return { error: "Could not read this file." };
	}
}
function parseQuickAdd(input, lists, now = /* @__PURE__ */ new Date()) {
	let text = input.trim();
	if (!text) return null;
	let priority = "medium";
	const tags = [];
	let listId = null;
	let dueDate = null;
	let dueTime = null;
	let estimateMin = null;
	text = text.replace(/!(high|medium|med|low)\b/gi, (_, token) => {
		const value = token.toLowerCase();
		priority = value.startsWith("h") ? "high" : value.startsWith("l") ? "low" : "medium";
		return " ";
	});
	text = text.replace(/#([\p{L}\p{N}_-]+)/gu, (_, tag) => {
		tags.push(tag);
		return " ";
	});
	text = text.replace(/@([\p{L}\p{N}_-]+)/gu, (_, name) => {
		const match = lists.find((list) => list.name.toLowerCase() === name.toLowerCase() || list.id.toLowerCase() === name.toLowerCase());
		if (match) listId = match.id;
		return " ";
	});
	text = text.replace(/~(\d+)\s*(m|min|h|hr)?/i, (_, amount, unit) => {
		const value = Number(amount);
		estimateMin = unit && unit.toLowerCase().startsWith("h") ? value * 60 : value;
		return " ";
	});
	text = text.replace(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i, (_, hourText, minuteText, ap) => {
		let hour = Number(hourText) % 12;
		if (ap.toLowerCase() === "pm") hour += 12;
		dueTime = `${String(hour).padStart(2, "0")}:${minuteText ?? "00"}`;
		return " ";
	});
	text = text.replace(/\b([01]?\d|2[0-3]):([0-5]\d)\b/, (_, hourText, minuteText) => {
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
		const names = [
			"sunday",
			"monday",
			"tuesday",
			"wednesday",
			"thursday",
			"friday",
			"saturday"
		];
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
	text = text.replace(/\b(\d{4}-\d{2}-\d{2})\b/, (_, iso) => {
		dueDate = iso;
		return " ";
	});
	const title = text.replace(/\s+/g, " ").trim();
	if (!title) return null;
	return {
		title,
		priority,
		tags,
		listId,
		dueDate,
		dueTime,
		estimateMin
	};
}
function tasksToCsv(tasks, lists) {
	const lines = [[
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
		"order"
	].join(",")];
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
			String(task.order)
		];
		lines.push(columns.map((value) => `"${value.replace(/"/g, "\"\"")}"`).join(","));
	}
	return lines.join("\n");
}
function downloadText(filename, content, type) {
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
function nextOrder(tasks) {
	if (tasks.length === 0) return 0;
	return Math.max(...tasks.map((task) => task.order)) + 1;
}
function isOverdue(task, today = todayKey()) {
	return !task.completed && Boolean(task.dueDate) && task.dueDate < today;
}
var LEGACY_KEYS = [
	"my-assistant-tasks",
	"myAssistantTasks",
	"tasks"
];
function blankTask(input, order) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	return {
		id: uid(),
		title: input.title.trim(),
		notes: input.notes?.trim() ?? "",
		listId: input.listId || "inbox",
		dueDate: input.dueDate ?? null,
		dueTime: input.dueTime ?? null,
		priority: input.priority ?? "medium",
		tags: input.tags ?? [],
		completed: false,
		completedAt: null,
		createdAt: now,
		updatedAt: now,
		order,
		parentId: input.parentId ?? null,
		estimateMin: input.estimateMin ?? null,
		trackedMin: 0,
		repeat: input.repeat ?? "none",
		pinned: false
	};
}
function descendantIds(tasks, id) {
	return [id, ...tasks.filter((task) => task.parentId === id).map((task) => task.id).flatMap((child) => descendantIds(tasks, child))];
}
function applyTheme(theme) {
	if (typeof document === "undefined") return;
	document.documentElement.classList.toggle("dark", theme === "dark");
	try {
		localStorage.setItem("my-assistant-theme", theme);
	} catch {}
}
var useTasks = create()(persist((set, get) => {
	const snap = () => ({
		tasks: get().tasks,
		lists: get().lists,
		scratch: get().scratch
	});
	const commit = (recipe) => {
		const previous = snap();
		set((state) => ({
			...recipe(state),
			history: [...state.history, previous].slice(-25)
		}));
	};
	return {
		tasks: [],
		lists: DEFAULT_LISTS,
		scratch: "",
		theme: "light",
		view: "today",
		focus: defaultFocus(),
		history: [],
		sheet: null,
		palette: false,
		setView: (view) => set({ view }),
		setTheme: (theme) => {
			applyTheme(theme);
			set({ theme });
		},
		toggleTheme: () => {
			const theme = get().theme === "dark" ? "light" : "dark";
			applyTheme(theme);
			set({ theme });
		},
		openCreate: (opts) => set({
			palette: false,
			sheet: {
				mode: "create",
				dueDate: opts?.dueDate ?? null,
				listId: opts?.listId ?? "inbox",
				parentId: opts?.parentId ?? null
			}
		}),
		openEdit: (id) => set({
			palette: false,
			sheet: {
				mode: "edit",
				id
			}
		}),
		closeSheet: () => set({ sheet: null }),
		setPalette: (palette) => set({ palette }),
		addTask: (input) => {
			const title = input.title.trim();
			if (!title) return "";
			const task = blankTask({
				...input,
				title
			}, nextOrder(get().tasks));
			commit(() => ({ tasks: [...get().tasks, task] }));
			return task.id;
		},
		updateTask: (id, patch) => {
			const now = (/* @__PURE__ */ new Date()).toISOString();
			commit((state) => ({ tasks: state.tasks.map((task) => task.id === id ? {
				...task,
				...patch,
				id: task.id,
				updatedAt: now
			} : task) }));
		},
		deleteTask: (id) => {
			const remove = new Set(descendantIds(get().tasks, id));
			commit((state) => ({
				tasks: state.tasks.filter((task) => !remove.has(task.id)),
				focus: state.focus.taskId && remove.has(state.focus.taskId) ? {
					...state.focus,
					taskId: null
				} : state.focus
			}));
		},
		toggleTask: (id) => {
			const task = get().tasks.find((item) => item.id === id);
			if (!task) return false;
			const now = (/* @__PURE__ */ new Date()).toISOString();
			let repeated = false;
			commit((state) => {
				let tasks = state.tasks.map((item) => item.id === id ? {
					...item,
					completed: !item.completed,
					completedAt: item.completed ? null : now,
					updatedAt: now
				} : item);
				if (!task.completed && task.repeat !== "none" && task.dueDate && !task.parentId) {
					const nextDate = nextRepeatDate(task.dueDate, task.repeat);
					if (nextDate) {
						repeated = true;
						tasks = [...tasks, {
							...task,
							id: uid(),
							completed: false,
							completedAt: null,
							dueDate: nextDate,
							trackedMin: 0,
							createdAt: now,
							updatedAt: now,
							order: nextOrder(tasks)
						}];
					}
				}
				return { tasks };
			});
			return repeated;
		},
		setSequence: (ids) => {
			commit((state) => ({ tasks: state.tasks.map((task) => {
				const index = ids.indexOf(task.id);
				if (index === -1) return task;
				return {
					...task,
					order: index
				};
			}) }));
		},
		moveToList: (id, listId) => {
			commit((state) => ({ tasks: state.tasks.map((task) => task.id === id ? {
				...task,
				listId,
				updatedAt: (/* @__PURE__ */ new Date()).toISOString()
			} : task) }));
		},
		addList: (name) => {
			const trimmed = name.trim();
			if (!trimmed) return;
			commit((state) => ({ lists: [...state.lists, {
				id: uid(),
				name: trimmed,
				order: state.lists.reduce((max, list) => Math.max(max, list.order), -1) + 1
			}] }));
		},
		renameList: (id, name) => {
			const trimmed = name.trim();
			if (!trimmed) return;
			commit((state) => ({ lists: state.lists.map((list) => list.id === id ? {
				...list,
				name: trimmed
			} : list) }));
		},
		deleteList: (id) => {
			if (id === "inbox") return;
			commit((state) => {
				if (state.lists.length < 2) return {};
				return {
					lists: state.lists.filter((list) => list.id !== id),
					tasks: state.tasks.map((task) => task.listId === id ? {
						...task,
						listId: "inbox"
					} : task)
				};
			});
		},
		setScratch: (body) => set({ scratch: body }),
		logMinutes: (id, minutes) => {
			if (!Number.isFinite(minutes) || minutes === 0) return;
			commit((state) => ({ tasks: state.tasks.map((task) => task.id === id ? {
				...task,
				trackedMin: Math.max(0, task.trackedMin + Math.round(minutes)),
				updatedAt: (/* @__PURE__ */ new Date()).toISOString()
			} : task) }));
		},
		startFocus: (taskId) => {
			const focus = get().focus;
			set({
				view: "focus",
				focus: {
					...focus,
					taskId,
					phase: "focus",
					running: true,
					remainingMs: focus.focusMin * 6e4,
					endsAt: Date.now() + focus.focusMin * 6e4
				}
			});
		},
		pauseFocus: () => {
			const focus = get().focus;
			if (!focus.running || focus.endsAt == null) return;
			set({ focus: {
				...focus,
				running: false,
				endsAt: null,
				remainingMs: Math.max(0, focus.endsAt - Date.now())
			} });
		},
		resumeFocus: () => {
			const focus = get().focus;
			if (focus.phase === "idle" || focus.running) return;
			set({ focus: {
				...focus,
				running: true,
				endsAt: Date.now() + focus.remainingMs
			} });
		},
		stopFocus: () => {
			const focus = get().focus;
			set({ focus: {
				...focus,
				phase: "idle",
				running: false,
				endsAt: null,
				remainingMs: focus.focusMin * 6e4,
				taskId: null
			} });
		},
		setFocusLengths: (focusMin, breakMin) => {
			const focus = get().focus;
			if (focus.running) return;
			const nextFocus = Math.min(90, Math.max(5, Math.round(focusMin)));
			const nextBreak = Math.min(30, Math.max(1, Math.round(breakMin)));
			set({ focus: {
				...focus,
				focusMin: nextFocus,
				breakMin: nextBreak,
				remainingMs: focus.phase === "break" ? nextBreak * 6e4 : nextFocus * 6e4
			} });
		},
		tickFocus: () => {
			const focus = get().focus;
			if (!focus.running || focus.endsAt == null || Date.now() < focus.endsAt) return;
			const today = todayKey();
			if (focus.phase === "focus") {
				const minutes = focus.focusMin;
				set((state) => ({
					tasks: focus.taskId ? state.tasks.map((task) => task.id === focus.taskId ? {
						...task,
						trackedMin: task.trackedMin + minutes,
						updatedAt: (/* @__PURE__ */ new Date()).toISOString()
					} : task) : state.tasks,
					focus: {
						...state.focus,
						phase: "break",
						running: true,
						endsAt: Date.now() + state.focus.breakMin * 6e4,
						remainingMs: state.focus.breakMin * 6e4,
						loggedDate: today,
						loggedMin: (state.focus.loggedDate === today ? state.focus.loggedMin : 0) + minutes
					}
				}));
				return;
			}
			set((state) => ({ focus: {
				...state.focus,
				phase: "idle",
				running: false,
				endsAt: null,
				remainingMs: state.focus.focusMin * 6e4
			} }));
		},
		importData: (raw, mode) => {
			const parsed = normalizeIncoming(raw);
			if ("error" in parsed) return parsed.error;
			const data = parsed;
			commit((state) => {
				if (mode === "replace") return {
					tasks: data.tasks,
					lists: data.lists.length ? data.lists : DEFAULT_LISTS,
					scratch: data.scratch
				};
				const taskIds = new Set(state.tasks.map((task) => task.id));
				const listIds = new Set(state.lists.map((list) => list.id));
				return {
					tasks: [...state.tasks, ...data.tasks.filter((task) => !taskIds.has(task.id))],
					lists: [...state.lists, ...data.lists.filter((list) => !listIds.has(list.id))],
					scratch: state.scratch || data.scratch
				};
			});
			return null;
		},
		undo: () => {
			const history = get().history;
			const previous = history[history.length - 1];
			if (!previous) return false;
			set({
				tasks: previous.tasks,
				lists: previous.lists,
				scratch: previous.scratch,
				history: history.slice(0, -1)
			});
			return true;
		}
	};
}, {
	name: "my-assistant-v2",
	storage: createJSONStorage(() => localStorage),
	skipHydration: true,
	partialize: (state) => ({
		tasks: state.tasks,
		lists: state.lists,
		scratch: state.scratch,
		theme: state.theme,
		view: state.view,
		focus: state.focus
	}),
	version: 1,
	onRehydrateStorage: () => (state) => {
		if (!state) return;
		applyTheme(state.theme);
		if (state.tasks.length > 0) return;
		try {
			for (const key of LEGACY_KEYS) {
				const raw = localStorage.getItem(key);
				if (!raw) continue;
				const parsed = normalizeIncoming(JSON.parse(raw));
				if ("error" in parsed || parsed.tasks.length === 0) continue;
				queueMicrotask(() => {
					useTasks.setState({
						tasks: parsed.tasks,
						lists: parsed.lists.length ? parsed.lists : state.lists
					});
				});
				break;
			}
		} catch {}
	}
}));
var PRIORITIES = [
	"high",
	"medium",
	"low"
];
var REPEATS = [
	{
		id: "none",
		label: "Does not repeat"
	},
	{
		id: "daily",
		label: "Every day"
	},
	{
		id: "weekdays",
		label: "Weekdays"
	},
	{
		id: "weekly",
		label: "Every week"
	},
	{
		id: "monthly",
		label: "Every month"
	}
];
function TaskSheet() {
	const sheet = useTasks((state) => state.sheet);
	const tasks = useTasks((state) => state.tasks);
	const lists = useTasks((state) => state.lists);
	const closeSheet = useTasks((state) => state.closeSheet);
	const addTask = useTasks((state) => state.addTask);
	const updateTask = useTasks((state) => state.updateTask);
	const deleteTask = useTasks((state) => state.deleteTask);
	const toggleTask = useTasks((state) => state.toggleTask);
	const logMinutes = useTasks((state) => state.logMinutes);
	const startFocus = useTasks((state) => state.startFocus);
	const undo = useTasks((state) => state.undo);
	const editing = sheet?.mode === "edit" ? tasks.find((task) => task.id === sheet.id) : void 0;
	const [title, setTitle] = (0, import_react.useState)("");
	const [notes, setNotes] = (0, import_react.useState)("");
	const [dueDate, setDueDate] = (0, import_react.useState)("");
	const [dueTime, setDueTime] = (0, import_react.useState)("");
	const [priority, setPriority] = (0, import_react.useState)("medium");
	const [listId, setListId] = (0, import_react.useState)("inbox");
	const [tags, setTags] = (0, import_react.useState)("");
	const [estimate, setEstimate] = (0, import_react.useState)("");
	const [repeat, setRepeat] = (0, import_react.useState)("none");
	const [pinned, setPinned] = (0, import_react.useState)(false);
	const [subtask, setSubtask] = (0, import_react.useState)("");
	const [confirmDelete, setConfirmDelete] = (0, import_react.useState)(false);
	const sheetKey = sheet == null ? "" : sheet.mode === "edit" ? sheet.id : `new:${sheet.dueDate ?? ""}:${sheet.listId}:${sheet.parentId ?? ""}`;
	(0, import_react.useEffect)(() => {
		if (!sheet) return;
		setConfirmDelete(false);
		setSubtask("");
		if (sheet.mode === "edit") {
			const task = useTasks.getState().tasks.find((item) => item.id === sheet.id);
			if (!task) return;
			setTitle(task.title);
			setNotes(task.notes);
			setDueDate(task.dueDate ?? "");
			setDueTime(task.dueTime ?? "");
			setPriority(task.priority);
			setListId(task.listId);
			setTags(task.tags.join(", "));
			setEstimate(task.estimateMin == null ? "" : String(task.estimateMin));
			setRepeat(task.repeat);
			setPinned(task.pinned);
			return;
		}
		setTitle("");
		setNotes("");
		setDueDate(sheet.dueDate ?? "");
		setDueTime("");
		setPriority("medium");
		setListId(sheet.listId);
		setTags("");
		setEstimate("");
		setRepeat("none");
		setPinned(false);
	}, [sheetKey, sheet]);
	(0, import_react.useEffect)(() => {
		if (!sheet) return;
		function onKey(event) {
			if (event.key === "Escape") closeSheet();
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [sheet, closeSheet]);
	if (!sheet) return null;
	if (sheet.mode === "edit" && !editing) return null;
	const children = editing ? tasks.filter((task) => task.parentId === editing.id) : [];
	function save() {
		const trimmed = title.trim();
		if (!trimmed) return;
		const tagList = tags.split(",").map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean);
		const estimateMin = estimate.trim() ? Math.max(0, Math.round(Number(estimate))) || null : null;
		const patch = {
			title: trimmed,
			notes: notes.trim(),
			dueDate: dueDate || null,
			dueTime: dueTime || null,
			priority,
			listId,
			tags: tagList,
			estimateMin,
			repeat,
			pinned
		};
		if (sheet?.mode === "edit" && editing) {
			updateTask(editing.id, patch);
			toast("Task saved");
		} else if (sheet?.mode === "create") {
			addTask({
				...patch,
				parentId: sheet.parentId
			});
			toast("Task added");
		}
		closeSheet();
	}
	function remove() {
		if (!editing) return;
		deleteTask(editing.id);
		closeSheet();
		toast("Task deleted", { action: {
			label: "Undo",
			onClick: () => {
				if (undo()) toast("Restored");
			}
		} });
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-50 flex items-end justify-center sm:items-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			className: "absolute inset-0 bg-fg/40",
			"aria-label": "Close task",
			onClick: closeSheet
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			role: "dialog",
			"aria-modal": "true",
			"aria-labelledby": "task-sheet-title",
			className: "sheet-in relative z-10 max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-xl border border-border bg-bg-elevated p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:rounded-xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-4 flex items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						id: "task-sheet-title",
						className: "font-serif text-2xl tracking-tight",
						children: editing ? "Edit task" : "New task"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "grid size-11 place-items-center rounded-md text-muted",
						onClick: closeSheet,
						"aria-label": "Close",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-5" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "mb-3 block text-sm font-medium text-muted",
					htmlFor: "task-title",
					children: ["Title", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						id: "task-title",
						value: title,
						onChange: (event) => setTitle(event.target.value),
						placeholder: "What needs doing?",
						className: "mt-1 h-11 w-full rounded-md border border-border bg-bg px-3 text-base text-fg",
						autoFocus: true
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "mb-3 block text-sm font-medium text-muted",
					htmlFor: "task-notes",
					children: ["Notes", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						id: "task-notes",
						value: notes,
						onChange: (event) => setNotes(event.target.value),
						rows: 3,
						className: "mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-base text-fg"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-3 grid grid-cols-2 gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "text-sm font-medium text-muted",
						htmlFor: "task-date",
						children: ["Due date", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "task-date",
							type: "date",
							value: dueDate,
							onChange: (event) => setDueDate(event.target.value),
							className: "mt-1 h-11 w-full rounded-md border border-border bg-bg px-3 text-base text-fg"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "text-sm font-medium text-muted",
						htmlFor: "task-time",
						children: ["Time", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "task-time",
							type: "time",
							value: dueTime,
							onChange: (event) => setDueTime(event.target.value),
							className: "mt-1 h-11 w-full rounded-md border border-border bg-bg px-3 text-base text-fg"
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-1 text-sm font-medium text-muted",
					children: "Priority"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mb-3 grid grid-cols-3 gap-2",
					children: PRIORITIES.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setPriority(item),
						className: cn("h-11 rounded-md border text-sm font-medium capitalize", priority === item ? item === "high" ? "border-high bg-high-soft text-high" : item === "medium" ? "border-medium bg-medium-soft text-medium" : "border-low bg-low-soft text-low" : "border-border text-muted"),
						children: item
					}, item))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-3 grid grid-cols-2 gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "text-sm font-medium text-muted",
						htmlFor: "task-list",
						children: ["List", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							id: "task-list",
							value: listId,
							onChange: (event) => setListId(event.target.value),
							className: "mt-1 h-11 w-full rounded-md border border-border bg-bg px-3 text-base text-fg",
							children: lists.slice().sort((a, b) => a.order - b.order).map((list) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: list.id,
								children: list.name
							}, list.id))
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "text-sm font-medium text-muted",
						htmlFor: "task-repeat",
						children: ["Repeat", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							id: "task-repeat",
							value: repeat,
							onChange: (event) => setRepeat(event.target.value),
							className: "mt-1 h-11 w-full rounded-md border border-border bg-bg px-3 text-base text-fg",
							children: REPEATS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: item.id,
								children: item.label
							}, item.id))
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-3 grid grid-cols-2 gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "text-sm font-medium text-muted",
						htmlFor: "task-tags",
						children: ["Tags", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "task-tags",
							value: tags,
							onChange: (event) => setTags(event.target.value),
							placeholder: "home, bills",
							className: "mt-1 h-11 w-full rounded-md border border-border bg-bg px-3 text-base text-fg"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "text-sm font-medium text-muted",
						htmlFor: "task-estimate",
						children: ["Estimate (minutes)", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "task-estimate",
							inputMode: "numeric",
							value: estimate,
							onChange: (event) => setEstimate(event.target.value.replace(/[^\d]/g, "")),
							className: "mt-1 h-11 w-full rounded-md border border-border bg-bg px-3 text-base text-fg"
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setPinned((value) => !value),
					className: cn("mb-4 flex h-11 w-full items-center justify-between rounded-md border px-3 text-sm", pinned ? "border-accent bg-accent-soft text-accent" : "border-border text-fg"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Pin this task" }), pinned ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-muted",
						children: "Off"
					})]
				}),
				editing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-4 rounded-lg border border-border p-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-2 flex items-center justify-between text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-medium",
								children: "Time tracked"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "tabular-nums text-muted",
								children: fmtMinutes(editing.trackedMin)
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "h-11 flex-1 rounded-md border border-border text-sm",
									onClick: () => logMinutes(editing.id, 5),
									children: "+5m"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "h-11 flex-1 rounded-md border border-border text-sm",
									onClick: () => logMinutes(editing.id, 25),
									children: "+25m"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "h-11 flex-1 rounded-md bg-accent text-sm font-medium text-accent-fg",
									onClick: () => startFocus(editing.id),
									children: "Focus"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mb-2 text-sm font-medium",
									children: "Steps"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "mb-2 space-y-1",
									children: children.map((child) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => toggleTask(child.id),
										className: "flex min-h-11 w-full items-center gap-2 text-left text-sm",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: cn("grid size-5 place-items-center rounded-full border", child.completed ? "border-accent bg-accent text-accent-fg" : "border-border"),
											children: child.completed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-3" }) : null
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: cn(child.completed && "text-muted line-through"),
											children: child.title
										})]
									}) }, child.id))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
									className: "flex gap-2",
									onSubmit: (event) => {
										event.preventDefault();
										const name = subtask.trim();
										if (!name) return;
										addTask({
											title: name,
											parentId: editing.id,
											listId: editing.listId,
											dueDate: editing.dueDate,
											priority: editing.priority
										});
										setSubtask("");
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: subtask,
										onChange: (event) => setSubtask(event.target.value),
										placeholder: "Add a step",
										className: "h-11 min-w-0 flex-1 rounded-md border border-border bg-bg px-3 text-sm"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "submit",
										className: "h-11 rounded-md border border-border px-3 text-sm",
										children: "Add"
									})]
								})
							]
						})
					]
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2",
					children: [editing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => confirmDelete ? remove() : setConfirmDelete(true),
						className: "h-11 flex-1 rounded-md bg-high-soft text-sm font-medium text-high",
						children: confirmDelete ? "Confirm delete" : "Delete"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: closeSheet,
						className: "h-11 flex-1 rounded-md border border-border text-sm font-medium",
						children: "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: save,
						className: "h-11 flex-1 rounded-md bg-accent text-sm font-medium text-accent-fg",
						children: editing ? "Save" : "Add task"
					})]
				})
			]
		})]
	});
}
function priorityDot(priority) {
	if (priority === "high") return "bg-high";
	if (priority === "low") return "bg-low";
	return "bg-medium";
}
function TaskRow({ task, movable = false, onUp, onDown, onDragHandle }) {
	const tasks = useTasks((state) => state.tasks);
	const lists = useTasks((state) => state.lists);
	const toggleTask = useTasks((state) => state.toggleTask);
	const openEdit = useTasks((state) => state.openEdit);
	const today = todayKey();
	const children = tasks.filter((item) => item.parentId === task.id);
	const doneChildren = children.filter((item) => item.completed).length;
	const listName = lists.find((list) => list.id === task.listId)?.name;
	const overdue = isOverdue(task, today);
	const soon = !task.completed && task.dueDate != null && task.dueDate > today && dayDiff(task.dueDate, today) <= 1;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		"data-task": task.id,
		className: cn("flex items-stretch rounded-lg border border-border bg-bg-elevated", task.completed && "opacity-60"),
		children: [
			movable ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				"aria-label": "Drag to reorder",
				onPointerDown: onDragHandle,
				className: "grid w-11 shrink-0 touch-none place-items-center text-subtle",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GripVertical, { className: "size-4" })
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				"aria-label": task.completed ? "Reopen task" : "Complete task",
				onClick: () => {
					if (toggleTask(task.id)) toast("Completed. Next one is scheduled.");
				},
				className: "grid w-11 shrink-0 place-items-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: cn("grid size-6 place-items-center rounded-full border", task.completed ? "border-accent bg-accent text-accent-fg" : "border-border"),
					children: task.completed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-3.5" }) : null
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => openEdit(task.id),
				className: "min-w-0 flex-1 py-3 pr-3 text-left",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: cn("block text-base font-medium", task.completed && "text-muted line-through"),
					children: task.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "mt-1 flex flex-wrap items-center gap-2 text-xs text-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: cn("size-2 rounded-full", priorityDot(task.priority)),
							"aria-hidden": true
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							task.priority,
							" · ",
							formatNice(task.dueDate),
							task.dueTime ? ` · ${task.dueTime}` : ""
						] }),
						listName ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: listName }) : null,
						overdue ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "rounded-sm bg-high-soft px-1.5 py-0.5 font-medium text-high",
							children: "Overdue"
						}) : null,
						soon ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "rounded-sm bg-medium-soft px-1.5 py-0.5 font-medium text-medium",
							children: "Soon"
						}) : null,
						task.priority === "high" && !task.completed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "rounded-sm bg-high-soft px-1.5 py-0.5 font-medium text-high",
							children: "High"
						}) : null,
						children.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							doneChildren,
							"/",
							children.length,
							" steps"
						] }) : null,
						task.estimateMin ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: fmtMinutes(task.estimateMin) }) : null
					]
				})]
			}),
			movable ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex shrink-0 flex-col border-l border-border",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					"aria-label": "Move up",
					onClick: onUp,
					className: "grid h-11 w-11 place-items-center text-muted",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "size-4" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					"aria-label": "Move down",
					onClick: onDown,
					className: "grid h-11 w-11 place-items-center text-muted",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "size-4" })
				})]
			}) : null
		]
	});
}
function QuickAdd({ defaultDue, listId = "inbox" }) {
	const lists = useTasks((state) => state.lists);
	const addTask = useTasks((state) => state.addTask);
	const [value, setValue] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		className: "flex gap-2",
		onSubmit: (event) => {
			event.preventDefault();
			const draft = parseQuickAdd(value, lists);
			if (!draft) return;
			addTask({
				title: draft.title,
				priority: draft.priority,
				tags: draft.tags,
				listId: draft.listId ?? listId,
				dueDate: draft.dueDate ?? defaultDue,
				dueTime: draft.dueTime,
				estimateMin: draft.estimateMin
			});
			setValue("");
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				className: "sr-only",
				htmlFor: "quick-add",
				children: "Add a task"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id: "quick-add",
				value,
				onChange: (event) => setValue(event.target.value),
				placeholder: "Add a task — tomorrow 3pm !high #home",
				className: "h-12 min-w-0 flex-1 rounded-lg border border-border bg-bg-elevated px-3 text-base"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "submit",
				className: "h-12 shrink-0 rounded-lg bg-accent px-4 text-sm font-medium text-accent-fg",
				children: "Add"
			})
		]
	});
}
function Section({ title, meta, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mt-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-2 flex items-baseline justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-xs font-medium tracking-wide text-subtle uppercase",
				children: title
			}), meta ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-xs text-muted",
				children: meta
			}) : null]
		}), children]
	});
}
function TodayView() {
	const tasks = useTasks((state) => state.tasks);
	const setSequence = useTasks((state) => state.setSequence);
	const openCreate = useTasks((state) => state.openCreate);
	const setView = useTasks((state) => state.setView);
	const today = todayKey();
	const listRef = (0, import_react.useRef)(null);
	const todayTasks = (0, import_react.useMemo)(() => tasks.filter((task) => !task.parentId && !task.completed && task.dueDate === today).sort((a, b) => a.order - b.order), [tasks, today]);
	const doneToday = tasks.filter((task) => !task.parentId && task.completed && task.dueDate === today).length;
	const totalToday = todayTasks.length + doneToday;
	const attentionIds = new Set(todayTasks.map((task) => task.id));
	const overdue = tasks.filter((task) => !task.parentId && isOverdue(task, today) && !attentionIds.has(task.id)).sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
	const urgent = tasks.filter((task) => {
		if (task.parentId || task.completed || !task.dueDate || attentionIds.has(task.id)) return false;
		if (task.dueDate <= today) return false;
		return task.priority === "high" && dayDiff(task.dueDate, today) <= 2;
	});
	const attention = [...overdue, ...urgent].slice(0, 8);
	const upcoming = tasks.filter((task) => !task.parentId && !task.completed && task.dueDate && task.dueDate > today).sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "") || a.order - b.order).slice(0, 4);
	const estimate = todayTasks.reduce((sum, task) => sum + Math.max(0, (task.estimateMin ?? 0) - task.trackedMin), 0);
	const percent = totalToday === 0 ? 0 : Math.round(doneToday / totalToday * 100);
	function applyOrder(ids) {
		setSequence(ids);
	}
	function move(id, direction) {
		const ids = todayTasks.map((task) => task.id);
		const index = ids.indexOf(id);
		const next = index + direction;
		if (index < 0 || next < 0 || next >= ids.length) return;
		const copy = [...ids];
		const [item] = copy.splice(index, 1);
		copy.splice(next, 0, item);
		applyOrder(copy);
	}
	function onDragHandle(event) {
		const list = listRef.current;
		const handle = event.currentTarget;
		const row = handle.closest("[data-task]");
		if (!list || !row) return;
		handle.setPointerCapture(event.pointerId);
		const moveRow = (pointer) => {
			const rows = [...list.querySelectorAll("[data-task]")];
			for (const other of rows) {
				if (other === row) continue;
				const rect = other.getBoundingClientRect();
				if (pointer.clientY > rect.top && pointer.clientY < rect.bottom) {
					if (pointer.clientY < rect.top + rect.height / 2) list.insertBefore(row, other);
					else list.insertBefore(row, other.nextSibling);
					break;
				}
			}
		};
		const finish = (pointer) => {
			if (handle.hasPointerCapture(pointer.pointerId)) handle.releasePointerCapture(pointer.pointerId);
			handle.removeEventListener("pointermove", moveRow);
			handle.removeEventListener("pointerup", finish);
			handle.removeEventListener("pointercancel", finish);
			applyOrder([...list.querySelectorAll("[data-task]")].map((item) => item.dataset.task ?? "").filter(Boolean));
		};
		handle.addEventListener("pointermove", moveRow);
		handle.addEventListener("pointerup", finish);
		handle.addEventListener("pointercancel", finish);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-serif text-3xl tracking-tight",
			children: formatLong()
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mt-1 text-sm text-muted tabular-nums",
			children: [
				doneToday,
				" of ",
				totalToday,
				" done today",
				estimate > 0 ? ` · about ${fmtMinutes(estimate)} left` : ""
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-3 h-1 overflow-hidden rounded-full bg-bg-subtle",
			"aria-hidden": true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "h-full bg-accent",
				style: { width: `${percent}%` }
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-4",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuickAdd, { defaultDue: today })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			title: "Today's tasks",
			meta: todayTasks.length ? `${todayTasks.length} open` : void 0,
			children: todayTasks.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border border-dashed border-border px-4 py-10 text-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-medium",
						children: "Nothing due today"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: "Your list starts empty. Nothing is added for you."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => openCreate({ dueDate: today }),
						className: "mt-4 h-11 rounded-lg bg-accent px-4 text-sm font-medium text-accent-fg",
						children: "Add a task"
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				ref: listRef,
				className: "space-y-2",
				children: todayTasks.map((task) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskRow, {
					task,
					movable: true,
					onUp: () => move(task.id, -1),
					onDown: () => move(task.id, 1),
					onDragHandle
				}, task.id))
			})
		}),
		attention.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			title: "Needs attention",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-2",
				children: attention.map((task) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskRow, { task }, task.id))
			})
		}) : null,
		upcoming.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
			title: "Upcoming",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-2",
				children: upcoming.map((task) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskRow, { task }, task.id))
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => setView("all"),
				className: "mt-3 text-sm font-medium text-accent",
				children: "View all tasks"
			})]
		}) : null
	] });
}
var WEEKDAYS = [
	"Sun",
	"Mon",
	"Tue",
	"Wed",
	"Thu",
	"Fri",
	"Sat"
];
function CalendarView() {
	const tasks = useTasks((state) => state.tasks);
	const openCreate = useTasks((state) => state.openCreate);
	const now = /* @__PURE__ */ new Date();
	const [cursor, setCursor] = (0, import_react.useState)({
		year: now.getFullYear(),
		month: now.getMonth()
	});
	const [selected, setSelected] = (0, import_react.useState)(todayKey(now));
	const cells = monthCells(cursor.year, cursor.month);
	const today = todayKey();
	function shift(delta) {
		const date = new Date(cursor.year, cursor.month + delta, 1);
		setCursor({
			year: date.getFullYear(),
			month: date.getMonth()
		});
	}
	const dayTasks = tasks.filter((task) => task.dueDate === selected).sort((a, b) => Number(a.completed) - Number(b.completed) || a.order - b.order);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "sr-only",
			children: "Calendar"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto w-full max-w-md",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-3 flex items-center justify-between gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": "Previous month",
							onClick: () => shift(-1),
							className: "grid size-11 place-items-center rounded-md",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "size-5" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-serif text-xl",
							children: monthLabel(cursor.year, cursor.month)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									const date = /* @__PURE__ */ new Date();
									setCursor({
										year: date.getFullYear(),
										month: date.getMonth()
									});
									setSelected(todayKey(date));
								},
								className: "h-11 rounded-md px-3 text-sm font-medium text-accent",
								children: "Today"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": "Next month",
								onClick: () => shift(1),
								className: "grid size-11 place-items-center rounded-md",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "size-5" })
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-7 gap-1",
					children: [WEEKDAYS.map((day) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "py-1 text-center text-xs font-medium text-subtle",
						children: day
					}, day)), cells.map((cell) => {
						const pending = tasks.filter((task) => task.dueDate === cell.key && !task.completed && !task.parentId);
						const selectedDay = cell.key === selected;
						const isToday = cell.key === today;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setSelected(cell.key),
							"aria-label": `${cell.key}${pending.length ? `, ${pending.length} tasks` : ""}`,
							"aria-pressed": selectedDay,
							className: cn("flex min-h-11 flex-col items-center justify-center rounded-md text-sm", !cell.inMonth && "text-subtle", isToday && !selectedDay && "bg-accent-soft font-medium text-accent", selectedDay && "bg-accent font-medium text-accent-fg"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: cell.date.getDate() }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex h-3 items-center gap-0.5",
								children: [pending.slice(0, 3).map((task) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("size-1.5 rounded-full", selectedDay ? "bg-accent-fg" : priorityDot(task.priority)) }, task.id)), pending.length > 3 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: cn("text-xs", selectedDay ? "text-accent-fg" : "text-muted"),
									children: ["+", pending.length - 3]
								}) : null]
							})]
						}, cell.key);
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 flex flex-wrap gap-3 text-xs text-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "inline-flex items-center gap-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "size-2 rounded-full bg-high" }), " High"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "inline-flex items-center gap-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "size-2 rounded-full bg-medium" }), " Medium"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "inline-flex items-center gap-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "size-2 rounded-full bg-low" }), " Low"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "inline-flex items-center gap-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "size-2 rounded-full bg-accent" }), " Today"]
						})
					]
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
			title: formatNice(selected) === "Today" ? formatLong(/* @__PURE__ */ new Date()) : formatNice(selected),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mb-2 flex justify-end",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => openCreate({ dueDate: selected }),
					className: "text-sm font-medium text-accent",
					children: "Add to this day"
				})
			}), dayTasks.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted",
				children: "No tasks on this day."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-2",
				children: dayTasks.map((task) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskRow, { task }, task.id))
			})]
		})
	] });
}
function BoardView() {
	const tasks = useTasks((state) => state.tasks);
	const lists = useTasks((state) => state.lists);
	const addList = useTasks((state) => state.addList);
	const renameList = useTasks((state) => state.renameList);
	const deleteList = useTasks((state) => state.deleteList);
	const moveToList = useTasks((state) => state.moveToList);
	const openCreate = useTasks((state) => state.openCreate);
	const openEdit = useTasks((state) => state.openEdit);
	const [draft, setDraft] = (0, import_react.useState)("");
	const sorted = lists.slice().sort((a, b) => a.order - b.order);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-serif text-3xl tracking-tight",
			children: "Lists"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 text-sm text-muted",
			children: "Open tasks grouped by list. Drag a card onto another list, or change the list while editing."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-4 flex gap-3 overflow-x-auto pb-2",
			children: [sorted.map((list) => {
				const column = tasks.filter((task) => !task.parentId && task.listId === list.id && !task.completed).sort((a, b) => a.order - b.order);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "w-72 shrink-0 rounded-xl border border-border bg-bg-subtle p-3",
					onDragOver: (event) => event.preventDefault(),
					onDrop: (event) => {
						const id = event.dataTransfer.getData("text/plain");
						if (id) moveToList(id, list.id);
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-2 flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								"aria-label": `${list.name} name`,
								defaultValue: list.name,
								onBlur: (event) => {
									const next = event.target.value.trim();
									if (!next) {
										event.target.value = list.name;
										return;
									}
									if (next !== list.name) renameList(list.id, next);
								},
								className: "h-11 min-w-0 flex-1 rounded-md bg-transparent px-1 font-medium"
							}), list.id !== "inbox" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => deleteList(list.id),
								className: "h-11 px-2 text-xs text-muted",
								children: "Remove"
							}) : null]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2",
							children: [column.map((task) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								draggable: true,
								onDragStart: (event) => event.dataTransfer.setData("text/plain", task.id),
								onClick: () => openEdit(task.id),
								className: "block w-full rounded-lg border border-border bg-bg-elevated px-3 py-3 text-left",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block font-medium",
									children: task.title
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "mt-1 flex items-center gap-2 text-xs text-muted",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("size-2 rounded-full", priorityDot(task.priority)) }), formatNice(task.dueDate)]
								})]
							}, task.id)), column.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "px-1 py-4 text-sm text-muted",
								children: "No open tasks"
							}) : null]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => openCreate({
								listId: list.id,
								dueDate: null
							}),
							className: "mt-2 h-11 w-full rounded-md text-sm font-medium text-accent",
							children: "Add task"
						})
					]
				}, list.id);
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "w-72 shrink-0 rounded-xl border border-dashed border-border p-3",
				onSubmit: (event) => {
					event.preventDefault();
					addList(draft);
					setDraft("");
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "text-sm font-medium text-muted",
					htmlFor: "new-list",
					children: ["New list", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						id: "new-list",
						value: draft,
						onChange: (event) => setDraft(event.target.value),
						placeholder: "List name",
						className: "mt-2 h-11 w-full rounded-md border border-border bg-bg-elevated px-3"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					className: "mt-2 h-11 w-full rounded-md bg-accent text-sm font-medium text-accent-fg",
					children: "Create list"
				})]
			})]
		})
	] });
}
var FILTERS = [
	{
		id: "open",
		label: "Open"
	},
	{
		id: "today",
		label: "Today"
	},
	{
		id: "upcoming",
		label: "Upcoming"
	},
	{
		id: "overdue",
		label: "Overdue"
	},
	{
		id: "unscheduled",
		label: "Unscheduled"
	},
	{
		id: "pinned",
		label: "Pinned"
	},
	{
		id: "completed",
		label: "Completed"
	}
];
function AllView() {
	const tasks = useTasks((state) => state.tasks);
	const lists = useTasks((state) => state.lists);
	const [filter, setFilter] = (0, import_react.useState)("open");
	const [query, setQuery] = (0, import_react.useState)("");
	const today = todayKey();
	const visible = (0, import_react.useMemo)(() => {
		const q = query.trim().toLowerCase();
		let list = tasks.filter((task) => q ? true : !task.parentId);
		if (filter === "open") list = list.filter((task) => !task.completed);
		if (filter === "today") list = list.filter((task) => !task.completed && task.dueDate === today);
		if (filter === "upcoming") list = list.filter((task) => !task.completed && Boolean(task.dueDate) && task.dueDate > today);
		if (filter === "overdue") list = list.filter((task) => isOverdue(task, today));
		if (filter === "unscheduled") list = list.filter((task) => !task.completed && !task.dueDate);
		if (filter === "pinned") list = list.filter((task) => task.pinned && !task.completed);
		if (filter === "completed") list = list.filter((task) => task.completed);
		if (q) list = list.filter((task) => {
			const listName = lists.find((item) => item.id === task.listId)?.name ?? "";
			return `${task.title} ${task.notes} ${task.tags.join(" ")} ${listName}`.toLowerCase().includes(q);
		});
		return list.slice().sort((a, b) => {
			if (filter === "completed") return (b.completedAt ?? "").localeCompare(a.completedAt ?? "");
			if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
			if (a.dueDate && !b.dueDate) return -1;
			if (!a.dueDate && b.dueDate) return 1;
			return a.order - b.order;
		});
	}, [
		tasks,
		lists,
		filter,
		query,
		today
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-serif text-3xl tracking-tight",
			children: "All tasks"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				className: "sr-only",
				htmlFor: "task-search",
				children: "Search tasks"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id: "task-search",
				value: query,
				onChange: (event) => setQuery(event.target.value),
				placeholder: "Search title, notes, or tags",
				className: "h-12 w-full rounded-lg border border-border bg-bg-elevated px-3"
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-3 flex gap-2 overflow-x-auto pb-1",
			children: FILTERS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => setFilter(item.id),
				className: cn("h-11 shrink-0 rounded-full border px-3 text-sm", filter === item.id ? "border-accent bg-accent-soft font-medium text-accent" : "border-border text-muted"),
				children: item.label
			}, item.id))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mt-3 text-xs text-muted",
			children: [
				visible.length,
				" task",
				visible.length === 1 ? "" : "s"
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-2 space-y-2",
			children: visible.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted",
				children: "No tasks match."
			}) : visible.map((task) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskRow, { task }, task.id))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-4",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuickAdd, { defaultDue: null })
		})
	] });
}
function FocusView() {
	const tasks = useTasks((state) => state.tasks);
	const focus = useTasks((state) => state.focus);
	const startFocus = useTasks((state) => state.startFocus);
	const pauseFocus = useTasks((state) => state.pauseFocus);
	const resumeFocus = useTasks((state) => state.resumeFocus);
	const stopFocus = useTasks((state) => state.stopFocus);
	const setFocusLengths = useTasks((state) => state.setFocusLengths);
	const tickFocus = useTasks((state) => state.tickFocus);
	const [now, setNow] = (0, import_react.useState)(() => Date.now());
	(0, import_react.useEffect)(() => {
		const timer = window.setInterval(() => {
			setNow(Date.now());
			tickFocus();
		}, 250);
		return () => window.clearInterval(timer);
	}, [tickFocus]);
	const openTasks = tasks.filter((task) => !task.completed && !task.parentId);
	const current = tasks.find((task) => task.id === focus.taskId);
	const clock = fmtClock(remainingMs(focus, now));
	const logged = focusLogged(focus);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-serif text-3xl tracking-tight",
			children: "Focus"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mt-1 text-sm text-muted",
			children: [
				"A timer that runs while this app is open. It is not a background alarm. Focused today:",
				" ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "tabular-nums",
					children: fmtMinutes(logged)
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-6 rounded-xl border border-border bg-bg-elevated px-4 py-8 text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium tracking-wide text-subtle uppercase",
					children: focus.phase === "break" ? "Break" : focus.phase === "focus" ? "Focus" : "Ready"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 font-serif text-6xl tabular-nums tracking-tight",
					children: clock
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted",
					children: current ? current.title : "No task selected"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [focus.phase === "idle" || !focus.running ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => focus.phase === "idle" ? startFocus(focus.taskId) : resumeFocus(),
						className: "inline-flex h-12 items-center gap-2 rounded-lg bg-accent px-5 text-sm font-medium text-accent-fg",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-4" }), focus.phase === "idle" ? "Start" : "Resume"]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: pauseFocus,
						className: "h-12 rounded-lg bg-accent px-5 text-sm font-medium text-accent-fg",
						children: "Pause"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: stopFocus,
						className: "h-12 rounded-lg border border-border px-5 text-sm font-medium",
						children: "Stop"
					})]
				})
			]
		}),
		focus.phase === "idle" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-4 grid grid-cols-2 gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "text-sm text-muted",
				children: ["Focus minutes", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "number",
					min: 5,
					max: 90,
					value: focus.focusMin,
					onChange: (event) => setFocusLengths(Number(event.target.value), focus.breakMin),
					className: "mt-1 h-11 w-full rounded-md border border-border bg-bg-elevated px-3 text-fg"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "text-sm text-muted",
				children: ["Break minutes", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "number",
					min: 1,
					max: 30,
					value: focus.breakMin,
					onChange: (event) => setFocusLengths(focus.focusMin, Number(event.target.value)),
					className: "mt-1 h-11 w-full rounded-md border border-border bg-bg-elevated px-3 text-fg"
				})]
			})]
		}) : null,
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-xs font-medium tracking-wide text-subtle uppercase",
				children: "Work on"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => startFocus(null),
						className: cn("flex h-11 w-full items-center rounded-lg border px-3 text-left text-sm", focus.taskId == null ? "border-accent bg-accent-soft" : "border-border"),
						children: "Untied focus block"
					}),
					openTasks.slice(0, 12).map((task) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => startFocus(task.id),
						className: cn("flex min-h-11 w-full items-center rounded-lg border px-3 py-2 text-left text-sm", focus.taskId === task.id ? "border-accent bg-accent-soft" : "border-border"),
						children: task.title
					}, task.id)),
					openTasks.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Add a task first, or start an untied block."
					}) : null
				]
			})]
		})
	] });
}
function MoreView() {
	const tasks = useTasks((state) => state.tasks);
	const lists = useTasks((state) => state.lists);
	const scratch = useTasks((state) => state.scratch);
	const theme = useTasks((state) => state.theme);
	const toggleTheme = useTasks((state) => state.toggleTheme);
	const setScratch = useTasks((state) => state.setScratch);
	const importData = useTasks((state) => state.importData);
	const undo = useTasks((state) => state.undo);
	const [confirmReplace, setConfirmReplace] = (0, import_react.useState)(null);
	const fileRef = (0, import_react.useRef)(null);
	const openCount = tasks.filter((task) => !task.completed && !task.parentId).length;
	const overdueCount = tasks.filter((task) => isOverdue(task)).length;
	function exportJson() {
		const payload = {
			version: 2,
			app: "My Assistant",
			exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
			tasks,
			lists,
			scratch
		};
		downloadText(`my-assistant-backup-${todayKey()}.json`, JSON.stringify(payload, null, 2), "application/json");
		toast("Backup downloaded");
	}
	function exportCsv() {
		downloadText(`my-assistant-tasks-${todayKey()}.csv`, tasksToCsv(tasks, lists), "text/csv");
		toast("CSV downloaded");
	}
	async function onFile(file) {
		try {
			const raw = JSON.parse(await file.text());
			setConfirmReplace(raw);
		} catch {
			toast.error("That file is not valid JSON.");
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-serif text-3xl tracking-tight",
			children: "More"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mt-1 text-sm text-muted tabular-nums",
			children: [
				openCount,
				" open · ",
				overdueCount,
				" overdue · ",
				tasks.length,
				" stored"
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "mt-6 rounded-xl border border-border bg-bg-elevated p-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-medium",
					children: "Backup and restore"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted",
					children: "Tasks live in this browser only. Download a backup if you need a file you can keep. Replacing current tasks asks you to confirm first."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 flex flex-col gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: exportJson,
							className: "h-11 rounded-md bg-accent text-sm font-medium text-accent-fg",
							children: "Download JSON backup"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: exportCsv,
							className: "h-11 rounded-md border border-border text-sm font-medium",
							children: "Download CSV"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => fileRef.current?.click(),
							className: "h-11 rounded-md border border-border text-sm font-medium",
							children: "Import a backup"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							ref: fileRef,
							type: "file",
							accept: "application/json,.json",
							className: "sr-only",
							onChange: (event) => {
								const file = event.target.files?.[0];
								event.target.value = "";
								if (file) onFile(file);
							}
						})
					]
				}),
				confirmReplace ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 rounded-lg border border-border p-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm",
						children: "How should this file be applied?"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "h-11 flex-1 rounded-md border border-border text-sm",
							onClick: () => {
								const error = importData(confirmReplace, "merge");
								if (error) toast.error(error);
								else toast("Backup merged");
								setConfirmReplace(null);
							},
							children: "Merge"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "h-11 flex-1 rounded-md bg-high-soft text-sm font-medium text-high",
							onClick: () => {
								const error = importData(confirmReplace, "replace");
								if (error) toast.error(error);
								else toast("Tasks replaced", { action: {
									label: "Undo",
									onClick: () => undo() && toast("Restored")
								} });
								setConfirmReplace(null);
							},
							children: "Replace all"
						})]
					})]
				}) : null
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "mt-4 rounded-xl border border-border bg-bg-elevated p-4",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-medium",
					children: "Appearance"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Light or dark. Saved on this device."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: toggleTheme,
					className: "h-11 rounded-md border border-border px-4 text-sm font-medium",
					children: theme === "dark" ? "Dark" : "Light"
				})]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "mt-4 rounded-xl border border-border bg-bg-elevated p-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-medium",
				children: "Scratch note"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
				value: scratch,
				onChange: (event) => setScratch(event.target.value),
				rows: 5,
				placeholder: "A note that stays with your tasks",
				className: "mt-2 w-full rounded-md border border-border bg-bg px-3 py-2 text-base"
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "mt-4 rounded-xl border border-border p-4 text-sm text-muted",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-medium text-fg",
					children: "Install and reminders"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2",
					children: "Use your browser’s install or “Add to Home screen” action to open My Assistant without the address bar. A normal browser tab still shows browser controls until you install it."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2",
					children: "Due dates and overdue labels update when you open the app. The focus timer only runs while the app is open. This is not a guaranteed background alarm."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2",
					children: "Clearing site data, uninstalling, or losing this device can erase tasks. Keep a JSON backup somewhere safe. There is no account and no cloud sync."
				})
			]
		})
	] });
}
var NAV = [
	{
		id: "today",
		label: "Today",
		icon: House
	},
	{
		id: "calendar",
		label: "Calendar",
		icon: CalendarDays
	},
	{
		id: "board",
		label: "Lists",
		icon: LayoutGrid
	},
	{
		id: "all",
		label: "All",
		icon: List
	},
	{
		id: "more",
		label: "More",
		icon: Ellipsis
	}
];
function useHydrated() {
	const [hydrated, setHydrated] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		let live = true;
		const finish = () => {
			if (live) setHydrated(true);
		};
		if (useTasks.persist.hasHydrated()) finish();
		const unsub = useTasks.persist.onFinishHydration(finish);
		Promise.resolve(useTasks.persist.rehydrate()).finally(finish);
		return () => {
			live = false;
			unsub();
		};
	}, []);
	return hydrated;
}
function AssistantApp() {
	const hydrated = useHydrated();
	const view = useTasks((state) => state.view);
	const setView = useTasks((state) => state.setView);
	const openCreate = useTasks((state) => state.openCreate);
	const palette = useTasks((state) => state.palette);
	const setPalette = useTasks((state) => state.setPalette);
	const focus = useTasks((state) => state.focus);
	const [now, setNow] = (0, import_react.useState)(() => Date.now());
	(0, import_react.useEffect)(() => {
		if (!hydrated) return;
		const theme = useTasks.getState().theme;
		document.documentElement.classList.toggle("dark", theme === "dark");
	}, [hydrated]);
	(0, import_react.useEffect)(() => {
		if (!focus.running) return;
		const timer = window.setInterval(() => {
			setNow(Date.now());
			useTasks.getState().tickFocus();
		}, 500);
		return () => window.clearInterval(timer);
	}, [focus.running]);
	(0, import_react.useEffect)(() => {
		function onKey(event) {
			const target = event.target;
			const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				setPalette(true);
			} else if (event.key === "/" && !typing) {
				event.preventDefault();
				setPalette(true);
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [setPalette]);
	if (!hydrated) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh bg-bg px-4 py-6 text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-serif text-3xl tracking-tight",
			children: "My Assistant"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm text-muted",
			children: "Loading your tasks…"
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto grid min-h-dvh max-w-6xl md:grid-cols-[5.5rem_minmax(0,1fr)]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
					className: "sticky top-0 hidden h-dvh flex-col border-r border-border px-2 py-4 md:flex",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-2 font-serif text-sm tracking-tight",
						children: "My Assistant"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
						className: "mt-6 flex flex-col gap-1",
						"aria-label": "Sections",
						children: [NAV.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavButton, {
							item,
							active: view === item.id,
							onClick: () => setView(item.id),
							stacked: true
						}, item.id)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavButton, {
							item: {
								id: "focus",
								label: "Focus",
								icon: Timer
							},
							active: view === "focus",
							onClick: () => setView("focus"),
							stacked: true
						})]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex min-w-0 flex-col pb-20 md:pb-0",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
							className: "sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-bg px-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "min-w-0 flex-1 truncate font-serif text-lg tracking-tight",
									children: "My Assistant"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-label": "Search and jump",
									onClick: () => setPalette(true),
									className: "grid size-11 place-items-center rounded-md text-muted",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "size-5" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-label": "Add task",
									onClick: () => openCreate(view === "today" ? { dueDate: todayKey() } : void 0),
									className: "grid size-11 place-items-center rounded-md bg-accent text-accent-fg",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-5" })
								})
							]
						}),
						focus.running ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setView("focus"),
							className: "flex h-11 items-center justify-between border-b border-border bg-accent-soft px-4 text-sm text-accent",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-2 font-medium",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-4" }),
									focus.phase === "break" ? "Break" : "Focus",
									" running"
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "tabular-nums",
								children: fmtClock(remainingMs(focus, now))
							})]
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
							className: "mx-auto w-full max-w-3xl flex-1 px-4 py-5",
							children: [
								view === "today" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TodayView, {}) : null,
								view === "calendar" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarView, {}) : null,
								view === "board" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BoardView, {}) : null,
								view === "all" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AllView, {}) : null,
								view === "focus" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FocusView, {}) : null,
								view === "more" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MoreView, {}) : null
							]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg-elevated pb-[env(safe-area-inset-bottom)] md:hidden",
				"aria-label": "Sections",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-5",
					children: NAV.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavButton, {
						item,
						active: view === item.id,
						onClick: () => setView(item.id)
					}, item.id))
				})
			}),
			palette ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Palette, { onClose: () => setPalette(false) }) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskSheet, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
				position: "top-center",
				toastOptions: { style: {
					background: "var(--color-fg)",
					color: "var(--color-bg)",
					border: "none"
				} }
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "sr-only",
				children: ["Focused today ", fmtClock(focusLogged(focus) * 6e4)]
			})
		]
	});
}
function NavButton({ item, active, onClick, stacked = false }) {
	const Icon = item.icon;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick,
		"aria-current": active ? "page" : void 0,
		className: cn("flex items-center justify-center gap-1 text-xs font-medium", stacked ? "h-14 flex-col rounded-lg" : "h-16 flex-col", active ? "text-accent" : "text-muted"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
			className: "size-5",
			strokeWidth: 1.75
		}), item.label]
	});
}
function Palette({ onClose }) {
	const tasks = useTasks((state) => state.tasks);
	const setView = useTasks((state) => state.setView);
	const openEdit = useTasks((state) => state.openEdit);
	const openCreate = useTasks((state) => state.openCreate);
	const toggleTheme = useTasks((state) => state.toggleTheme);
	const [query, setQuery] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		function onKey(event) {
			if (event.key === "Escape") onClose();
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);
	const matches = (0, import_react.useMemo)(() => {
		const q = query.trim().toLowerCase();
		const open = tasks.filter((task) => !task.completed);
		if (!q) return open.slice(0, 6);
		return open.filter((task) => task.title.toLowerCase().includes(q)).slice(0, 8);
	}, [tasks, query]);
	const commands = [
		{
			label: "Go to Today",
			run: () => setView("today")
		},
		{
			label: "Go to Calendar",
			run: () => setView("calendar")
		},
		{
			label: "Go to Lists",
			run: () => setView("board")
		},
		{
			label: "Go to All tasks",
			run: () => setView("all")
		},
		{
			label: "Go to Focus",
			run: () => setView("focus")
		},
		{
			label: "Go to More",
			run: () => setView("more")
		},
		{
			label: "New task",
			run: () => openCreate()
		},
		{
			label: "Toggle theme",
			run: () => {
				toggleTheme();
				toast("Theme updated");
			}
		}
	];
	const q = query.trim().toLowerCase();
	const shownCommands = commands.filter((command) => !q || command.label.toLowerCase().includes(q));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12dvh]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			className: "absolute inset-0 bg-fg/40",
			"aria-label": "Close search",
			onClick: onClose
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			role: "dialog",
			"aria-modal": "true",
			"aria-label": "Search",
			className: "sheet-in relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-bg-elevated",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				autoFocus: true,
				value: query,
				onChange: (event) => setQuery(event.target.value),
				placeholder: "Jump to a task or section",
				className: "h-12 w-full border-b border-border bg-transparent px-4 text-base"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "max-h-[50dvh] overflow-y-auto p-2",
				children: [
					shownCommands.map((command) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => {
							command.run();
							onClose();
						},
						className: "flex h-11 w-full items-center rounded-md px-3 text-left text-sm hover:bg-bg-subtle",
						children: command.label
					}, command.label)),
					matches.map((task) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => {
							openEdit(task.id);
							onClose();
						},
						className: "flex h-11 w-full items-center rounded-md px-3 text-left text-sm hover:bg-bg-subtle",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "truncate",
							children: task.title
						})
					}, task.id)),
					shownCommands.length === 0 && matches.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-3 py-6 text-sm text-muted",
						children: "Nothing matches."
					}) : null
				]
			})]
		})]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AssistantApp, {});
}
//#endregion
export { Home as component };
