// ==========================================
// SECTION: CONFIG
// REPLACE THIS WITH YOUR GOOGLE APPS SCRIPT WEB APP URL AFTER DEPLOYING
// ==========================================

const API_URL =
  "https://script.google.com/macros/s/AKfycbzGP-t9Cnrpez16zgBnrsqu2eM4UNkk8wx9CwOmEIcaw9tyhrav1N-nyVIfZEfeD07c/exec";

// ==========================================
// SECTION: STATE
// ==========================================

const STATE = {
  totalTasks: 0,
  pendingTasks: 0,
  completedTasks: 0,
  totalNotes: 0,
  activeNotes: 0,
  totalTodos: 0,
  pendingTodos: 0,
  completedTodos: 0,
  allTasks: [],
  allNotes: [],
  allTodos: [],
  taskFilter: { search: "", status: "All", date: "All" },
  activeNotesTab: "notes",  // "notes" or "todos"
  editingTaskId: null,
  editingNoteId: null,
  editingTodoId: null
};

// ==========================================
// SECTION: DOM REFS
// ==========================================

const standupForm = document.getElementById("standupForm");
const developerDropdown = document.getElementById("developer");
const currentDateEl = document.getElementById("currentDate");
const themeToggle = document.getElementById("themeToggle");
const themeLabel = document.querySelector(".theme-label");
const summaryOutput = document.getElementById("summaryOutput");
const directorSummaryOutput = document.getElementById("directorSummaryOutput");
const copySummaryBtn = document.getElementById("copySummary");
const copyDirectorBtn = document.getElementById("copyDirectorSummary");
const loader = document.getElementById("loader");
const loaderText = document.querySelector(".loader-text");
const toast = document.getElementById("toast");

// Topbar counters
const updatedCount = document.getElementById("updatedCount");
const pendingCount = document.getElementById("pendingCount");
const entryCount = document.getElementById("entryCount");

// Page title
const pageTitle = document.getElementById("pageTitle");

// Modals
const developerModal = document.getElementById("developerModal");
const openDeveloperModal = document.getElementById("openDeveloperModal");
const saveDeveloperBtn = document.getElementById("saveDeveloper");
const newDeveloperName = document.getElementById("newDeveloperName");

// Nav
const navItems = document.querySelectorAll(".nav-item");

// Buttons
const generateSummaryBtn = document.getElementById("generateSummary");
const generateDirectorSummaryBtn = document.getElementById("generateDirectorSummary");

// ==========================================
// SECTION: INIT
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {
  setCurrentDate();
  loadTheme();
  loadDevelopers();
  initNav();
  initModals();

  // Initial fetch of stats and data
  showLoader("Loading standup portal...");
  try {
    await refreshStats();
    await refreshNotesData();
    await refreshTodosData();

    // Load initial dashboard stats
    await initDashboard();
  } catch (err) {
    console.error(err);
    showToast("Initial load failed. Check API URL.", "error");
  } finally {
    hideLoader();
  }
});

// ==========================================
// SECTION: API HELPER
// ==========================================

async function api(action, body = null) {
  const url = body
    ? API_URL
    : `${API_URL}?action=${action}`;

  const options = body
    ? { method: "POST", body: JSON.stringify({ action, ...body }) }
    : { method: "GET" };

  const res = await fetch(url, options);
  const data = await res.json();
  return data;
}

// ==========================================
// SECTION: DASHBOARD
// ==========================================

async function initDashboard() {
  // Show skeleton/loading state in stat cards
  const totalTasksVal = document.getElementById("statTotalTasksVal");
  if (totalTasksVal) totalTasksVal.textContent = "...";
  const pendingTasksVal = document.getElementById("statPendingTasksVal");
  if (pendingTasksVal) pendingTasksVal.textContent = "...";
  const completedTasksVal = document.getElementById("statCompletedTasksVal");
  if (completedTasksVal) completedTasksVal.textContent = "...";
  const activeNotesVal = document.getElementById("statActiveNotesVal");
  if (activeNotesVal) activeNotesVal.textContent = "...";
  const pendingTodosVal = document.getElementById("statPendingTodosVal");
  if (pendingTodosVal) pendingTodosVal.textContent = "...";
  const completedTodosVal = document.getElementById("statCompletedTodosVal");
  if (completedTodosVal) completedTodosVal.textContent = "...";

  try {
    const stats = await api("getDashboardStats");
    if (stats && typeof stats === "object" && stats.success !== false) {
      STATE.totalTasks = stats.totalTasks || 0;
      STATE.pendingTasks = stats.pendingTasks || 0;
      STATE.completedTasks = stats.completedTasks || 0;
      STATE.activeNotes = stats.activeNotes || 0;
      STATE.pendingTodos = stats.pendingTodos || 0;
      STATE.completedTodos = stats.completedTodos || 0;
    } else {
      console.warn("getDashboardStats returned unexpected result:", stats);
    }

    renderDashboardStats();
    updateStatDisplay();

    renderStickyNotesPreview();
    renderTodoPreview();
  } catch (err) {
    console.error("initDashboard error:", err);
    showToast("Failed to load dashboard metrics.", "error");
  }
}

function renderDashboardStats() {
  const container = document.getElementById("dashboardStats");
  if (!container) return;

  const stats = [
    { label: "Total Tasks", val: STATE.totalTasks, icon: "📋", dot: "dot-blue", id: "statTotalTasksVal" },
    { label: "Pending Tasks", val: STATE.pendingTasks, icon: "⏳", dot: "dot-amber", id: "statPendingTasksVal" },
    { label: "Completed Tasks", val: STATE.completedTasks, icon: "✅", dot: "dot-green", id: "statCompletedTasksVal" },
    { label: "Active Notes", val: STATE.activeNotes, icon: "📌", dot: "dot-purple", id: "statActiveNotesVal" },
    { label: "Pending To-Dos", val: STATE.pendingTodos, icon: "⏰", dot: "dot-red", id: "statPendingTodosVal" },
    { label: "Completed To-Dos", val: STATE.completedTodos, icon: "✔️", dot: "dot-green", id: "statCompletedTodosVal" }
  ];

  container.innerHTML = stats.map(s => `
    <div class="stat-card">
      <div class="stat-card-icon" style="background: var(--surface-3);">
        ${s.icon}
      </div>
      <div class="stat-card-info">
        <h3 id="${s.id}">${s.val}</h3>
        <p>${s.label}</p>
      </div>
      <span class="stat-dot ${s.dot}" style="margin-left: auto;"></span>
    </div>
  `).join("");
}

function renderStickyNotesPreview() {
  const container = document.getElementById("notesPreview");
  if (!container) return;

  const activeNotes = STATE.allNotes.filter(n => n.status === "Active").slice(0, 6);

  if (activeNotes.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="width: 100%;">
        <p>No active sticky notes.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = activeNotes.map(n => {
    const contentTrunc = n.content.length > 90 ? n.content.substring(0, 87) + "..." : n.content;
    return `
      <div class="note-card" data-id="${n.id}">
        <h3 class="note-card-title">${n.title}</h3>
        <p class="note-card-content">${contentTrunc}</p>
        <div class="note-card-footer">
          <span class="note-card-date">${n.createdDate}</span>
          <div class="note-actions">
            <button class="btn-icon mark-note-btn" title="Mark Done">✓</button>
            <button class="btn-icon edit-note-btn" title="Edit">✏</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // Bind events
  container.querySelectorAll(".mark-note-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.closest(".note-card").dataset.id, 10);
      handleMarkNoteCompleted(id);
    });
  });
  container.querySelectorAll(".edit-note-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.closest(".note-card").dataset.id, 10);
      handleEditNote(id);
    });
  });
}

function renderTodoPreview() {
  const container = document.getElementById("todosPreview");
  if (!container) return;

  if (STATE.allTodos.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No to-do items.</p>
      </div>
    `;
    return;
  }

  // Sort: Pending first, then Completed
  const sortedTodos = [...STATE.allTodos].sort((a, b) => {
    if (a.status === "Pending" && b.status === "Completed") return -1;
    if (a.status === "Completed" && b.status === "Pending") return 1;
    return b.id - a.id;
  });

  container.innerHTML = sortedTodos.map(todo => {
    const isCompleted = todo.status === "Completed";
    const itemClass = isCompleted ? "todo-item completed" : "todo-item";
    const priorityClass = `priority-${todo.priority.toLowerCase()}`;

    const dueBadge = todo.dueDate ? `
      <span class="badge ${isOverdue(todo.dueDate) && !isCompleted ? 'overdue' : ''}" style="font-size: 11px;">
        📅 Due: ${formatDisplayDate(todo.dueDate)}
      </span>
    ` : "";

    const statusBadge = `<span class="badge ${isCompleted ? 'badge-completed' : 'badge-pending'}">${todo.status}</span>`;
    const actionButtons = !isCompleted ? `
      <button class="btn btn-secondary btn-sm comp-todo-btn">✓ Complete</button>
    ` : "";

    const descriptionHtml = todo.description ? `
      <p class="text-muted" style="margin-top: 4px; font-size: 12px;">${todo.description}</p>
    ` : "";

    return `
      <div class="${itemClass}" data-id="${todo.id}">
        <div class="todo-item-left">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="priority-badge ${priorityClass}">${todo.priority}</span>
            <span class="todo-item-title">${todo.title}</span>
          </div>
          ${descriptionHtml}
          <div class="todo-item-meta" style="margin-top: 6px;">
            <span>Requested by: ${todo.assignedBy || "Director"}</span>
            ${dueBadge}
            ${statusBadge}
          </div>
        </div>
        <div class="todo-item-actions">
          ${actionButtons}
          <button class="btn btn-secondary btn-sm edit-todo-btn">✏ Edit</button>
          <button class="btn btn-ghost btn-sm delete-todo-btn" style="color: var(--red);">🗑 Delete</button>
        </div>
      </div>
    `;
  }).join("");

  // Bind events
  container.querySelectorAll(".comp-todo-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.closest(".todo-item").dataset.id, 10);
      handleMarkTodoCompleted(id);
    });
  });
  container.querySelectorAll(".edit-todo-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.closest(".todo-item").dataset.id, 10);
      handleEditTodo(id);
    });
  });
  container.querySelectorAll(".delete-todo-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.closest(".todo-item").dataset.id, 10);
      handleDeleteTodo(id);
    });
  });
}

// ==========================================
// SECTION: NAVIGATION
// ==========================================

function initNav() {
  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const tab = item.dataset.tab;
      switchTab(tab);

      navItems.forEach(n => n.classList.remove("active"));
      item.classList.add("active");
    });
  });

  // Sub-tabs switching logic (Notes vs To-Dos inside Notes tab)
  const subTabs = document.querySelectorAll(".sub-tab");
  subTabs.forEach(btn => {
    btn.addEventListener("click", () => {
      subTabs.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const subpage = btn.dataset.subtab;
      document.querySelectorAll(".sub-page").forEach(sp => sp.classList.remove("active"));
      document.getElementById(`subpage-${subpage}`).classList.add("active");

      if (subpage === "notes") {
        renderNotes();
      } else {
        renderTodoList();
      }
    });
  });
}

function switchTab(tab) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));

  const tabTitles = {
    dashboard: "Dashboard",
    standup: "Daily Update",
    summary: "Director Summary",
    tasks: "Task List",
    notes: "Notes & To-Do"
  };

  const page = document.getElementById(`page-${tab}`);
  if (page) {
    page.classList.add("active");
    pageTitle.textContent = tabTitles[tab] || "Dashboard";

    // Call appropriate tab refreshers
    if (tab === "dashboard") {
      initDashboard();
    } else if (tab === "tasks") {
      initTaskList();
    } else if (tab === "notes") {
      initNotes();
    }
  }
}

// ==========================================
// SECTION: THEME
// ==========================================

function loadTheme() {
  const saved = localStorage.getItem("standup_theme") || "dark";
  applyTheme(saved);
}

function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  if (themeLabel) {
    themeLabel.textContent = theme === "dark" ? "Dark" : "Light";
  }
  localStorage.setItem("standup_theme", theme);
}

themeToggle.addEventListener("click", () => {
  const current = document.body.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
});

// ==========================================
// SECTION: LOADER & TOAST
// ==========================================

function showLoader(msg = "Saving…") {
  if (loaderText) loaderText.textContent = msg;
  loader.classList.remove("hidden");
}

function hideLoader() {
  loader.classList.add("hidden");
}

let toastTimer = null;

function showToast(message, type = "info") {
  toast.textContent = message;
  toast.className = `toast toast-${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}

// ==========================================
// SECTION: STANDUP FORM
// ==========================================

function setCurrentDate() {
  const today = new Date();
  currentDateEl.textContent = today.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function getFormattedDate() {
  const today = new Date();
  return today.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

async function loadDevelopers() {
  try {
    showLoader("Loading developers…");
    const developers = await api("getDevelopers");

    developerDropdown.innerHTML =
      '<option value="">Select developer…</option>';

    if (Array.isArray(developers)) {
      developers.forEach(dev => {
        const opt = document.createElement("option");
        opt.value = dev;
        opt.textContent = dev;
        developerDropdown.appendChild(opt);
      });
    } else {
      console.warn("getDevelopers response is not an array:", developers);
    }

  } catch (err) {
    console.error("loadDevelopers:", err);
    showToast("Could not load developers. Check API URL.", "error");
  } finally {
    hideLoader();
  }
}

generateSummaryBtn.addEventListener("click", generateTeamsSummary);

function generateTeamsSummary() {
  const developer = developerDropdown.value;
  const completed = document.getElementById("completedTasks").value.trim();
  const inProgress = document.getElementById("inProgressTasks").value.trim();
  const deliverables = document.getElementById("deliverables").value.trim();
  const blockers = document.getElementById("blockers").value.trim();
  const clarifications = document.getElementById("clarifications").value.trim();
  const comments = document.getElementById("comments").value.trim();

  if (!developer) {
    showToast("Please select a developer first.", "error");
    return;
  }

  const date = getFormattedDate();

  let summary =
    `📋 Daily Standup Update — ${date}
Developer: ${developer}

✅ Completed Tasks
${completed || "—"}

🔄 In Progress
${inProgress || "—"}

🎯 Today's Deliverables
${deliverables || "—"}

🚫 Blockers / Dependencies
${blockers || "—"}

❓ Clarifications Required
${clarifications || "—"}`;

  if (comments) {
    summary += `\n\n💬 Comments / Updates\n${comments}`;
  }

  summaryOutput.textContent = summary;
}

copySummaryBtn.addEventListener("click", async () => {
  const text = summaryOutput.textContent.trim();
  if (!text || summaryOutput.querySelector(".empty-state")) {
    showToast("Nothing to copy yet.", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showToast("Summary copied to clipboard.", "success");
  } catch {
    showToast("Copy failed — try selecting and copying manually.", "error");
  }
});

standupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const developer = developerDropdown.value;
  if (!developer) {
    showToast("Please select a developer.", "error");
    return;
  }

  const payload = {
    date: getFormattedDate(),
    developer: developer,
    completedTasks: document.getElementById("completedTasks").value.trim(),
    inProgressTasks: document.getElementById("inProgressTasks").value.trim(),
    deliverables: document.getElementById("deliverables").value.trim(),
    blockers: document.getElementById("blockers").value.trim(),
    clarifications: document.getElementById("clarifications").value.trim(),
    comments: document.getElementById("comments").value.trim(),
    status: "Pending"
  };

  try {
    showLoader("Saving standup…");
    const result = await api("saveStandup", payload);

    if (result.success) {
      showToast("Standup saved successfully!", "success");
      generateTeamsSummary();
      await refreshStats();
      resetForm();
    } else {
      showToast("Save failed: " + (result.message || "Unknown error"), "error");
    }

  } catch (err) {
    console.error("saveStandup:", err);
    showToast("Network error. Check your connection.", "error");
  } finally {
    hideLoader();
  }
});

function resetForm() {
  document.getElementById("completedTasks").value = "";
  document.getElementById("inProgressTasks").value = "";
  document.getElementById("deliverables").value = "";
  document.getElementById("blockers").value = "";
  document.getElementById("clarifications").value = "";
  document.getElementById("comments").value = "";
}

// ==========================================
// SECTION: TASK LIST
// ==========================================

async function initTaskList() {
  showTaskSkeletons();
  try {
    const tasks = await api("getAllTasks");
    if (Array.isArray(tasks)) {
      STATE.allTasks = tasks;
    } else {
      STATE.allTasks = [];
      console.warn("getAllTasks response is not an array:", tasks);
    }
    applyTaskFilters();
  } catch (err) {
    console.error("initTaskList error:", err);
    STATE.allTasks = [];
    showToast("Failed to fetch task list.", "error");
  }
}

function showTaskSkeletons() {
  const container = document.getElementById("taskListContainer");
  if (!container) return;

  container.innerHTML = Array(4).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-bar title skeleton"></div>
      <div class="skeleton-bar text skeleton" style="margin-top: 15px;"></div>
      <div class="skeleton-bar text skeleton"></div>
      <div class="skeleton-bar short skeleton"></div>
      <div class="skeleton-bar text skeleton" style="margin-top: 15px; width: 30%;"></div>
    </div>
  `).join("");
}

function renderTaskList(tasks) {
  const container = document.getElementById("taskListContainer");
  if (!container) return;

  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state-full">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.25">
          <circle cx="12" cy="12" r="10"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        <p>No tasks found.</p>
      </div>
    `;
    return;
  }

  // Group by DATE
  const groups = {};
  tasks.forEach(t => {
    if (!groups[t.date]) {
      groups[t.date] = [];
    }
    groups[t.date].push(t);
  });

  // Sort date groups descending
  const sortedDates = Object.keys(groups).sort((a, b) => {
    return parseDateString(b) - parseDateString(a);
  });

  let html = "";
  sortedDates.forEach(date => {
    html += `
      <div class="task-date-group">
        <div class="task-date-header">
          <span>📅 ${date}</span>
        </div>
    `;

    // Sort developers alphabetically
    const dateTasks = groups[date].sort((a, b) => a.developer.localeCompare(b.developer));

    dateTasks.forEach(t => {
      const isCompleted = t.status === "Completed";
      const statusClass = isCompleted ? "status-completed" : "status-pending";
      const cardClass = isCompleted ? "task-card completed" : "task-card";

      const blockersHtml = (t.blockers && t.blockers !== "-") ? `
        <div class="task-field">
          <span class="task-field-label">🚫 Blockers:</span>
          <span class="task-field-value">${t.blockers}</span>
        </div>
      ` : "";

      const clarificationsHtml = (t.clarifications && t.clarifications !== "-") ? `
        <div class="task-field">
          <span class="task-field-label">❓ Clarifications:</span>
          <span class="task-field-value">${t.clarifications}</span>
        </div>
      ` : "";

      const commentsHtml = `
        <div class="task-comments">
          <div class="task-comments-label">💬 Comments / Updates:</div>
          <p class="text-muted" style="font-size: 13px;">${t.comments || "No comments yet."}</p>
        </div>
      `;

      html += `
        <div class="${cardClass}" data-id="${t.id}" style="${isCompleted ? 'border-left-color: var(--task-completed-border)' : 'border-left-color: var(--task-pending-border)'}">
          <div class="task-card-header">
            <span class="task-dev-name">${t.developer}</span>
            <span class="badge ${statusClass}">${t.status}</span>
          </div>
          <div class="task-body">
            <div class="task-field">
              <span class="task-field-label">✅ Completed:</span>
              <span class="task-field-value">${t.completedTasks}</span>
            </div>
            <div class="task-field">
              <span class="task-field-label">🔄 In Progress:</span>
              <span class="task-field-value">${t.inProgressTasks}</span>
            </div>
            <div class="task-field">
              <span class="task-field-label">🎯 Deliverables:</span>
              <span class="task-field-value">${t.deliverables}</span>
            </div>
            ${blockersHtml}
            ${clarificationsHtml}
            ${commentsHtml}
          </div>
          <div class="task-actions">
            <button class="btn btn-secondary btn-sm mark-task-comp-btn" ${isCompleted ? "disabled style='opacity: 0.5; cursor: not-allowed;'" : ""}>
              ✓ Mark Complete
            </button>
            <button class="btn btn-secondary btn-sm edit-task-btn">
              ✏ Edit Comments
            </button>
            <button class="btn btn-ghost btn-sm delete-task-btn" style="color: var(--red);">
              🗑 Delete
            </button>
          </div>
        </div>
      `;
    });

    html += `</div>`;
  });

  container.innerHTML = html;

  // Attach Event Listeners
  container.querySelectorAll(".mark-task-comp-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".task-card");
      const id = parseInt(card.dataset.id, 10);
      handleMarkTaskCompleted(id);
    });
  });

  container.querySelectorAll(".edit-task-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".task-card");
      const id = parseInt(card.dataset.id, 10);
      handleEditTask(id);
    });
  });

  container.querySelectorAll(".delete-task-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".task-card");
      const id = parseInt(card.dataset.id, 10);
      handleDeleteTask(id);
    });
  });
}

function applyTaskFilters() {
  let filtered = [...STATE.allTasks];

  if (STATE.taskFilter.status !== "All") {
    filtered = filtered.filter(t => t.status === STATE.taskFilter.status);
  }

  if (STATE.taskFilter.date === "Today") {
    const todayStr = getFormattedDate();
    filtered = filtered.filter(t => t.date === todayStr);
  } else if (STATE.taskFilter.date === "Week") {
    filtered = filtered.filter(t => isWithinThisWeek(t.date));
  }

  if (STATE.taskFilter.search) {
    const q = STATE.taskFilter.search.toLowerCase();
    filtered = filtered.filter(t =>
      t.developer.toLowerCase().includes(q) ||
      t.completedTasks.toLowerCase().includes(q) ||
      t.inProgressTasks.toLowerCase().includes(q) ||
      t.deliverables.toLowerCase().includes(q) ||
      t.blockers.toLowerCase().includes(q) ||
      t.clarifications.toLowerCase().includes(q) ||
      t.comments.toLowerCase().includes(q)
    );
  }

  renderTaskList(filtered);
}

async function handleMarkTaskCompleted(id) {
  try {
    showLoader("Updating task...");
    const result = await api("markTaskCompleted", { id: id });
    if (result.success) {
      showToast("Task marked completed.", "success");
      await refreshStats();
      await initTaskList();
    } else {
      showToast(result.message || "Failed to update task.", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Error updating task.", "error");
  } finally {
    hideLoader();
  }
}

function handleEditTask(id) {
  const task = STATE.allTasks.find(t => t.id === id);
  if (!task) return;

  document.getElementById("editTaskInfo").textContent = `Developer: ${task.developer} | Date: ${task.date}`;
  document.getElementById("editTaskComments").value = task.comments || "";
  document.getElementById("editTaskStatus").value = task.status || "Pending";

  STATE.editingTaskId = id;
  document.getElementById("editTaskModal").classList.add("active");
  document.getElementById("editTaskComments").focus();
}

async function saveTaskChanges() {
  const comments = document.getElementById("editTaskComments").value.trim();
  const status = document.getElementById("editTaskStatus").value;
  const id = STATE.editingTaskId;

  try {
    showLoader("Saving task changes...");
    const result = await api("updateTask", { id: id, comments: comments, status: status });
    if (result.success) {
      document.getElementById("editTaskModal").classList.remove("active");
      showToast("Task updated successfully.", "success");
      await refreshStats();
      await initTaskList();
    } else {
      showToast(result.message || "Failed to update task.", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Error updating task.", "error");
  } finally {
    hideLoader();
  }
}

function handleDeleteTask(id) {
  showConfirm("Delete Task", "Are you sure you want to delete this standup entry? This action cannot be undone.", async () => {
    try {
      showLoader("Deleting task...");
      const result = await api("deleteTask", { id: id });
      if (result.success) {
        showToast("Task deleted.", "success");
        await refreshStats();
        await initTaskList();
      } else {
        showToast(result.message || "Failed to delete task.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error deleting task.", "error");
    } finally {
      hideLoader();
    }
  });
}

// ==========================================
// SECTION: NOTES
// ==========================================

async function initNotes() {
  try {
    showLoader("Loading notes...");
    await refreshNotesData();
    await refreshTodosData();
  } catch (err) {
    console.error(err);
  } finally {
    hideLoader();
  }
}

async function refreshNotesData() {
  try {
    const notes = await api("getNotes");
    if (Array.isArray(notes)) {
      STATE.allNotes = notes;
    } else {
      STATE.allNotes = [];
      console.warn("getNotes response is not an array:", notes);
    }
  } catch (err) {
    console.error("refreshNotesData error:", err);
    STATE.allNotes = [];
  }
  renderStickyNotesPreview();
  renderNotes();
}

function renderNotes() {
  const container = document.getElementById("notesGrid");
  if (!container) return;

  if (STATE.allNotes.length === 0) {
    container.innerHTML = `
      <div class="empty-state-full" style="grid-column: 1 / -1;">
        <p>No notes found.</p>
      </div>
    `;
    return;
  }

  // Sort Active first, then Completed.
  const sortedNotes = [...STATE.allNotes].sort((a, b) => {
    if (a.status === "Active" && b.status === "Completed") return -1;
    if (a.status === "Completed" && b.status === "Active") return 1;
    return b.id - a.id;
  });

  container.innerHTML = sortedNotes.map(n => {
    const isCompleted = n.status === "Completed";
    const cardClass = isCompleted ? "note-card completed" : "note-card";
    const statusBadge = `<span class="badge ${isCompleted ? 'badge-completed' : 'badge-active'}">${n.status}</span>`;

    const actionButtons = !isCompleted ? `
      <button class="btn-icon mark-note-btn" title="Mark Done">✓</button>
      <button class="btn-icon edit-note-btn" title="Edit">✏</button>
    ` : "";

    return `
      <div class="${cardClass}" data-id="${n.id}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <h3 class="note-card-title" style="margin-bottom: 0;">${n.title}</h3>
          ${statusBadge}
        </div>
        <p class="note-card-content" style="white-space: pre-wrap;">${n.content}</p>
        <div class="note-card-footer">
          <span class="note-card-date">${n.createdDate}</span>
          <div class="note-actions">
            ${actionButtons}
            <button class="btn-icon delete-note-btn" title="Delete" style="color: var(--red);">🗑</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // Bind events
  container.querySelectorAll(".mark-note-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.closest(".note-card").dataset.id, 10);
      handleMarkNoteCompleted(id);
    });
  });
  container.querySelectorAll(".edit-note-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.closest(".note-card").dataset.id, 10);
      handleEditNote(id);
    });
  });
  container.querySelectorAll(".delete-note-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.closest(".note-card").dataset.id, 10);
      handleDeleteNote(id);
    });
  });
}

async function handleMarkNoteCompleted(id) {
  try {
    showLoader("Updating note...");
    const result = await api("markNoteCompleted", { id: id });
    if (result.success) {
      showToast("Note marked completed.", "success");
      await refreshStats();
      await refreshNotesData();
    } else {
      showToast(result.message || "Failed to update note.", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Error updating note.", "error");
  } finally {
    hideLoader();
  }
}

async function handleAddNote() {
  const title = document.getElementById("newNoteTitle").value.trim();
  const content = document.getElementById("newNoteContent").value.trim();

  if (!title || !content) {
    showToast("Please fill in all required fields.", "error");
    return;
  }

  try {
    showLoader("Adding note...");
    const result = await api("addNote", { title: title, content: content });
    if (result.success) {
      document.getElementById("addNoteModal").classList.remove("active");
      showToast("Note saved.", "success");
      await refreshStats();
      await refreshNotesData();
    } else {
      showToast(result.message || "Failed to save note.", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Error saving note.", "error");
  } finally {
    hideLoader();
  }
}

function handleEditNote(id) {
  const note = STATE.allNotes.find(n => n.id === id);
  if (!note) return;

  document.getElementById("editNoteTitle").value = note.title;
  document.getElementById("editNoteContent").value = note.content;
  STATE.editingNoteId = id;

  document.getElementById("editNoteModal").classList.add("active");
  document.getElementById("editNoteTitle").focus();
}

async function handleUpdateNote() {
  const title = document.getElementById("editNoteTitle").value.trim();
  const content = document.getElementById("editNoteContent").value.trim();
  const id = STATE.editingNoteId;

  if (!title || !content) {
    showToast("Please fill in all required fields.", "error");
    return;
  }

  try {
    showLoader("Updating note...");
    const result = await api("updateNote", { id: id, title: title, content: content });
    if (result.success) {
      document.getElementById("editNoteModal").classList.remove("active");
      showToast("Note updated.", "success");
      await refreshNotesData();
    } else {
      showToast(result.message || "Failed to update note.", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Error updating note.", "error");
  } finally {
    hideLoader();
  }
}

function handleDeleteNote(id) {
  showConfirm("Delete Note", "Are you sure you want to delete this sticky note?", async () => {
    try {
      showLoader("Deleting note...");
      const result = await api("deleteNote", { id: id });
      if (result.success) {
        showToast("Note deleted.", "success");
        await refreshStats();
        await refreshNotesData();
      } else {
        showToast(result.message || "Failed to delete note.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error deleting note.", "error");
    } finally {
      hideLoader();
    }
  });
}

// ==========================================
// SECTION: TO-DO LIST
// ==========================================

async function refreshTodosData() {
  try {
    const todos = await api("getTodos");
    if (Array.isArray(todos)) {
      STATE.allTodos = todos;
    } else {
      STATE.allTodos = [];
      console.warn("getTodos response is not an array:", todos);
    }
  } catch (err) {
    console.error("refreshTodosData error:", err);
    STATE.allTodos = [];
  }
  renderTodoPreview();
  renderTodoList();
}

function renderTodoList() {
  const container = document.getElementById("todoList");
  if (!container) return;

  if (STATE.allTodos.length === 0) {
    container.innerHTML = `
      <div class="empty-state-full">
        <p>No to-do items found.</p>
      </div>
    `;
    return;
  }

  const sortedTodos = [...STATE.allTodos].sort((a, b) => {
    if (a.status === "Pending" && b.status === "Completed") return -1;
    if (a.status === "Completed" && b.status === "Pending") return 1;
    return b.id - a.id;
  });

  container.innerHTML = sortedTodos.map(todo => {
    const isCompleted = todo.status === "Completed";
    const itemClass = isCompleted ? "todo-item completed" : "todo-item";
    const priorityClass = `priority-${todo.priority.toLowerCase()}`;

    const dueBadge = todo.dueDate ? `
      <span class="badge ${isOverdue(todo.dueDate) && !isCompleted ? 'overdue' : ''}" style="font-size: 11px;">
        📅 Due: ${formatDisplayDate(todo.dueDate)}
      </span>
    ` : "";

    const statusBadge = `<span class="badge ${isCompleted ? 'badge-completed' : 'badge-pending'}">${todo.status}</span>`;
    const actionButtons = !isCompleted ? `
      <button class="btn btn-secondary btn-sm comp-todo-btn">✓ Complete</button>
    ` : "";

    const descriptionHtml = todo.description ? `
      <p class="text-muted" style="margin-top: 4px; font-size: 12px;">${todo.description}</p>
    ` : "";

    return `
      <div class="${itemClass}" data-id="${todo.id}">
        <div class="todo-item-left">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="priority-badge ${priorityClass}">${todo.priority}</span>
            <span class="todo-item-title">${todo.title}</span>
          </div>
          ${descriptionHtml}
          <div class="todo-item-meta" style="margin-top: 6px;">
            <span>Requested by: ${todo.assignedBy || "Director"}</span>
            ${dueBadge}
            ${statusBadge}
          </div>
        </div>
        <div class="todo-item-actions">
          ${actionButtons}
          <button class="btn btn-secondary btn-sm edit-todo-btn">✏ Edit</button>
          <button class="btn btn-ghost btn-sm delete-todo-btn" style="color: var(--red);">🗑 Delete</button>
        </div>
      </div>
    `;
  }).join("");

  // Bind events
  container.querySelectorAll(".comp-todo-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.closest(".todo-item").dataset.id, 10);
      handleMarkTodoCompleted(id);
    });
  });
  container.querySelectorAll(".edit-todo-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.closest(".todo-item").dataset.id, 10);
      handleEditTodo(id);
    });
  });
  container.querySelectorAll(".delete-todo-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.closest(".todo-item").dataset.id, 10);
      handleDeleteTodo(id);
    });
  });
}

async function handleMarkTodoCompleted(id) {
  try {
    showLoader("Updating todo...");
    const result = await api("markTodoCompleted", { id: id });
    if (result.success) {
      showToast("To-Do marked completed.", "success");
      await refreshStats();
      await refreshTodosData();
    } else {
      showToast(result.message || "Failed to update todo.", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Error updating todo.", "error");
  } finally {
    hideLoader();
  }
}

async function handleAddTodo() {
  const title = document.getElementById("newTodoTitle").value.trim();
  const description = document.getElementById("newTodoDesc").value.trim();
  const assignedBy = document.getElementById("newTodoAssignedBy").value.trim();
  const priority = document.getElementById("newTodoPriority").value;
  const dueDate = document.getElementById("newTodoDueDate").value;

  if (!title) {
    showToast("Title is required.", "error");
    return;
  }

  try {
    showLoader("Adding todo...");
    const result = await api("addTodo", {
      title: title,
      description: description,
      assignedBy: assignedBy,
      priority: priority,
      dueDate: dueDate
    });
    if (result.success) {
      document.getElementById("addTodoModal").classList.remove("active");
      showToast("To-Do saved.", "success");
      await refreshStats();
      await refreshTodosData();
    } else {
      showToast(result.message || "Failed to save todo.", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Error saving todo.", "error");
  } finally {
    hideLoader();
  }
}

function handleEditTodo(id) {
  const todo = STATE.allTodos.find(t => t.id === id);
  if (!todo) return;

  document.getElementById("editTodoTitle").value = todo.title;
  document.getElementById("editTodoDesc").value = todo.description || "";
  document.getElementById("editTodoAssignedBy").value = todo.assignedBy || "";
  document.getElementById("editTodoPriority").value = todo.priority || "Medium";

  if (todo.dueDate) {
    const parsed = new Date(todo.dueDate);
    if (!isNaN(parsed)) {
      const yyyy = parsed.getFullYear();
      const mm = String(parsed.getMonth() + 1).padStart(2, "0");
      const dd = String(parsed.getDate()).padStart(2, "0");
      document.getElementById("editTodoDueDate").value = `${yyyy}-${mm}-${dd}`;
    } else {
      document.getElementById("editTodoDueDate").value = "";
    }
  } else {
    document.getElementById("editTodoDueDate").value = "";
  }

  STATE.editingTodoId = id;
  document.getElementById("editTodoModal").classList.add("active");
  document.getElementById("editTodoTitle").focus();
}

async function handleUpdateTodo() {
  const title = document.getElementById("editTodoTitle").value.trim();
  const description = document.getElementById("editTodoDesc").value.trim();
  const assignedBy = document.getElementById("editTodoAssignedBy").value.trim();
  const priority = document.getElementById("editTodoPriority").value;
  const dueDate = document.getElementById("editTodoDueDate").value;
  const id = STATE.editingTodoId;

  if (!title) {
    showToast("Title is required.", "error");
    return;
  }

  try {
    showLoader("Updating todo...");
    const result = await api("updateTodo", {
      id: id,
      title: title,
      description: description,
      assignedBy: assignedBy,
      priority: priority,
      dueDate: dueDate
    });
    if (result.success) {
      document.getElementById("editTodoModal").classList.remove("active");
      showToast("To-Do updated.", "success");
      await refreshTodosData();
    } else {
      showToast(result.message || "Failed to update todo.", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Error updating todo.", "error");
  } finally {
    hideLoader();
  }
}

function handleDeleteTodo(id) {
  showConfirm("Delete To-Do", "Are you sure you want to delete this to-do item?", async () => {
    try {
      showLoader("Deleting todo...");
      const result = await api("deleteTodo", { id: id });
      if (result.success) {
        showToast("To-Do deleted.", "success");
        await refreshStats();
        await refreshTodosData();
      } else {
        showToast(result.message || "Failed to delete todo.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error deleting todo.", "error");
    } finally {
      hideLoader();
    }
  });
}

// ==========================================
// SECTION: MODALS
// ==========================================

function initModals() {
  // Developer modal
  openDeveloperModal.addEventListener("click", () => {
    developerModal.classList.add("active");
    newDeveloperName.focus();
  });
  document.getElementById("closeDeveloperModal").addEventListener("click", () => developerModal.classList.remove("active"));

  // Close modals when clicking overlay
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.remove("active");
      }
    });
  });

  // ESC key to close all modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-overlay").forEach(overlay => {
        overlay.classList.remove("active");
      });
    }
  });

  // Close buttons on other modals
  document.querySelectorAll(".close-modal-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.closest(".modal-overlay").classList.remove("active");
    });
  });

  // Confirm modal close/cancel
  document.getElementById("closeConfirmModal").addEventListener("click", () => {
    document.getElementById("confirmModal").classList.remove("active");
  });
  document.getElementById("cancelConfirm").addEventListener("click", () => {
    document.getElementById("confirmModal").classList.remove("active");
  });

  // Bind save buttons inside modals
  document.getElementById("saveTaskBtn").addEventListener("click", saveTaskChanges);
  document.getElementById("saveNoteBtn").addEventListener("click", handleAddNote);
  document.getElementById("updateNoteBtn").addEventListener("click", handleUpdateNote);
  document.getElementById("saveTodoBtn").addEventListener("click", handleAddTodo);
  document.getElementById("updateTodoBtn").addEventListener("click", handleUpdateTodo);

  // Bind add button triggers
  document.getElementById("addNoteBtn").addEventListener("click", () => {
    document.getElementById("newNoteTitle").value = "";
    document.getElementById("newNoteContent").value = "";
    document.getElementById("addNoteModal").classList.add("active");
    document.getElementById("newNoteTitle").focus();
  });

  const openAddTodo = () => {
    document.getElementById("newTodoTitle").value = "";
    document.getElementById("newTodoDesc").value = "";
    document.getElementById("newTodoAssignedBy").value = "";
    document.getElementById("newTodoPriority").value = "Medium";
    document.getElementById("newTodoDueDate").value = "";
    document.getElementById("addTodoModal").classList.add("active");
    document.getElementById("newTodoTitle").focus();
  };
  document.getElementById("addTodoBtn").addEventListener("click", openAddTodo);
  document.getElementById("dashAddTodo").addEventListener("click", openAddTodo);

  // Bind refresh stats button
  const refreshStatsBtn = document.getElementById("refreshStatsBtn");
  if (refreshStatsBtn) {
    refreshStatsBtn.addEventListener("click", async () => {
      showLoader("Refreshing stats...");
      try {
        await refreshStats();
        await refreshNotesData();
        await refreshTodosData();
        showToast("Stats refreshed", "success");
      } catch (err) {
        console.error(err);
        showToast("Refresh failed", "error");
      } finally {
        hideLoader();
      }
    });
  }

  // Bind filter triggers for Task List
  const taskSearch = document.getElementById("taskSearch");
  if (taskSearch) {
    taskSearch.addEventListener("input", (e) => {
      STATE.taskFilter.search = e.target.value;
      applyTaskFilters();
    });
  }
  const taskStatusFilter = document.getElementById("taskStatusFilter");
  if (taskStatusFilter) {
    taskStatusFilter.addEventListener("change", (e) => {
      STATE.taskFilter.status = e.target.value;
      applyTaskFilters();
    });
  }
  const taskDateFilter = document.getElementById("taskDateFilter");
  if (taskDateFilter) {
    taskDateFilter.addEventListener("change", (e) => {
      STATE.taskFilter.date = e.target.value;
      applyTaskFilters();
    });
  }
}

function showConfirm(title, message, onConfirm) {
  document.getElementById("confirmTitle").textContent = title;
  document.getElementById("confirmMessage").textContent = message;
  document.getElementById("confirmModal").classList.add("active");
  document.getElementById("proceedConfirm").onclick = () => {
    document.getElementById("confirmModal").classList.remove("active");
    onConfirm();
  };
}

// ==========================================
// UTILITY HELPERS
// ==========================================

async function refreshStats() {
  try {
    const stats = await api("getDashboardStats");
    STATE.totalTasks = stats.totalTasks;
    STATE.pendingTasks = stats.pendingTasks;
    STATE.completedTasks = stats.completedTasks;
    STATE.activeNotes = stats.activeNotes;
    STATE.pendingTodos = stats.pendingTodos;
    STATE.completedTodos = stats.completedTodos;
    updateStatDisplay();
  } catch (err) {
    console.error("refreshStats error:", err);
  }
}

function updateStatDisplay() {
  if (updatedCount) updatedCount.textContent = STATE.completedTasks;
  if (pendingCount) pendingCount.textContent = STATE.pendingTasks;
  if (entryCount) entryCount.textContent = STATE.totalTasks;

  const totalTasksVal = document.getElementById("statTotalTasksVal");
  if (totalTasksVal) totalTasksVal.textContent = STATE.totalTasks;

  const pendingTasksVal = document.getElementById("statPendingTasksVal");
  if (pendingTasksVal) pendingTasksVal.textContent = STATE.pendingTasks;

  const completedTasksVal = document.getElementById("statCompletedTasksVal");
  if (completedTasksVal) completedTasksVal.textContent = STATE.completedTasks;

  const activeNotesVal = document.getElementById("statActiveNotesVal");
  if (activeNotesVal) activeNotesVal.textContent = STATE.activeNotes;

  const pendingTodosVal = document.getElementById("statPendingTodosVal");
  if (pendingTodosVal) pendingTodosVal.textContent = STATE.pendingTodos;

  const completedTodosVal = document.getElementById("statCompletedTodosVal");
  if (completedTodosVal) completedTodosVal.textContent = STATE.completedTodos;
}

function parseDateString(dateStr) {
  if (!dateStr) return new Date(0);
  const parts = dateStr.split(" ");
  if (parts.length < 3) return new Date(dateStr) || new Date(0);
  const day = parseInt(parts[0], 10);
  const monthStr = parts[1];
  const year = parseInt(parts[2], 10);
  const months = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };
  const month = months[monthStr.toLowerCase()] || 0;
  return new Date(year, month, day);
}

function isWithinThisWeek(dateStr) {
  const parsed = parseDateString(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const timeDiff = today.getTime() - parsed.getTime();
  const diffDays = timeDiff / (1000 * 3600 * 24);
  return diffDays >= 0 && diffDays <= 7;
}

function isOverdue(dueDateStr) {
  if (!dueDateStr) return false;
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

// ==========================================
// DIRECTOR DAILY SUMMARY (report generator)
// ==========================================

if (generateDirectorSummaryBtn) {
  generateDirectorSummaryBtn.addEventListener("click", generateDirectorSummary);
}

async function generateDirectorSummary() {
  try {
    showLoader("Generating report…");
    const data = await api("getTodaySummary");
    const date = getFormattedDate();

    const report =
      `📊 Director's Daily Standup Report
Date: ${date}
Developers Updated: ${data.totalDevelopers}

${"─".repeat(48)}

✅  COMPLETED TASKS
${data.completed || "No entries."}

${"─".repeat(48)}

🔄  IN PROGRESS
${data.inProgress || "No entries."}

${"─".repeat(48)}

🎯  TODAY'S DELIVERABLES
${data.deliverables || "No entries."}

${"─".repeat(48)}

🚫  BLOCKERS / DEPENDENCIES
${data.blockers || "None reported."}

${"─".repeat(48)}

❓  CLARIFICATIONS REQUIRED
${data.clarifications || "None reported."}`;

    directorSummaryOutput.textContent = report;

  } catch (err) {
    console.error("generateDirectorSummary:", err);
    showToast("Failed to generate report.", "error");
  } finally {
    hideLoader();
  }
}

if (copyDirectorBtn) {
  copyDirectorBtn.addEventListener("click", async () => {
    const text = directorSummaryOutput.textContent.trim();
    if (!text || directorSummaryOutput.querySelector(".empty-state")) {
      showToast("Generate a report first.", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast("Report copied to clipboard.", "success");
    } catch {
      showToast("Copy failed.", "error");
    }
  });
}