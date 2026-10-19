# HR Flow (PHN HR FMS)

An internal web system for PHN where staff submit HR forms online and the system routes each form through the right approvers, step by step, with email notifications and automatic escalation when an approver is late.

It replaces paper forms and email chains for these processes:

| Form | What it is for |
| --- | --- |
| Man Power Requisition | Requesting new headcount |
| Flexible Working Arrangement | Requesting a flexible work schedule |
| Grievance Report | Raising a workplace grievance |
| Employee Monthly Performance Review | A superior reviews an employee, the employee adds comments, HCD acknowledges |
| Sexual Harassment Report | Confidential report, submitted from a public page with no login |

It also has analytics pages (manpower trend and breakdown, form insights) and an admin area.

## How the system works

1. **Login.** Staff sign in with staff ID and password. Every user has a primary role and sits in a division, department and section.
2. **Submit.** The user picks a form on the Form page and submits it. The answers are saved as JSON in `FormSubmission.formData`, and each submission gets a unique reference ID.
3. **Build the approval chain.** The system reads the approval flow configured for that form type (`ApprovalFlowStep` rows, in order) and works out the actual approvers for each step. It creates one `Approval` row per approver. The first step is `PENDING`, later steps are `WAITING`.
4. **Notify.** The requester gets a confirmation email and the first step's approvers get an "action required" email.
5. **Approve or reject.** Approvers act from the Approval page. Approving opens the next step and emails its approvers. The last approval marks the submission `APPROVED`. A rejection marks it `REJECTED` straight away (Grievance is different, see below).
6. **Escalate.** A background job runs every 2 minutes. Any `PENDING` approval past its deadline is marked `ESCALATED` and the next step is opened.

### How approvers are chosen for a step

Each step has an approver source:

| Source | Meaning |
| --- | --- |
| `ROLE` | Everyone with the step's role. If the step has no division, department or section set, it uses the requester's own unit (for example, the requester's own Head of Department). |
| `MANUAL` | Specific users picked by an admin (`ApprovalStepApprover`). |
| `FORM_FIELD` | A staff ID the requester selects on the form itself, such as "Immediate Superior". That person must not be plain `STAFF`. |

A step can also have:

- **A fallback role**, used when nobody matches, or combined with the main role when `combineWithFallback` is on.
- **An approval mode**: `ALL` (every approver must approve) or `ANY` (one approval completes the step).
- **A step type**: `APPROVER` (must act) or `NOTIFY` (receives an FYI email and the step is passed automatically).

The requester is never their own approver, and a user is not assigned to more than one step of the same submission. The logic lives in [lib/approverResolution.ts](lib/approverResolution.ts) and [src/app/api/form/route.ts](src/app/api/form/route.ts).

### Forms with special rules

These rules are hard-coded and matched by the form type's **name**, so renaming a form type in Admin breaks them.

| Form | Special behaviour |
| --- | --- |
| Man Power Requisition | A Head of Department requester skips the first Head of Department step. Requesters in the "HUMAN CAPITAL AND ESG" division use only the steps explicitly scoped to a unit. |
| Grievance Report | Has its own submit route. A rejection passes the report to the next step instead of ending it, and only the last approver's rejection is final. One approval approves the whole report. Deadlines are 5, 5, 7 days and 10 days on the last step. |
| Employee Monthly Performance Review | Moves through stages kept in `formData.reviewStage`: evaluator submits, HOD approves, the employee fills in comments, HCD acknowledges. Matched by a name containing "employee monthly performance". |
| Sexual Harassment Report | Not a `FormSubmission`. It has its own tables, a public submit page, and separate access rules (see below). |

### Deadlines

- Ordinary forms: 7 days per step, 21 days on the last step. The deadline is set when a step is opened by an approval, so the **first step has no deadline** and never escalates automatically.
- Grievance Report: deadlines apply from the first step.

### Sexual harassment reports

- Submitted at `/report/sexual-harassment` without logging in. The endpoint is rate limited to 5 submissions per IP per hour and has a honeypot field.
- Stored in `SexualHarassmentReport`, with attachments under `storage/sensitive-uploads`.
- Only compliance officers can read them. A compliance officer is a user manually assigned as an approver on the form type named "Sexual Harassment Report", or a `FORM_ADMIN` scoped to that form type. See [src/lib/compliance-officers.ts](src/lib/compliance-officers.ts).

## Roles and access

| Role | Access |
| --- | --- |
| `STAFF` | Submit forms, see own submissions, act on approvals assigned to them |
| `HEAD_OF_SECTION` | Same as staff, and is an approver in role-based steps |
| `HEAD_OF_DEPARTMENT`, `HEAD_OF_DIVISION`, `TOP_MANAGEMENT` | As above, plus the Analytics pages |
| `FORM_ADMIN` | Read-only Admin page and Analytics, limited to the form types assigned to them (`FormTypeAdmin`) |
| `ADMIN` | Full Admin page: users, form types, approval flows, all submissions |

A user has one primary role (`User.role`), which drives approval routing, and can hold extra roles (`UserRole`), for example a Head of Section who is also an Admin. Role checks are in [src/lib/admin-roles.ts](src/lib/admin-roles.ts), [src/lib/admin-access.ts](src/lib/admin-access.ts) and [src/lib/analytics-access.ts](src/lib/analytics-access.ts).

## Tech stack

- Next.js 15 (App Router) with React 19 and TypeScript; pages and API routes are in one project
- MySQL through Prisma 7 (MariaDB adapter)
- NextAuth with staff ID and password, JWT session lasting 1 hour
- Nodemailer over Office 365 SMTP, with Handlebars email templates
- Tailwind CSS 4, Recharts for charts, jsPDF and html2pdf for PDF export, xlsx for manpower uploads
- node-cron for the escalation job, PM2 in production

## Getting started

### 1. Install

```bash
npm install
```

### 2. Create `.env`

`.env` files are git-ignored, so get the real values from the previous developer or the server.

| Variable | Used for |
| --- | --- |
| `DATABASE_URL` | Prisma CLI (migrations, seed), e.g. `mysql://user:pass@host:3306/dbname` |
| `DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` | The running app's database connection |
| `NEXTAUTH_URL` | Public base URL of the app. Also used for links in emails and by the escalation job. |
| `NEXTAUTH_SECRET` | Signing key for NextAuth sessions |
| `EMAIL`, `EMAIL_PASS` | Office 365 mailbox that sends notifications |
| `EMAIL_TEST_RECIPIENT` | Optional. Outside production, redirects every email to this address. |
| `NEXT_PUBLIC_BASE_PATH` | Optional. Set when the app is served under a sub-path. |
| `CORS_ALLOWED_ORIGIN` | Optional. Adds CORS headers for that origin. |

The app needs both `DATABASE_URL` and the four separate `DATABASE_*` values, pointing at the same database.

### 3. Set up the database

```bash
npx prisma migrate deploy   # create the tables
npx prisma generate         # regenerate the client into src/generated
npx prisma db seed          # divisions, departments, sections and management users
```

The seed in [prisma/seed.ts](prisma/seed.ts) gives every seeded user the same default password (see the file). It does **not** create an `ADMIN` user, form types or approval flows, so on an empty database you need to set one user's role to `ADMIN` directly in the database, then create the form types and flows from the Admin page.

### 4. Run

```bash
npm run dev      # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server on port 3000 |
| `npm run build` / `npm start` | Production build and start |
| `npm run lint` | ESLint |
| `npm run cron` | Run the escalation job by itself (normally not needed) |
| `npm run backfill:reference-ids` | One-off script that fills `referenceId` on old submissions |

## Project layout

```
src/app/                 Pages and API routes (App Router)
  login, register, reset-password
  report/sexual-harassment   Public report page
  dashboard/                 Logged-in area: forms, approval, profile, admin,
                             compliance, form-insights, manpower-analytics
  api/                       All backend endpoints
  component/                 React components, grouped by feature
src/lib/                 Auth options and role / access checks
src/generated/           Prisma client (generated, do not edit)
src/middleware.ts        Security headers and CSP
lib/                     Shared server logic: prisma client, email, approver
                         resolution, notify steps, deadlines, reference IDs
prisma/                  schema.prisma, migrations, seed
emailTemplates/          Handlebars (.hbs) email templates
server/cron.ts           Escalation scheduler
storage/uploads/         Form attachments (served through /api/uploads/[filename])
```

Key API routes:

| Route | Purpose |
| --- | --- |
| `POST /api/form` | Submit a form and build its approval chain |
| `POST /api/form/grievance-post` | Submit a Grievance Report |
| `POST /api/form/employee-review-post`, `employee-review-employee-submit` | Employee Review stages |
| `POST /api/approval-form/action` | Approve or reject |
| `GET /api/approval-form/fetch` | Pending, history and own submissions for the Approval page |
| `/api/approval-flow`, `/api/form-type`, `/api/user` | Admin configuration |
| `POST /api/public/sexual-harassment-report` | Public harassment report submission |
| `/api/compliance/sexual-harassment` | Compliance officer views and status updates |
| `GET /api/cron/escalate-overdue` | Escalation run, called by the scheduler |
| `/api/manpower-dashboard` | Manpower uploads and analytics data |

## Database model

Defined in [prisma/schema.prisma](prisma/schema.prisma).

- **Organisation:** `Division` → `Department` → `Section`, and `User` belongs to one of each (all optional).
- **Roles:** `User.role` (primary), `UserRole` (extra roles), `FormTypeAdmin` (which form types a `FORM_ADMIN` covers).
- **Forms:** `FormType` → `FormSubmission` (`formData` JSON, `status`) → `FileAttachment`.
- **Approval setup:** `ApprovalFlowStep` (one row per step of a form type) → `ApprovalStepApprover` (manual approvers).
- **Approval run:** `Approval` (one row per approver per step of a submission, with `status`, `deadline`, `escalated`).
- **Other:** `SexualHarassmentReport` and its attachments, `ManpowerUpload` (one snapshot per month), `PasswordResetToken`.

`Approval.status` is a plain string. The values used in code are `PENDING`, `WAITING`, `APPROVED`, `REJECTED` and `ESCALATED`.

## Adding a new form

1. Build the form component under `src/app/component/form/hr-form/`.
2. Register it in [lib/hrformcomponents.tsx](lib/hrformcomponents.tsx). The key is the form type name in lower case with non-alphanumeric characters replaced by dashes (for example "Man Power Requisition" becomes `man-power-requisition`).
3. Create the form type with the matching name in Admin → Form Type.
4. Configure its steps in Admin → Approval Flow.
5. If a step should use a staff ID chosen on the form, add that field to `FormApproverFieldOptions` in the same file.

## Background job and email

- The scheduler in [server/cron.ts](server/cron.ts) is started by [instrumentation.ts](instrumentation.ts) when the Next.js server starts, in development too. Every 2 minutes it calls `GET {NEXTAUTH_URL}/api/cron/escalate-overdue`. No separate process is needed.
- That endpoint does not check for a login.
- Real emails are sent only when `NODE_ENV` is `production`. Otherwise they are logged to the console, or redirected to `EMAIL_TEST_RECIPIENT` if it is set. See [lib/emailService.ts](lib/emailService.ts).

## Deployment

Production runs on a Windows server under PM2 using [ecosystem.config.js](ecosystem.config.js), which starts `next start -p 3000` from `E:/WebProjects/hr-flow-phn`.

```bash
npm install
npx prisma migrate deploy
npm run build
pm2 restart hr-flow-phn      # first time: pm2 start ecosystem.config.js
```

[pm2.json](pm2.json) is an unused placeholder.

## Things to know before changing code

- **Form type names are part of the logic.** "Man Power Requisition", "Grievance Report", "Sexual Harassment Report", names containing "employee monthly performance", and the division "HUMAN CAPITAL AND ESG" are all compared as text.
- **Approval mode is ignored for Grievance Report and Employee Review.** Their flow is fixed in [src/app/api/approval-form/action/route.ts](src/app/api/approval-form/action/route.ts).
- **The session cookie is always `Secure`** (`__Secure-next-auth.session-token`), so the app is meant to be served over HTTPS.
- **`GET /api/user` returns fewer fields to non-admins.** They get a basic directory (name, staff ID, role, designation, division, department, section) and admins get the full record. If a field on a form only fills in for admins, check this first, and add the missing field to the non-admin `select` in [src/app/api/user/route.ts](src/app/api/user/route.ts).
- **Uploaded files live on the server's disk**, not in the database, so `storage/` must be backed up and kept across deployments. Manpower uploads are the exception and are stored in the database.
- **The escalation email subject says "pending > 5 days"**, while the actual deadlines are the ones listed above.
