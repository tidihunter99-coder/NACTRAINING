import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const schemaPath = resolve("supabase/migrations/20261103210000_nac_training_schema.sql");
const hardeningPath = resolve("supabase/migrations/20261103220000_security_hardening.sql");
const inactivePath = resolve("supabase/migrations/20261104010000_inactive_profile_access.sql");
const studentFlowPath = resolve("supabase/migrations/20261104020000_student_workout_flow.sql");
const instructorFlowPath = resolve("supabase/migrations/20261104030000_instructor_plan_workflow.sql");
const instructorConflictPath = resolve("supabase/migrations/20261104040000_instructor_activation_conflict.sql");
const instructorEditorPath = resolve("supabase/migrations/20261104050000_instructor_draft_editor.sql");
const adminOperationsPath = resolve("supabase/migrations/20261104060000_admin_operations.sql");
const adminWeeklyPath = resolve("supabase/migrations/20261104070000_admin_weekly_activity.sql");
const adminPrivacyPath = resolve("supabase/migrations/20261104080000_admin_log_privacy.sql");
const adminHistoryPath = resolve("supabase/migrations/20261104090000_admin_history_guards.sql");
const adminCleanupPath = resolve("supabase/migrations/20261104100000_admin_history_guard_cleanup.sql");
const adminDuplicatesPath = resolve("supabase/migrations/20261104110000_admin_catalog_duplicates.sql");
const bootstrapPath = resolve("supabase/migrations/20261104120000_first_admin_bootstrap.sql");
const rlsTestPath = resolve("supabase/tests/nac_rls_test.sql");
const inactiveTestPath = resolve("supabase/tests/nac_inactive_rls_test.sql");
const studentFlowTestPath = resolve("supabase/tests/nac_student_flow_test.sql");
const instructorTestPath = resolve("supabase/tests/nac_instructor_flow_test.sql");
const instructorEditorTestPath = resolve("supabase/tests/nac_instructor_editor_test.sql");
const adminTestPath = resolve("supabase/tests/nac_admin_flow_test.sql");
const bootstrapTestPath = resolve("supabase/tests/nac_first_admin_bootstrap_test.sql");
const [schema, hardening, inactive, studentFlow, instructorFlow, instructorConflict, instructorEditor, adminOperations, adminWeekly, adminPrivacy, adminHistory, adminCleanup, adminDuplicates, bootstrap, rlsTest, inactiveTest, studentFlowTest, instructorTest, instructorEditorTest, adminTest, bootstrapTest, migrations, tests] = await Promise.all([
  readFile(schemaPath, "utf8"),
  readFile(hardeningPath, "utf8"),
  readFile(inactivePath, "utf8"),
  readFile(studentFlowPath, "utf8"),
  readFile(instructorFlowPath, "utf8"),
  readFile(instructorConflictPath, "utf8"),
  readFile(instructorEditorPath, "utf8"),
  readFile(adminOperationsPath, "utf8"),
  readFile(adminWeeklyPath, "utf8"),
  readFile(adminPrivacyPath, "utf8"),
  readFile(adminHistoryPath, "utf8"),
  readFile(adminCleanupPath, "utf8"),
  readFile(adminDuplicatesPath, "utf8"),
  readFile(bootstrapPath, "utf8"),
  readFile(rlsTestPath, "utf8"),
  readFile(inactiveTestPath, "utf8"),
  readFile(studentFlowTestPath, "utf8"),
  readFile(instructorTestPath, "utf8"),
  readFile(instructorEditorTestPath, "utf8"),
  readFile(adminTestPath, "utf8"),
  readFile(bootstrapTestPath, "utf8"),
  readdir(resolve("supabase/migrations")),
  readdir(resolve("supabase/tests")),
]);

const requiredFragments = [
  "create table public.profiles",
  "create table public.student_instructors",
  "create table public.exercises",
  "create table public.workout_plans",
  "create table public.workout_days",
  "create table public.workout_exercises",
  "create table public.workout_sessions",
  "create table public.workout_set_logs",
  "create table public.body_metrics",
  "create table public.audit_events",
  "alter table public.profiles enable row level security",
  "alter table public.body_metrics enable row level security",
  "create function public.handle_new_user()",
  "create function public.admin_assign_role",
  "workout_plans_one_active_per_student",
  "create policy body_metrics_select_limited",
];

const missing = requiredFragments.filter((fragment) => !schema.includes(fragment));

const policyCount = (schema.match(/^create policy /gm) ?? []).length;
const hardeningFragments = [
  "create function public.protect_workout_plan_ownership()",
  "create function public.protect_terminal_workout_session()",
  "create or replace function public.protect_profile_sensitive_fields()",
  "and visibility = 'instructor_only'",
];
const missingHardening = hardeningFragments.filter((fragment) => !hardening.includes(fragment));
const inactiveFragments = [
  "create or replace function public.can_view_workout_plan",
  "create or replace function public.owns_open_workout_session",
  "drop policy body_metrics_student_insert",
  "drop policy workout_sessions_student_update",
  "drop policy student_instructors_select_authorized",
  "public.current_app_role() = 'student'",
];
const missingInactive = inactiveFragments.filter((fragment) => !inactive.includes(fragment));
const studentFlowFragments = ["workout_sessions_one_open_per_student", "student_has_session_for_plan", "create or replace function public.can_view_workout_plan", "create or replace function public.validate_workout_session"];
const missingStudentFlow = studentFlowFragments.filter((fragment) => !studentFlow.includes(fragment));
const instructorFragments = ["public.is_active_instructor_for(wp.student_id)", "create function public.activate_instructor_workout_plan", "security invoker", "pg_advisory_xact_lock"];
const missingInstructor = instructorFragments.filter((fragment) => !instructorFlow.includes(fragment));
const conflictFragments = ["create or replace function public.activate_instructor_workout_plan", "The active plan belongs to another instructor"];
const missingConflict = conflictFragments.filter((fragment) => !instructorConflict.includes(fragment));
const editorFragments = ["create or replace function public.protect_workout_plan_ownership", "create function public.remove_draft_workout_day", "create function public.move_draft_workout_day", "create function public.move_draft_workout_exercise"];
const missingEditor = editorFragments.filter((fragment) => !instructorEditor.includes(fragment));
const adminFragments = [
  [adminOperations, "admin_set_instructor_link"],
  [adminOperations, "admin_dashboard_counts"],
  [adminOperations, "admin_assign_role"],
  [adminWeekly, "admin_completed_weekly"],
  [adminPrivacy, "drop policy workout_set_logs_select_authorized"],
  [adminHistory, "prevent_exercise_delete"],
  [adminCleanup, "current_user in ('postgres', 'service_role')"],
  [adminDuplicates, "admin_exercise_duplicate_counts"],
];
const missingAdmin = adminFragments.filter(([content, fragment]) => !content.includes(fragment)).map(([, fragment]) => fragment);
const bootstrapFragments = ["create schema if not exists nac_private", "security invoker", "current_user <> 'postgres'", "email_confirmed_at is not null", "An administrator already exists", "admin.bootstrap", "operator_reference"];
const missingBootstrap = bootstrapFragments.filter((fragment) => !bootstrap.includes(fragment));
const requiredRlsTestFragments = [
  "create extension if not exists pgtap",
  "select plan(22);",
  "set local role authenticated;",
  "Student A cannot promote own role",
  "Instructor A cannot see unlinked Student B",
  "Admin has no blanket access to Student A metrics",
  "rollback;",
];
const missingRlsTests = requiredRlsTestFragments.filter((fragment) => !rlsTest.includes(fragment));
const requiredInactiveTestFragments = [
  "select plan(16);",
  "Inactive student cannot read body metrics",
  "Inactive student cannot start a session",
  "Inactive instructor cannot read exercise catalog",
  "rollback;",
];
const missingInactiveTests = requiredInactiveTestFragments.filter((fragment) => !inactiveTest.includes(fragment));
const studentFlowTestFragments = ["select plan(10);", "Only one open session per student", "Archived plan remains visible with own session", "Completed session sets cannot be edited", "rollback;"];
const missingStudentFlowTests = studentFlowTestFragments.filter((fragment) => !studentFlowTest.includes(fragment));
const instructorTestFragments = ["select plan(15);", "Linked instructor B cannot edit another author plan", "Instructor B cannot displace another author active plan", "rollback;"];
const missingInstructorTests = instructorTestFragments.filter((fragment) => !instructorTest.includes(fragment));
const editorTestFragments = ["select plan(14);", "rollback;"];
const missingEditorTests = editorTestFragments.filter((fragment) => !instructorEditorTest.includes(fragment));
const adminTestFragments = ["select plan(35);", "Student cannot elevate own role", "Admin removes assignment and archives active plan", "Admin cannot read private body metrics", "Student cannot query duplicate catalog metadata", "rollback;"];
const missingAdminTests = adminTestFragments.filter((fragment) => !adminTest.includes(fragment));
const bootstrapTestFragments = ["select plan(13);", "Authenticated API role cannot execute bootstrap", "Second bootstrap is refused", "rollback;"];
const missingBootstrapTests = bootstrapTestFragments.filter((fragment) => !bootstrapTest.includes(fragment));
const migrationCount = migrations.filter((name) => name.endsWith(".sql")).length;
const mediaMigration = await readFile(resolve("supabase/migrations/20261104160000_exercise_media_management.sql"), "utf8");
const mediaStorageMigration = await readFile(resolve("supabase/migrations/20261104170000_exercise_media_storage_select.sql"), "utf8");
const visualReviewMigration = await readFile(resolve("supabase/migrations/20261104180000_exercise_visual_review.sql"), "utf8");
const privateMediaMigration = await readFile(resolve("supabase/migrations/20261104190000_private_exercise_media.sql"), "utf8");
const mediaControls = ["coaching_tip", "common_mistakes", "nac-exercise-media", "public.is_admin()", "protect_prescribed_exercise"];
const privateMediaControls = ["public = false", "can_access_exercise_media", "can_access_exercise_media_object", "student_has_session_for_plan", "nac_exercise_media_authorized_select", "Only administrators can associate exercise media"];
const missingMedia = mediaControls.filter((fragment) => !mediaMigration.includes(fragment)).concat(["for select to authenticated", "public.is_admin()"].filter((fragment) => !mediaStorageMigration.includes(fragment)), ["visual_review_status", "media_rights_note", "technical_reviewer", "exercises_protect_visual_review", "Only administrators can review exercise visuals"].filter((fragment) => !visualReviewMigration.includes(fragment)), privateMediaControls.filter((fragment) => !privateMediaMigration.includes(fragment)));
const testCount = tests.filter((name) => name.endsWith("_test.sql")).length;

if (missing.length > 0 || missingHardening.length > 0 || missingInactive.length > 0 || missingStudentFlow.length > 0 || missingInstructor.length > 0 || missingConflict.length > 0 || missingEditor.length > 0 || missingAdmin.length > 0 || missingBootstrap.length > 0 || missingRlsTests.length > 0 || missingInactiveTests.length > 0 || missingStudentFlowTests.length > 0 || missingInstructorTests.length > 0 || missingEditorTests.length > 0 || missingAdminTests.length > 0 || missingBootstrapTests.length > 0 || missingMedia.length > 0 || policyCount !== 29 || migrationCount !== 21 || testCount !== 8) {
  throw new Error([
    "Schema verification failed.",
    missing.length > 0 ? `Missing base fragments:\n${missing.join("\n")}` : "",
    missingHardening.length > 0 ? `Missing hardening fragments:\n${missingHardening.join("\n")}` : "",
    missingInactive.length > 0 ? `Missing inactive access fragments:\n${missingInactive.join("\n")}` : "",
    missingStudentFlow.length > 0 ? `Missing student flow fragments:\n${missingStudentFlow.join("\n")}` : "",
    missingInstructor.length > 0 ? `Missing instructor flow fragments:\n${missingInstructor.join("\n")}` : "",
    missingConflict.length > 0 ? `Missing instructor conflict fragments:\n${missingConflict.join("\n")}` : "",
    missingEditor.length > 0 ? `Missing instructor editor fragments:\n${missingEditor.join("\n")}` : "",
    missingAdmin.length > 0 ? `Missing admin fragments:\n${missingAdmin.join("\n")}` : "",
    missingBootstrap.length > 0 ? `Missing bootstrap fragments:\n${missingBootstrap.join("\n")}` : "",
    missingMedia.length > 0 ? `Missing media controls:\n${missingMedia.join("\n")}` : "",
    missingRlsTests.length > 0 ? `Missing pgTAP test fragments:\n${missingRlsTests.join("\n")}` : "",
    missingInactiveTests.length > 0 ? `Missing inactive pgTAP test fragments:\n${missingInactiveTests.join("\n")}` : "",
    missingStudentFlowTests.length > 0 ? `Missing student flow pgTAP test fragments:\n${missingStudentFlowTests.join("\n")}` : "",
    missingInstructorTests.length > 0 ? `Missing instructor pgTAP test fragments:\n${missingInstructorTests.join("\n")}` : "",
    missingEditorTests.length > 0 ? `Missing instructor editor pgTAP test fragments:\n${missingEditorTests.join("\n")}` : "",
    missingAdminTests.length > 0 ? `Missing admin pgTAP test fragments:\n${missingAdminTests.join("\n")}` : "",
    missingBootstrapTests.length > 0 ? `Missing bootstrap pgTAP test fragments:\n${missingBootstrapTests.join("\n")}` : "",
    policyCount !== 29 ? `Expected 29 base RLS policies; found ${policyCount}.` : "",
    migrationCount !== 21 ? `Expected 21 migrations; found ${migrationCount}.` : "",
    testCount !== 8 ? `Expected 8 pgTAP suites; found ${testCount}.` : "",
  ].filter(Boolean).join("\n"));
}

console.log(`Schema verification passed: ${requiredFragments.length} base controls, ${policyCount} base policies, ${migrationCount} migrations, and ${testCount} pgTAP suites found.`);
