const SHEET_NAMES = {
  users: "User Data",
  questions: "Question Bank",
  results: "Result Sheet",
  settings: "Test Setting",
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
  settings: ["Test Name", "Duration", "Status", "Show Explanation"],
};

function setupNursingSolutionSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEET_NAMES).forEach((key) => {
    const sheet = getOrCreateSheet_(ss, SHEET_NAMES[key]);
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS[key]);
    sheet.getRange(1, 1, 1, HEADERS[key].length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  });
  ensureSalt_();
}

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || "{}");
    const action = payload.action;
    let data;

    if (action === "register") data = register_(payload);
    else if (action === "login") data = login_(payload);
    else if (action === "listTests") data = listTests_();
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

function listTests_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settings = tableRows_(getOrCreateSheet_(ss, SHEET_NAMES.settings));
  const questionRows = tableRows_(getOrCreateSheet_(ss, SHEET_NAMES.questions));

  const tests = settings.map((setting) => {
    const testName = setting["Test Name"];
    const questions = questionRows.filter((row) => row["Test Name"] === testName);
    return {
      testName,
      subject: questions[0] ? questions[0].Subject : "",
      duration: Number(setting.Duration || questions[0]?.["Test Timing"] || 0),
      status: setting.Status || "Inactive",
      questionCount: questions.length,
    };
  });

  return { tests };
}

function getQuestions_(payload) {
  requireSession_(payload.userId, payload.token);
  const testName = payload.testName;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settings = tableRows_(getOrCreateSheet_(ss, SHEET_NAMES.settings)).find(
    (row) => row["Test Name"] === testName,
  );
  if (!settings || settings.Status !== "Active") throw new Error("Test is not active.");

  const rows = tableRows_(getOrCreateSheet_(ss, SHEET_NAMES.questions)).filter(
    (row) => row["Test Name"] === testName,
  );
  return {
    test: {
      testName,
      subject: rows[0] ? rows[0].Subject : "",
      duration: Number(settings.Duration || rows[0]?.["Test Timing"] || 0),
      status: settings.Status,
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
  const testName = payload.testName;
  const rows = tableRows_(
    getOrCreateSheet_(SpreadsheetApp.getActiveSpreadsheet(), SHEET_NAMES.questions),
  ).filter((row) => row["Test Name"] === testName);
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

  const resultsSheet = getOrCreateSheet_(SpreadsheetApp.getActiveSpreadsheet(), SHEET_NAMES.results);
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
  const rows = tableRows_(
    getOrCreateSheet_(SpreadsheetApp.getActiveSpreadsheet(), SHEET_NAMES.results),
  );
  const results = rows
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

function sendResultEmail_(result) {
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
    "Nursing Solution Test Series",
  ].join("\n");
  MailApp.sendEmail(result.email, subject, body);
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

function tableRows_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).filter((row) => row.some(String)).map((row) => {
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
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
