import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';

// Called only by the existing localhost-only student integration suite.
export async function verifyVolume({ admin, student, ids }) {
  const check = result => { assert.ifError(result.error); return result.data; };
  const extraPrescription = randomUUID();
  const sessions = Array.from({ length: 205 }, (_, i) => ({ id: randomUUID(), student_id: ids.studentA,
    workout_plan_id: ids.plan, workout_day_id: ids.day, status: 'completed',
    started_at: new Date(Date.now() - (i + 1) * 86400000 - 3600000).toISOString(),
    finished_at: new Date(Date.now() - (i + 1) * 86400000).toISOString() }));
  const metrics = Array.from({ length: 120 }, (_, i) => ({ id: randomUUID(), student_id: ids.studentA,
    recorded_at: new Date(Date.now() - (i + 1) * 86400000).toISOString(), weight_kg: 70,
    notes: `volume-local-${i}` }));
  try {
    check(await admin.from('workout_exercises').insert({ id: extraPrescription, workout_day_id: ids.day,
      exercise_id: ids.exercise, display_order: 2, sets: 60, repetitions: 10 }));
    check(await admin.from('workout_sessions').insert(sessions));
    const logs = sessions.slice(0, 40).flatMap(session => Array.from({ length: 60 }, (_, i) => ({
      workout_session_id: session.id, workout_exercise_id: extraPrescription, set_number: i + 1,
      repetitions_completed: 10, load_used: 20, completed: true, completed_at: session.finished_at })));
    for (let i = 0; i < logs.length; i += 200) check(await admin.from('workout_set_logs').insert(logs.slice(i, i + 200)));
    check(await admin.from('body_metrics').insert(metrics));
    const secondPage = await student.request('/aluno/historico?pagina=2');
    assert.equal(secondPage.status, 200);
    const text = (await secondPage.text()).replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, '');
    assert.match(text, /206 registros/);
    assert.equal((text.match(/60 séries registradas/g) ?? []).length, 20, 'All 1200 logs on page 2 must be counted');
    const lastPage = await student.request('/aluno/historico?pagina=11');
    assert.match(await lastPage.text(), new RegExp(sessions.at(-1).id), 'Session older than the original 200-row cap is reachable');
    const filtered = await student.request('/aluno/historico?periodo=7');
    const filteredText = (await filtered.text()).replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, '');
    assert.match(filteredText, /7 registros/, 'Period is applied before pagination');
    const evolution = await student.request('/aluno/evolucao?pagina=7');
    assert.match(await evolution.text(), /volume-local-119/, 'Metrics older than the original 100-row cap remain reachable');
    const measurements = [];
    for (const path of ['/aluno', '/aluno/historico?pagina=2', '/aluno/evolucao']) {
      const timings = []; let bytes = 0;
      for (let attempt = 0; attempt < 11; attempt++) {
        const started = performance.now();
        const response = await student.request(path);
        assert.equal(response.status, 200);
        const body = await response.arrayBuffer();
        if (attempt > 0) timings.push(performance.now() - started);
        bytes = body.byteLength;
      }
      timings.sort((a, b) => a - b);
      measurements.push({ path, samples: 10, p50_ms: Number(timings[4].toFixed(2)), p95_ms: Number(timings[9].toFixed(2)), response_bytes: bytes });
    }
    writeFileSync('docs/evidence/master-local-performance.json', JSON.stringify({
      environment: 'localhost, production build, sequential requests, one warmup excluded; not remote or mobile latency',
      fixture: { sessions: 206, logs: 2402, metrics: 121 }, measurements,
    }, null, 2) + '\n');
    console.log('PASS volume: 206 sessions, 2400 logs, 121 metrics; old pages, full series counts and server-side period filter');
  } finally {
    // Delete only IDs owned by this fictional fixture; never broad table deletes.
    for (let i = 0; i < sessions.length; i += 40) {
      const batch = sessions.slice(i, i + 40).map(row => row.id);
      check(await admin.from('workout_set_logs').delete().in('workout_session_id', batch));
      check(await admin.from('workout_sessions').delete().in('id', batch));
    }
    for (let i = 0; i < metrics.length; i += 40) check(await admin.from('body_metrics').delete().in('id', metrics.slice(i, i + 40).map(row => row.id)));
    check(await admin.from('workout_exercises').delete().eq('id', extraPrescription));
  }
}
