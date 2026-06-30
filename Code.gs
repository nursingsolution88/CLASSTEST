const SHEET_NAMES = {
  users: "User Data",
  questions: "Question Bank",
  results: "Result Sheet",
  settings: "Test Setting",
  notes: "Notes",
  access: "Access Control",
};

const HEADERS = {
  users: [
    "User ID",
    "Name",
    "Email",
    "Mobile",
    "Registration Date",
    "Password Hash",
    "Status",
  ],
  questions: [
    "Test Name",
    "Subject",
    "Question",
    "Option A",
    "Option B",
    "Option C",
    "Option D",
    "Correct Answer",
    "Explanation",
    "Test Timing",
  ],
  results: [
    "Result ID",
    "Student Name",
    "Email",
    "User ID",
    "Test Name",
    "Score",
    "Correct Answers",
    "Wrong Answers",
    "Percentage",
    "Date & Time",
    "Auto Submitted",
    "Answers JSON",
  ],
  settings: [
    "Test Name",
    "Duration",
    "Status",
    "Show Explanation",
    "Access Type",
    "Price",
    "Razorpay Link",
    "Sort Order",
  ],
  notes: [
    "Note Title",
    "Subject",
    "Description",
    "Note Type",
    "File Link",
    "Status",
    "Access Type",
    "Price",
    "Razorpay Link",
    "Sort Order",
  ],
  access: [
    "Email",
    "User ID",
    "Item Type",
    "Item Name",
    "Access Status",
    "Expiry Date",
    "Payment Ref",
    "Added Date",
  ],
};

function setupNursingSolutionSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEET_NAMES).forEach((key) => {
    const sheet = getOrCreateSheet_(ss, SHEET_NAMES[key]);
    ensureHeaders_(sheet, HEADERS[key]);
    sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight("bold");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, Math.min(sheet.getLastColumn(), 10));
  });
  ensureSalt_();
}

function doGet() {
  return json_({
    ok: true,
    app: "Nursing Solution",
    mode: "live",
    message: "Backend is ready. Use POST requests from the website.",
  });
}

function doPost(event) {
  try {
    const payload = JSON.parse((event.postData && event.postData.contents) || "{}");
    const action = payload.action;
    let data;

    if (action === "register") data = register_(payload);
    else if (action === "login") data = login_(payload);
    else if (action === "listTests") data = listTests_(payload);
    else if (action === "listNotes") data = listNotes_(payload);
    else if (action === "getQuestions") data = getQuestions_(payload);
    else if (action === "submitResult") data = submitResult_(payload);
    else if (action === "myResults") data = myResults_(payload);
    else throw new Error("Unknown action.");

    return json_({ ok: true, ...data });
  } catch (error) {
    return json_({ ok: false, error: error.message });
  }
}

function register_(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const email = normalizeEmail_(payload.email);
    if (!email || !payload.name || !payload.password) {
      throw new Error("Name, email and password are required.");
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const users = getOrCreateSheet_(ss, SHEET_NAMES.users);
    ensureHeaders_(users, HEADERS.users);
    const rows = tableRows_(users);
    if (rows.some((row) => normalizeEmail_(row.Email) === email)) {
      throw new Error("This email is already registered.");
    }

    const userId = Utilities.getUuid();
    const now = new Date();
    users.appendRow([
      userId,
      String(payload.name).trim(),
      email,
      payload.mobile || "",
      now,
      hashPassword_(payload.password),
      "Active",
    ]);

    const token = createSession_(userId);
    return {
      user: {
        userId,
        name: String(payload.name).trim(),
        email,
        mobile: payload.mobile || "",
        registrationDate: now.toISOString(),
        token,
      },
    };
  } finally {
    lock.releaseLock();
  }
}

function login_(payload) {
  const email = normalizeEmail_(payload.email);
  const passwordHash = hashPassword_(payload.password || "");
  const users = getOrCreateSheet_(SpreadsheetApp.getActiveSpreadsheet(), SHEET_NAMES.users);
  ensureHeaders_(users, HEADERS.users);
  const rows = tableRows_(users);
  const user = rows.find(
    (row) =>
      normalizeEmail_(row.Email) === email &&
      row["Password Hash"] === passwordHash &&
      String(row.Status || "Active") === "Active",
  );
  if (!user) throw new Error("Invalid email or password.");
  return {
    user: {
      userId: user["User ID"],
      name: user.Name,
      email: user.Email,
      mobile: user.Mobile || "",
      registrationDate: asIso_(user["Registration Date"]),
      token: createSession_(user["User ID"]),
    },
  };
}

function listTests_(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = getOrCreateSheet_(ss, SHEET_NAMES.settings);
  const questionSheet = getOrCreateSheet_(ss, SHEET_NAMES.questions);
  ensureHeaders_(settingsSheet, HEADERS.settings);
  ensureHeaders_(questionSheet, HEADERS.questions);

  const settings = tableRows_(settingsSheet);
  const questionRows = tableRows_(questionSheet);
  const user = getUserById_(payload.userId);

  const tests = settings
    .filter((setting) => setting["Test Name"])
    .map((setting) => {
      const testName = setting["Test Name"];
      const questions = questionRows.filter((row) => row["Test Name"] === testName);
      const accessType = normalizeAccessType_(setting["Access Type"]);
      return {
        testName,
        subject: questions[0] ? questions[0].Subject : "",
        duration: Number(setting.Duration || (questions[0] && questions[0]["Test Timing"]) || 0),
        status: setting.Status || "Inactive",
        showExplanation: String(setting["Show Explanation"] || "Yes"),
        accessType,
        price: setting.Price || "",
        razorpayLink: setting["Razorpay Link"] || "",
        isUnlocked: hasAccess_(ss, accessType, "Test", testName, user),
        questionCount: questions.length,
        sortOrder: Number(setting["Sort Order"] || 9999),
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.testName.localeCompare(b.testName));

  return { tests };
}

function listNotes_(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const notesSheet = getOrCreateSheet_(ss, SHEET_NAMES.notes);
  ensureHeaders_(notesSheet, HEADERS.notes);
  const user = getUserById_(payload.userId);

  const notes = tableRows_(notesSheet)
    .filter((row) => row["Note Title"])
    .map((row) => {
      const accessType = normalizeAccessType_(row["Access Type"]);
      const noteTitle = row["Note Title"];
      const unlocked = hasAccess_(ss, accessType, "Note", noteTitle, user);
      return {
        noteTitle,
        subject: row.Subject || "",
        description: row.Description || "",
        noteType: row["Note Type"] || "PDF",
        fileLink: unlocked ? row["File Link"] || "" : "",
        status: row.Status || "Inactive",
        accessType,
        price: row.Price || "",
        razorpayLink: row["Razorpay Link"] || "",
        isUnlocked: unlocked,
        sortOrder: Number(row["Sort Order"] || 9999),
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.noteTitle.localeCompare(b.noteTitle));

  return { notes };
}

function getQuestions_(payload) {
  requireSession_(payload.userId, payload.token);
  const testName = payload.testName;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = getOrCreateSheet_(ss, SHEET_NAMES.settings);
  const questionSheet = getOrCreateSheet_(ss, SHEET_NAMES.questions);
  ensureHeaders_(settingsSheet, HEADERS.settings);
  ensureHeaders_(questionSheet, HEADERS.questions);

  const setting = tableRows_(settingsSheet).find((row) => row["Test Name"] === testName);
  if (!setting || setting.Status !== "Active") throw new Error("Test is not active.");

  const user = getUserById_(payload.userId);
  const accessType = normalizeAccessType_(setting["Access Type"]);
  if (!hasAccess_(ss, accessType, "Test", testName, user)) {
    throw new Error("This is a paid test. Please complete payment first.");
  }

  const rows = tableRows_(questionSheet).filter((row) => row["Test Name"] === testName);
  return {
    test: {
      testName,
      subject: rows[0] ? rows[0].Subject : "",
      duration: Number(setting.Duration || (rows[0] && rows[0]["Test Timing"]) || 0),
      status: setting.Status,
    },
    questions: rows.map((row, index) => ({
      questionId: `${testName}_${index + 1}`,
      question: row.Question,
      options: {
        A: row["Option A"],
        B: row["Option B"],
        C: row["Option C"],
        D: row["Option D"],
      },
    })),
  };
}

function submitResult_(payload) {
  requireSession_(payload.user.userId, payload.token);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const testName = payload.testName;
  const setting = tableRows_(getOrCreateSheet_(ss, SHEET_NAMES.settings)).find(
    (row) => row["Test Name"] === testName,
  );
  const accessType = normalizeAccessType_(setting && setting["Access Type"]);
  const user = getUserById_(payload.user.userId);
  if (!hasAccess_(ss, accessType, "Test", testName, user)) {
    throw new Error("This is a paid test. Please complete payment first.");
  }

  const rows = tableRows_(getOrCreateSheet_(ss, SHEET_NAMES.questions)).filter(
    (row) => row["Test Name"] === testName,
  );
  if (!rows.length) throw new Error("Test not found.");

  const review = rows.map((row, index) => {
    const selected = (payload.answers || {})[String(index)] || "";
    const correctAnswer = String(row["Correct Answer"] || "").trim().toUpperCase();
    return {
      question: row.Question,
      selected,
      correctAnswer,
      options: {
        A: row["Option A"],
        B: row["Option B"],
        C: row["Option C"],
        D: row["Option D"],
      },
      explanation: row.Explanation || "",
      isCorrect: selected === correctAnswer,
    };
  });

  const correctAnswers = review.filter((item) => item.isCorrect).length;
  const wrongAnswers = review.length - correctAnswers;
  const percentage = review.length ? Math.round((correctAnswers / review.length) * 100) : 0;
  const resultId = Utilities.getUuid();
  const now = new Date();
  const result = {
    resultId,
    userId: payload.user.userId,
    studentName: payload.user.name,
    email: payload.user.email,
    testName,
    score: `${correctAnswers}/${review.length}`,
    correctAnswers,
    wrongAnswers,
    percentage,
    submittedAt: now.toISOString(),
    review,
  };

  const resultsSheet = getOrCreateSheet_(ss, SHEET_NAMES.results);
  ensureHeaders_(resultsSheet, HEADERS.results);
  resultsSheet.appendRow([
    resultId,
    result.studentName,
    result.email,
    result.userId,
    testName,
    result.score,
    correctAnswers,
    wrongAnswers,
    percentage,
    now,
    payload.autoSubmitted ? "Yes" : "No",
    JSON.stringify(review),
  ]);

  sendResultEmail_(result);
  return { result, emailSent: true };
}

function myResults_(payload) {
  requireSession_(payload.userId, payload.token);
  const resultsSheet = getOrCreateSheet_(SpreadsheetApp.getActiveSpreadsheet(), SHEET_NAMES.results);
  ensureHeaders_(resultsSheet, HEADERS.results);
  const results = tableRows_(resultsSheet)
    .filter((row) => row["User ID"] === payload.userId)
    .map((row) => ({
      resultId: row["Result ID"],
      userId: row["User ID"],
      studentName: row["Student Name"],
      email: row.Email,
      testName: row["Test Name"],
      score: row.Score,
      correctAnswers: Number(row["Correct Answers"] || 0),
      wrongAnswers: Number(row["Wrong Answers"] || 0),
      percentage: Number(row.Percentage || 0),
      submittedAt: asIso_(row["Date & Time"]),
      review: safeJson_(row["Answers JSON"], []),
    }));
  return { results };
}

function hasAccess_(ss, accessType, itemType, itemName, user) {
  if (normalizeAccessType_(accessType) !== "Paid") return true;
  if (!user) return false;

  const accessSheet = getOrCreateSheet_(ss, SHEET_NAMES.access);
  ensureHeaders_(accessSheet, HEADERS.access);
  const email = normalizeEmail_(user.Email);
  const userId = String(user["User ID"] || "");
  const type = String(itemType || "").toLowerCase();
  const name = String(itemName || "").trim().toLowerCase();
  const activeStatuses = ["active", "unlocked", "paid", "yes"];

  return tableRows_(accessSheet).some((row) => {
    const rowStatus = String(row["Access Status"] || "").trim().toLowerCase();
    const rowType = String(row["Item Type"] || "").trim().toLowerCase();
    const rowName = String(row["Item Name"] || "").trim().toLowerCase();
    const rowEmail = normalizeEmail_(row.Email);
    const rowUserId = String(row["User ID"] || "");
    const expiry = row["Expiry Date"];
    const notExpired = !expiry || new Date(expiry).getTime() >= startOfToday_().getTime();
    const sameUser = (rowEmail && rowEmail === email) || (rowUserId && rowUserId === userId);
    return activeStatuses.includes(rowStatus) && rowType === type && rowName === name && sameUser && notExpired;
  });
}

function getUserById_(userId) {
  if (!userId) return null;
  const usersSheet = getOrCreateSheet_(SpreadsheetApp.getActiveSpreadsheet(), SHEET_NAMES.users);
  ensureHeaders_(usersSheet, HEADERS.users);
  return tableRows_(usersSheet).find((row) => row["User ID"] === userId) || null;
}

function sendResultEmail_(result) {
  try {
    const subject = `Result: ${result.testName}`;
    const body = [
      `Dear ${result.studentName},`,
      "",
      `Your test result for ${result.testName} is ready.`,
      `Score: ${result.score}`,
      `Percentage: ${result.percentage}%`,
      `Correct Answers: ${result.correctAnswers}`,
      `Wrong Answers: ${result.wrongAnswers}`,
      "",
      performanceSummary_(result.percentage),
      "",
      "Nursing Solution",
    ].join("\n");
    MailApp.sendEmail(result.email, subject, body);
  } catch (error) {
    console.warn(error);
  }
}

function performanceSummary_(percentage) {
  if (percentage >= 80) return "Performance Summary: Excellent preparation. Keep revising.";
  if (percentage >= 60) return "Performance Summary: Good score. Focus on weak topics.";
  return "Performance Summary: Needs improvement. Review explanations and reattempt practice tests.";
}

function createSession_(userId) {
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put(`session_${token}`, userId, 21600);
  return token;
}

function requireSession_(userId, token) {
  if (!token || CacheService.getScriptCache().get(`session_${token}`) !== userId) {
    throw new Error("Session expired. Please login again.");
  }
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function ensureHeaders_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    return;
  }
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const existing = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(String);
  const missing = headers.filter((header) => !existing.includes(header));
  if (missing.length) {
    sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
  }
}

function tableRows_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values
    .slice(1)
    .filter((row) => row.some(String))
    .map((row) => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = row[index];
      });
      return record;
    });
}

function normalizeEmail_(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeAccessType_(value) {
  return String(value || "Free").trim().toLowerCase() === "paid" ? "Paid" : "Free";
}

function startOfToday_() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function ensureSalt_() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty("PASSWORD_SALT")) {
    props.setProperty("PASSWORD_SALT", Utilities.getUuid());
  }
}

function hashPassword_(password) {
  ensureSalt_();
  const salt = PropertiesService.getScriptProperties().getProperty("PASSWORD_SALT");
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    `${salt}:${password}`,
  );
  return bytes.map((byte) => (byte + 256).toString(16).slice(-2)).join("");
}

function safeJson_(value, fallback) {
  try {
    return JSON.parse(value || "[]");
  } catch (error) {
    return fallback;
  }
}

function asIso_(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? "" : date.toISOString();
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
