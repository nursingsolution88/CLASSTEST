const CONFIG = {
  googleAppsScriptUrl: "",
  showExplanations: true,
};

const STORE = {
  users: "nsts_users_v1",
  session: "nsts_session_v1",
  results: "nsts_results_v1",
};

const seedTests = [
  {
    testName: "Nursing Foundation Mock Test 01",
    subject: "Fundamentals of Nursing",
    duration: 20,
    status: "Active",
    questions: [
      {
        question: "Which vital sign is most directly affected by fever?",
        options: {
          A: "Pulse rate",
          B: "Hair color",
          C: "Vision acuity",
          D: "Height",
        },
        correctAnswer: "A",
        explanation:
          "Fever commonly increases metabolic demand and can raise the pulse rate.",
      },
      {
        question: "The preferred route for measuring core body temperature in adults is:",
        options: {
          A: "Axillary",
          B: "Oral",
          C: "Rectal",
          D: "Skin patch",
        },
        correctAnswer: "C",
        explanation:
          "Rectal temperature is often closer to core temperature, though patient condition and policy decide the final method.",
      },
      {
        question: "Which practice helps prevent hospital-acquired infection?",
        options: {
          A: "Hand hygiene",
          B: "Skipping PPE",
          C: "Sharing needles",
          D: "Open waste disposal",
        },
        correctAnswer: "A",
        explanation:
          "Hand hygiene is one of the most effective measures to reduce infection transmission.",
      },
      {
        question: "Normal adult respiratory rate is generally:",
        options: {
          A: "4 to 8 breaths/min",
          B: "12 to 20 breaths/min",
          C: "28 to 36 breaths/min",
          D: "40 to 50 breaths/min",
        },
        correctAnswer: "B",
        explanation:
          "A typical resting adult respiratory rate is about 12 to 20 breaths per minute.",
      },
    ],
  },
  {
    testName: "Community Health Nursing Test",
    subject: "Community Health",
    duration: 15,
    status: "Active",
    questions: [
      {
        question: "Primary prevention focuses on:",
        options: {
          A: "Early diagnosis only",
          B: "Rehabilitation only",
          C: "Disease prevention before occurrence",
          D: "Palliative care only",
        },
        correctAnswer: "C",
        explanation:
          "Primary prevention includes measures such as immunization and health education before disease develops.",
      },
      {
        question: "Which vaccine is given at birth under routine immunization?",
        options: {
          A: "BCG",
          B: "MMR second dose",
          C: "DPT booster",
          D: "Typhoid conjugate only",
        },
        correctAnswer: "A",
        explanation:
          "BCG is commonly given at birth according to routine immunization schedules.",
      },
      {
        question: "ORS is mainly used to manage:",
        options: {
          A: "Dehydration due to diarrhea",
          B: "Fracture pain",
          C: "Hypertension",
          D: "Asthma attack",
        },
        correctAnswer: "A",
        explanation:
          "Oral rehydration solution helps replace fluid and electrolytes lost during diarrhea.",
      },
    ],
  },
  {
    testName: "Anatomy Quick Revision",
    subject: "Anatomy",
    duration: 10,
    status: "Inactive",
    questions: [
      {
        question: "The basic structural and functional unit of life is:",
        options: {
          A: "Tissue",
          B: "Cell",
          C: "Organ",
          D: "System",
        },
        correctAnswer: "B",
        explanation:
          "The cell is the basic structural and functional unit of living organisms.",
      },
    ],
  },
];

const state = {
  user: null,
  tests: [],
  results: [],
  activeTest: null,
  activeQuestions: [],
  activeAnswers: {},
  activeIndex: 0,
  endAt: 0,
  timerId: null,
  submitted: false,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function sha256(value) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initials(name) {
  return String(name || "Student")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

async function apiRequest(action, payload = {}) {
  if (!CONFIG.googleAppsScriptUrl) {
    return demoApi(action, payload);
  }

  const response = await fetch(CONFIG.googleAppsScriptUrl, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await response.json();
  if (!data.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function demoApi(action, payload) {
  const users = readJson(STORE.users, []);
  const results = readJson(STORE.results, []);

  if (action === "register") {
    const email = payload.email.trim().toLowerCase();
    if (users.some((user) => user.email === email)) {
      throw new Error("This email is already registered.");
    }
    const user = {
      userId: uid("user"),
      name: payload.name.trim(),
      email,
      mobile: payload.mobile || "",
      registrationDate: new Date().toISOString(),
      passwordHash: await sha256(payload.password),
      token: uid("token"),
    };
    users.push(user);
    writeJson(STORE.users, users);
    return { ok: true, user: publicUser(user) };
  }

  if (action === "login") {
    const email = payload.email.trim().toLowerCase();
    const passwordHash = await sha256(payload.password);
    const user = users.find((item) => item.email === email && item.passwordHash === passwordHash);
    if (!user) throw new Error("Invalid email or password.");
    user.token = uid("token");
    writeJson(STORE.users, users);
    return { ok: true, user: publicUser(user) };
  }

  if (action === "listTests") {
    return {
      ok: true,
      tests: seedTests.map((test) => ({
        testName: test.testName,
        subject: test.subject,
        duration: test.duration,
        status: test.status,
        questionCount: test.questions.length,
      })),
    };
  }

  if (action === "getQuestions") {
    const test = seedTests.find((item) => item.testName === payload.testName);
    if (!test || test.status !== "Active") throw new Error("Test is not active.");
    return {
      ok: true,
      test: {
        testName: test.testName,
        subject: test.subject,
        duration: test.duration,
        status: test.status,
      },
      questions: test.questions.map((item, index) => ({
        questionId: `${test.testName}_${index + 1}`,
        question: item.question,
        options: item.options,
      })),
    };
  }

  if (action === "submitResult") {
    const test = seedTests.find((item) => item.testName === payload.testName);
    if (!test) throw new Error("Test not found.");
    const checked = test.questions.map((question, index) => {
      const selected = payload.answers[String(index)] || "";
      return {
        question: question.question,
        selected,
        correctAnswer: question.correctAnswer,
        options: question.options,
        explanation: question.explanation,
        isCorrect: selected === question.correctAnswer,
      };
    });
    const correct = checked.filter((item) => item.isCorrect).length;
    const wrong = checked.length - correct;
    const percentage = checked.length ? Math.round((correct / checked.length) * 100) : 0;
    const result = {
      resultId: uid("result"),
      userId: payload.user.userId,
      studentName: payload.user.name,
      email: payload.user.email,
      testName: test.testName,
      score: `${correct}/${checked.length}`,
      correctAnswers: correct,
      wrongAnswers: wrong,
      percentage,
      submittedAt: new Date().toISOString(),
      review: checked,
    };
    results.push(result);
    writeJson(STORE.results, results);
    return { ok: true, result, emailSent: true };
  }

  if (action === "myResults") {
    return {
      ok: true,
      results: results.filter((result) => result.userId === payload.userId),
    };
  }

  throw new Error("Unknown action.");
}

function publicUser(user) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function setAuthMode(mode) {
  const login = mode === "login";
  $("#loginTab").classList.toggle("active", login);
  $("#registerTab").classList.toggle("active", !login);
  $("#loginForm").classList.toggle("hidden", !login);
  $("#registerForm").classList.toggle("hidden", login);
  $("#authMessage").textContent = "";
}

async function loadApp() {
  $("#todayLabel").textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  state.user = readJson(STORE.session, null);
  if (!state.user) {
    showAuth();
    return;
  }
  await showWorkspace();
}

function showAuth() {
  $("#authView").classList.remove("hidden");
  $("#workspace").classList.add("hidden");
  $(".sidebar").classList.add("hidden");
}

async function showWorkspace() {
  $("#authView").classList.add("hidden");
  $("#workspace").classList.remove("hidden");
  $(".sidebar").classList.remove("hidden");
  $("#userChip").textContent = `${initials(state.user.name)}  ${state.user.name}`;
  $("#profileAvatar").textContent = initials(state.user.name);
  $("#profileName").textContent = state.user.name;
  $("#profileEmail").textContent = state.user.email;
  $("#profileMeta").textContent = `User ID: ${state.user.userId}`;
  await refreshData();
  switchView("dashboard");
}

async function refreshData() {
  const [testsResponse, resultsResponse] = await Promise.all([
    apiRequest("listTests"),
    apiRequest("myResults", { userId: state.user.userId, token: state.user.token }),
  ]);
  state.tests = testsResponse.tests;
  state.results = resultsResponse.results.sort(
    (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt),
  );
  renderAll();
}

function renderAll() {
  const activeTests = state.tests.filter((test) => test.status === "Active");
  const avg = state.results.length
    ? Math.round(state.results.reduce((sum, item) => sum + item.percentage, 0) / state.results.length)
    : 0;
  const best = state.results.length ? Math.max(...state.results.map((item) => item.percentage)) : 0;

  $("#availableCount").textContent = String(activeTests.length);
  $("#attemptedCount").textContent = String(state.results.length);
  $("#averageScore").textContent = `${avg}%`;
  $("#bestScore").textContent = `${best}%`;

  renderSubjectFilter();
  renderTests("#dashboardTests", activeTests.slice(0, 3), true);
  renderTests("#testList", filteredTests(), false);
  renderResults("#recentResults", state.results.slice(0, 3));
  renderResults("#resultHistory", state.results);
}

function renderSubjectFilter() {
  const filter = $("#subjectFilter");
  const current = filter.value;
  const subjects = [...new Set(state.tests.map((test) => test.subject))].sort();
  filter.innerHTML = '<option value="all">All subjects</option>';
  subjects.forEach((subject) => {
    const option = document.createElement("option");
    option.value = subject;
    option.textContent = subject;
    filter.append(option);
  });
  filter.value = subjects.includes(current) ? current : "all";
}

function filteredTests() {
  const query = $("#testSearch")?.value?.trim().toLowerCase() || "";
  const subject = $("#subjectFilter")?.value || "all";
  return state.tests.filter((test) => {
    const matchesQuery = `${test.testName} ${test.subject}`.toLowerCase().includes(query);
    const matchesSubject = subject === "all" || test.subject === subject;
    return matchesQuery && matchesSubject;
  });
}

function renderTests(selector, tests, compact) {
  const container = $(selector);
  if (!tests.length) {
    container.innerHTML = '<div class="empty">No tests available right now.</div>';
    return;
  }
  container.innerHTML = tests
    .map(
      (test) => `
        <article class="test-card">
          <div>
            <h3>${escapeHtml(test.testName)}</h3>
            <div class="test-meta">
              <span class="pill">${escapeHtml(test.subject)}</span>
              <span class="pill">${test.questionCount} Questions</span>
              <span class="pill">${test.duration} Min</span>
              <span class="pill ${test.status === "Active" ? "live" : "closed"}">${escapeHtml(test.status)}</span>
            </div>
          </div>
          ${
            compact
              ? `<button class="secondary-button" data-view-jump="tests" type="button">Open</button>`
              : `<button class="primary-button" data-start-test="${escapeHtml(test.testName)}" ${
                  test.status !== "Active" ? "disabled" : ""
                } type="button">Start test</button>`
          }
        </article>
      `,
    )
    .join("");
}

function renderResults(selector, results) {
  const container = $(selector);
  if (!results.length) {
    container.innerHTML = '<div class="empty">No result history yet.</div>';
    return;
  }
  container.innerHTML = results
    .map(
      (result) => `
        <article class="result-card">
          <div class="panel-heading">
            <div>
              <h3>${escapeHtml(result.testName)}</h3>
              <div class="result-meta">
                <span class="pill">${new Date(result.submittedAt).toLocaleString()}</span>
                <span class="pill">${result.correctAnswers} Correct</span>
                <span class="pill">${result.wrongAnswers} Wrong</span>
              </div>
            </div>
            <strong class="score">${result.percentage}%</strong>
          </div>
          <button class="text-button" data-result-id="${escapeHtml(result.resultId)}" type="button">Review result</button>
        </article>
      `,
    )
    .join("");
}

function switchView(viewName) {
  if (state.timerId && viewName !== "attempt") return;
  const titles = {
    dashboard: "Dashboard",
    tests: "Available Test Series",
    attempt: "Test Attempt",
    results: "Result History",
    profile: "Profile Information",
  };
  $$(".view").forEach((view) => view.classList.add("hidden"));
  $(`#${viewName}View`).classList.remove("hidden");
  $("#viewTitle").textContent = titles[viewName] || "Dashboard";
  $$(".nav-item").forEach((button) =>
    button.classList.toggle("active", button.dataset.view === viewName),
  );
}

async function startTest(testName) {
  const response = await apiRequest("getQuestions", {
    testName,
    userId: state.user.userId,
    token: state.user.token,
  });
  state.activeTest = response.test;
  state.activeQuestions = response.questions;
  state.activeAnswers = {};
  state.activeIndex = 0;
  state.submitted = false;
  state.endAt = Date.now() + response.test.duration * 60 * 1000;
  $("#attemptSubject").textContent = response.test.subject;
  $("#attemptTitle").textContent = response.test.testName;
  switchView("attempt");
  renderQuestion();
  tickTimer();
  state.timerId = setInterval(tickTimer, 1000);
}

function renderQuestion() {
  const question = state.activeQuestions[state.activeIndex];
  const total = state.activeQuestions.length;
  const selected = state.activeAnswers[String(state.activeIndex)] || "";
  $("#progressFill").style.width = `${((state.activeIndex + 1) / total) * 100}%`;
  $("#questionArea").innerHTML = `
    <p class="question-count">Question ${state.activeIndex + 1} of ${total}</p>
    <h2>${escapeHtml(question.question)}</h2>
    <div class="options">
      ${Object.entries(question.options)
        .map(
          ([key, value]) => `
            <button class="option ${selected === key ? "selected" : ""}" data-answer="${key}" type="button">
              <span>${key}</span>
              <span>${escapeHtml(value)}</span>
            </button>
          `,
        )
        .join("")}
    </div>
  `;
  $("#prevQuestion").disabled = state.activeIndex === 0;
  $("#nextQuestion").disabled = state.activeIndex === total - 1;
  renderPalette();
}

function renderPalette() {
  $("#questionPalette").innerHTML = state.activeQuestions
    .map(
      (_, index) => `
        <button class="palette-button ${
          state.activeIndex === index ? "current" : ""
        } ${state.activeAnswers[String(index)] ? "answered" : ""}" data-question-index="${index}" type="button">
          ${index + 1}
        </button>
      `,
    )
    .join("");
}

function tickTimer() {
  const remaining = Math.max(0, state.endAt - Date.now());
  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  $("#timer").textContent = `${minutes}:${seconds}`;
  if (remaining <= 0) submitActiveTest(true);
}

async function submitActiveTest(autoSubmitted = false) {
  if (state.submitted) return;
  state.submitted = true;
  clearInterval(state.timerId);
  state.timerId = null;
  const response = await apiRequest("submitResult", {
    user: state.user,
    token: state.user.token,
    testName: state.activeTest.testName,
    answers: state.activeAnswers,
    autoSubmitted,
  });
  await refreshData();
  showResult(response.result, autoSubmitted);
  switchView("results");
  state.activeTest = null;
  state.activeQuestions = [];
  state.activeAnswers = {};
}

function showResult(result, autoSubmitted = false) {
  const statusText = autoSubmitted ? "Submitted automatically when time ended." : "Submitted successfully.";
  $("#resultSummary").innerHTML = `
    <article class="result-card">
      <p class="eyebrow">${statusText}</p>
      <h3>${escapeHtml(result.testName)}</h3>
      <div class="result-meta">
        <span class="pill">Score: ${escapeHtml(result.score)}</span>
        <span class="pill">Percentage: ${result.percentage}%</span>
        <span class="pill">${result.correctAnswers} Correct</span>
        <span class="pill">${result.wrongAnswers} Wrong</span>
      </div>
      ${CONFIG.showExplanations ? renderReview(result.review) : ""}
    </article>
  `;
  $("#resultDialog").showModal();
}

function renderReview(review = []) {
  return `
    <div class="review">
      ${review
        .map(
          (item, index) => `
            <div class="review-item ${item.isCorrect ? "correct" : "wrong"}">
              <strong>Q${index + 1}. ${escapeHtml(item.question)}</strong>
              <p>Your answer: ${escapeHtml(item.selected || "Not attempted")}</p>
              <p>Correct answer: ${escapeHtml(item.correctAnswer)}</p>
              <p>${escapeHtml(item.explanation)}</p>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function showMessage(text) {
  $("#authMessage").textContent = text;
}

$("#loginTab").addEventListener("click", () => setAuthMode("login"));
$("#registerTab").addEventListener("click", () => setAuthMode("register"));

$("#registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  try {
    const response = await apiRequest("register", data);
    state.user = response.user;
    writeJson(STORE.session, state.user);
    await showWorkspace();
  } catch (error) {
    showMessage(error.message);
  }
});

$("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  try {
    const response = await apiRequest("login", data);
    state.user = response.user;
    writeJson(STORE.session, state.user);
    await showWorkspace();
  } catch (error) {
    showMessage(error.message);
  }
});

$("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem(STORE.session);
  location.reload();
});

$("#navList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (button) switchView(button.dataset.view);
});

document.addEventListener("click", async (event) => {
  const jump = event.target.closest("[data-view-jump]");
  if (jump) switchView(jump.dataset.viewJump);

  const start = event.target.closest("[data-start-test]");
  if (start) {
    try {
      await startTest(start.dataset.startTest);
    } catch (error) {
      alert(error.message);
    }
  }

  const answer = event.target.closest("[data-answer]");
  if (answer) {
    state.activeAnswers[String(state.activeIndex)] = answer.dataset.answer;
    renderQuestion();
  }

  const palette = event.target.closest("[data-question-index]");
  if (palette) {
    state.activeIndex = Number(palette.dataset.questionIndex);
    renderQuestion();
  }

  const resultButton = event.target.closest("[data-result-id]");
  if (resultButton) {
    const result = state.results.find((item) => item.resultId === resultButton.dataset.resultId);
    if (result) showResult(result);
  }
});

$("#prevQuestion").addEventListener("click", () => {
  state.activeIndex = Math.max(0, state.activeIndex - 1);
  renderQuestion();
});

$("#nextQuestion").addEventListener("click", () => {
  state.activeIndex = Math.min(state.activeQuestions.length - 1, state.activeIndex + 1);
  renderQuestion();
});

$("#submitTest").addEventListener("click", () => {
  const unanswered = state.activeQuestions.length - Object.keys(state.activeAnswers).length;
  const ok = unanswered
    ? confirm(`${unanswered} questions are unanswered. Submit now?`)
    : confirm("Submit this test now?");
  if (ok) submitActiveTest(false);
});

$("#closeResult").addEventListener("click", () => $("#resultDialog").close());
$("#testSearch").addEventListener("input", () => renderTests("#testList", filteredTests(), false));
$("#subjectFilter").addEventListener("change", () => renderTests("#testList", filteredTests(), false));

loadApp();
