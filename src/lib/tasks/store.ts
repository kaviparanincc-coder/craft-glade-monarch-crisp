import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  type FocusState,
  type IncomingData,
  type Priority,
  type Repeat,
  type Task,
  type TaskList,
  type ViewId,
  DEFAULT_LISTS,
  defaultFocus,
  nextOrder,
  nextRepeatDate,
  normalizeIncoming,
  todayKey,
  uid,
} from "@/lib/tasks/model";

export type SheetState =
  | null
  | { mode: "create"; dueDate: string | null; listId: string; parentId: string | null }
  | { mode: "edit"; id: string };

type Snap = { tasks: Task[]; lists: TaskList[]; scratch: string };

type TaskInput = {
  title: string;
  notes?: string;
  listId?: string;
  dueDate?: string | null;
  dueTime?: string | null;
  priority?: Priority;
  tags?: string[];
  parentId?: string | null;
  estimateMin?: number | null;
  repeat?: Repeat;
};

type Store = {
  tasks: Task[];
  lists: TaskList[];
  scratch: string;
  theme: "light" | "dark";
  view: ViewId;
  focus: FocusState;
  history: Snap[];
  sheet: SheetState;
  palette: boolean;
  setView: (view: ViewId) => void;
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
  openCreate: (opts?: { dueDate?: string | null; listId?: string; parentId?: string | null }) => void;
  openEdit: (id: string) => void;
  closeSheet: () => void;
  setPalette: (open: boolean) => void;
  addTask: (input: TaskInput) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => boolean;
  setSequence: (ids: string[]) => void;
  moveToList: (id: string, listId: string) => void;
  addList: (name: string) => void;
  renameList: (id: string, name: string) => void;
  deleteList: (id: string) => void;
  setScratch: (body: string) => void;
  logMinutes: (id: string, minutes: number) => void;
  startFocus: (taskId: string | null) => void;
  pauseFocus: () => void;
  resumeFocus: () => void;
  stopFocus: () => void;
  setFocusLengths: (focusMin: number, breakMin: number) => void;
  tickFocus: () => void;
  importData: (raw: unknown, mode: "merge" | "replace") => string | null;
  undo: () => boolean;
};

const LEGACY_KEYS = ["my-assistant-tasks", "myAssistantTasks", "tasks"];

function blankTask(input: TaskInput, order: number): Task {
  const now = new Date().toISOString();
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
    pinned: false,
  };
}

function descendantIds(tasks: Task[], id: string): string[] {
  const children = tasks.filter((task) => task.parentId === id).map((task) => task.id);
  return [id, ...children.flatMap((child) => descendantIds(tasks, child))];
}

function applyTheme(theme: "light" | "dark") {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem("my-assistant-theme", theme);
  } catch {
    /* ignore quota / private mode */
  }
}

export const useTasks = create<Store>()(
  persist(
    (set, get) => {
      const snap = (): Snap => ({
        tasks: get().tasks,
        lists: get().lists,
        scratch: get().scratch,
      });
      const commit = (recipe: (state: Store) => Partial<Store>) => {
        const previous = snap();
        set((state) => ({
          ...recipe(state),
          history: [...state.history, previous].slice(-25),
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
        openCreate: (opts) =>
          set({
            palette: false,
            sheet: {
              mode: "create",
              dueDate: opts?.dueDate ?? null,
              listId: opts?.listId ?? "inbox",
              parentId: opts?.parentId ?? null,
            },
          }),
        openEdit: (id) => set({ palette: false, sheet: { mode: "edit", id } }),
        closeSheet: () => set({ sheet: null }),
        setPalette: (palette) => set({ palette }),
        addTask: (input) => {
          const title = input.title.trim();
          if (!title) return "";
          const task = blankTask({ ...input, title }, nextOrder(get().tasks));
          commit(() => ({ tasks: [...get().tasks, task] }));
          return task.id;
        },
        updateTask: (id, patch) => {
          const now = new Date().toISOString();
          commit((state) => ({
            tasks: state.tasks.map((task) =>
              task.id === id ? { ...task, ...patch, id: task.id, updatedAt: now } : task,
            ),
          }));
        },
        deleteTask: (id) => {
          const remove = new Set(descendantIds(get().tasks, id));
          commit((state) => ({
            tasks: state.tasks.filter((task) => !remove.has(task.id)),
            focus: state.focus.taskId && remove.has(state.focus.taskId) ? { ...state.focus, taskId: null } : state.focus,
          }));
        },
        toggleTask: (id) => {
          const task = get().tasks.find((item) => item.id === id);
          if (!task) return false;
          const now = new Date().toISOString();
          let repeated = false;
          commit((state) => {
            let tasks = state.tasks.map((item) =>
              item.id === id
                ? {
                    ...item,
                    completed: !item.completed,
                    completedAt: item.completed ? null : now,
                    updatedAt: now,
                  }
                : item,
            );
            if (!task.completed && task.repeat !== "none" && task.dueDate && !task.parentId) {
              const nextDate = nextRepeatDate(task.dueDate, task.repeat);
              if (nextDate) {
                repeated = true;
                tasks = [
                  ...tasks,
                  {
                    ...task,
                    id: uid(),
                    completed: false,
                    completedAt: null,
                    dueDate: nextDate,
                    trackedMin: 0,
                    createdAt: now,
                    updatedAt: now,
                    order: nextOrder(tasks),
                  },
                ];
              }
            }
            return { tasks };
          });
          return repeated;
        },
        setSequence: (ids) => {
          commit((state) => ({
            tasks: state.tasks.map((task) => {
              const index = ids.indexOf(task.id);
              if (index === -1) return task;
              return { ...task, order: index };
            }),
          }));
        },
        moveToList: (id, listId) => {
          commit((state) => ({
            tasks: state.tasks.map((task) =>
              task.id === id ? { ...task, listId, updatedAt: new Date().toISOString() } : task,
            ),
          }));
        },
        addList: (name) => {
          const trimmed = name.trim();
          if (!trimmed) return;
          commit((state) => ({
            lists: [
              ...state.lists,
              {
                id: uid(),
                name: trimmed,
                order: state.lists.reduce((max, list) => Math.max(max, list.order), -1) + 1,
              },
            ],
          }));
        },
        renameList: (id, name) => {
          const trimmed = name.trim();
          if (!trimmed) return;
          commit((state) => ({
            lists: state.lists.map((list) => (list.id === id ? { ...list, name: trimmed } : list)),
          }));
        },
        deleteList: (id) => {
          if (id === "inbox") return;
          commit((state) => {
            if (state.lists.length < 2) return {};
            return {
              lists: state.lists.filter((list) => list.id !== id),
              tasks: state.tasks.map((task) => (task.listId === id ? { ...task, listId: "inbox" } : task)),
            };
          });
        },
        setScratch: (body) => set({ scratch: body }),
        logMinutes: (id, minutes) => {
          if (!Number.isFinite(minutes) || minutes === 0) return;
          commit((state) => ({
            tasks: state.tasks.map((task) =>
              task.id === id
                ? { ...task, trackedMin: Math.max(0, task.trackedMin + Math.round(minutes)), updatedAt: new Date().toISOString() }
                : task,
            ),
          }));
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
              remainingMs: focus.focusMin * 60_000,
              endsAt: Date.now() + focus.focusMin * 60_000,
            },
          });
        },
        pauseFocus: () => {
          const focus = get().focus;
          if (!focus.running || focus.endsAt == null) return;
          set({
            focus: {
              ...focus,
              running: false,
              endsAt: null,
              remainingMs: Math.max(0, focus.endsAt - Date.now()),
            },
          });
        },
        resumeFocus: () => {
          const focus = get().focus;
          if (focus.phase === "idle" || focus.running) return;
          set({
            focus: {
              ...focus,
              running: true,
              endsAt: Date.now() + focus.remainingMs,
            },
          });
        },
        stopFocus: () => {
          const focus = get().focus;
          set({
            focus: {
              ...focus,
              phase: "idle",
              running: false,
              endsAt: null,
              remainingMs: focus.focusMin * 60_000,
              taskId: null,
            },
          });
        },
        setFocusLengths: (focusMin, breakMin) => {
          const focus = get().focus;
          if (focus.running) return;
          const nextFocus = Math.min(90, Math.max(5, Math.round(focusMin)));
          const nextBreak = Math.min(30, Math.max(1, Math.round(breakMin)));
          set({
            focus: {
              ...focus,
              focusMin: nextFocus,
              breakMin: nextBreak,
              remainingMs: focus.phase === "break" ? nextBreak * 60_000 : nextFocus * 60_000,
            },
          });
        },
        tickFocus: () => {
          const focus = get().focus;
          if (!focus.running || focus.endsAt == null || Date.now() < focus.endsAt) return;
          const today = todayKey();
          if (focus.phase === "focus") {
            const minutes = focus.focusMin;
            set((state) => ({
              tasks: focus.taskId
                ? state.tasks.map((task) =>
                    task.id === focus.taskId
                      ? { ...task, trackedMin: task.trackedMin + minutes, updatedAt: new Date().toISOString() }
                      : task,
                  )
                : state.tasks,
              focus: {
                ...state.focus,
                phase: "break",
                running: true,
                endsAt: Date.now() + state.focus.breakMin * 60_000,
                remainingMs: state.focus.breakMin * 60_000,
                loggedDate: today,
                loggedMin: (state.focus.loggedDate === today ? state.focus.loggedMin : 0) + minutes,
              },
            }));
            return;
          }
          set((state) => ({
            focus: {
              ...state.focus,
              phase: "idle",
              running: false,
              endsAt: null,
              remainingMs: state.focus.focusMin * 60_000,
            },
          }));
        },
        importData: (raw, mode) => {
          const parsed = normalizeIncoming(raw);
          if ("error" in parsed) return parsed.error;
          const data: IncomingData = parsed;
          commit((state) => {
            if (mode === "replace") {
              return {
                tasks: data.tasks,
                lists: data.lists.length ? data.lists : DEFAULT_LISTS,
                scratch: data.scratch,
              };
            }
            const taskIds = new Set(state.tasks.map((task) => task.id));
            const listIds = new Set(state.lists.map((list) => list.id));
            return {
              tasks: [...state.tasks, ...data.tasks.filter((task) => !taskIds.has(task.id))],
              lists: [...state.lists, ...data.lists.filter((list) => !listIds.has(list.id))],
              scratch: state.scratch || data.scratch,
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
            history: history.slice(0, -1),
          });
          return true;
        },
      };
    },
    {
      name: "my-assistant-v2",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        tasks: state.tasks,
        lists: state.lists,
        scratch: state.scratch,
        theme: state.theme,
        view: state.view,
        focus: state.focus,
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
                lists: parsed.lists.length ? parsed.lists : state.lists,
              });
            });
            break;
          }
        } catch {
          /* leave the list empty */
        }
      },
    },
  ),
);
