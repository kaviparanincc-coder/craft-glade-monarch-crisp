import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { type Priority, type Repeat, fmtMinutes } from "@/lib/tasks/model";
import { useTasks } from "@/lib/tasks/store";

const PRIORITIES: Priority[] = ["high", "medium", "low"];
const REPEATS: { id: Repeat; label: string }[] = [
  { id: "none", label: "Does not repeat" },
  { id: "daily", label: "Every day" },
  { id: "weekdays", label: "Weekdays" },
  { id: "weekly", label: "Every week" },
  { id: "monthly", label: "Every month" },
];

export function TaskSheet() {
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

  const editing = sheet?.mode === "edit" ? tasks.find((task) => task.id === sheet.id) : undefined;
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [listId, setListId] = useState("inbox");
  const [tags, setTags] = useState("");
  const [estimate, setEstimate] = useState("");
  const [repeat, setRepeat] = useState<Repeat>("none");
  const [pinned, setPinned] = useState(false);
  const [subtask, setSubtask] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const sheetKey =
    sheet == null ? "" : sheet.mode === "edit" ? sheet.id : `new:${sheet.dueDate ?? ""}:${sheet.listId}:${sheet.parentId ?? ""}`;

  useEffect(() => {
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

  useEffect(() => {
    if (!sheet) return;
    function onKey(event: KeyboardEvent) {
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
    const tagList = tags
      .split(",")
      .map((tag) => tag.trim().replace(/^#/, ""))
      .filter(Boolean);
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
      pinned,
    };
    if (sheet?.mode === "edit" && editing) {
      updateTask(editing.id, patch);
      toast("Task saved");
    } else if (sheet?.mode === "create") {
      addTask({ ...patch, parentId: sheet.parentId });
      toast("Task added");
    }
    closeSheet();
  }

  function remove() {
    if (!editing) return;
    deleteTask(editing.id);
    closeSheet();
    toast("Task deleted", {
      action: {
        label: "Undo",
        onClick: () => {
          if (undo()) toast("Restored");
        },
      },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button className="absolute inset-0 bg-fg/40" aria-label="Close task" onClick={closeSheet} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-sheet-title"
        className="sheet-in relative z-10 max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-xl border border-border bg-bg-elevated p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:rounded-xl"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="task-sheet-title" className="font-serif text-2xl tracking-tight">
            {editing ? "Edit task" : "New task"}
          </h2>
          <button type="button" className="grid size-11 place-items-center rounded-md text-muted" onClick={closeSheet} aria-label="Close">
            <X className="size-5" />
          </button>
        </div>

        <label className="mb-3 block text-sm font-medium text-muted" htmlFor="task-title">
          Title
          <input
            id="task-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What needs doing?"
            className="mt-1 h-11 w-full rounded-md border border-border bg-bg px-3 text-base text-fg"
            autoFocus
          />
        </label>

        <label className="mb-3 block text-sm font-medium text-muted" htmlFor="task-notes">
          Notes
          <textarea
            id="task-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-base text-fg"
          />
        </label>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <label className="text-sm font-medium text-muted" htmlFor="task-date">
            Due date
            <input
              id="task-date"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-border bg-bg px-3 text-base text-fg"
            />
          </label>
          <label className="text-sm font-medium text-muted" htmlFor="task-time">
            Time
            <input
              id="task-time"
              type="time"
              value={dueTime}
              onChange={(event) => setDueTime(event.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-border bg-bg px-3 text-base text-fg"
            />
          </label>
        </div>

        <p className="mb-1 text-sm font-medium text-muted">Priority</p>
        <div className="mb-3 grid grid-cols-3 gap-2">
          {PRIORITIES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPriority(item)}
              className={cn(
                "h-11 rounded-md border text-sm font-medium capitalize",
                priority === item
                  ? item === "high"
                    ? "border-high bg-high-soft text-high"
                    : item === "medium"
                      ? "border-medium bg-medium-soft text-medium"
                      : "border-low bg-low-soft text-low"
                  : "border-border text-muted",
              )}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <label className="text-sm font-medium text-muted" htmlFor="task-list">
            List
            <select
              id="task-list"
              value={listId}
              onChange={(event) => setListId(event.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-border bg-bg px-3 text-base text-fg"
            >
              {lists
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-sm font-medium text-muted" htmlFor="task-repeat">
            Repeat
            <select
              id="task-repeat"
              value={repeat}
              onChange={(event) => setRepeat(event.target.value as Repeat)}
              className="mt-1 h-11 w-full rounded-md border border-border bg-bg px-3 text-base text-fg"
            >
              {REPEATS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <label className="text-sm font-medium text-muted" htmlFor="task-tags">
            Tags
            <input
              id="task-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="home, bills"
              className="mt-1 h-11 w-full rounded-md border border-border bg-bg px-3 text-base text-fg"
            />
          </label>
          <label className="text-sm font-medium text-muted" htmlFor="task-estimate">
            Estimate (minutes)
            <input
              id="task-estimate"
              inputMode="numeric"
              value={estimate}
              onChange={(event) => setEstimate(event.target.value.replace(/[^\d]/g, ""))}
              className="mt-1 h-11 w-full rounded-md border border-border bg-bg px-3 text-base text-fg"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => setPinned((value) => !value)}
          className={cn(
            "mb-4 flex h-11 w-full items-center justify-between rounded-md border px-3 text-sm",
            pinned ? "border-accent bg-accent-soft text-accent" : "border-border text-fg",
          )}
        >
          <span>Pin this task</span>
          {pinned ? <Check className="size-4" /> : <span className="text-muted">Off</span>}
        </button>

        {editing ? (
          <div className="mb-4 rounded-lg border border-border p-3">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Time tracked</span>
              <span className="tabular-nums text-muted">{fmtMinutes(editing.trackedMin)}</span>
            </div>
            <div className="flex gap-2">
              <button type="button" className="h-11 flex-1 rounded-md border border-border text-sm" onClick={() => logMinutes(editing.id, 5)}>
                +5m
              </button>
              <button type="button" className="h-11 flex-1 rounded-md border border-border text-sm" onClick={() => logMinutes(editing.id, 25)}>
                +25m
              </button>
              <button
                type="button"
                className="h-11 flex-1 rounded-md bg-accent text-sm font-medium text-accent-fg"
                onClick={() => startFocus(editing.id)}
              >
                Focus
              </button>
            </div>
            <div className="mt-3">
              <p className="mb-2 text-sm font-medium">Steps</p>
              <ul className="mb-2 space-y-1">
                {children.map((child) => (
                  <li key={child.id}>
                    <button
                      type="button"
                      onClick={() => toggleTask(child.id)}
                      className="flex min-h-11 w-full items-center gap-2 text-left text-sm"
                    >
                      <span
                        className={cn(
                          "grid size-5 place-items-center rounded-full border",
                          child.completed ? "border-accent bg-accent text-accent-fg" : "border-border",
                        )}
                      >
                        {child.completed ? <Check className="size-3" /> : null}
                      </span>
                      <span className={cn(child.completed && "text-muted line-through")}>{child.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const name = subtask.trim();
                  if (!name) return;
                  addTask({
                    title: name,
                    parentId: editing.id,
                    listId: editing.listId,
                    dueDate: editing.dueDate,
                    priority: editing.priority,
                  });
                  setSubtask("");
                }}
              >
                <input
                  value={subtask}
                  onChange={(event) => setSubtask(event.target.value)}
                  placeholder="Add a step"
                  className="h-11 min-w-0 flex-1 rounded-md border border-border bg-bg px-3 text-sm"
                />
                <button type="submit" className="h-11 rounded-md border border-border px-3 text-sm">
                  Add
                </button>
              </form>
            </div>
          </div>
        ) : null}

        <div className="flex gap-2">
          {editing ? (
            <button
              type="button"
              onClick={() => (confirmDelete ? remove() : setConfirmDelete(true))}
              className="h-11 flex-1 rounded-md bg-high-soft text-sm font-medium text-high"
            >
              {confirmDelete ? "Confirm delete" : "Delete"}
            </button>
          ) : (
            <button type="button" onClick={closeSheet} className="h-11 flex-1 rounded-md border border-border text-sm font-medium">
              Cancel
            </button>
          )}
          <button type="button" onClick={save} className="h-11 flex-1 rounded-md bg-accent text-sm font-medium text-accent-fg">
            {editing ? "Save" : "Add task"}
          </button>
        </div>
      </div>
    </div>
  );
}
