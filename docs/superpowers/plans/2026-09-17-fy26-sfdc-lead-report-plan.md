# FY26 SFDC Lead Web Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private web report that accepts approved full Excel snapshots, preserves historical report dates, recalculates weekly/monthly metrics, and protects organization-level Lead detail.

**Architecture:** Use a Sites-compatible TypeScript web app with server-backed persistence. Store approved snapshot metadata, normalized Lead rows, mappings, users, permissions, and derived metrics in the application database; store original upload files in object storage when supported. Keep public aggregate queries separate from authorization-protected row-level queries, and never send unauthorized rows to the browser.

**Tech Stack:** Sites starter/runtime, TypeScript, the starter’s existing UI primitives, server-side ESM handlers, database migrations, object storage for original files, and spreadsheet parsing through the bundled workspace runtime.

**Spec:** `docs/superpowers/specs/2026-09-17-fy26-sfdc-lead-report-design.md`

## Global Constraints

- Weekly aggregation uses Monday through Sunday.
- Monthly and weekly periods use `Created Date`.
- Snapshot dates are the Asia/Seoul calendar date of the approved upload.
- Same-day uploads keep only the last approved upload as the effective snapshot.
- Recent two-year snapshots are retained by date; older snapshots retain only the earliest-date snapshot per month.
- All authenticated users can view Overview and organization Summary aggregates.
- Row-level Lead detail, API responses, search, and downloads require `Organization Level 2` permission.
- System administrators can view all organization detail and manage users, mappings, uploads, and approvals.
- `Main Interest Area` is stored as `관심제품`; derived `Business` values are `DT`, `GC`, `BS`, or `ETC`.
- The 15 required Excel columns are validated by their exact source names before preview or persistence.
- Salesforce footer rows with no `SFDC Lead Code` and no Lead fields are excluded; a real Lead row without `SFDC Lead Code` fails validation.
- No implementation starts until each task’s failing test and passing test cycle is defined and run.

---

### Task 1: Initialize the Sites application and persistence configuration

**Files:**
- Create: `package.json`, `tsconfig.json`, framework starter files, `.openai/hosting.json`
- Create: `app/`, `components/`, `lib/`, `db/`, `tests/`
- Modify: `요구정의.md` to link the approved plan

**Interfaces:**
- Produces the runnable Sites project, database binding names, object-storage binding name, and test command used by later tasks.

- [ ] **Step 1: Write the failing smoke test**

Create `tests/smoke/app.test.ts` with a test that requests the root route and expects HTTP 200 plus the report title `FY26 SFDC Lead`.

- [ ] **Step 2: Run the smoke test**

Run the project test command for `tests/smoke/app.test.ts`. Expected: FAIL because the app and root route do not exist.

- [ ] **Step 3: Generate the Sites starter and bindings**

Create the starter using the Sites setup flow. Configure static/runtime output and declare the database and object-storage bindings in `.openai/hosting.json`. Preserve the package manager and use the starter’s existing scripts.

- [ ] **Step 4: Implement the minimal root route**

Create `app/page.tsx` with the title `FY26 SFDC Lead 웹 레포트` and a placeholder authenticated-report shell. Create `app/layout.tsx` with the report title and Korean-compatible font configuration.

- [ ] **Step 5: Run the smoke test to verify it passes**

Run the same test. Expected: PASS with HTTP 200 and the report title.

- [ ] **Step 6: Commit**

Run `git add package.json tsconfig.json app components lib db tests .openai/hosting.json 요구정의.md` and commit with `feat: initialize lead report site`.

### Task 2: Add database schema and exact Excel-to-DB mapping

**Files:**
- Create: `db/migrations/0001_lead_report.sql`
- Create: `lib/schema.ts`, `lib/columnMapping.ts`, `tests/schema/columnMapping.test.ts`
- Modify: `요구정의.md` only if the approved mapping table changes

**Interfaces:**
- `COLUMN_MAPPING: Record<string, string>` maps every approved Excel source column to its approved DB name.
- `REQUIRED_SOURCE_COLUMNS: readonly string[]` contains the 15 required source headers.
- `normalizeLeadRow(row): NormalizedLead` returns a Lead row with `Business` derived from `관심제품`.

- [ ] **Step 1: Write failing mapping tests**

Test that `Created Date` maps to `Lead생성날짜`, `Organization Level 2` to `부서`, `Main Interest Area` to `관심제품`, `Source Campaign: Campaign Name` to `캠페인명`, and the two excluded columns are not persisted.

- [ ] **Step 2: Run mapping tests**

Run `pnpm test tests/schema/columnMapping.test.ts`. Expected: FAIL because mapping constants and normalization do not exist.

- [ ] **Step 3: Implement schema and mapping**

Create tables for `users`, `user_org_permissions`, `lead_snapshots`, `leads`, `business_mapping`, `historical_metrics`, and `upload_drafts`. Add uniqueness for effective snapshot date and `(snapshot_id, SFDC_Lead_Code)`. Add indexes on snapshot date, `부서`, `Lead상태`, `Lead유입경로`, `관심제품`, and `Business`.

Implement the exact approved mapping from `요구정의.md`, including the 15 required source columns, the two excluded columns, and `Business` derivation.

- [ ] **Step 4: Run mapping tests to verify they pass**

Run `pnpm test tests/schema/columnMapping.test.ts`. Expected: PASS.

- [ ] **Step 5: Commit**

Run `git add db lib/schema.ts lib/columnMapping.ts tests/schema/columnMapping.test.ts` and commit with `feat: add lead report schema and source mapping`.

### Task 3: Implement Excel parsing, validation, and preview drafts

**Files:**
- Create: `lib/excelParser.ts`, `lib/uploadValidation.ts`, `lib/previewMetrics.ts`
- Create: `app/api/admin/uploads/preview/route.ts`
- Create: `tests/upload/uploadValidation.test.ts`, `tests/upload/previewMetrics.test.ts`

**Interfaces:**
- `parseExcel(buffer): Promise<RawSheet>` reads the first data sheet using the bundled spreadsheet runtime.
- `validateUpload(sheet): ValidationResult` returns `{ ok, missingColumns, changedColumns, unmappedProducts, footerRows, validRows }`.
- `buildPreview(rows): UploadPreview` returns row count, date range, status counts, Business counts, source counts, and representative deltas.

- [ ] **Step 1: Write failing validation tests**

Cover exact required-header validation, footer exclusion, failure for a real Lead without `SFDC Lead Code`, and failure for an unmapped `관심제품`.

- [ ] **Step 2: Run validation tests**

Run `pnpm test tests/upload/uploadValidation.test.ts`. Expected: FAIL because parser and validator are absent.

- [ ] **Step 3: Implement parser and validator**

Read the first worksheet, compare headers exactly, discard only rows whose `SFDC Lead Code` and Lead fields are all empty and whose first-cell text matches the Salesforce export footer pattern, and reject any remaining row without `SFDC Lead Code`. Normalize dates and numeric revenue fields without changing source meaning.

- [ ] **Step 4: Write and run preview tests**

Use a fixture with rows across two weeks, two months, all four Business values, and at least three statuses. Assert that preview counts are deterministic and do not write a snapshot.

Run `pnpm test tests/upload/previewMetrics.test.ts`. Expected: FAIL before `buildPreview`, then PASS after implementation.

- [ ] **Step 5: Implement preview endpoint**

Create the admin-only preview route. Store validated data in `upload_drafts`, return preview JSON, and do not modify `lead_snapshots`, `leads`, or `historical_metrics`.

- [ ] **Step 6: Commit**

Run `git add lib app/api/admin/uploads tests/upload` and commit with `feat: validate excel uploads and create previews`.

### Task 4: Implement approved snapshot replacement and metric calculation

**Files:**
- Create: `lib/snapshotService.ts`, `lib/metrics.ts`
- Create: `app/api/admin/uploads/[draftId]/approve/route.ts`
- Create: `tests/snapshots/snapshotService.test.ts`, `tests/metrics/metrics.test.ts`

**Interfaces:**
- `approveDraft(draftId, approvedAt): Promise<SnapshotResult>` atomically creates or replaces the effective snapshot for the Asia/Seoul date.
- `calculateMetrics(rows, options): MetricsResult` returns weekly, monthly, cumulative, status, source, Business, organization, and Pipeline aggregates.
- `getEffectiveSnapshot(snapshotDate): Promise<Snapshot>` returns the last approved snapshot for that date.

- [ ] **Step 1: Write failing snapshot tests**

Assert that two approvals on one Seoul calendar date leave only the second as effective, while approvals on different dates remain selectable.

- [ ] **Step 2: Write failing metric tests**

Assert Monday-to-Sunday boundaries, month grouping by `Lead생성날짜`, current `Lead상태` counts, Business aggregation, and Pipeline totals from `Opportunity상태`, `Opportunity_GI`, and `Opportunity_매출`.

- [ ] **Step 3: Run tests to verify failure**

Run `pnpm test tests/snapshots/snapshotService.test.ts tests/metrics/metrics.test.ts`. Expected: FAIL because services do not exist.

- [ ] **Step 4: Implement transaction-safe approval**

On approval, mark any prior effective snapshot for the same Seoul date superseded, persist the draft rows under the new snapshot, calculate and persist metrics, and make the new snapshot effective in one transaction. Keep the original file in object storage and record its metadata.

- [ ] **Step 5: Implement metric calculation**

Calculate all report views from the selected snapshot. Preserve count denominators and return `data unavailable` for periods absent from the snapshot instead of inventing zeros. Treat `Business` as a derived field from the approved mapping table.

- [ ] **Step 6: Run tests to verify they pass**

Run the same test command. Expected: PASS.

- [ ] **Step 7: Commit**

Run `git add lib app/api/admin/uploads tests/snapshots tests/metrics` and commit with `feat: approve snapshots and calculate report metrics`.

### Task 5: Seed all PPT historical weekly and monthly summaries

**Files:**
- Create: `data/pptHistoricalMetrics.ts`, `scripts/seedPptMetrics.ts`
- Create: `tests/history/pptHistoricalMetrics.test.ts`
- Modify: `요구정의.md` only if the verified PPT seed scope changes

**Interfaces:**
- `PPT_HISTORICAL_METRICS: HistoricalMetricSeed[]` contains every weekly and monthly summary from the supplied deck with source slide and report date.
- `seedPptMetrics(db): Promise<number>` inserts idempotent seed rows.

- [ ] **Step 1: Write failing seed coverage tests**

Assert that the seed contains all deck weekly/monthly summary categories, includes source slide references, and is idempotent by a stable `(source, period, metric_key)` key.

- [ ] **Step 2: Run the test**

Run `pnpm test tests/history/pptHistoricalMetrics.test.ts`. Expected: FAIL because the seed data and script do not exist.

- [ ] **Step 3: Encode verified PPT values**

Transcribe the deck’s weekly and monthly summary tables into typed seed records. Preserve the PPT snapshot date and label these rows as `ppt_seed`, not as row-level Excel data.

- [ ] **Step 4: Run the test to verify it passes**

Run the same command. Expected: PASS.

- [ ] **Step 5: Commit**

Run `git add data scripts tests/history` and commit with `feat: seed historical ppt metrics`.

### Task 6: Implement invited-account authentication and organization permissions

**Files:**
- Create: `lib/auth.ts`, `lib/permissions.ts`, `app/api/admin/users/route.ts`, `app/api/auth/accept-invite/route.ts`, `app/api/auth/reset-password/route.ts`
- Create: `tests/auth/permissions.test.ts`, `tests/auth/inviteFlow.test.ts`

**Interfaces:**
- `authorize(user, action, organizationLevel2?): AuthorizationResult` distinguishes aggregate access, detail access, and admin access.
- `getAllowedOrganizations(user): Promise<string[]>` returns one or more exact `Organization Level 2` values.
- `inviteUser(input): Promise<Invite>` creates an email-based invite with first-login password setup.

- [ ] **Step 1: Write failing permission tests**

Assert that all authenticated users can read aggregate metrics, a user can read only rows matching an allowed `Organization Level 2`, a multi-org leader can read all assigned organizations, and an administrator can read every organization.

- [ ] **Step 2: Run permission tests**

Run `pnpm test tests/auth/permissions.test.ts`. Expected: FAIL because auth and permission services are absent.

- [ ] **Step 3: Implement auth and permission policy**

Use the supported Sites authentication flow. Store email login IDs, invitation state, password state, role, and exact organization permissions. Enforce authorization in server handlers before querying rows; never filter only in the UI.

- [ ] **Step 4: Implement invite and reset flows**

Add admin user invitation, first-login password setup, email reset links, expiry checks, account disablement, and role/org permission editing.

- [ ] **Step 5: Run tests to verify they pass**

Run `pnpm test tests/auth/permissions.test.ts tests/auth/inviteFlow.test.ts`. Expected: PASS.

- [ ] **Step 6: Commit**

Run `git add lib/auth.ts lib/permissions.ts app/api/auth app/api/admin/users tests/auth` and commit with `feat: add invited users and organization permissions`.

### Task 7: Build aggregate report APIs and protected Lead detail APIs

**Files:**
- Create: `app/api/report/summary/route.ts`, `app/api/report/weekly/route.ts`, `app/api/report/monthly/route.ts`, `app/api/report/pipeline/route.ts`, `app/api/report/organization/route.ts`, `app/api/report/detail/route.ts`, `app/api/report/download/route.ts`
- Create: `tests/api/reportAccess.test.ts`

**Interfaces:**
- Aggregate endpoints accept `{ snapshotDate, filters }` and return only derived metrics.
- Detail endpoint accepts `{ snapshotDate, organizationLevel2, filters, page }` and returns rows only after authorization.
- Download endpoint uses the same permission predicate as detail and never accepts a client-supplied bypass.

- [ ] **Step 1: Write failing API access tests**

Test aggregate access for every authenticated role, unauthorized detail requests, unauthorized search/download requests, multi-org access, and administrator access.

- [ ] **Step 2: Run tests to verify failure**

Run `pnpm test tests/api/reportAccess.test.ts`. Expected: FAIL because routes do not exist.

- [ ] **Step 3: Implement snapshot-date selection**

Return only effective approved snapshot dates and reject dates not present in the snapshot table. Use the selected snapshot consistently across all aggregate and detail queries.

- [ ] **Step 4: Implement aggregate routes**

Return Overview, Weekly, Monthly, Pipeline, Organization Summary, and Source/Product metrics without exposing raw Lead columns.

- [ ] **Step 5: Implement protected detail and download routes**

Apply `authorize` before the database query and include `Organization Level 2` in the predicate. Add pagination and server-side filters for `Lead상태`, `Lead유입경로`, `관심제품`, and date.

- [ ] **Step 6: Run tests to verify they pass**

Run the same command. Expected: PASS.

- [ ] **Step 7: Commit**

Run `git add app/api/report tests/api` and commit with `feat: add report and protected detail APIs`.

### Task 8: Build the report UI and admin upload workflow

**Files:**
- Create: `app/(report)/page.tsx`, `app/(report)/weekly/page.tsx`, `app/(report)/monthly/page.tsx`, `app/(report)/organization/page.tsx`, `app/(report)/pipeline/page.tsx`, `app/(report)/source-product/page.tsx`, `app/(admin)/uploads/page.tsx`, `app/(admin)/users/page.tsx`
- Create: `components/report/MetricSummary.tsx`, `components/report/OrganizationSummary.tsx`, `components/report/LeadDetailTable.tsx`, `components/report/SnapshotSelector.tsx`, `components/admin/UploadPreview.tsx`
- Modify: `app/globals.css`, `app/layout.tsx`
- Create: `tests/ui/reportNavigation.test.tsx`

**Interfaces:**
- `SnapshotSelector` emits only valid snapshot dates.
- `OrganizationSummary` renders public aggregates and emits a detail request without assuming authorization.
- `LeadDetailTable` renders only rows returned by the protected API and displays an explicit forbidden state for denied requests.
- `UploadPreview` exposes validation errors and requires an explicit `반영` action.

- [ ] **Step 1: Write failing UI tests**

Test navigation, snapshot date options, public Summary rendering, protected detail denial, multi-org switching, and upload preview approval.

- [ ] **Step 2: Run UI tests to verify failure**

Run `pnpm test tests/ui/reportNavigation.test.tsx`. Expected: FAIL because report components and pages do not exist.

- [ ] **Step 3: Implement the first meaningful report slice**

Build Overview with snapshot selector, KPI summary, organization Summary, and a representative protected Drill-down action. Use concrete PPT-derived labels and the approved visual direction.

- [ ] **Step 4: Implement remaining report views**

Add Weekly, Monthly, Pipeline, Organization, Source & Product, and History/Upload navigation. Keep aggregate cards and tables separate from raw Lead detail.

- [ ] **Step 5: Implement admin upload preview and approval**

Show validation results, unmapped products, row counts, status/Business summaries, and the final `반영` button. Disable approval until validation passes.

- [ ] **Step 6: Run UI tests to verify they pass**

Run the same command. Expected: PASS.

- [ ] **Step 7: Commit**

Run `git add app components tests/ui` and commit with `feat: build lead report dashboards and upload approval ui`.

### Task 9: Add snapshot retention, audit events, and operational safeguards

**Files:**
- Create: `lib/retention.ts`, `lib/audit.ts`, `scripts/cleanupSnapshots.ts`
- Create: `tests/retention/retention.test.ts`, `tests/audit/audit.test.ts`

**Interfaces:**
- `selectSnapshotsToRetain(snapshots, now): SnapshotRetentionPlan` keeps all dates within two years and the earliest-date snapshot per older month.
- `recordAuditEvent(event): Promise<void>` records upload, preview, approval, permission, and cleanup events without storing raw passwords.

- [ ] **Step 1: Write failing retention tests**

Cover same-day replacement, all dates inside two years, one earliest-date snapshot per older month, and choosing the last upload when the retained date has multiple uploads.

- [ ] **Step 2: Run retention tests**

Run `pnpm test tests/retention/retention.test.ts`. Expected: FAIL because retention logic is absent.

- [ ] **Step 3: Implement retention and audit logic**

Generate a retention plan before deletion, preserve the selected representatives, and write an audit event for every deletion. Keep admin actions attributable to the authenticated email.

- [ ] **Step 4: Run tests to verify they pass**

Run `pnpm test tests/retention/retention.test.ts tests/audit/audit.test.ts`. Expected: PASS.

- [ ] **Step 5: Commit**

Run `git add lib/retention.ts lib/audit.ts scripts tests/retention tests/audit` and commit with `feat: add snapshot retention and audit safeguards`.

### Task 10: End-to-end verification and private deployment

**Files:**
- Create: `tests/e2e/leadReport.e2e.ts`
- Modify: `README.md`, `.openai/hosting.json`, `요구정의.md`

**Interfaces:**
- End-to-end flow: invited user login → admin upload → validation preview → approval → snapshot selection → aggregate report → authorized detail → forbidden cross-org detail.

- [ ] **Step 1: Write the end-to-end test**

Use a fixture Excel with two `Organization Level 2` values and an unmapped product case. Verify failed validation does not change the current snapshot, approval creates a selectable date, all users see aggregates, and cross-org raw rows are unavailable.

- [ ] **Step 2: Run the end-to-end test to establish failures**

Run `pnpm test tests/e2e/leadReport.e2e.ts`. Expected: FAIL for any unconnected production path.

- [ ] **Step 3: Run full validation**

Run the project test command, the Sites build command, and the required static/runtime checks. Fix only actual build or test failures.

- [ ] **Step 4: Verify deployment configuration**

Confirm the private authentication configuration, database/object-storage bindings, static output, and migration state. Do not publish a public version of the report.

- [ ] **Step 5: Deploy privately and verify status**

Use the Sites hosting workflow, then verify the deployed URL, login, upload approval, snapshot date selection, aggregate visibility, and cross-org detail denial.

- [ ] **Step 6: Commit final documentation**

Run `git add README.md .openai/hosting.json 요구정의.md tests/e2e` and commit with `chore: verify and document lead report deployment`.

## Plan Self-Review

- Spec coverage: data model, upload validation/approval, snapshot date rules, two-year retention, PPT seed data, weekly/monthly metrics, Business mapping, invited accounts, role/org permissions, aggregate visibility, protected row detail, download/search protection, and verification are each covered by a task.
- Placeholder scan: no `TBD`, `TODO`, or undefined implementation placeholder remains in the plan.
- Type consistency: the mapping, snapshot, metric, authorization, and UI interfaces are defined before their consumers.
- Repository note: the current workspace is not a Git repository, so the listed commit steps require repository initialization or execution in the project’s Git-managed checkout.
