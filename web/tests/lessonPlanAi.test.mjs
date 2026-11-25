import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeExtractedPlan,
  mergeExtractedIntoForm,
  matchIndicatorsFromCodes,
  formatThaiCountdown,
} from '../src/utils/lessonPlanAi.js';
import { GET } from '../api/parse-lesson-plan.js';

test('lessonPlanAi: sanitizes BE dates, computes minutes, and filters invalid option IDs', () => {
  const result = sanitizeExtractedPlan(
    {
      teach_subject_id: '1003',
      grade_level_id: '999',
      subject_type: '01',
      subject_code: ' ว23103 ',
      teach_date: '2569-09-04',
      teach_timestart: '8.30',
      teach_timeend: '10:10',
      competency: ['CO1', 'FAKE_ID'],
      ability21: ['C1'],
      desirable: ['D3'],
      indicator_codes: ['ว 4.1 ม.3/1'],
    },
    {
      teachSubject: [{ teach_subject_id: '1003', teach_subject: 'วิทยาศาสตร์ฯ' }],
      gradeLevel: [{ grade_level_id: '313', grade_level_name: 'ม.3' }],
      subjectTypes: [{ subjecttype_id: '01', subjecttype_name: 'พื้นฐาน' }],
      competency: [{ competency_id: 'CO1', competency_name: 'สื่อสาร' }],
      ability21: [{ ability21_id: 'C1', ability21_name_th: 'คิดวิเคราะห์' }],
      desirable: [{ desirable_id: 'D3', desirable_name: 'มีวินัย' }],
    }
  );

  assert.equal(result.teach_subject_id, '1003');
  assert.equal(result.grade_level_id, '');
  assert.equal(result.subject_code, 'ว23103');
  assert.equal(result.teach_date, '2026-09-04');
  assert.equal(result.teach_timestart, '08:30');
  assert.equal(result.teach_timeend, '10:10');
  assert.equal(result.teach_minute, '100');
  assert.deepEqual(result.competency, ['CO1']);
});

test('lessonPlanAi: merges emptyOnly without overwriting teacher input', () => {
  const { nextForm, filledLabels } = mergeExtractedIntoForm(
    { subject_code: 'ค21101', subject_name: '', competency: [] },
    { subject_code: 'ว23103', subject_name: 'คณิตศาสตร์', competency: ['CO1'] },
    'emptyOnly'
  );
  assert.equal(nextForm.subject_code, 'ค21101');
  assert.equal(nextForm.subject_name, 'คณิตศาสตร์');
  assert.deepEqual(nextForm.competency, ['CO1']);
  assert.ok(filledLabels.includes('ชื่อรายวิชา'));
});

test('lessonPlanAi: matches curriculum indicator codes regardless of spacing', () => {
  const matched = matchIndicatorsFromCodes(
    ['ว4.1ม.3/1', 'ว 4.1 ม.3/2'],
    [
      { indicators_name: 'ว 4.1 ม.3/1', indicator_id: '1' },
      { indicators_name: 'ว 4.1 ม.3/2', indicator_id: '2' },
    ]
  );
  assert.deepEqual(matched.mid, ['ว 4.1 ม.3/1']);
  assert.deepEqual(matched.final, ['ว 4.1 ม.3/2']);
});

test('lessonPlanAi: formats countdown in Thai and health-checks API GET handler', async () => {
  assert.equal(formatThaiCountdown(45), '45 วินาที');
  assert.equal(formatThaiCountdown(125), '2 นาที 05 วินาที');
  assert.equal(formatThaiCountdown(3665), '1 ชม. 01 นาที 05 วินาที');

  const res = GET();
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.service, 'parse-lesson-plan');
});

