import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  House,
  LayoutGrid,
  List,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  Timer,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { cn } from "@/lib/cn";
import { type ViewId, fmtClock, focusLogged, remainingMs, todayKey } from "@/lib/tasks/model";
import { useTasks } from "@/lib/tasks/store";
import { TaskSheet } from "@/components/assistant/task-sheet";
import { AllView, BoardView, CalendarView, FocusView, MoreView, TodayView } from "@/components/assistant/views";

const NAV: { id: ViewId; label: string; icon: typeof House }[] = [
  { id: "today", label: "Today", icon: House },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "board", label: "Lists", icon: LayoutGrid },
  { id: "all", label: "All", icon: List },
  { id: "more", label: "More", icon: MoreHorizontal },
];

function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let live = true;
    const finish = () => {
      if (live) setHydrated(true);
    };
    if (useTasks.persist.hasHydrated()) finish();
    const unsub = useTasks.persist.onFinishHydration(finish);
    void Promise.resolve(useTasks.persist.rehydrate()).finally(finish);
    return () => {
      live = false;
      unsub();
    };
  }, []);
  return hydrated;
}

export function AssistantApp() {
  const hydrated = useHydrated();
  const view = useTasks((state) => state.view);
  const setView = useTasks((state) => state.setView);
  const openCreate = useTasks((state) => state.openCreate);
  const palette = useTasks((state) => state.palette);
  const setPalette = useTasks((state) => state.setPalette);
  const focus = useTasks((state) => state.focus);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!hydrated) return;
    const theme = useTasks.getState().theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [hydrated]);

  useEffect(() => {
    if (!focus.running) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
      useTasks.getState().tickFocus();
    }, 500);
    return () => window.clearInterval(timer);
  }, [focus.running]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
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

  if (!hydrated) {
    return (
      <div className="min-h-dvh bg-bg px-4 py-6 text-fg">
        <p className="font-serif text-3xl tracking-tight">My Assistant</p>
        <p className="mt-2 text-sm text-muted">Loading your tasks…</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <div className="mx-auto grid min-h-dvh max-w-6xl md:grid-cols-[5.5rem_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border px-2 py-4 md:flex">
          <p className="px-2 font-serif text-sm tracking-tight">My Assistant</p>
          <nav className="mt-6 flex flex-col gap-1" aria-label="Sections">
            {NAV.map((item) => (
              <NavButton key={item.id} item={item} active={view === item.id} onClick={() => setView(item.id)} stacked />
            ))}
            <NavButton
              item={{ id: "focus", label: "Focus", icon: Timer }}
              active={view === "focus"}
              onClick={() => setView("focus")}
              stacked
            />
          </nav>
        </aside>
        <div className="flex min-w-0 flex-col pb-20 md:pb-0">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-bg px-4">
            <p className="min-w-0 flex-1 truncate font-serif text-lg tracking-tight">My Assistant</p>
            <button
              type="button"
              aria-label="Search and jump"
              onClick={() => setPalette(true)}
              className="grid size-11 place-items-center rounded-md text-muted"
            >
              <Search className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Add task"
              onClick={() => openCreate(view === "today" ? { dueDate: todayKey() } : undefined)}
              className="grid size-11 place-items-center rounded-md bg-accent text-accent-fg"
            >
              <Plus className="size-5" />
            </button>
          </header>
          {focus.running ? (
            <button
              type="button"
              onClick={() => setView("focus")}
              className="flex h-11 items-center justify-between border-b border-border bg-accent-soft px-4 text-sm text-accent"
            >
              <span className="inline-flex items-center gap-2 font-medium">
                <Play className="size-4" />
                {focus.phase === "break" ? "Break" : "Focus"} running
              </span>
              <span className="tabular-nums">{fmtClock(remainingMs(focus, now))}</span>
            </button>
          ) : null}
          <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5">
            {view === "today" ? <TodayView /> : null}
            {view === "calendar" ? <CalendarView /> : null}
            {view === "board" ? <BoardView /> : null}
            {view === "all" ? <AllView /> : null}
            {view === "focus" ? <FocusView /> : null}
            {view === "more" ? <MoreView /> : null}
          </main>
        </div>
      </div>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg-elevated pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Sections"
      >
        <div className="grid grid-cols-5">
          {NAV.map((item) => (
            <NavButton key={item.id} item={item} active={view === item.id} onClick={() => setView(item.id)} />
          ))}
        </div>
      </nav>
      {palette ? <Palette onClose={() => setPalette(false)} /> : null}
      <TaskSheet />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "var(--color-fg)",
            color: "var(--color-bg)",
            border: "none",
          },
        }}
      />
      <span className="sr-only">Focused today {fmtClock(focusLogged(focus) * 60_000)}</span>
    </div>
  );
}

function NavButton({
  item,
  active,
  onClick,
  stacked = false,
}: {
  item: { id: string; label: string; icon: typeof House };
  active: boolean;
  onClick: () => void;
  stacked?: boolean;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center justify-center gap-1 text-xs font-medium",
        stacked ? "h-14 flex-col rounded-lg" : "h-16 flex-col",
        active ? "text-accent" : "text-muted",
      )}
    >
      <Icon className="size-5" strokeWidth={1.75} />
      {item.label}
    </button>
  );
}

function Palette({ onClose }: { onClose: () => void }) {
  const tasks = useTasks((state) => state.tasks);
  const setView = useTasks((state) => state.setView);
  const openEdit = useTasks((state) => state.openEdit);
  const openCreate = useTasks((state) => state.openCreate);
  const toggleTheme = useTasks((state) => state.toggleTheme);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const open = tasks.filter((task) => !task.completed);
    if (!q) return open.slice(0, 6);
    return open.filter((task) => task.title.toLowerCase().includes(q)).slice(0, 8);
  }, [tasks, query]);

  const commands: { label: string; run: () => void }[] = [
    { label: "Go to Today", run: () => setView("today") },
    { label: "Go to Calendar", run: () => setView("calendar") },
    { label: "Go to Lists", run: () => setView("board") },
    { label: "Go to All tasks", run: () => setView("all") },
    { label: "Go to Focus", run: () => setView("focus") },
    { label: "Go to More", run: () => setView("more") },
    { label: "New task", run: () => openCreate() },
    {
      label: "Toggle theme",
      run: () => {
        toggleTheme();
        toast("Theme updated");
      },
    },
  ];
  const q = query.trim().toLowerCase();
  const shownCommands = commands.filter((command) => !q || command.label.toLowerCase().includes(q));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12dvh]">
      <button className="absolute inset-0 bg-fg/40" aria-label="Close search" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="sheet-in relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-bg-elevated"
      >
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Jump to a task or section"
          className="h-12 w-full border-b border-border bg-transparent px-4 text-base"
        />
        <div className="max-h-[50dvh] overflow-y-auto p-2">
          {shownCommands.map((command) => (
            <button
              key={command.label}
              type="button"
              onClick={() => {
                command.run();
                onClose();
              }}
              className="flex h-11 w-full items-center rounded-md px-3 text-left text-sm hover:bg-bg-subtle"
            >
              {command.label}
            </button>
          ))}
          {matches.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => {
                openEdit(task.id);
                onClose();
              }}
              className="flex h-11 w-full items-center rounded-md px-3 text-left text-sm hover:bg-bg-subtle"
            >
              <span className="truncate">{task.title}</span>
            </button>
          ))}
          {shownCommands.length === 0 && matches.length === 0 ? (
            <p className="px-3 py-6 text-sm text-muted">Nothing matches.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
