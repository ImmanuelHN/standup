const TRACKER_SHEET = "Standup_Tracker";
const DEVELOPERS_SHEET = "Developers";

/* =========================================
   SHEETS INITIALIZATION
========================================= */

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const sheetsConfig = [
    {
      name: "Standup_Tracker",
      headers: ["ID", "Date", "Developer", "Completed Tasks", "In Progress Tasks", "Deliverables", "Blockers", "Clarifications", "Timestamp", "Comments", "Status"]
    },
    {
      name: "Developers",
      headers: ["ID", "Developer Name"]
    },
    {
      name: "Notes",
      headers: ["ID", "Title", "Content", "Created Date", "Status", "Timestamp"]
    },
    {
      name: "TodoList",
      headers: ["ID", "Title", "Description", "Assigned By", "Priority", "Due Date", "Status", "Created Date", "Timestamp"]
    }
  ];

  sheetsConfig.forEach(config => {
    let sheet = ss.getSheetByName(config.name);
    if (!sheet) {
      sheet = ss.insertSheet(config.name);
    }
    
    // Setup headers and styling if sheet is empty or only has headers
    if (sheet.getLastRow() <= 1) {
      sheet.clearContents();
      sheet.appendRow(config.headers);
      
      // Style headers: bold, dark background, white text, frozen row 1
      const headerRange = sheet.getRange(1, 1, 1, config.headers.length);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#1f2937"); // dark gray/black background
      headerRange.setFontColor("#ffffff");
      sheet.setFrozenRows(1);
    }
  });
}

/* =========================================
   GET REQUESTS
========================================= */

function doGet(e) {
  const action = e.parameter.action;

  switch (action) {
    case "getDevelopers":
      return createResponse(getDevelopers());

    case "getTodaySummary":
      return createResponse(getTodaySummary());

    case "getDashboardStats":
      return createResponse(getDashboardStats());

    case "getAllTasks":
      return createResponse(getAllTasks());

    case "getNotes":
      return createResponse(getNotes());

    case "getTodos":
      return createResponse(getTodos());

    default:
      return createResponse({
        success: false,
        message: "Invalid Action"
      });
  }
}

/* =========================================
   POST REQUESTS
========================================= */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    switch (data.action) {
      case "saveStandup":
        return createResponse(saveStandup(data));

      case "addDeveloper":
        return createResponse(addDeveloper(data));

      case "updateTask":
        return createResponse(updateTask(data));

      case "deleteTask":
        return createResponse(deleteTask(data));

      case "markTaskCompleted":
        return createResponse(markTaskCompleted(data));

      case "addNote":
        return createResponse(addNote(data));

      case "updateNote":
        return createResponse(updateNote(data));

      case "deleteNote":
        return createResponse(deleteNote(data));

      case "markNoteCompleted":
        return createResponse(markNoteCompleted(data));

      case "addTodo":
        return createResponse(addTodo(data));

      case "updateTodo":
        return createResponse(updateTodo(data));

      case "deleteTodo":
        return createResponse(deleteTodo(data));

      case "markTodoCompleted":
        return createResponse(markTodoCompleted(data));

      default:
        return createResponse({
          success: false,
          message: "Unknown Action"
        });
    }
  } catch (error) {
    return createResponse({
      success: false,
      message: error.toString()
    });
  }
}

/* =========================================
   HELPER FUNCTIONS
========================================= */

function findRowById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i + 1; // 1-indexed sheet row
  }
  return -1;
}

function getNextId(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 1;
  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let maxId = 0;
  for (let i = 0; i < values.length; i++) {
    const val = parseInt(values[i][0], 10);
    if (!isNaN(val) && val > maxId) {
      maxId = val;
    }
  }
  return maxId + 1;
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

/* =========================================
   DASHBOARD STATS
========================================= */

function getDashboardStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Standup Tracker Stats
  const trackerSheet = ss.getSheetByName(TRACKER_SHEET);
  const trackerData = trackerSheet ? trackerSheet.getDataRange().getValues() : [];
  let totalTasks = 0;
  let pendingTasks = 0;
  let completedTasks = 0;
  if (trackerData.length > 1) {
    totalTasks = trackerData.length - 1;
    for (let i = 1; i < trackerData.length; i++) {
      const status = trackerData[i][10]; // Column K
      if (status === "Completed") {
        completedTasks++;
      } else {
        pendingTasks++; // Default to pending if not Completed
      }
    }
  }
  
  // Notes Stats
  const notesSheet = ss.getSheetByName("Notes");
  const notesData = notesSheet ? notesSheet.getDataRange().getValues() : [];
  let totalNotes = 0;
  let activeNotes = 0;
  if (notesData.length > 1) {
    totalNotes = notesData.length - 1;
    for (let i = 1; i < notesData.length; i++) {
      const status = notesData[i][4]; // Column E
      if (status === "Active") {
        activeNotes++;
      }
    }
  }
  
  // TodoList Stats
  const todoSheet = ss.getSheetByName("TodoList");
  const todoData = todoSheet ? todoSheet.getDataRange().getValues() : [];
  let totalTodos = 0;
  let pendingTodos = 0;
  let completedTodos = 0;
  if (todoData.length > 1) {
    totalTodos = todoData.length - 1;
    for (let i = 1; i < todoData.length; i++) {
      const status = todoData[i][6]; // Column G
      if (status === "Completed") {
        completedTodos++;
      } else {
        pendingTodos++; // Default to pending if not Completed
      }
    }
  }
  
  return {
    totalTasks: totalTasks,
    pendingTasks: pendingTasks,
    completedTasks: completedTasks,
    totalNotes: totalNotes,
    activeNotes: activeNotes,
    totalTodos: totalTodos,
    pendingTodos: pendingTodos,
    completedTodos: completedTodos
  };
}

/* =========================================
   STANDUP TRACKER METHODS
========================================= */

function saveStandup(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TRACKER_SHEET);
  const id = getNextId(sheet);
  const status = data.status || "Pending";
  const comments = data.comments || "";

  sheet.appendRow([
    id,
    data.date,
    data.developer,
    data.completedTasks,
    data.inProgressTasks,
    data.deliverables,
    data.blockers,
    data.clarifications,
    new Date(),
    comments,
    status
  ]);

  return {
    success: true,
    message: "Standup Saved"
  };
}

function getAllTasks() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TRACKER_SHEET);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  
  const tasks = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    tasks.push({
      id: row[0],
      date: row[1],
      developer: row[2],
      completedTasks: row[3],
      inProgressTasks: row[4],
      deliverables: row[5],
      blockers: row[6],
      clarifications: row[7],
      timestamp: row[8],
      comments: row[9] || "",
      status: row[10] || "Pending"
    });
  }
  
  // Sort by date descending, then ID descending
  tasks.sort((a, b) => {
    const dateA = parseDateString(a.date);
    const dateB = parseDateString(b.date);
    if (dateB - dateA !== 0) return dateB - dateA;
    return b.id - a.id;
  });
  
  return tasks;
}

function updateTask(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TRACKER_SHEET);
  const rowNum = findRowById(sheet, data.id);
  if (rowNum === -1) {
    return { success: false, message: "Task not found." };
  }
  sheet.getRange(rowNum, 10).setValue(data.comments || ""); // Column J is cell 10
  sheet.getRange(rowNum, 11).setValue(data.status || "Pending"); // Column K is cell 11
  return { success: true, message: "Task updated." };
}

function deleteTask(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TRACKER_SHEET);
  const rowNum = findRowById(sheet, data.id);
  if (rowNum === -1) {
    return { success: false, message: "Task not found." };
  }
  sheet.deleteRow(rowNum);
  return { success: true, message: "Task deleted." };
}

function markTaskCompleted(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TRACKER_SHEET);
  const rowNum = findRowById(sheet, data.id);
  if (rowNum === -1) {
    return { success: false, message: "Task not found." };
  }
  sheet.getRange(rowNum, 11).setValue("Completed");
  return { success: true, message: "Task marked completed." };
}

/* =========================================
   DEVELOPER METHODS
========================================= */

function getDevelopers() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DEVELOPERS_SHEET);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return [];
  }
  const data = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  return data.map(row => row[0]);
}

function addDeveloper(data) {
  const developer = data.developerName.trim();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DEVELOPERS_SHEET);
  const values = sheet.getDataRange().getValues();
  const exists = values.some(row => String(row[1]).toLowerCase() === developer.toLowerCase());

  if (exists) {
    return {
      success: false,
      message: "Developer already exists"
    };
  }

  const id = getNextId(sheet);
  sheet.appendRow([id, developer]);

  return {
    success: true,
    message: "Developer Added"
  };
}

/* =========================================
   TODAY SUMMARY
========================================= */

function getTodaySummary() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TRACKER_SHEET);
  const rows = sheet.getDataRange().getValues();
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MMM-yyyy");

  let developers = [];
  let completed = [];
  let inProgress = [];
  let deliverables = [];
  let blockers = [];
  let clarifications = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[1] === today) {
      developers.push(row[2]);
      completed.push(`${row[2]} : ${row[3]}`);
      inProgress.push(`${row[2]} : ${row[4]}`);
      deliverables.push(`${row[2]} : ${row[5]}`);

      if (row[6] && row[6] !== "-") {
        blockers.push(`${row[2]} : ${row[6]}`);
      }
      if (row[7] && row[7] !== "-") {
        clarifications.push(`${row[2]} : ${row[7]}`);
      }
    }
  }

  return {
    success: true,
    totalDevelopers: developers.length,
    completed: completed.join("\n\n"),
    inProgress: inProgress.join("\n\n"),
    deliverables: deliverables.join("\n\n"),
    blockers: blockers.join("\n\n"),
    clarifications: clarifications.join("\n\n")
  };
}

/* =========================================
   NOTES METHODS
========================================= */

function getNotes() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Notes");
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  
  const notes = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    notes.push({
      id: row[0],
      title: row[1],
      content: row[2],
      createdDate: row[3],
      status: row[4],
      timestamp: row[5]
    });
  }
  notes.sort((a, b) => b.id - a.id);
  return notes;
}

function addNote(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Notes");
  const id = getNextId(sheet);
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MMM-yyyy");
  
  sheet.appendRow([
    id,
    data.title,
    data.content,
    today,
    "Active",
    new Date()
  ]);
  
  return { success: true, message: "Note saved." };
}

function updateNote(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Notes");
  const rowNum = findRowById(sheet, data.id);
  if (rowNum === -1) {
    return { success: false, message: "Note not found." };
  }
  sheet.getRange(rowNum, 2).setValue(data.title);
  sheet.getRange(rowNum, 3).setValue(data.content);
  return { success: true, message: "Note updated." };
}

function deleteNote(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Notes");
  const rowNum = findRowById(sheet, data.id);
  if (rowNum === -1) {
    return { success: false, message: "Note not found." };
  }
  sheet.deleteRow(rowNum);
  return { success: true, message: "Note deleted." };
}

function markNoteCompleted(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Notes");
  const rowNum = findRowById(sheet, data.id);
  if (rowNum === -1) {
    return { success: false, message: "Note not found." };
  }
  sheet.getRange(rowNum, 5).setValue("Completed");
  return { success: true, message: "Note marked completed." };
}

/* =========================================
   TODO LIST METHODS
========================================= */

function getTodos() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("TodoList");
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  
  const todos = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    todos.push({
      id: row[0],
      title: row[1],
      description: row[2],
      assignedBy: row[3],
      priority: row[4],
      dueDate: row[5],
      status: row[6],
      createdDate: row[7],
      timestamp: row[8]
    });
  }
  todos.sort((a, b) => b.id - a.id);
  return todos;
}

function addTodo(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("TodoList");
  const id = getNextId(sheet);
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MMM-yyyy");
  
  sheet.appendRow([
    id,
    data.title,
    data.description || "",
    data.assignedBy || "",
    data.priority || "Medium",
    data.dueDate || "",
    "Pending",
    today,
    new Date()
  ]);
  
  return { success: true, message: "Todo saved." };
}

function updateTodo(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("TodoList");
  const rowNum = findRowById(sheet, data.id);
  if (rowNum === -1) {
    return { success: false, message: "Todo not found." };
  }
  sheet.getRange(rowNum, 2).setValue(data.title);
  sheet.getRange(rowNum, 3).setValue(data.description || "");
  sheet.getRange(rowNum, 4).setValue(data.assignedBy || "");
  sheet.getRange(rowNum, 5).setValue(data.priority || "Medium");
  sheet.getRange(rowNum, 6).setValue(data.dueDate || "");
  return { success: true, message: "Todo updated." };
}

function deleteTodo(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("TodoList");
  const rowNum = findRowById(sheet, data.id);
  if (rowNum === -1) {
    return { success: false, message: "Todo not found." };
  }
  sheet.deleteRow(rowNum);
  return { success: true, message: "Todo deleted." };
}

function markTodoCompleted(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("TodoList");
  const rowNum = findRowById(sheet, data.id);
  if (rowNum === -1) {
    return { success: false, message: "Todo not found." };
  }
  sheet.getRange(rowNum, 7).setValue("Completed");
  return { success: true, message: "Todo marked completed." };
}

/* =========================================
   COMMON RESPONSE
========================================= */

function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}