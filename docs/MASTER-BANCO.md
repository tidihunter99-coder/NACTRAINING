# Comparação de catálogos — Missão Master

Fonte remota: SQL Editor, somente SELECT, 04/11/2026. Fonte local: PostgreSQL 17, 15 migrations (14 originais + correção da auditoria). Não são testes RLS.

Comparação dos dez catálogos exportados. Grants de schema/coluna, default ACL e dependências complementares ainda dependem da consulta supplement-readonly.sql: navegador indisponível. Não aplicar o candidato remotamente antes de concluir essa análise e comprovar recuperação.

As definições completas e os valores de cada campo estão em `supabase/audit/catalog-diff.json`; os arquivos local-* e remote-* são inventários de esquema, sem dados pessoais. Normalização aplicada: somente CRLF → LF.

| Objeto | Definição local | Definição remota | Diferença | Impacto | Correção proposta |
|---|---|---|---|---|---|
| columns: audit_events.id | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: audit_events.actor_id | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: audit_events.action | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: audit_events.entity_type | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: audit_events.entity_id | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: audit_events.created_at | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: audit_events.operator_reference | local-columns.json | Ausente | Ausente no remoto | Campo de rastreio do operador | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| columns: body_metrics.id | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: body_metrics.student_id | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: body_metrics.recorded_at | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: body_metrics.weight_kg | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: body_metrics.waist_cm | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: body_metrics.chest_cm | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: body_metrics.arm_cm | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: body_metrics.thigh_cm | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: body_metrics.hip_cm | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: body_metrics.notes | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: body_metrics.created_at | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: exercises.id | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: exercises.name | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: exercises.description | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: exercises.muscle_group | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: exercises.secondary_muscles | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: exercises.equipment | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: exercises.difficulty | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: exercises.instructions | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: exercises.video_url | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: exercises.image_url | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: exercises.created_by | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: exercises.visibility | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: exercises.is_active | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: exercises.created_at | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: exercises.updated_at | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: profiles.id | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: profiles.full_name | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: profiles.email | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: profiles.phone | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: profiles.avatar_url | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: profiles.role | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: profiles.status | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: profiles.created_at | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: profiles.updated_at | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: student_instructors.id | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: student_instructors.student_id | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: student_instructors.instructor_id | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: student_instructors.active | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: student_instructors.assigned_at | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: student_instructors.created_at | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_days.id | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_days.workout_plan_id | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_days.name | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_days.description | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_days.display_order | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_days.estimated_duration | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_days.created_at | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_days.updated_at | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_exercises.id | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_exercises.workout_day_id | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_exercises.exercise_id | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_exercises.display_order | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_exercises.sets | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_exercises.repetitions | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_exercises.suggested_load | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_exercises.rest_seconds | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_exercises.notes | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_exercises.created_at | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_exercises.updated_at | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_plans.id | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_plans.student_id | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_plans.instructor_id | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_plans.title | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_plans.description | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_plans.objective | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_plans.status | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_plans.starts_at | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_plans.ends_at | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_plans.created_at | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_plans.updated_at | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_sessions.id | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_sessions.student_id | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_sessions.workout_plan_id | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_sessions.workout_day_id | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_sessions.started_at | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_sessions.finished_at | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_sessions.status | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_sessions.duration_seconds | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_sessions.notes | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_sessions.created_at | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_set_logs.id | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_set_logs.workout_session_id | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_set_logs.workout_exercise_id | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_set_logs.set_number | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_set_logs.repetitions_completed | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_set_logs.load_used | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_set_logs.completed | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_set_logs.completed_at | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| columns: workout_set_logs.created_at | local-columns.json | remote-columns.json | Idêntica | Sem alteração | Preservar |
| constraints: audit_events.audit_events_action_length | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: audit_events.audit_events_actor_id_fkey | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: audit_events.audit_events_entity_type_length | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: audit_events.audit_events_operator_reference_length | local-constraints.json | Ausente | Ausente no remoto | Validação de comprimento do operador | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| constraints: audit_events.audit_events_pkey | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: body_metrics.body_metrics_arm | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: body_metrics.body_metrics_chest | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: body_metrics.body_metrics_hip | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: body_metrics.body_metrics_notes_length | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: body_metrics.body_metrics_pkey | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: body_metrics.body_metrics_recorded_at | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: body_metrics.body_metrics_student_id_fkey | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: body_metrics.body_metrics_thigh | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: body_metrics.body_metrics_waist | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: body_metrics.body_metrics_weight | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: exercises.exercises_allowed_equipment | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: exercises.exercises_allowed_muscle_group | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: exercises.exercises_created_by_fkey | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: exercises.exercises_description_length | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: exercises.exercises_difficulty | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: exercises.exercises_image_url_length | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: exercises.exercises_name_length | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: exercises.exercises_pkey | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: exercises.exercises_video_url_length | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: profiles.profiles_avatar_url_length | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: profiles.profiles_email_key | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: profiles.profiles_full_name_length | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: profiles.profiles_id_fkey | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: profiles.profiles_phone_length | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: profiles.profiles_pkey | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: student_instructors.student_instructors_distinct_users | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: student_instructors.student_instructors_instructor_id_fkey | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: student_instructors.student_instructors_pkey | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: student_instructors.student_instructors_student_id_fkey | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: student_instructors.student_instructors_unique_pair | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_days.workout_days_display_order | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_days.workout_days_duration | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_days.workout_days_name_length | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_days.workout_days_pkey | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_days.workout_days_unique_order | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_days.workout_days_workout_plan_id_fkey | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_exercises.workout_exercises_display_order | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_exercises.workout_exercises_exercise_id_fkey | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_exercises.workout_exercises_load | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_exercises.workout_exercises_notes_length | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_exercises.workout_exercises_pkey | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_exercises.workout_exercises_repetitions | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_exercises.workout_exercises_rest | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_exercises.workout_exercises_sets | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_exercises.workout_exercises_unique_order | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_exercises.workout_exercises_workout_day_id_fkey | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_plans.workout_plans_date_range | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_plans.workout_plans_instructor_id_fkey | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_plans.workout_plans_pkey | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_plans.workout_plans_student_id_fkey | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_plans.workout_plans_title_length | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_sessions.workout_sessions_completion | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_sessions.workout_sessions_duration | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_sessions.workout_sessions_finished_after_started | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_sessions.workout_sessions_notes_length | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_sessions.workout_sessions_pkey | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_sessions.workout_sessions_student_id_fkey | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_sessions.workout_sessions_workout_day_id_fkey | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_sessions.workout_sessions_workout_plan_id_fkey | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_set_logs.workout_set_logs_completion | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_set_logs.workout_set_logs_load | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_set_logs.workout_set_logs_pkey | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_set_logs.workout_set_logs_repetitions | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_set_logs.workout_set_logs_set_number | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_set_logs.workout_set_logs_unique_set | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_set_logs.workout_set_logs_workout_exercise_id_fkey | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| constraints: workout_set_logs.workout_set_logs_workout_session_id_fkey | local-constraints.json | remote-constraints.json | Idêntica | Sem alteração | Preservar |
| indexes: audit_events.audit_events_entity_idx | local-indexes.json | remote-indexes.json | Idêntica | Sem alteração | Preservar |
| indexes: audit_events.audit_events_pkey | local-indexes.json | remote-indexes.json | Idêntica | Sem alteração | Preservar |
| indexes: body_metrics.body_metrics_pkey | local-indexes.json | remote-indexes.json | Idêntica | Sem alteração | Preservar |
| indexes: body_metrics.body_metrics_student_recorded_idx | local-indexes.json | remote-indexes.json | Idêntica | Sem alteração | Preservar |
| indexes: exercises.exercises_created_by_idx | local-indexes.json | remote-indexes.json | Idêntica | Sem alteração | Preservar |
| indexes: exercises.exercises_normalized_name_idx | local-indexes.json | Ausente | Ausente no remoto | Integridade de sessão aberta / pesquisa de exercícios | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| indexes: exercises.exercises_pkey | local-indexes.json | remote-indexes.json | Idêntica | Sem alteração | Preservar |
| indexes: profiles.profiles_email_key | local-indexes.json | remote-indexes.json | Idêntica | Sem alteração | Preservar |
| indexes: profiles.profiles_pkey | local-indexes.json | remote-indexes.json | Idêntica | Sem alteração | Preservar |
| indexes: student_instructors.student_instructors_instructor_active_idx | local-indexes.json | remote-indexes.json | Idêntica | Sem alteração | Preservar |
| indexes: student_instructors.student_instructors_pkey | local-indexes.json | remote-indexes.json | Idêntica | Sem alteração | Preservar |
| indexes: student_instructors.student_instructors_student_active_idx | local-indexes.json | remote-indexes.json | Idêntica | Sem alteração | Preservar |
| indexes: student_instructors.student_instructors_unique_pair | local-indexes.json | remote-indexes.json | Idêntica | Sem alteração | Preservar |
| indexes: workout_days.workout_days_pkey | local-indexes.json | remote-indexes.json | Idêntica | Sem alteração | Preservar |
| indexes: workout_days.workout_days_plan_idx | local-indexes.json | remote-indexes.json | Idêntica | Sem alteração | Preservar |
| indexes: workout_days.workout_days_unique_order | local-indexes.json | remote-indexes.json | Idêntica | Sem alteração | Preservar |
| indexes: workout_exercises.workout_exercises_day_idx | local-indexes.json | remote-indexes.json | Idêntica | Sem alteração | Preservar |
| indexes: workout_exercises.workout_exercises_pkey | local-indexes.json | remote-indexes.json | Idêntica | Sem alteração | Preservar |
| indexes: workout_exercises.workout_exercises_unique_order | local-indexes.json | remote-indexes.json | Idêntica | Sem alteração | Preservar |
| indexes: workout_plans.workout_plans_instructor_idx | local-indexes.json | remote-indexes.json | Idêntica | Sem alteração | Preservar |
| indexes: workout_plans.workout_plans_one_active_per_student | local-indexes.json | remote-indexes.json | Idêntica | Sem alteração | Preservar |
| indexes: workout_plans.workout_plans_pkey | local-indexes.json | remote-indexes.json | Idêntica | Sem alteração | Preservar |
| indexes: workout_plans.workout_plans_student_status_idx | local-indexes.json | remote-indexes.json | Idêntica | Sem alteração | Preservar |
| indexes: workout_sessions.workout_sessions_one_open_per_student | local-indexes.json | Ausente | Ausente no remoto | Integridade de sessão aberta / pesquisa de exercícios | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| indexes: workout_sessions.workout_sessions_pkey | local-indexes.json | remote-indexes.json | Idêntica | Sem alteração | Preservar |
| indexes: workout_sessions.workout_sessions_plan_day_idx | local-indexes.json | remote-indexes.json | Idêntica | Sem alteração | Preservar |
| indexes: workout_sessions.workout_sessions_student_started_idx | local-indexes.json | remote-indexes.json | Idêntica | Sem alteração | Preservar |
| indexes: workout_set_logs.workout_set_logs_pkey | local-indexes.json | remote-indexes.json | Idêntica | Sem alteração | Preservar |
| indexes: workout_set_logs.workout_set_logs_session_idx | local-indexes.json | remote-indexes.json | Idêntica | Sem alteração | Preservar |
| indexes: workout_set_logs.workout_set_logs_unique_set | local-indexes.json | remote-indexes.json | Idêntica | Sem alteração | Preservar |
| triggers: auth.users.on_auth_user_created | local-triggers.json | remote-triggers.json | Idêntica | Sem alteração | Preservar |
| triggers: public.body_metrics.body_metrics_validate | local-triggers.json | remote-triggers.json | Idêntica | Sem alteração | Preservar |
| triggers: public.exercises.exercises_audit | local-triggers.json | Ausente | Ausente no remoto | Preservação de vínculos, exercícios e auditoria | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| triggers: public.exercises.exercises_prevent_delete | local-triggers.json | Ausente | Ausente no remoto | Preservação de vínculos, exercícios e auditoria | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| triggers: public.exercises.exercises_protect_prescribed | local-triggers.json | Ausente | Ausente no remoto | Preservação de vínculos, exercícios e auditoria | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| triggers: public.exercises.exercises_set_updated_at | local-triggers.json | remote-triggers.json | Idêntica | Sem alteração | Preservar |
| triggers: public.profiles.profiles_audit | local-triggers.json | remote-triggers.json | Idêntica | Sem alteração | Preservar |
| triggers: public.profiles.profiles_protect_sensitive_fields | local-triggers.json | remote-triggers.json | Idêntica | Sem alteração | Preservar |
| triggers: public.profiles.profiles_set_updated_at | local-triggers.json | remote-triggers.json | Idêntica | Sem alteração | Preservar |
| triggers: public.student_instructors.student_instructors_audit | local-triggers.json | remote-triggers.json | Idêntica | Sem alteração | Preservar |
| triggers: public.student_instructors.student_instructors_protect_active_plan | local-triggers.json | Ausente | Ausente no remoto | Preservação de vínculos, exercícios e auditoria | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| triggers: public.student_instructors.student_instructors_validate | local-triggers.json | remote-triggers.json | Idêntica | Sem alteração | Preservar |
| triggers: public.workout_days.workout_days_set_updated_at | local-triggers.json | remote-triggers.json | Idêntica | Sem alteração | Preservar |
| triggers: public.workout_exercises.workout_exercises_set_updated_at | local-triggers.json | remote-triggers.json | Idêntica | Sem alteração | Preservar |
| triggers: public.workout_plans.workout_plans_audit | local-triggers.json | remote-triggers.json | Idêntica | Sem alteração | Preservar |
| triggers: public.workout_plans.workout_plans_protect_ownership | local-triggers.json | remote-triggers.json | Idêntica | Sem alteração | Preservar |
| triggers: public.workout_plans.workout_plans_set_updated_at | local-triggers.json | remote-triggers.json | Idêntica | Sem alteração | Preservar |
| triggers: public.workout_plans.workout_plans_validate | local-triggers.json | remote-triggers.json | Idêntica | Sem alteração | Preservar |
| triggers: public.workout_sessions.workout_sessions_protect_terminal | local-triggers.json | remote-triggers.json | Idêntica | Sem alteração | Preservar |
| triggers: public.workout_sessions.workout_sessions_validate | local-triggers.json | remote-triggers.json | Idêntica | Sem alteração | Preservar |
| triggers: public.workout_set_logs.workout_set_logs_validate | local-triggers.json | remote-triggers.json | Idêntica | Sem alteração | Preservar |
| functions: nac_private.bootstrap_first_admin.target_profile_id uuid, expected_email text, operator_reference text, confirmation_phrase text | local-functions.json | Ausente | Ausente no remoto | Regras de autorização, fluxo e indicadores | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| functions: public.activate_instructor_workout_plan.target_plan_id uuid | local-functions.json | Ausente | Ausente no remoto | Regras de autorização, fluxo e indicadores | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| functions: public.admin_assign_role.target_profile_id uuid, target_role app_role | local-functions.json | remote-functions.json | definition | Regras de autorização, fluxo e indicadores | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| functions: public.admin_completed_weekly. | local-functions.json | Ausente | Ausente no remoto | Regras de autorização, fluxo e indicadores | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| functions: public.admin_dashboard_counts.since_at timestamp with time zone | local-functions.json | Ausente | Ausente no remoto | Regras de autorização, fluxo e indicadores | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| functions: public.admin_exercise_duplicate_counts.target_ids uuid[] | local-functions.json | Ausente | Ausente no remoto | Regras de autorização, fluxo e indicadores | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| functions: public.admin_instructor_link_counts.target_ids uuid[] | local-functions.json | Ausente | Ausente no remoto | Regras de autorização, fluxo e indicadores | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| functions: public.admin_set_instructor_link.target_student_id uuid, target_instructor_id uuid, target_active boolean | local-functions.json | Ausente | Ausente no remoto | Regras de autorização, fluxo e indicadores | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| functions: public.admin_set_profile_status.target_profile_id uuid, target_status profile_status | local-functions.json | remote-functions.json | definition | Regras de autorização, fluxo e indicadores | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| functions: public.audit_exercise_change. | local-functions.json | Ausente | Ausente no remoto | Regras de autorização, fluxo e indicadores | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| functions: public.audit_profile_change. | local-functions.json | remote-functions.json | Idêntica | Sem alteração | Preservar |
| functions: public.audit_student_instructor_change. | local-functions.json | remote-functions.json | Idêntica | Sem alteração | Preservar |
| functions: public.audit_workout_plan_status_change. | local-functions.json | remote-functions.json | Idêntica | Sem alteração | Preservar |
| functions: public.can_edit_draft_workout_plan.target_plan_id uuid | local-functions.json | remote-functions.json | Idêntica | Sem alteração | Preservar |
| functions: public.can_manage_workout_plan.target_plan_id uuid | local-functions.json | remote-functions.json | Idêntica | Sem alteração | Preservar |
| functions: public.can_view_workout_plan.target_plan_id uuid | local-functions.json | remote-functions.json | definition | Regras de autorização, fluxo e indicadores | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| functions: public.current_app_role. | local-functions.json | remote-functions.json | Idêntica | Sem alteração | Preservar |
| functions: public.handle_new_user. | local-functions.json | remote-functions.json | Idêntica | Sem alteração | Preservar |
| functions: public.is_active_instructor_for.target_student_id uuid | local-functions.json | remote-functions.json | Idêntica | Sem alteração | Preservar |
| functions: public.is_admin. | local-functions.json | remote-functions.json | Idêntica | Sem alteração | Preservar |
| functions: public.move_draft_workout_day.target_day_id uuid, direction integer | local-functions.json | Ausente | Ausente no remoto | Regras de autorização, fluxo e indicadores | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| functions: public.move_draft_workout_exercise.target_prescription_id uuid, direction integer | local-functions.json | Ausente | Ausente no remoto | Regras de autorização, fluxo e indicadores | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| functions: public.owns_open_workout_session.target_session_id uuid | local-functions.json | remote-functions.json | definition | Regras de autorização, fluxo e indicadores | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| functions: public.prevent_exercise_delete. | local-functions.json | Ausente | Ausente no remoto | Regras de autorização, fluxo e indicadores | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| functions: public.protect_link_with_active_plan. | local-functions.json | Ausente | Ausente no remoto | Regras de autorização, fluxo e indicadores | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| functions: public.protect_prescribed_exercise. | local-functions.json | Ausente | Ausente no remoto | Regras de autorização, fluxo e indicadores | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| functions: public.protect_profile_sensitive_fields. | local-functions.json | remote-functions.json | Idêntica | Sem alteração | Preservar |
| functions: public.protect_terminal_workout_session. | local-functions.json | remote-functions.json | Idêntica | Sem alteração | Preservar |
| functions: public.protect_workout_plan_ownership. | local-functions.json | remote-functions.json | definition | Regras de autorização, fluxo e indicadores | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| functions: public.remove_draft_workout_day.target_day_id uuid | local-functions.json | Ausente | Ausente no remoto | Regras de autorização, fluxo e indicadores | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| functions: public.set_updated_at. | local-functions.json | remote-functions.json | Idêntica | Sem alteração | Preservar |
| functions: public.student_has_session_for_plan.target_plan_id uuid | local-functions.json | Ausente | Ausente no remoto | Regras de autorização, fluxo e indicadores | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| functions: public.validate_body_metric_owner. | local-functions.json | remote-functions.json | Idêntica | Sem alteração | Preservar |
| functions: public.validate_student_instructor. | local-functions.json | remote-functions.json | Idêntica | Sem alteração | Preservar |
| functions: public.validate_workout_plan. | local-functions.json | remote-functions.json | Idêntica | Sem alteração | Preservar |
| functions: public.validate_workout_session. | local-functions.json | remote-functions.json | definition | Regras de autorização, fluxo e indicadores | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| functions: public.validate_workout_set_log. | local-functions.json | remote-functions.json | Idêntica | Sem alteração | Preservar |
| functions: public.write_audit_event.a_action text, a_entity_type text, a_entity_id uuid | local-functions.json | remote-functions.json | Idêntica | Sem alteração | Preservar |
| policies: audit_events.audit_events_admin_select | local-policies.json | remote-policies.json | Idêntica | Sem alteração | Preservar |
| policies: body_metrics.body_metrics_select_limited | local-policies.json | remote-policies.json | qual | Isolamento por papel, vínculo e status ativo | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| policies: body_metrics.body_metrics_student_insert | local-policies.json | remote-policies.json | with_check | Isolamento por papel, vínculo e status ativo | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| policies: body_metrics.body_metrics_student_update | local-policies.json | remote-policies.json | qual, with_check | Isolamento por papel, vínculo e status ativo | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| policies: exercises.exercises_instructor_insert | local-policies.json | remote-policies.json | Idêntica | Sem alteração | Preservar |
| policies: exercises.exercises_owner_delete | local-policies.json | remote-policies.json | Idêntica | Sem alteração | Preservar |
| policies: exercises.exercises_owner_update | local-policies.json | remote-policies.json | Idêntica | Sem alteração | Preservar |
| policies: exercises.exercises_select_authorized | local-policies.json | remote-policies.json | qual | Isolamento por papel, vínculo e status ativo | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| policies: profiles.profiles_select_authorized | local-policies.json | remote-policies.json | Idêntica | Sem alteração | Preservar |
| policies: profiles.profiles_update_self_basic_fields | local-policies.json | remote-policies.json | qual, with_check | Isolamento por papel, vínculo e status ativo | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| policies: student_instructors.student_instructors_admin_delete | local-policies.json | remote-policies.json | Idêntica | Sem alteração | Preservar |
| policies: student_instructors.student_instructors_admin_insert | local-policies.json | remote-policies.json | Idêntica | Sem alteração | Preservar |
| policies: student_instructors.student_instructors_admin_update | local-policies.json | remote-policies.json | Idêntica | Sem alteração | Preservar |
| policies: student_instructors.student_instructors_select_authorized | local-policies.json | remote-policies.json | qual | Isolamento por papel, vínculo e status ativo | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| policies: workout_days.workout_days_draft_delete | local-policies.json | Ausente | Ausente no remoto | Isolamento por papel, vínculo e status ativo | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| policies: workout_days.workout_days_draft_update | local-policies.json | remote-policies.json | Idêntica | Sem alteração | Preservar |
| policies: workout_days.workout_days_draft_write | local-policies.json | remote-policies.json | Idêntica | Sem alteração | Preservar |
| policies: workout_days.workout_days_select_authorized | local-policies.json | remote-policies.json | Idêntica | Sem alteração | Preservar |
| policies: workout_exercises.workout_exercises_draft_delete | local-policies.json | Ausente | Ausente no remoto | Isolamento por papel, vínculo e status ativo | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| policies: workout_exercises.workout_exercises_draft_insert | local-policies.json | remote-policies.json | Idêntica | Sem alteração | Preservar |
| policies: workout_exercises.workout_exercises_draft_update | local-policies.json | remote-policies.json | Idêntica | Sem alteração | Preservar |
| policies: workout_exercises.workout_exercises_select_authorized | local-policies.json | remote-policies.json | Idêntica | Sem alteração | Preservar |
| policies: workout_plans.workout_plans_instructor_insert | local-policies.json | remote-policies.json | Idêntica | Sem alteração | Preservar |
| policies: workout_plans.workout_plans_instructor_update | local-policies.json | remote-policies.json | Idêntica | Sem alteração | Preservar |
| policies: workout_plans.workout_plans_select_authorized | local-policies.json | remote-policies.json | qual | Isolamento por papel, vínculo e status ativo | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| policies: workout_sessions.workout_sessions_select_authorized | local-policies.json | remote-policies.json | qual | Isolamento por papel, vínculo e status ativo | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| policies: workout_sessions.workout_sessions_student_insert | local-policies.json | remote-policies.json | with_check | Isolamento por papel, vínculo e status ativo | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| policies: workout_sessions.workout_sessions_student_update | local-policies.json | remote-policies.json | qual, with_check | Isolamento por papel, vínculo e status ativo | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| policies: workout_set_logs.workout_set_logs_select_authorized | local-policies.json | remote-policies.json | qual | Isolamento por papel, vínculo e status ativo | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| policies: workout_set_logs.workout_set_logs_student_insert | local-policies.json | remote-policies.json | Idêntica | Sem alteração | Preservar |
| policies: workout_set_logs.workout_set_logs_student_update | local-policies.json | remote-policies.json | Idêntica | Sem alteração | Preservar |
| table-grants: audit_events.authenticated | local-table-grants.json | remote-table-grants.json | Idêntica | Sem alteração | Preservar |
| table-grants: audit_events.service_role | local-table-grants.json | remote-table-grants.json | Idêntica | Sem alteração | Preservar |
| table-grants: body_metrics.authenticated | local-table-grants.json | remote-table-grants.json | Idêntica | Sem alteração | Preservar |
| table-grants: body_metrics.service_role | local-table-grants.json | remote-table-grants.json | Idêntica | Sem alteração | Preservar |
| table-grants: exercises.authenticated | local-table-grants.json | remote-table-grants.json | Idêntica | Sem alteração | Preservar |
| table-grants: exercises.service_role | local-table-grants.json | remote-table-grants.json | Idêntica | Sem alteração | Preservar |
| table-grants: profiles.authenticated | local-table-grants.json | remote-table-grants.json | Idêntica | Sem alteração | Preservar |
| table-grants: profiles.service_role | local-table-grants.json | remote-table-grants.json | Idêntica | Sem alteração | Preservar |
| table-grants: student_instructors.authenticated | local-table-grants.json | remote-table-grants.json | Idêntica | Sem alteração | Preservar |
| table-grants: student_instructors.service_role | local-table-grants.json | remote-table-grants.json | Idêntica | Sem alteração | Preservar |
| table-grants: workout_days.authenticated | local-table-grants.json | remote-table-grants.json | privileges | Operações em rascunhos sujeitas a RLS | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| table-grants: workout_days.service_role | local-table-grants.json | remote-table-grants.json | Idêntica | Sem alteração | Preservar |
| table-grants: workout_exercises.authenticated | local-table-grants.json | remote-table-grants.json | privileges | Operações em rascunhos sujeitas a RLS | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| table-grants: workout_exercises.service_role | local-table-grants.json | remote-table-grants.json | Idêntica | Sem alteração | Preservar |
| table-grants: workout_plans.authenticated | local-table-grants.json | remote-table-grants.json | Idêntica | Sem alteração | Preservar |
| table-grants: workout_plans.service_role | local-table-grants.json | remote-table-grants.json | Idêntica | Sem alteração | Preservar |
| table-grants: workout_sessions.authenticated | local-table-grants.json | remote-table-grants.json | Idêntica | Sem alteração | Preservar |
| table-grants: workout_sessions.service_role | local-table-grants.json | remote-table-grants.json | Idêntica | Sem alteração | Preservar |
| table-grants: workout_set_logs.authenticated | local-table-grants.json | remote-table-grants.json | Idêntica | Sem alteração | Preservar |
| table-grants: workout_set_logs.service_role | local-table-grants.json | remote-table-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: nac_private.bootstrap_first_admin.target_profile_id uuid, expected_email text, operator_reference text, confirmation_phrase text.anon | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: nac_private.bootstrap_first_admin.target_profile_id uuid, expected_email text, operator_reference text, confirmation_phrase text.authenticated | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: nac_private.bootstrap_first_admin.target_profile_id uuid, expected_email text, operator_reference text, confirmation_phrase text.service_role | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.activate_instructor_workout_plan.target_plan_id uuid.anon | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.activate_instructor_workout_plan.target_plan_id uuid.authenticated | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.activate_instructor_workout_plan.target_plan_id uuid.service_role | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.admin_assign_role.target_profile_id uuid, target_role app_role.anon | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.admin_assign_role.target_profile_id uuid, target_role app_role.authenticated | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.admin_assign_role.target_profile_id uuid, target_role app_role.service_role | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.admin_completed_weekly..anon | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.admin_completed_weekly..authenticated | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.admin_completed_weekly..service_role | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.admin_dashboard_counts.since_at timestamp with time zone.anon | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.admin_dashboard_counts.since_at timestamp with time zone.authenticated | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.admin_dashboard_counts.since_at timestamp with time zone.service_role | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.admin_exercise_duplicate_counts.target_ids uuid[].anon | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.admin_exercise_duplicate_counts.target_ids uuid[].authenticated | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.admin_exercise_duplicate_counts.target_ids uuid[].service_role | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.admin_instructor_link_counts.target_ids uuid[].anon | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.admin_instructor_link_counts.target_ids uuid[].authenticated | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.admin_instructor_link_counts.target_ids uuid[].service_role | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.admin_set_instructor_link.target_student_id uuid, target_instructor_id uuid, target_active boolean.anon | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.admin_set_instructor_link.target_student_id uuid, target_instructor_id uuid, target_active boolean.authenticated | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.admin_set_instructor_link.target_student_id uuid, target_instructor_id uuid, target_active boolean.service_role | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.admin_set_profile_status.target_profile_id uuid, target_status profile_status.anon | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.admin_set_profile_status.target_profile_id uuid, target_status profile_status.authenticated | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.admin_set_profile_status.target_profile_id uuid, target_status profile_status.service_role | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.audit_exercise_change..anon | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.audit_exercise_change..authenticated | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.audit_exercise_change..service_role | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.audit_profile_change..anon | local-function-grants.json | remote-function-grants.json | can_execute | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.audit_profile_change..authenticated | local-function-grants.json | remote-function-grants.json | can_execute | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.audit_profile_change..service_role | local-function-grants.json | remote-function-grants.json | can_execute | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.audit_student_instructor_change..anon | local-function-grants.json | remote-function-grants.json | can_execute | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.audit_student_instructor_change..authenticated | local-function-grants.json | remote-function-grants.json | can_execute | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.audit_student_instructor_change..service_role | local-function-grants.json | remote-function-grants.json | can_execute | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.audit_workout_plan_status_change..anon | local-function-grants.json | remote-function-grants.json | can_execute | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.audit_workout_plan_status_change..authenticated | local-function-grants.json | remote-function-grants.json | can_execute | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.audit_workout_plan_status_change..service_role | local-function-grants.json | remote-function-grants.json | can_execute | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.can_edit_draft_workout_plan.target_plan_id uuid.anon | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.can_edit_draft_workout_plan.target_plan_id uuid.authenticated | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.can_edit_draft_workout_plan.target_plan_id uuid.service_role | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.can_manage_workout_plan.target_plan_id uuid.anon | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.can_manage_workout_plan.target_plan_id uuid.authenticated | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.can_manage_workout_plan.target_plan_id uuid.service_role | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.can_view_workout_plan.target_plan_id uuid.anon | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.can_view_workout_plan.target_plan_id uuid.authenticated | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.can_view_workout_plan.target_plan_id uuid.service_role | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.current_app_role..anon | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.current_app_role..authenticated | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.current_app_role..service_role | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.handle_new_user..anon | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.handle_new_user..authenticated | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.handle_new_user..service_role | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.is_active_instructor_for.target_student_id uuid.anon | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.is_active_instructor_for.target_student_id uuid.authenticated | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.is_active_instructor_for.target_student_id uuid.service_role | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.is_admin..anon | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.is_admin..authenticated | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.is_admin..service_role | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.move_draft_workout_day.target_day_id uuid, direction integer.anon | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.move_draft_workout_day.target_day_id uuid, direction integer.authenticated | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.move_draft_workout_day.target_day_id uuid, direction integer.service_role | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.move_draft_workout_exercise.target_prescription_id uuid, direction integer.anon | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.move_draft_workout_exercise.target_prescription_id uuid, direction integer.authenticated | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.move_draft_workout_exercise.target_prescription_id uuid, direction integer.service_role | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.owns_open_workout_session.target_session_id uuid.anon | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.owns_open_workout_session.target_session_id uuid.authenticated | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.owns_open_workout_session.target_session_id uuid.service_role | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.prevent_exercise_delete..anon | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.prevent_exercise_delete..authenticated | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.prevent_exercise_delete..service_role | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.protect_link_with_active_plan..anon | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.protect_link_with_active_plan..authenticated | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.protect_link_with_active_plan..service_role | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.protect_prescribed_exercise..anon | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.protect_prescribed_exercise..authenticated | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.protect_prescribed_exercise..service_role | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.protect_profile_sensitive_fields..anon | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.protect_profile_sensitive_fields..authenticated | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.protect_profile_sensitive_fields..service_role | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.protect_terminal_workout_session..anon | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.protect_terminal_workout_session..authenticated | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.protect_terminal_workout_session..service_role | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.protect_workout_plan_ownership..anon | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.protect_workout_plan_ownership..authenticated | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.protect_workout_plan_ownership..service_role | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.remove_draft_workout_day.target_day_id uuid.anon | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.remove_draft_workout_day.target_day_id uuid.authenticated | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.remove_draft_workout_day.target_day_id uuid.service_role | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.set_updated_at..anon | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.set_updated_at..authenticated | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.set_updated_at..service_role | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.student_has_session_for_plan.target_plan_id uuid.anon | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.student_has_session_for_plan.target_plan_id uuid.authenticated | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.student_has_session_for_plan.target_plan_id uuid.service_role | local-function-grants.json | Ausente | Ausente no remoto | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.validate_body_metric_owner..anon | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.validate_body_metric_owner..authenticated | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.validate_body_metric_owner..service_role | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.validate_student_instructor..anon | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.validate_student_instructor..authenticated | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.validate_student_instructor..service_role | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.validate_workout_plan..anon | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.validate_workout_plan..authenticated | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.validate_workout_plan..service_role | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.validate_workout_session..anon | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.validate_workout_session..authenticated | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.validate_workout_session..service_role | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.validate_workout_set_log..anon | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.validate_workout_set_log..authenticated | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.validate_workout_set_log..service_role | local-function-grants.json | remote-function-grants.json | Idêntica | Sem alteração | Preservar |
| function-grants: public.write_audit_event.a_action text, a_entity_type text, a_entity_id uuid.anon | local-function-grants.json | remote-function-grants.json | can_execute | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.write_audit_event.a_action text, a_entity_type text, a_entity_id uuid.authenticated | local-function-grants.json | remote-function-grants.json | can_execute | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| function-grants: public.write_audit_event.a_action text, a_entity_type text, a_entity_id uuid.service_role | local-function-grants.json | remote-function-grants.json | can_execute | Privilégio de execução das funções | Aplicar trecho incremental revisado; validar catálogo e pgTAP |
| tables: public.audit_events | local-tables.json | remote-tables.json | Idêntica | Sem alteração | Preservar |
| tables: public.body_metrics | local-tables.json | remote-tables.json | Idêntica | Sem alteração | Preservar |
| tables: public.exercises | local-tables.json | remote-tables.json | Idêntica | Sem alteração | Preservar |
| tables: public.profiles | local-tables.json | remote-tables.json | Idêntica | Sem alteração | Preservar |
| tables: public.student_instructors | local-tables.json | remote-tables.json | Idêntica | Sem alteração | Preservar |
| tables: public.workout_days | local-tables.json | remote-tables.json | Idêntica | Sem alteração | Preservar |
| tables: public.workout_exercises | local-tables.json | remote-tables.json | Idêntica | Sem alteração | Preservar |
| tables: public.workout_plans | local-tables.json | remote-tables.json | Idêntica | Sem alteração | Preservar |
| tables: public.workout_sessions | local-tables.json | remote-tables.json | Idêntica | Sem alteração | Preservar |
| tables: public.workout_set_logs | local-tables.json | remote-tables.json | Idêntica | Sem alteração | Preservar |
| enums: public.app_role.student | local-enums.json | remote-enums.json | Idêntica | Sem alteração | Preservar |
| enums: public.app_role.instructor | local-enums.json | remote-enums.json | Idêntica | Sem alteração | Preservar |
| enums: public.app_role.admin | local-enums.json | remote-enums.json | Idêntica | Sem alteração | Preservar |
| enums: public.exercise_visibility.academy | local-enums.json | remote-enums.json | Idêntica | Sem alteração | Preservar |
| enums: public.exercise_visibility.instructor_only | local-enums.json | remote-enums.json | Idêntica | Sem alteração | Preservar |
| enums: public.profile_status.active | local-enums.json | remote-enums.json | Idêntica | Sem alteração | Preservar |
| enums: public.profile_status.inactive | local-enums.json | remote-enums.json | Idêntica | Sem alteração | Preservar |
| enums: public.workout_plan_status.draft | local-enums.json | remote-enums.json | Idêntica | Sem alteração | Preservar |
| enums: public.workout_plan_status.active | local-enums.json | remote-enums.json | Idêntica | Sem alteração | Preservar |
| enums: public.workout_plan_status.archived | local-enums.json | remote-enums.json | Idêntica | Sem alteração | Preservar |
| enums: public.workout_session_status.in_progress | local-enums.json | remote-enums.json | Idêntica | Sem alteração | Preservar |
| enums: public.workout_session_status.completed | local-enums.json | remote-enums.json | Idêntica | Sem alteração | Preservar |
| enums: public.workout_session_status.cancelled | local-enums.json | remote-enums.json | Idêntica | Sem alteração | Preservar |
