import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, GripVertical, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import {
  type FilterId,
  type Task,
  dayDiff,
  downloadText,
  focusLogged,
  fmtClock,
  fmtMinutes,
  formatLong,
  formatNice,
  isOverdue,
  monthCells,
  monthLabel,
  parseQuickAdd,
  remainingMs,
  tasksToCsv,
  todayKey,
} from "@/lib/tasks/model";
import { useTasks } from "@/lib/tasks/store";

function priorityDot(priority: Task["priority"]) {
  if (priority === "high") return "bg-high";
  if (priority === "low") return "bg-low";
  return "bg-medium";
}

export function TaskRow({
  task,
  movable = false,
  onUp,
  onDown,
  onDragHandle,
}: {
  task: Task;
  movable?: boolean;
  onUp?: () => void;
  onDown?: () => void;
  onDragHandle?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
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

  return (
    <div
      data-task={task.id}
      className={cn(
        "flex items-stretch rounded-lg border border-border bg-bg-elevated",
        task.completed && "opacity-60",
      )}
    >
      {movable ? (
        <button
          type="button"
          aria-label="Drag to reorder"
          onPointerDown={onDragHandle}
          className="grid w-11 shrink-0 touch-none place-items-center text-subtle"
        >
          <GripVertical className="size-4" />
        </button>
      ) : null}
      <button
        type="button"
        aria-label={task.completed ? "Reopen task" : "Complete task"}
        onClick={() => {
          const repeated = toggleTask(task.id);
          if (repeated) toast("Completed. Next one is scheduled.");
        }}
        className="grid w-11 shrink-0 place-items-center"
      >
        <span
          className={cn(
            "grid size-6 place-items-center rounded-full border",
            task.completed ? "border-accent bg-accent text-accent-fg" : "border-border",
          )}
        >
          {task.completed ? <Check className="size-3.5" /> : null}
        </span>
      </button>
      <button type="button" onClick={() => openEdit(task.id)} className="min-w-0 flex-1 py-3 pr-3 text-left">
        <span className={cn("block text-base font-medium", task.completed && "text-muted line-through")}>{task.title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className={cn("size-2 rounded-full", priorityDot(task.priority))} aria-hidden />
          <span>
            {task.priority} · {formatNice(task.dueDate)}
            {task.dueTime ? ` · ${task.dueTime}` : ""}
          </span>
          {listName ? <span>{listName}</span> : null}
          {overdue ? <span className="rounded-sm bg-high-soft px-1.5 py-0.5 font-medium text-high">Overdue</span> : null}
          {soon ? <span className="rounded-sm bg-medium-soft px-1.5 py-0.5 font-medium text-medium">Soon</span> : null}
          {children.length > 0 ? (
            <span>
              {doneChildren}/{children.length} steps
            </span>
          ) : null}
          {task.estimateMin ? <span>{fmtMinutes(task.estimateMin)}</span> : null}
        </span>
      </button>
      {movable ? (
        <div className="flex shrink-0 flex-col border-l border-border">
          <button type="button" aria-label="Move up" onClick={onUp} className="grid h-11 w-11 place-items-center text-muted">
            <ChevronUp className="size-4" />
          </button>
          <button type="button" aria-label="Move down" onClick={onDown} className="grid h-11 w-11 place-items-center text-muted">
            <ChevronDown className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function QuickAdd({
  defaultDue,
  listId = "inbox",
}: {
  defaultDue: string | null;
  listId?: string;
}) {
  const lists = useTasks((state) => state.lists);
  const addTask = useTasks((state) => state.addTask);
  const [value, setValue] = useState("");

  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
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
          estimateMin: draft.estimateMin,
        });
        setValue("");
      }}
    >
      <label className="sr-only" htmlFor="quick-add">
        Add a task
      </label>
      <input
        id="quick-add"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Add a task — tomorrow 3pm !high #home"
        className="h-12 min-w-0 flex-1 rounded-lg border border-border bg-bg-elevated px-3 text-base"
      />
      <button type="submit" className="h-12 shrink-0 rounded-lg bg-accent px-4 text-sm font-medium text-accent-fg">
        Add
      </button>
    </form>
  );
}

function Section({ title, meta, children }: { title: string; meta?: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-medium tracking-wide text-subtle uppercase">{title}</h2>
        {meta ? <span className="text-xs text-muted">{meta}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function TodayView() {
  const tasks = useTasks((state) => state.tasks);
  const setSequence = useTasks((state) => state.setSequence);
  const openCreate = useTasks((state) => state.openCreate);
  const setView = useTasks((state) => state.setView);
  const today = todayKey();
  const listRef = useRef<HTMLDivElement>(null);

  const todayTasks = useMemo(
    () => tasks.filter((task) => !task.parentId && !task.completed && task.dueDate === today).sort((a, b) => a.order - b.order),
    [tasks, today],
  );
  const doneToday = tasks.filter((task) => !task.parentId && task.completed && task.dueDate === today).length;
  const totalToday = todayTasks.length + doneToday;
  const attentionIds = new Set(todayTasks.map((task) => task.id));
  const overdue = tasks
    .filter((task) => !task.parentId && isOverdue(task, today) && !attentionIds.has(task.id))
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
  const urgent = tasks.filter((task) => {
    if (task.parentId || task.completed || !task.dueDate || attentionIds.has(task.id)) return false;
    if (task.dueDate <= today) return false;
    return task.priority === "high" && dayDiff(task.dueDate, today) <= 2;
  });
  const attention = [...overdue, ...urgent].slice(0, 8);
  const shown = new Set([...attentionIds, ...attention.map((task) => task.id)]);
  const upcoming = tasks
    .filter((task) => !task.parentId && !task.completed && task.dueDate && task.dueDate > today && !shown.has(task.id))
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "") || a.order - b.order)
    .slice(0, 4);
  const estimate = todayTasks.reduce((sum, task) => sum + Math.max(0, (task.estimateMin ?? 0) - task.trackedMin), 0);
  const percent = totalToday === 0 ? 0 : Math.round((doneToday / totalToday) * 100);

  function applyOrder(ids: string[]) {
    setSequence(ids);
  }

  function move(id: string, direction: -1 | 1) {
    const ids = todayTasks.map((task) => task.id);
    const index = ids.indexOf(id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= ids.length) return;
    const copy = [...ids];
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item);
    applyOrder(copy);
  }

  function onDragHandle(event: ReactPointerEvent<HTMLButtonElement>) {
    const list = listRef.current;
    const handle = event.currentTarget;
    const row = handle.closest<HTMLElement>("[data-task]");
    if (!list || !row) return;
    handle.setPointerCapture(event.pointerId);
    const moveRow = (pointer: PointerEvent) => {
      const rows = [...list.querySelectorAll<HTMLElement>("[data-task]")];
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
    const finish = (pointer: PointerEvent) => {
      if (handle.hasPointerCapture(pointer.pointerId)) handle.releasePointerCapture(pointer.pointerId);
      handle.removeEventListener("pointermove", moveRow);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", finish);
      const ids = [...list.querySelectorAll<HTMLElement>("[data-task]")].map((item) => item.dataset.task ?? "").filter(Boolean);
      applyOrder(ids);
    };
    handle.addEventListener("pointermove", moveRow);
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
  }

  return (
    <div>
      <h1 className="font-serif text-3xl tracking-tight">{formatLong()}</h1>
      <p className="mt-1 text-sm text-muted tabular-nums">
        {doneToday} of {totalToday} done today
        {estimate > 0 ? ` · about ${fmtMinutes(estimate)} left` : ""}
      </p>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-bg-subtle" aria-hidden>
        <div className="h-full bg-accent" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-4">
        <QuickAdd defaultDue={today} />
      </div>

      <Section title="Today's tasks" meta={todayTasks.length ? `${todayTasks.length} open` : undefined}>
        {todayTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
            <p className="font-medium">Nothing due today</p>
            <p className="mt-1 text-sm text-muted">Your list starts empty. Nothing is added for you.</p>
            <button
              type="button"
              onClick={() => openCreate({ dueDate: today })}
              className="mt-4 h-11 rounded-lg bg-accent px-4 text-sm font-medium text-accent-fg"
            >
              Add a task
            </button>
          </div>
        ) : (
          <div ref={listRef} className="space-y-2">
            {todayTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                movable
                onUp={() => move(task.id, -1)}
                onDown={() => move(task.id, 1)}
                onDragHandle={onDragHandle}
              />
            ))}
          </div>
        )}
      </Section>

      {attention.length > 0 ? (
        <Section title="Needs attention">
          <div className="space-y-2">
            {attention.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        </Section>
      ) : null}

      {upcoming.length > 0 ? (
        <Section title="Upcoming">
          <div className="space-y-2">
            {upcoming.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
          <button type="button" onClick={() => setView("all")} className="mt-3 text-sm font-medium text-accent">
            View all tasks
          </button>
        </Section>
      ) : null}
    </div>
  );
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView() {
  const tasks = useTasks((state) => state.tasks);
  const openCreate = useTasks((state) => state.openCreate);
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState(todayKey(now));
  const cells = monthCells(cursor.year, cursor.month);
  const today = todayKey();

  function shift(delta: number) {
    const date = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: date.getFullYear(), month: date.getMonth() });
  }

  const dayTasks = tasks
    .filter((task) => task.dueDate === selected)
    .sort((a, b) => Number(a.completed) - Number(b.completed) || a.order - b.order);

  return (
    <div>
      <h1 className="sr-only">Calendar</h1>
      <div className="mx-auto w-full max-w-md">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button type="button" aria-label="Previous month" onClick={() => shift(-1)} className="grid size-11 place-items-center rounded-md">
            <ChevronLeft className="size-5" />
          </button>
          <p className="font-serif text-xl">{monthLabel(cursor.year, cursor.month)}</p>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => {
                const date = new Date();
                setCursor({ year: date.getFullYear(), month: date.getMonth() });
                setSelected(todayKey(date));
              }}
              className="h-11 rounded-md px-3 text-sm font-medium text-accent"
            >
              Today
            </button>
            <button type="button" aria-label="Next month" onClick={() => shift(1)} className="grid size-11 place-items-center rounded-md">
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-1 text-center text-xs font-medium text-subtle">
              {day}
            </div>
          ))}
          {cells.map((cell) => {
            const pending = tasks.filter((task) => task.dueDate === cell.key && !task.completed && !task.parentId);
            const selectedDay = cell.key === selected;
            const isToday = cell.key === today;
            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => setSelected(cell.key)}
                aria-label={`${cell.key}${pending.length ? `, ${pending.length} tasks` : ""}`}
                aria-pressed={selectedDay}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center rounded-md text-sm",
                  !cell.inMonth && "text-subtle",
                  isToday && !selectedDay && "bg-accent-soft font-medium text-accent",
                  selectedDay && "bg-accent font-medium text-accent-fg",
                )}
              >
                <span>{cell.date.getDate()}</span>
                <span className="flex h-3 items-center gap-0.5">
                  {pending.slice(0, 3).map((task) => (
                    <span
                      key={task.id}
                      className={cn("size-1.5 rounded-full", selectedDay ? "bg-accent-fg" : priorityDot(task.priority))}
                    />
                  ))}
                  {pending.length > 3 ? (
                    <span className={cn("text-xs", selectedDay ? "text-accent-fg" : "text-muted")}>+{pending.length - 3}</span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <i className="size-2 rounded-full bg-high" /> High
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="size-2 rounded-full bg-medium" /> Medium
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="size-2 rounded-full bg-low" /> Low
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="size-2 rounded-full bg-accent" /> Today
          </span>
        </div>
      </div>
      <Section title={formatNice(selected) === "Today" ? formatLong(new Date()) : formatNice(selected)}>
        <div className="mb-2 flex justify-end">
          <button type="button" onClick={() => openCreate({ dueDate: selected })} className="text-sm font-medium text-accent">
            Add to this day
          </button>
        </div>
        {dayTasks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">No tasks on this day.</p>
        ) : (
          <div className="space-y-2">
            {dayTasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

export function BoardView() {
  const tasks = useTasks((state) => state.tasks);
  const lists = useTasks((state) => state.lists);
  const addList = useTasks((state) => state.addList);
  const renameList = useTasks((state) => state.renameList);
  const deleteList = useTasks((state) => state.deleteList);
  const moveToList = useTasks((state) => state.moveToList);
  const openCreate = useTasks((state) => state.openCreate);
  const openEdit = useTasks((state) => state.openEdit);
  const [draft, setDraft] = useState("");
  const sorted = lists.slice().sort((a, b) => a.order - b.order);

  return (
    <div>
      <h1 className="font-serif text-3xl tracking-tight">Lists</h1>
      <p className="mt-1 text-sm text-muted">Open tasks grouped by list. Drag a card onto another list, or change the list while editing.</p>
      <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
        {sorted.map((list) => {
          const column = tasks
            .filter((task) => !task.parentId && task.listId === list.id && !task.completed)
            .sort((a, b) => a.order - b.order);
          return (
            <section
              key={list.id}
              className="w-72 shrink-0 rounded-xl border border-border bg-bg-subtle p-3"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const id = event.dataTransfer.getData("text/plain");
                if (id) moveToList(id, list.id);
              }}
            >
              <div className="mb-2 flex items-center gap-2">
                <input
                  aria-label={`${list.name} name`}
                  defaultValue={list.name}
                  onBlur={(event) => {
                    const next = event.target.value.trim();
                    if (!next) {
                      event.target.value = list.name;
                      return;
                    }
                    if (next !== list.name) renameList(list.id, next);
                  }}
                  className="h-11 min-w-0 flex-1 rounded-md bg-transparent px-1 font-medium"
                />
                {list.id !== "inbox" ? (
                  <button type="button" onClick={() => deleteList(list.id)} className="h-11 px-2 text-xs text-muted">
                    Remove
                  </button>
                ) : null}
              </div>
              <div className="space-y-2">
                {column.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData("text/plain", task.id)}
                    onClick={() => openEdit(task.id)}
                    className="block w-full rounded-lg border border-border bg-bg-elevated px-3 py-3 text-left"
                  >
                    <span className="block font-medium">{task.title}</span>
                    <span className="mt-1 flex items-center gap-2 text-xs text-muted">
                      <span className={cn("size-2 rounded-full", priorityDot(task.priority))} />
                      {formatNice(task.dueDate)}
                    </span>
                  </button>
                ))}
                {column.length === 0 ? <p className="px-1 py-4 text-sm text-muted">No open tasks</p> : null}
              </div>
              <button
                type="button"
                onClick={() => openCreate({ listId: list.id, dueDate: null })}
                className="mt-2 h-11 w-full rounded-md text-sm font-medium text-accent"
              >
                Add task
              </button>
            </section>
          );
        })}
        <form
          className="w-72 shrink-0 rounded-xl border border-dashed border-border p-3"
          onSubmit={(event) => {
            event.preventDefault();
            addList(draft);
            setDraft("");
          }}
        >
          <label className="text-sm font-medium text-muted" htmlFor="new-list">
            New list
            <input
              id="new-list"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="List name"
              className="mt-2 h-11 w-full rounded-md border border-border bg-bg-elevated px-3"
            />
          </label>
          <button type="submit" className="mt-2 h-11 w-full rounded-md bg-accent text-sm font-medium text-accent-fg">
            Create list
          </button>
        </form>
      </div>
    </div>
  );
}

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "overdue", label: "Overdue" },
  { id: "unscheduled", label: "Unscheduled" },
  { id: "pinned", label: "Pinned" },
  { id: "completed", label: "Completed" },
];

export function AllView() {
  const tasks = useTasks((state) => state.tasks);
  const lists = useTasks((state) => state.lists);
  const [filter, setFilter] = useState<FilterId>("open");
  const [query, setQuery] = useState("");
  const today = todayKey();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = tasks.filter((task) => (q ? true : !task.parentId));
    if (filter === "open") list = list.filter((task) => !task.completed);
    if (filter === "today") list = list.filter((task) => !task.completed && task.dueDate === today);
    if (filter === "upcoming") list = list.filter((task) => !task.completed && Boolean(task.dueDate) && (task.dueDate as string) > today);
    if (filter === "overdue") list = list.filter((task) => isOverdue(task, today));
    if (filter === "unscheduled") list = list.filter((task) => !task.completed && !task.dueDate);
    if (filter === "pinned") list = list.filter((task) => task.pinned && !task.completed);
    if (filter === "completed") list = list.filter((task) => task.completed);
    if (q) {
      list = list.filter((task) => {
        const listName = lists.find((item) => item.id === task.listId)?.name ?? "";
        return `${task.title} ${task.notes} ${task.tags.join(" ")} ${listName}`.toLowerCase().includes(q);
      });
    }
    return list.slice().sort((a, b) => {
      if (filter === "completed") return (b.completedAt ?? "").localeCompare(a.completedAt ?? "");
      if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      return a.order - b.order;
    });
  }, [tasks, lists, filter, query, today]);

  return (
    <div>
      <h1 className="font-serif text-3xl tracking-tight">All tasks</h1>
      <div className="mt-4">
        <label className="sr-only" htmlFor="task-search">
          Search tasks
        </label>
        <input
          id="task-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title, notes, or tags"
          className="h-12 w-full rounded-lg border border-border bg-bg-elevated px-3"
        />
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={cn(
              "h-11 shrink-0 rounded-full border px-3 text-sm",
              filter === item.id ? "border-accent bg-accent-soft font-medium text-accent" : "border-border text-muted",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">
        {visible.length} task{visible.length === 1 ? "" : "s"}
      </p>
      <div className="mt-2 space-y-2">
        {visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">No tasks match.</p>
        ) : (
          visible.map((task) => <TaskRow key={task.id} task={task} />)
        )}
      </div>
      <div className="mt-4">
        <QuickAdd defaultDue={null} />
      </div>
    </div>
  );
}

export function FocusView() {
  const tasks = useTasks((state) => state.tasks);
  const focus = useTasks((state) => state.focus);
  const startFocus = useTasks((state) => state.startFocus);
  const pauseFocus = useTasks((state) => state.pauseFocus);
  const resumeFocus = useTasks((state) => state.resumeFocus);
  const stopFocus = useTasks((state) => state.stopFocus);
  const setFocusLengths = useTasks((state) => state.setFocusLengths);
  const tickFocus = useTasks((state) => state.tickFocus);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
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

  return (
    <div>
      <h1 className="font-serif text-3xl tracking-tight">Focus</h1>
      <p className="mt-1 text-sm text-muted">
        A timer that runs while this app is open. It is not a background alarm. Focused today:{" "}
        <span className="tabular-nums">{fmtMinutes(logged)}</span>
      </p>
      <div className="mt-6 rounded-xl border border-border bg-bg-elevated px-4 py-8 text-center">
        <p className="text-xs font-medium tracking-wide text-subtle uppercase">
          {focus.phase === "break" ? "Break" : focus.phase === "focus" ? "Focus" : "Ready"}
        </p>
        <p className="mt-2 font-serif text-6xl tabular-nums tracking-tight">{clock}</p>
        <p className="mt-2 text-sm text-muted">{current ? current.title : "No task selected"}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {focus.phase === "idle" || !focus.running ? (
            <button
              type="button"
              onClick={() => (focus.phase === "idle" ? startFocus(focus.taskId) : resumeFocus())}
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-accent px-5 text-sm font-medium text-accent-fg"
            >
              <Play className="size-4" />
              {focus.phase === "idle" ? "Start" : "Resume"}
            </button>
          ) : (
            <button type="button" onClick={pauseFocus} className="h-12 rounded-lg bg-accent px-5 text-sm font-medium text-accent-fg">
              Pause
            </button>
          )}
          <button type="button" onClick={stopFocus} className="h-12 rounded-lg border border-border px-5 text-sm font-medium">
            Stop
          </button>
        </div>
      </div>
      {focus.phase === "idle" ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <label className="text-sm text-muted">
            Focus minutes
            <input
              type="number"
              min={5}
              max={90}
              value={focus.focusMin}
              onChange={(event) => setFocusLengths(Number(event.target.value), focus.breakMin)}
              className="mt-1 h-11 w-full rounded-md border border-border bg-bg-elevated px-3 text-fg"
            />
          </label>
          <label className="text-sm text-muted">
            Break minutes
            <input
              type="number"
              min={1}
              max={30}
              value={focus.breakMin}
              onChange={(event) => setFocusLengths(focus.focusMin, Number(event.target.value))}
              className="mt-1 h-11 w-full rounded-md border border-border bg-bg-elevated px-3 text-fg"
            />
          </label>
        </div>
      ) : null}
      <div className="mt-6">
        <h2 className="text-xs font-medium tracking-wide text-subtle uppercase">Work on</h2>
        <div className="mt-2 space-y-2">
          <button
            type="button"
            onClick={() => startFocus(null)}
            className={cn(
              "flex h-11 w-full items-center rounded-lg border px-3 text-left text-sm",
              focus.taskId == null ? "border-accent bg-accent-soft" : "border-border",
            )}
          >
            Untied focus block
          </button>
          {openTasks.slice(0, 12).map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => startFocus(task.id)}
              className={cn(
                "flex min-h-11 w-full items-center rounded-lg border px-3 py-2 text-left text-sm",
                focus.taskId === task.id ? "border-accent bg-accent-soft" : "border-border",
              )}
            >
              {task.title}
            </button>
          ))}
          {openTasks.length === 0 ? <p className="text-sm text-muted">Add a task first, or start an untied block.</p> : null}
        </div>
      </div>
    </div>
  );
}

export function MoreView() {
  const tasks = useTasks((state) => state.tasks);
  const lists = useTasks((state) => state.lists);
  const scratch = useTasks((state) => state.scratch);
  const theme = useTasks((state) => state.theme);
  const toggleTheme = useTasks((state) => state.toggleTheme);
  const setScratch = useTasks((state) => state.setScratch);
  const importData = useTasks((state) => state.importData);
  const undo = useTasks((state) => state.undo);
  const [confirmReplace, setConfirmReplace] = useState<unknown>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const openCount = tasks.filter((task) => !task.completed && !task.parentId).length;
  const overdueCount = tasks.filter((task) => isOverdue(task)).length;

  function exportJson() {
    const payload = {
      version: 2,
      app: "My Assistant",
      exportedAt: new Date().toISOString(),
      tasks,
      lists,
      scratch,
    };
    downloadText(`my-assistant-backup-${todayKey()}.json`, JSON.stringify(payload, null, 2), "application/json");
    toast("Backup downloaded");
  }

  function exportCsv() {
    downloadText(`my-assistant-tasks-${todayKey()}.csv`, tasksToCsv(tasks, lists), "text/csv");
    toast("CSV downloaded");
  }

  async function onFile(file: File) {
    try {
      const raw = JSON.parse(await file.text()) as unknown;
      setConfirmReplace(raw);
    } catch {
      toast.error("That file is not valid JSON.");
    }
  }

  return (
    <div>
      <h1 className="font-serif text-3xl tracking-tight">More</h1>
      <p className="mt-1 text-sm text-muted tabular-nums">
        {openCount} open · {overdueCount} overdue · {tasks.length} stored
      </p>

      <section className="mt-6 rounded-xl border border-border bg-bg-elevated p-4">
        <h2 className="font-medium">Backup and restore</h2>
        <p className="mt-1 text-sm text-muted">
          Tasks live in this browser only. Download a backup if you need a file you can keep. Replacing current tasks asks you to confirm first.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <button type="button" onClick={exportJson} className="h-11 rounded-md bg-accent text-sm font-medium text-accent-fg">
            Download JSON backup
          </button>
          <button type="button" onClick={exportCsv} className="h-11 rounded-md border border-border text-sm font-medium">
            Download CSV
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="h-11 rounded-md border border-border text-sm font-medium">
            Import a backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void onFile(file);
            }}
          />
        </div>
        {confirmReplace ? (
          <div className="mt-3 rounded-lg border border-border p-3">
            <p className="text-sm">How should this file be applied?</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="h-11 flex-1 rounded-md border border-border text-sm"
                onClick={() => {
                  const error = importData(confirmReplace, "merge");
                  if (error) toast.error(error);
                  else toast("Backup merged");
                  setConfirmReplace(null);
                }}
              >
                Merge
              </button>
              <button
                type="button"
                className="h-11 flex-1 rounded-md bg-high-soft text-sm font-medium text-high"
                onClick={() => {
                  const error = importData(confirmReplace, "replace");
                  if (error) toast.error(error);
                  else {
                    toast("Tasks replaced", {
                      action: { label: "Undo", onClick: () => undo() && toast("Restored") },
                    });
                  }
                  setConfirmReplace(null);
                }}
              >
                Replace all
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="mt-4 rounded-xl border border-border bg-bg-elevated p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-medium">Appearance</h2>
            <p className="text-sm text-muted">Light or dark. Saved on this device.</p>
          </div>
          <button type="button" onClick={toggleTheme} className="h-11 rounded-md border border-border px-4 text-sm font-medium">
            {theme === "dark" ? "Dark" : "Light"}
          </button>
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-border bg-bg-elevated p-4">
        <h2 className="font-medium">Scratch note</h2>
        <textarea
          value={scratch}
          onChange={(event) => setScratch(event.target.value)}
          rows={5}
          placeholder="A note that stays with your tasks"
          className="mt-2 w-full rounded-md border border-border bg-bg px-3 py-2 text-base"
        />
      </section>

      <section className="mt-4 rounded-xl border border-border p-4 text-sm text-muted">
        <h2 className="font-medium text-fg">Install and reminders</h2>
        <p className="mt-2">
          Use your browser’s install or “Add to Home screen” action to open My Assistant without the address bar. A normal browser tab still shows browser controls until you install it.
        </p>
        <p className="mt-2">
          Due dates and overdue labels update when you open the app. The focus timer only runs while the app is open. This is not a guaranteed background alarm.
        </p>
        <p className="mt-2">
          Clearing site data, uninstalling, or losing this device can erase tasks. Keep a JSON backup somewhere safe. There is no account and no cloud sync.
        </p>
      </section>
    </div>
  );
}
