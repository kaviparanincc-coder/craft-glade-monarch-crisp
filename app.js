/* My Assistant — Offline-first personal task manager */
(function () {
  'use strict';

  // ========== Constants ==========
  const DB_NAME = 'MyAssistantDB';
  const DB_VERSION = 1;
  const STORE = 'tasks';
  const META_STORE = 'meta';
  const BACKUP_VERSION = 1;
  const LEGACY_KEYS = ['my-assistant-tasks', 'myAssistantTasks', 'tasks'];

  // ========== State ==========
  let db = null;
  let tasks = [];
  let currentView = 'today';
  let selectedDate = toDateKey(new Date());
  let calMonth = new Date().getFullYear();
  let calYear = new Date().getMonth(); // 0-11
  let filter = 'open';
  let searchQuery = '';
  let editingTaskId = null;
  let deferredPrompt = null;
  let lastDeleted = null;
  let toastTimer = null;

  // ========== Date helpers ==========
  function toDateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function parseDateKey(key) {
    if (!key) return null;
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function todayKey() {
    return toDateKey(new Date());
  }

  function formatDisplayDate(key) {
    if (!key) return '';
    const d = parseDateKey(key);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (key === toDateKey(today)) return 'Today';
    if (key === toDateKey(tomorrow)) return 'Tomorrow';
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function formatFullDate(key) {
    if (!key) return '';
    const d = parseDateKey(key);
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  function daysBetween(a, b) {
    const da = parseDateKey(a);
    const db = parseDateKey(b);
    return Math.round((da - db) / 86400000);
  }

  function isLeapYear(y) {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  }

  function daysInMonth(year, month) {
    return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
  }

  // ========== IndexedDB ==========
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains(STORE)) {
          const store = database.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('dueDate', 'dueDate', { unique: false });
          store.createIndex('order', 'order', { unique: false });
          store.createIndex('completed', 'completed', { unique: false });
        }
        if (!database.objectStoreNames.contains(META_STORE)) {
          database.createObjectStore(META_STORE, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function idbGetAll() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  function idbPut(task) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(task);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function idbDelete(id) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function idbClearAndPutAll(list) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      store.clear();
      list.forEach((t) => store.put(t));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function idbGetMeta(key) {
    return new Promise((resolve) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const req = tx.objectStore(META_STORE).get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => resolve(null);
    });
  }

  function idbSetMeta(key, value) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readwrite');
      tx.objectStore(META_STORE).put({ key, value });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ========== Migration from localStorage ==========
  async function migrateLegacy() {
    const migrated = await idbGetMeta('migrated');
    if (migrated) return;

    for (const key of LEGACY_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        let list = Array.isArray(parsed) ? parsed : (parsed.tasks || parsed.data || []);
        if (!Array.isArray(list) || list.length === 0) continue;

        const normalized = list.map((t, i) => normalizeTask(t, i)).filter(Boolean);
        if (normalized.length === 0) continue;

        await idbClearAndPutAll(normalized);
        await idbSetMeta('migrated', true);
        // Keep original localStorage as safety; do not delete
        console.info('Migrated', normalized.length, 'tasks from', key);
        return;
      } catch (e) {
        console.warn('Migration skip for', key, e);
      }
    }
    await idbSetMeta('migrated', true);
  }

  function normalizeTask(raw, fallbackOrder) {
    if (!raw || typeof raw !== 'object') return null;
    const title = String(raw.title || raw.name || '').trim();
    if (!title) return null;
    const id = String(raw.id || crypto.randomUUID());
    let dueDate = raw.dueDate || raw.due || null;
    if (dueDate && typeof dueDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dueDate)) {
      dueDate = dueDate.slice(0, 10);
    } else {
      dueDate = null;
    }
    let priority = (raw.priority || 'medium').toLowerCase();
    if (!['high', 'medium', 'low'].includes(priority)) priority = 'medium';
    return {
      id,
      title,
      notes: String(raw.notes || raw.description || raw.tag || '').trim() || '',
      dueDate,
      dueTime: raw.dueTime || raw.time || null,
      priority,
      completed: Boolean(raw.completed || raw.done),
      completedAt: raw.completedAt || null,
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString(),
      order: typeof raw.order === 'number' ? raw.order : (fallbackOrder ?? 0),
    };
  }

  // ========== Task operations ==========
  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : 't-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  }

  async function loadTasks() {
    tasks = await idbGetAll();
    tasks.sort((a, b) => (a.order - b.order) || (a.createdAt || '').localeCompare(b.createdAt || ''));
  }

  async function saveTask(task) {
    task.updatedAt = new Date().toISOString();
    await idbPut(task);
    const idx = tasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) tasks[idx] = task;
    else tasks.push(task);
    tasks.sort((a, b) => (a.order - b.order) || (a.createdAt || '').localeCompare(b.createdAt || ''));
  }

  async function deleteTask(id) {
    const t = tasks.find((x) => x.id === id);
    if (t) lastDeleted = { ...t };
    await idbDelete(id);
    tasks = tasks.filter((x) => x.id !== id);
  }

  async function reorderTasks(orderedIds) {
    const map = new Map(tasks.map((t) => [t.id, t]));
    const updates = [];
    orderedIds.forEach((id, i) => {
      const t = map.get(id);
      if (t && t.order !== i) {
        t.order = i;
        t.updatedAt = new Date().toISOString();
        updates.push(t);
      }
    });
    for (const t of updates) await idbPut(t);
    tasks.sort((a, b) => a.order - b.order);
  }

  function nextOrder() {
    if (tasks.length === 0) return 0;
    return Math.max(...tasks.map((t) => t.order)) + 1;
  }

  // ========== Derived lists ==========
  function getTodayTasks() {
    const key = todayKey();
    return tasks
      .filter((t) => !t.completed && t.dueDate === key)
      .sort((a, b) => a.order - b.order);
  }

  function getNeedsAttention() {
    const key = todayKey();
    const todayTasksIds = new Set(getTodayTasks().map((t) => t.id));
    const overdue = tasks.filter(
      (t) => !t.completed && t.dueDate && t.dueDate < key && !todayTasksIds.has(t.id)
    );
    const highSoon = tasks.filter((t) => {
      if (t.completed || !t.dueDate || todayTasksIds.has(t.id)) return false;
      if (t.dueDate < key) return false;
      const days = daysBetween(t.dueDate, key);
      return t.priority === 'high' && days <= 2;
    });
    return [...overdue.sort((a, b) => a.dueDate.localeCompare(b.dueDate)), ...highSoon].slice(0, 8);
  }

  function getUpcomingPreview() {
    const key = todayKey();
    return tasks
      .filter((t) => !t.completed && t.dueDate && t.dueDate > key)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.order - b.order)
      .slice(0, 4);
  }

  function getFilteredTasks() {
    let list = [...tasks];
    const key = todayKey();
    if (filter === 'open') list = list.filter((t) => !t.completed);
    else if (filter === 'today') list = list.filter((t) => !t.completed && t.dueDate === key);
    else if (filter === 'upcoming') list = list.filter((t) => !t.completed && t.dueDate && t.dueDate > key);
    else if (filter === 'overdue') list = list.filter((t) => !t.completed && t.dueDate && t.dueDate < key);
    else if (filter === 'unscheduled') list = list.filter((t) => !t.completed && !t.dueDate);
    else if (filter === 'completed') list = list.filter((t) => t.completed);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate) || a.order - b.order;
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return a.order - b.order;
    });
  }

  function tasksForDate(dateKey) {
    return tasks
      .filter((t) => t.dueDate === dateKey)
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return a.order - b.order;
      });
  }

  // ========== UI helpers ==========
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  function showToast(msg, undoFn) {
    const el = $('#toast');
    el.innerHTML = '';
    el.appendChild(document.createTextNode(msg));
    if (undoFn) {
      const btn = document.createElement('button');
      btn.textContent = 'Undo';
      btn.onclick = () => {
        undoFn();
        hideToast();
      };
      el.appendChild(btn);
    }
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, undoFn ? 5000 : 2500);
  }

  function hideToast() {
    $('#toast').classList.remove('show');
  }

  function openSheet(html) {
    const overlay = $('#overlay');
    const sheet = $('#sheet');
    sheet.innerHTML = '<div class="sheet-handle"></div>' + html;
    overlay.classList.add('open');
  }

  function closeSheet() {
    $('#overlay').classList.remove('open');
    editingTaskId = null;
  }

  function openDialog(title, message, onConfirm, danger) {
    openSheet(`
      <div class="dialog" style="box-shadow:none;padding:0;width:100%;max-width:none;">
        <h3>${esc(title)}</h3>
        <p>${esc(message)}</p>
        <div class="dialog-actions">
          <button class="btn btn-secondary" id="dlg-cancel">Cancel</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="dlg-ok">${danger ? 'Delete' : 'Confirm'}</button>
        </div>
      </div>
    `);
    $('#dlg-cancel').onclick = closeSheet;
    $('#dlg-ok').onclick = () => {
      closeSheet();
      onConfirm();
    };
  }

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // ========== Render task item ==========
  function renderTaskItem(task, opts = {}) {
    const { showDrag = false, showMove = false } = opts;
    const key = todayKey();
    let badges = '';
    if (!task.completed && task.dueDate) {
      if (task.dueDate < key) badges += `<span class="badge overdue">Overdue</span>`;
      else if (daysBetween(task.dueDate, key) <= 1 && task.dueDate !== key)
        badges += `<span class="badge soon">Soon</span>`;
    }
    if (task.priority === 'high' && !task.completed)
      badges += `<span class="badge high">High</span>`;

    const dueStr = task.dueDate
      ? formatDisplayDate(task.dueDate) + (task.dueTime ? ' · ' + task.dueTime : '')
      : 'No date';

    return `
      <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
        ${
          showDrag
            ? `<div class="task-drag" aria-label="Drag to reorder" title="Drag to reorder">
                <svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.5" fill="currentColor"/><circle cx="15" cy="6" r="1.5" fill="currentColor"/><circle cx="9" cy="12" r="1.5" fill="currentColor"/><circle cx="15" cy="12" r="1.5" fill="currentColor"/><circle cx="9" cy="18" r="1.5" fill="currentColor"/><circle cx="15" cy="18" r="1.5" fill="currentColor"/></svg>
              </div>`
            : ''
        }
        <div class="task-check">
          <button class="check-btn ${task.completed ? 'checked' : ''}" data-action="toggle" aria-label="${task.completed ? 'Reopen' : 'Complete'}">
            ${task.completed ? '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
          </button>
        </div>
        <div class="task-body" data-action="edit">
          <div class="task-title">${esc(task.title)}</div>
          <div class="task-meta">
            <span class="priority-dot ${task.priority}" title="${task.priority}"></span>
            <span>${esc(dueStr)}</span>
            ${badges}
          </div>
        </div>
        ${
          showMove
            ? `<div class="task-actions">
                <button class="icon-btn" data-action="up" aria-label="Move up" title="Move up">
                  <svg viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>
                </button>
                <button class="icon-btn" data-action="down" aria-label="Move down" title="Move down">
                  <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
              </div>`
            : ''
        }
      </div>
    `;
  }

  // ========== Views ==========
  function renderToday() {
    const today = getTodayTasks();
    const attention = getNeedsAttention();
    const upcoming = getUpcomingPreview();
    const doneCount = tasks.filter((t) => t.completed && t.dueDate === todayKey()).length;
    const totalToday = today.length + doneCount;
    const pct = totalToday ? Math.round((doneCount / totalToday) * 100) : 0;

    let html = `
      <div class="date-line">${formatFullDate(todayKey())}</div>
      <div class="section-meta" style="margin-bottom:12px">${doneCount} of ${totalToday} done today</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
    `;

    html += `<div class="section" style="margin-top:20px">
      <div class="section-header"><span class="section-title">Today's Tasks</span>
      ${today.length ? `<span class="section-meta">${today.length} open</span>` : ''}</div>`;

    if (today.length === 0) {
      html += `<div class="empty-state">
        <svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        <p>No tasks for today. Enjoy the space or add one.</p>
        <button class="btn btn-primary" style="max-width:200px;margin:0 auto" data-action="add-today">Add Task</button>
      </div>`;
    } else {
      html += `<div class="task-list" id="today-list">${today.map((t) => renderTaskItem(t, { showDrag: true, showMove: true })).join('')}</div>`;
    }
    html += `</div>`;

    if (attention.length) {
      html += `<div class="section">
        <div class="section-header"><span class="section-title">Needs Attention</span></div>
        <div class="task-list">${attention.map((t) => renderTaskItem(t)).join('')}</div>
      </div>`;
    }

    if (upcoming.length) {
      html += `<div class="section">
        <div class="section-header">
          <span class="section-title">Upcoming</span>
          <button class="section-meta" data-action="goto-all" style="color:var(--accent)">View all</button>
        </div>
        <div class="task-list">${upcoming.map((t) => renderTaskItem(t)).join('')}</div>
      </div>`;
    }

    $('#view-today').innerHTML = html;
    bindTaskList('#view-today');
    bindTodayActions();
  }

  function bindTodayActions() {
    const addBtn = $('[data-action="add-today"]');
    if (addBtn) addBtn.onclick = () => openTaskForm(null, todayKey());
    const viewAll = $('[data-action="goto-all"]');
    if (viewAll) viewAll.onclick = () => switchView('all');
  }

  function bindTaskList(containerSel) {
    const container = $(containerSel);
    if (!container) return;

    container.querySelectorAll('.task-item').forEach((el) => {
      const id = el.dataset.id;
      el.querySelector('[data-action="toggle"]')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        const task = tasks.find((t) => t.id === id);
        if (!task) return;
        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date().toISOString() : null;
        await saveTask(task);
        showToast(task.completed ? 'Task completed' : 'Task reopened');
        refresh();
      });
      el.querySelector('[data-action="edit"]')?.addEventListener('click', () => openTaskForm(id));
      el.querySelector('[data-action="up"]')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        await moveTask(id, -1);
      });
      el.querySelector('[data-action="down"]')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        await moveTask(id, 1);
      });
    });

    // Simple drag reorder for today list
    const list = $('#today-list');
    if (list) enableDragReorder(list);
  }

  async function moveTask(id, dir) {
    const today = getTodayTasks();
    const ids = today.map((t) => t.id);
    const idx = ids.indexOf(id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= ids.length) return;
    [ids[idx], ids[newIdx]] = [ids[newIdx], ids[idx]];
    // Preserve relative order of non-today tasks
    const otherIds = tasks.filter((t) => !ids.includes(t.id)).map((t) => t.id);
    await reorderTasks([...ids, ...otherIds]);
    refresh();
  }

  function enableDragReorder(listEl) {
    let dragEl = null;
    listEl.querySelectorAll('.task-drag').forEach((handle) => {
      handle.addEventListener('pointerdown', (e) => {
        dragEl = handle.closest('.task-item');
        dragEl.style.opacity = '0.7';
        handle.setPointerCapture(e.pointerId);
      });
      handle.addEventListener('pointermove', (e) => {
        if (!dragEl) return;
        const items = [...listEl.querySelectorAll('.task-item')];
        const y = e.clientY;
        for (const item of items) {
          if (item === dragEl) continue;
          const rect = item.getBoundingClientRect();
          if (y > rect.top && y < rect.bottom) {
            if (y < rect.top + rect.height / 2) listEl.insertBefore(dragEl, item);
            else listEl.insertBefore(dragEl, item.nextSibling);
            break;
          }
        }
      });
      handle.addEventListener('pointerup', async () => {
        if (!dragEl) return;
        dragEl.style.opacity = '';
        const ids = [...listEl.querySelectorAll('.task-item')].map((el) => el.dataset.id);
        const otherIds = tasks.filter((t) => !ids.includes(t.id)).map((t) => t.id);
        await reorderTasks([...ids, ...otherIds]);
        dragEl = null;
        refresh();
      });
    });
  }

  // ========== Calendar ==========
  function renderCalendar() {
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const first = new Date(calYear, calMonth, 1);
    const startPad = first.getDay();
    const dim = daysInMonth(calYear, calMonth);
    const prevDim = daysInMonth(calMonth === 0 ? calYear - 1 : calYear, calMonth === 0 ? 11 : calMonth - 1);
    const today = todayKey();

    // Build task map for month
    const taskMap = {};
    tasks.forEach((t) => {
      if (!t.dueDate) return;
      const [y, m] = t.dueDate.split('-').map(Number);
      if (y === calYear && m - 1 === calMonth) {
        if (!taskMap[t.dueDate]) taskMap[t.dueDate] = [];
        taskMap[t.dueDate].push(t);
      }
    });

    let html = `
      <div class="cal-nav">
        <button class="icon-btn" id="cal-prev" aria-label="Previous month"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></button>
        <div class="cal-month">${monthNames[calMonth]} ${calYear}</div>
        <div style="display:flex;gap:4px">
          <button class="btn btn-secondary" style="padding:8px 12px;min-height:36px;font-size:0.8125rem" id="cal-today-btn">Today</button>
          <button class="icon-btn" id="cal-next" aria-label="Next month"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></button>
        </div>
      </div>
      <div class="cal-grid">
        ${weekdays.map((w) => `<div class="cal-weekday">${w}</div>`).join('')}
    `;

    // Previous month days
    for (let i = startPad - 1; i >= 0; i--) {
      const d = prevDim - i;
      html += `<div class="cal-day other-month">${d}</div>`;
    }

    for (let d = 1; d <= dim; d++) {
      const key = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayTasks = (taskMap[key] || []).filter((t) => !t.completed);
      const classes = ['cal-day'];
      if (key === today) classes.push('today');
      if (key === selectedDate) classes.push('selected');

      let dots = '';
      if (dayTasks.length) {
        const shown = dayTasks.slice(0, 3);
        dots = `<div class="cal-dots">${shown.map((t) => `<span class="${t.priority}"></span>`).join('')}${dayTasks.length > 3 ? `<span class="more">+${dayTasks.length - 3}</span>` : ''}</div>`;
      }

      html += `<button class="${classes.join(' ')}" data-date="${key}" aria-label="${key}${dayTasks.length ? ', ' + dayTasks.length + ' tasks' : ''}">${d}${dots}</button>`;
    }

    // Next month padding
    const totalCells = startPad + dim;
    const remain = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remain; i++) {
      html += `<div class="cal-day other-month">${i}</div>`;
    }

    html += `</div>
      <div class="cal-legend">
        <span><i style="background:var(--high)"></i> High</span>
        <span><i style="background:var(--medium)"></i> Medium</span>
        <span><i style="background:var(--low)"></i> Low</span>
        <span><i style="background:var(--accent)"></i> Today</span>
      </div>
      <div class="section">
        <div class="section-header">
          <span class="section-title">${formatFullDate(selectedDate)}</span>
          <button class="section-meta" style="color:var(--accent)" data-action="add-for-date">Add task</button>
        </div>
        <div class="task-list" id="cal-day-tasks"></div>
      </div>
    `;

    $('#view-calendar').innerHTML = html;

    // Day tasks
    const dayList = tasksForDate(selectedDate);
    const container = $('#cal-day-tasks');
    if (dayList.length === 0) {
      container.innerHTML = `<div class="empty-state" style="padding:24px 12px"><p>No tasks on this day.</p></div>`;
    } else {
      container.innerHTML = dayList.map((t) => renderTaskItem(t)).join('');
      bindTaskList('#cal-day-tasks');
    }

    $('#cal-prev').onclick = () => {
      calMonth--;
      if (calMonth < 0) { calMonth = 11; calYear--; }
      renderCalendar();
    };
    $('#cal-next').onclick = () => {
      calMonth++;
      if (calMonth > 11) { calMonth = 0; calYear++; }
      renderCalendar();
    };
    $('#cal-today-btn').onclick = () => {
      const n = new Date();
      calYear = n.getFullYear();
      calMonth = n.getMonth();
      selectedDate = todayKey();
      renderCalendar();
    };
    $$('.cal-day[data-date]').forEach((btn) => {
      btn.onclick = () => {
        selectedDate = btn.dataset.date;
        renderCalendar();
      };
    });
    $('[data-action="add-for-date"]').onclick = () => openTaskForm(null, selectedDate);
  }

  // ========== All Tasks ==========
  function renderAll() {
    const list = getFilteredTasks();
    const filters = [
      { id: 'open', label: 'Open' },
      { id: 'today', label: 'Today' },
      { id: 'upcoming', label: 'Upcoming' },
      { id: 'overdue', label: 'Overdue' },
      { id: 'unscheduled', label: 'Unscheduled' },
      { id: 'completed', label: 'Completed' },
    ];

    let html = `
      <div class="search-bar">
        <input class="search-input" type="search" placeholder="Search tasks…" id="search-input" value="${esc(searchQuery)}" aria-label="Search tasks">
      </div>
      <div class="filter-row">
        ${filters.map((f) => `<button class="filter-chip ${filter === f.id ? 'active' : ''}" data-filter="${f.id}">${f.label}</button>`).join('')}
      </div>
      <div class="section-meta" style="margin-bottom:10px">${list.length} task${list.length !== 1 ? 's' : ''}</div>
      <div class="task-list" id="all-list">
        ${list.length ? list.map((t) => renderTaskItem(t)).join('') : `<div class="empty-state"><p>No tasks match.</p></div>`}
      </div>
    `;
    $('#view-all').innerHTML = html;
    bindTaskList('#view-all');

    $('#search-input').oninput = (e) => {
      searchQuery = e.target.value;
      renderAll();
      $('#search-input')?.focus();
      // restore cursor roughly
      const input = $('#search-input');
      if (input) {
        const len = input.value.length;
        input.setSelectionRange(len, len);
      }
    };
    $$('[data-filter]').forEach((btn) => {
      btn.onclick = () => {
        filter = btn.dataset.filter;
        renderAll();
      };
    });
  }

  // ========== More ==========
  function renderMore() {
    const offline = !navigator.onLine;
    const installed = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    let html = `
      <div class="more-list">
        <div class="more-item" id="btn-backup">
          <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Backup &amp; Restore</span>
          <svg class="chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
        <div class="more-item" id="btn-theme">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          <span>Toggle theme</span>
          <span class="status-pill" id="theme-label">Light</span>
        </div>
        <div class="more-item" id="btn-install">
          <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Install app</span>
          <span class="status-pill ${installed ? '' : 'warn'}" id="install-status">${installed ? 'Installed' : 'Available'}</span>
        </div>
        <div class="more-item" style="cursor:default">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <span>Offline status</span>
          <span class="status-pill ${offline ? 'warn' : ''}">${offline ? 'Offline' : 'Online'}</span>
        </div>
        <div class="more-item" style="cursor:default">
          <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span>Tasks stored</span>
          <span class="status-pill">${tasks.length}</span>
        </div>
      </div>
      <p style="margin-top:24px;font-size:0.8125rem;color:var(--text-secondary);line-height:1.6;padding:0 4px">
        Data stays on this device (IndexedDB). Clearing browser data, uninstalling, or losing the device can erase tasks.
        Use Backup regularly and keep the file somewhere safe.
      </p>
      <p style="margin-top:12px;font-size:0.8125rem;color:var(--text-secondary);line-height:1.6;padding:0 4px">
        Reminders: due dates and overdue indicators work when you open the app. Web/PWA notifications are not reliable for exact background alarms on Android.
      </p>
    `;
    $('#view-more').innerHTML = html;

    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    $('#theme-label').textContent = theme === 'dark' ? 'Dark' : 'Light';

    $('#btn-theme').onclick = () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('my-assistant-theme', next);
      renderMore();
    };

    $('#btn-backup').onclick = openBackupSheet;
    $('#btn-install').onclick = handleInstall;
  }

  // ========== Task form ==========
  function openTaskForm(id, presetDate) {
    const task = id ? tasks.find((t) => t.id === id) : null;
    editingTaskId = id || null;
    const title = task ? task.title : '';
    const notes = task ? task.notes : '';
    const dueDate = task ? task.dueDate || '' : (presetDate || '');
    const dueTime = task ? task.dueTime || '' : '';
    const priority = task ? task.priority : 'medium';

    openSheet(`
      <div class="sheet-title">${task ? 'Edit Task' : 'New Task'}</div>
      <div class="form-group">
        <label class="form-label" for="f-title">Title *</label>
        <input class="form-input" id="f-title" value="${esc(title)}" placeholder="What needs doing?" autofocus>
      </div>
      <div class="form-group">
        <label class="form-label" for="f-notes">Notes</label>
        <textarea class="form-textarea" id="f-notes" placeholder="Optional details">${esc(notes)}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label" for="f-date">Due date</label>
        <input class="form-input" type="date" id="f-date" value="${dueDate}">
      </div>
      <div class="form-group">
        <label class="form-label" for="f-time">Due time (optional)</label>
        <input class="form-input" type="time" id="f-time" value="${dueTime || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Priority</label>
        <div class="priority-picker">
          <button type="button" class="priority-btn high ${priority === 'high' ? 'active' : ''}" data-p="high">High</button>
          <button type="button" class="priority-btn medium ${priority === 'medium' ? 'active' : ''}" data-p="medium">Medium</button>
          <button type="button" class="priority-btn low ${priority === 'low' ? 'active' : ''}" data-p="low">Low</button>
        </div>
      </div>
      <div class="form-actions">
        ${task ? `<button class="btn btn-danger" id="f-delete">Delete</button>` : `<button class="btn btn-secondary" id="f-cancel">Cancel</button>`}
        <button class="btn btn-primary" id="f-save">${task ? 'Save' : 'Add Task'}</button>
      </div>
    `);

    let selectedPriority = priority;
    $$('.priority-btn').forEach((btn) => {
      btn.onclick = () => {
        $$('.priority-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        selectedPriority = btn.dataset.p;
      };
    });

    $('#f-cancel')?.addEventListener('click', closeSheet);
    $('#f-delete')?.addEventListener('click', () => {
      openDialog('Delete task?', 'This cannot be undone from here. You can restore from a backup.', async () => {
        await deleteTask(id);
        showToast('Task deleted', async () => {
          if (lastDeleted) {
            await saveTask(lastDeleted);
            lastDeleted = null;
            refresh();
          }
        });
        refresh();
      }, true);
    });

    $('#f-save').onclick = async () => {
      const t = $('#f-title').value.trim();
      if (!t) {
        $('#f-title').focus();
        return;
      }
      const notesVal = $('#f-notes').value.trim();
      const dateVal = $('#f-date').value || null;
      const timeVal = $('#f-time').value || null;

      if (task) {
        task.title = t;
        task.notes = notesVal;
        task.dueDate = dateVal;
        task.dueTime = timeVal;
        task.priority = selectedPriority;
        await saveTask(task);
        showToast('Task updated');
      } else {
        const newTask = {
          id: uid(),
          title: t,
          notes: notesVal,
          dueDate: dateVal,
          dueTime: timeVal,
          priority: selectedPriority,
          completed: false,
          completedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          order: nextOrder(),
        };
        await saveTask(newTask);
        showToast('Task added');
      }
      closeSheet();
      refresh();
    };
  }

  // ========== Backup ==========
  function openBackupSheet() {
    openSheet(`
      <div class="sheet-title">Backup & Restore</div>
      <p style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:16px">
        Export creates a JSON file with all tasks. Keep it safe. Import can merge or replace.
      </p>
      <div class="form-actions" style="flex-direction:column">
        <button class="btn btn-primary" id="btn-export-json">Export JSON backup</button>
        <button class="btn btn-secondary" id="btn-export-csv">Export CSV</button>
        <button class="btn btn-secondary" id="btn-import">Import backup…</button>
      </div>
      <input type="file" id="import-file" accept=".json,application/json" class="hidden">
      <p style="font-size:0.75rem;color:var(--text-muted);margin-top:20px;line-height:1.5">
        Versioned JSON includes order, priority, completion, and dates. CSV is for spreadsheets.
      </p>
    `);

    $('#btn-export-json').onclick = exportJSON;
    $('#btn-export-csv').onclick = exportCSV;
    $('#btn-import').onclick = () => $('#import-file').click();
    $('#import-file').onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) handleImport(file);
    };
  }

  function exportJSON() {
    const payload = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      app: 'My Assistant',
      tasks: tasks.map((t) => ({ ...t })),
    };
    downloadBlob(JSON.stringify(payload, null, 2), `my-assistant-backup-${todayKey()}.json`, 'application/json');
    showToast('Backup downloaded');
    closeSheet();
  }

  function exportCSV() {
    const headers = ['id', 'title', 'notes', 'dueDate', 'dueTime', 'priority', 'completed', 'completedAt', 'order', 'createdAt', 'updatedAt'];
    const rows = tasks.map((t) =>
      headers.map((h) => {
        let v = t[h] ?? '';
        v = String(v).replace(/"/g, '""');
        return `"${v}"`;
      }).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    downloadBlob(csv, `my-assistant-tasks-${todayKey()}.csv`, 'text/csv');
    showToast('CSV downloaded');
    closeSheet();
  }

  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      let list = [];
      if (Array.isArray(data)) list = data;
      else if (data.tasks && Array.isArray(data.tasks)) list = data.tasks;
      else throw new Error('No tasks array found');

      const normalized = list.map((t, i) => normalizeTask(t, i)).filter(Boolean);
      if (normalized.length === 0) throw new Error('No valid tasks in file');

      openSheet(`
        <div class="sheet-title">Import ${normalized.length} tasks</div>
        <p style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:16px">
          Choose how to apply this backup.
        </p>
        <div class="form-actions" style="flex-direction:column">
          <button class="btn btn-primary" id="imp-merge">Merge (keep existing + add new)</button>
          <button class="btn btn-danger" id="imp-replace">Replace all current tasks</button>
          <button class="btn btn-secondary" id="imp-cancel">Cancel</button>
        </div>
      `);

      $('#imp-cancel').onclick = closeSheet;
      $('#imp-merge').onclick = async () => {
        const existingIds = new Set(tasks.map((t) => t.id));
        let added = 0;
        for (const t of normalized) {
          if (!existingIds.has(t.id)) {
            t.order = nextOrder() + added;
            await saveTask(t);
            added++;
          }
        }
        showToast(`Merged · ${added} new tasks`);
        closeSheet();
        refresh();
      };
      $('#imp-replace').onclick = () => {
        openDialog(
          'Replace all tasks?',
          `This will delete your current ${tasks.length} tasks and load ${normalized.length} from the backup. This cannot be undone without another backup.`,
          async () => {
            await idbClearAndPutAll(normalized);
            await loadTasks();
            showToast('Tasks replaced from backup');
            closeSheet();
            refresh();
          },
          true
        );
      };
    } catch (err) {
      openSheet(`
        <div class="sheet-title">Import failed</div>
        <p style="color:var(--high);margin-bottom:16px">${esc(err.message || 'Invalid file')}</p>
        <button class="btn btn-secondary" id="imp-ok">OK</button>
      `);
      $('#imp-ok').onclick = closeSheet;
    }
  }

  // ========== Install ==========
  function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        deferredPrompt = null;
        renderMore();
      });
      return;
    }
    openSheet(`
      <div class="sheet-title">Install My Assistant</div>
      <p style="font-size:0.875rem;color:var(--text-secondary);line-height:1.6;margin-bottom:16px">
        On Android Chrome: open the browser menu (⋮) → <strong>Install app</strong> or <strong>Add to Home screen</strong>.
        After installation the app opens without the address bar.
      </p>
      <p style="font-size:0.8125rem;color:var(--text-muted);line-height:1.5">
        If you already installed it, look for the My Assistant icon on your home screen.
        Installation is only available when the site is served over HTTPS and the PWA criteria are met.
      </p>
      <button class="btn btn-secondary" style="margin-top:16px" id="inst-ok">Got it</button>
    `);
    $('#inst-ok').onclick = closeSheet;
  }

  // ========== Navigation ==========
  function switchView(name) {
    currentView = name;
    $$('.view').forEach((v) => v.classList.remove('active'));
    $$('.nav-item').forEach((n) => n.classList.remove('active'));
    $(`#view-${name}`)?.classList.add('active');
    $(`.nav-item[data-view="${name}"]`)?.classList.add('active');

    const titles = { today: 'Today', calendar: 'Calendar', all: 'All Tasks', more: 'More' };
    $('#header-title').textContent = titles[name] || 'My Assistant';

    if (name === 'today') renderToday();
    else if (name === 'calendar') renderCalendar();
    else if (name === 'all') renderAll();
    else if (name === 'more') renderMore();
  }

  function refresh() {
    if (currentView === 'today') renderToday();
    else if (currentView === 'calendar') renderCalendar();
    else if (currentView === 'all') renderAll();
    else if (currentView === 'more') renderMore();
  }

  // ========== Init ==========
  async function init() {
    // Theme
    const savedTheme = localStorage.getItem('my-assistant-theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    // Persistent storage hint
    if (navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {});
    }

    db = await openDB();
    await migrateLegacy();
    await loadTasks();

    // Service worker
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('./sw.js');
      } catch (e) {
        console.warn('SW registration failed', e);
      }
    }

    // Install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
    });

    // Nav
    $$('.nav-item').forEach((btn) => {
      btn.onclick = () => switchView(btn.dataset.view);
    });

    $('#fab').onclick = () => openTaskForm(null, currentView === 'calendar' ? selectedDate : todayKey());
    $('#overlay').addEventListener('click', (e) => {
      if (e.target === $('#overlay')) closeSheet();
    });

    switchView('today');
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
