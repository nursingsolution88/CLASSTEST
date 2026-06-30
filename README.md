<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Nursing Solution Learning App</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <div class="app-shell">
      <aside class="sidebar" aria-label="Main navigation">
        <div class="brand">
          <img class="brand-logo" src="./assets/nursing-solution-logo.svg" alt="Nursing Solution logo" />
          <div>
            <strong>Nursing Solution</strong>
            <small>Tests, notes, results</small>
          </div>
        </div>

        <nav class="nav-list" id="navList">
          <button class="nav-item active" data-view="dashboard" type="button">Dashboard</button>
          <button class="nav-item" data-view="tests" type="button">Tests</button>
          <button class="nav-item" data-view="notes" type="button">Notes</button>
          <button class="nav-item" data-view="results" type="button">Results</button>
          <button class="nav-item" data-view="profile" type="button">Profile</button>
        </nav>

        <div class="sidebar-footer">
          <span id="syncState">Google Sheet live mode</span>
          <button class="ghost-button" id="logoutBtn" type="button">Logout</button>
        </div>
      </aside>

      <main class="main">
        <section class="auth-view" id="authView">
          <div class="auth-panel">
            <div class="brand auth-brand">
              <img class="brand-logo large" src="./assets/nursing-solution-logo.svg" alt="Nursing Solution logo" />
              <div>
                <strong>Nursing Solution</strong>
                <small>Online nursing preparation</small>
              </div>
            </div>

            <div class="auth-copy">
              <p class="eyebrow">Student portal</p>
              <h1>Login karke test aur notes access karein.</h1>
            </div>

            <div class="auth-tabs" role="tablist" aria-label="Authentication">
              <button class="auth-tab active" id="loginTab" type="button">Login</button>
              <button class="auth-tab" id="registerTab" type="button">Register</button>
            </div>

            <form class="form-grid" id="loginForm">
              <label>
                Email ID
                <input name="email" type="email" autocomplete="email" required />
              </label>
              <label>
                Password
                <input name="password" type="password" autocomplete="current-password" required />
              </label>
              <button class="primary-button" type="submit">Login</button>
            </form>

            <form class="form-grid hidden" id="registerForm">
              <label>
                Name
                <input name="name" type="text" autocomplete="name" required />
              </label>
              <label>
                Email ID
                <input name="email" type="email" autocomplete="email" required />
              </label>
              <label>
                Password
                <input name="password" type="password" autocomplete="new-password" minlength="6" required />
              </label>
              <label>
                Mobile Number
                <input name="mobile" type="tel" autocomplete="tel" />
              </label>
              <button class="primary-button" type="submit">Create account</button>
            </form>

            <p class="message" id="authMessage" role="status"></p>
          </div>

          <div class="auth-art" aria-hidden="true">
            <div class="mock-device">
              <div class="mock-top">
                <span>Live Test Portal</span>
                <strong>Ready</strong>
              </div>
              <div class="mock-question"></div>
              <div class="mock-question short"></div>
              <div class="mock-options">
                <i></i>
                <i class="selected"></i>
                <i></i>
                <i></i>
              </div>
              <div class="mock-result">
                <span>Google Sheet</span>
                <strong>Live</strong>
              </div>
            </div>
          </div>
        </section>

        <section class="workspace hidden" id="workspace">
          <header class="topbar">
            <div>
              <p class="eyebrow" id="todayLabel"></p>
              <h1 id="viewTitle">Dashboard</h1>
            </div>
            <div class="topbar-actions">
              <button class="secondary-button" id="refreshBtn" type="button">Refresh</button>
              <div class="user-chip" id="userChip"></div>
            </div>
          </header>

          <section class="view" id="dashboardView">
            <div class="metric-grid">
              <article class="metric">
                <span>Active Tests</span>
                <strong id="availableCount">0</strong>
              </article>
              <article class="metric">
                <span>Study Notes</span>
                <strong id="notesCount">0</strong>
              </article>
              <article class="metric">
                <span>Attempted</span>
                <strong id="attemptedCount">0</strong>
              </article>
              <article class="metric accent">
                <span>Best Result</span>
                <strong id="bestScore">0%</strong>
              </article>
            </div>

            <div class="content-grid">
              <section class="panel">
                <div class="panel-heading">
                  <div>
                    <p class="eyebrow">Practice</p>
                    <h2>Available Test Series</h2>
                  </div>
                  <button class="text-button" data-view-jump="tests" type="button">View all</button>
                </div>
                <div class="test-list compact" id="dashboardTests"></div>
              </section>

              <section class="panel">
                <div class="panel-heading">
                  <div>
                    <p class="eyebrow">Revision</p>
                    <h2>Latest Notes</h2>
                  </div>
                  <button class="text-button" data-view-jump="notes" type="button">Open notes</button>
                </div>
                <div class="note-list compact" id="dashboardNotes"></div>
              </section>
            </div>
          </section>

          <section class="view hidden" id="testsView">
            <div class="toolbar">
              <label class="search-box">
                Search
                <input id="testSearch" type="search" placeholder="Subject or test name" />
              </label>
              <select id="subjectFilter" aria-label="Subject filter">
                <option value="all">All subjects</option>
              </select>
              <select id="accessFilter" aria-label="Access filter">
                <option value="all">All access</option>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
                <option value="unlocked">Unlocked</option>
              </select>
            </div>
            <div class="test-list" id="testList"></div>
          </section>

          <section class="view hidden" id="notesView">
            <div class="toolbar notes-toolbar">
              <label class="search-box">
                Search
                <input id="noteSearch" type="search" placeholder="Subject or note title" />
              </label>
              <select id="noteSubjectFilter" aria-label="Note subject filter">
                <option value="all">All subjects</option>
              </select>
            </div>
            <div class="note-list" id="noteList"></div>
          </section>

          <section class="view hidden" id="attemptView">
            <div class="attempt-layout">
              <section class="exam-panel">
                <div class="exam-top">
                  <div>
                    <p class="eyebrow" id="attemptSubject"></p>
                    <h2 id="attemptTitle"></h2>
                  </div>
                  <div class="timer" id="timer">00:00</div>
                </div>
                <div class="progress-bar" aria-hidden="true">
                  <span id="progressFill"></span>
                </div>
                <div id="questionArea"></div>
                <div class="exam-actions">
                  <button class="secondary-button" id="prevQuestion" type="button">Previous</button>
                  <button class="secondary-button" id="nextQuestion" type="button">Next</button>
                  <button class="primary-button" id="submitTest" type="button">Submit test</button>
                </div>
              </section>
              <aside class="question-palette" id="questionPalette"></aside>
            </div>
          </section>

          <section class="view hidden" id="resultsView">
            <div class="result-list large" id="resultHistory"></div>
          </section>

          <section class="view hidden" id="profileView">
            <section class="panel profile-panel">
              <div class="avatar" id="profileAvatar"></div>
              <div>
                <h2 id="profileName"></h2>
                <p id="profileEmail"></p>
                <p id="profileMeta"></p>
              </div>
            </section>
          </section>
        </section>
      </main>
    </div>

    <dialog id="resultDialog">
      <div class="dialog-head">
        <h2>Test Result</h2>
        <button class="icon-button" id="closeResult" type="button" aria-label="Close">x</button>
      </div>
      <div id="resultSummary"></div>
    </dialog>

    <dialog id="payDialog">
      <div class="dialog-head">
        <h2>Payment required</h2>
        <button class="icon-button" id="closePay" type="button" aria-label="Close">x</button>
      </div>
      <div id="paySummary"></div>
    </dialog>

    <script src="./script.js"></script>
  </body>
</html>
