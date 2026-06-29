# Nursing Solution Test Series

This package contains a responsive online test series website and a Google Apps Script backend template.

## Files

- `index.html` - website shell
- `styles.css` - responsive dashboard and exam UI
- `script.js` - registration, login, test attempt, timer, result history, and API adapter
- `apps-script.gs` - Google Sheets + Apps Script backend

## Try The Demo

Open `index.html` in a browser. The site runs in demo mode with local browser storage.

1. Register a student account.
2. Open Test Series.
3. Start an active test.
4. Submit the test or wait for the timer.
5. Review result history.

## Connect Google Sheets

1. Create a new Google Sheet.
2. Open Extensions > Apps Script.
3. Paste the full contents of `apps-script.gs`.
4. Run `setupNursingSolutionSheets` once and approve permissions.
5. Fill these sheets:
   - `Question Bank`
   - `Test Setting`
6. Deploy as Web App:
   - Execute as: Me
   - Who has access: Anyone
7. Copy the Web App URL.
8. Open `script.js` and set:

```js
const CONFIG = {
  googleAppsScriptUrl: "YOUR_WEB_APP_URL_HERE",
  showExplanations: true,
};
```

## Sheet Columns

### User Data

`User ID`, `Name`, `Email`, `Mobile`, `Registration Date`, `Password Hash`, `Status`

### Question Bank

`Test Name`, `Subject`, `Question`, `Option A`, `Option B`, `Option C`, `Option D`, `Correct Answer`, `Explanation`, `Test Timing`

### Result Sheet

`Result ID`, `Student Name`, `Email`, `User ID`, `Test Name`, `Score`, `Correct Answers`, `Wrong Answers`, `Percentage`, `Date & Time`, `Auto Submitted`, `Answers JSON`

### Test Setting

`Test Name`, `Duration`, `Status`, `Show Explanation`

## Important Security Note

This is a practical Apps Script starter. It hashes passwords, uses session tokens, and filters results by the logged-in user. For high-scale paid exams, add server-side rate limits, stronger audit logging, payment controls, and a dedicated backend before public launch.
