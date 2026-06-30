# Nursing Solution Paid Tests And Notes

This package contains an improved Nursing Solution student app with:

- Logo support
- Free and paid test series
- Free and paid notes
- Razorpay payment links managed from Google Sheet
- Manual paid access unlock from Google Sheet
- Result history with answer review
- Responsive mobile layout

## Files

- `index.html` - app layout
- `styles.css` - responsive UI styling
- `script.js` - login, tests, notes, payment buttons, results
- `apps-script.gs` - Google Apps Script backend
- `assets/nursing-solution-logo.svg` - logo file

## How To Connect With Your Google Sheet

1. Open your Google Sheet.
2. Go to Extensions > Apps Script.
3. Paste the full content of `apps-script.gs`.
4. Run `setupNursingSolutionSheets` one time and approve permissions.
5. Deploy as Web App:
   - Execute as: Me
   - Who has access: Anyone
6. Copy Web App URL.
7. Open `script.js` and replace `googleAppsScriptUrl` with your new Web App URL.

## Test Setting Sheet

Use this sheet to manage tests and Razorpay links.

`Test Name`, `Duration`, `Status`, `Show Explanation`, `Access Type`, `Price`, `Razorpay Link`, `Sort Order`

Example:

| Test Name | Duration | Status | Show Explanation | Access Type | Price | Razorpay Link | Sort Order |
| --- | ---: | --- | --- | --- | ---: | --- | ---: |
| GNM Free Mock 01 | 20 | Active | Yes | Free |  |  | 1 |
| NORCET Premium Set 01 | 45 | Active | Yes | Paid | 99 | https://rzp.io/l/your-link | 2 |

## Question Bank Sheet

`Test Name`, `Subject`, `Question`, `Option A`, `Option B`, `Option C`, `Option D`, `Correct Answer`, `Explanation`, `Test Timing`

Important: `Test Name` must exactly match the `Test Name` in Test Setting.

## Notes Sheet

Use this sheet to add free or paid study notes.

`Note Title`, `Subject`, `Description`, `Note Type`, `File Link`, `Status`, `Access Type`, `Price`, `Razorpay Link`, `Sort Order`

Example:

| Note Title | Subject | Description | Note Type | File Link | Status | Access Type | Price | Razorpay Link | Sort Order |
| --- | --- | --- | --- | --- | --- | --- | ---: | --- | ---: |
| Fundamentals Quick Notes | Fundamentals | Basic revision notes | PDF | https://drive.google.com/... | Active | Free |  |  | 1 |
| NORCET Premium Notes | Mixed Nursing | Premium revision file | PDF | https://drive.google.com/... | Active | Paid | 149 | https://rzp.io/l/your-link | 2 |

## Access Control Sheet

For paid tests or paid notes, add student access here after payment.

`Email`, `User ID`, `Item Type`, `Item Name`, `Access Status`, `Expiry Date`, `Payment Ref`, `Added Date`

Example:

| Email | User ID | Item Type | Item Name | Access Status | Expiry Date | Payment Ref | Added Date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| student@gmail.com |  | Test | NORCET Premium Set 01 | Active | 2026-12-31 | pay_xxxx | 2026-06-30 |
| student@gmail.com |  | Note | NORCET Premium Notes | Active | 2026-12-31 | pay_xxxx | 2026-06-30 |

`Item Type` must be `Test` or `Note`.

`Item Name` must exactly match the paid `Test Name` or `Note Title`.

`Access Status` can be `Active`, `Unlocked`, `Paid`, or `Yes`.

## Payment Flow

1. You add Razorpay link in `Test Setting` or `Notes`.
2. Student sees `Pay now`.
3. Student pays on Razorpay.
4. You add the student's email in `Access Control` with `Access Status` as `Active`.
5. Student clicks Refresh or logs in again.
6. Paid item becomes unlocked.

## Important

This setup does not verify Razorpay payments automatically. It is designed for manual access control from Google Sheet. For automatic unlock after payment, you will need a Razorpay webhook endpoint or a stronger backend.
