const TRACKER_SHEET = "Standup_Tracker";
const DEVELOPERS_SHEET = "Developers";

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

    const data =
      JSON.parse(e.postData.contents);

    switch (data.action) {

      case "saveStandup":
        return createResponse(
          saveStandup(data)
        );

      case "addDeveloper":
        return createResponse(
          addDeveloper(data)
        );

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
   SAVE STANDUP
========================================= */

function saveStandup(data) {

  const sheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(TRACKER_SHEET);

  const nextRow =
    sheet.getLastRow() + 1;

  const id =
    nextRow - 1;

  sheet.appendRow([
    id,
    data.date,
    data.developer,
    data.completedTasks,
    data.inProgressTasks,
    data.deliverables,
    data.blockers,
    data.clarifications,
    new Date()
  ]);

  return {
    success: true,
    message: "Standup Saved"
  };
}

/* =========================================
   GET DEVELOPERS
========================================= */

function getDevelopers() {

  const sheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(DEVELOPERS_SHEET);

  const lastRow =
    sheet.getLastRow();

  if (lastRow <= 1) {
    return [];
  }

  const data =
    sheet
      .getRange(
        2,
        2,
        lastRow - 1,
        1
      )
      .getValues();

  return data.map(
    row => row[0]
  );
}

/* =========================================
   ADD DEVELOPER
========================================= */

function addDeveloper(data) {

  const developer =
    data.developerName
      .trim();

  const sheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(DEVELOPERS_SHEET);

  const values =
    sheet
      .getDataRange()
      .getValues();

  const exists =
    values.some(row =>
      String(row[1])
        .toLowerCase()
        === developer.toLowerCase()
    );

  if (exists) {

    return {
      success: false,
      message:
        "Developer already exists"
    };
  }

  const id =
    sheet.getLastRow();

  sheet.appendRow([
    id,
    developer
  ]);

  return {
    success: true,
    message:
      "Developer Added"
  };
}

/* =========================================
   TODAY SUMMARY
========================================= */

function getTodaySummary() {

  const sheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(TRACKER_SHEET);

  const rows =
    sheet
      .getDataRange()
      .getValues();

  const today =
    Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      "dd-MMM-yyyy"
    );

  let developers = [];
  let completed = [];
  let inProgress = [];
  let deliverables = [];
  let blockers = [];
  let clarifications = [];

  for (
    let i = 1;
    i < rows.length;
    i++
  ) {

    const row = rows[i];

    if (row[1] === today) {

      developers.push(row[2]);

      completed.push(
        `${row[2]} : ${row[3]}`
      );

      inProgress.push(
        `${row[2]} : ${row[4]}`
      );

      deliverables.push(
        `${row[2]} : ${row[5]}`
      );

      if (
        row[6] &&
        row[6] !== "-"
      ) {

        blockers.push(
          `${row[2]} : ${row[6]}`
        );
      }

      if (
        row[7] &&
        row[7] !== "-"
      ) {

        clarifications.push(
          `${row[2]} : ${row[7]}`
        );
      }
    }
  }

  return {

    success: true,

    totalDevelopers:
      developers.length,

    completed:
      completed.join("\n\n"),

    inProgress:
      inProgress.join("\n\n"),

    deliverables:
      deliverables.join("\n\n"),

    blockers:
      blockers.join("\n\n"),

    clarifications:
      clarifications.join("\n\n")
  };
}

/* =========================================
   COMMON RESPONSE
========================================= */

function createResponse(data) {

  return ContentService
    .createTextOutput(
      JSON.stringify(data)
    )
    .setMimeType(
      ContentService
        .MimeType
        .JSON
    );
}