import type { PoolClient } from 'pg';
import { query as dbQuery } from '../config/database';

export type ScreeningOptionInput = {
  id?: string | null;
  option_text: string;
  is_correct?: boolean;
};

export type ScreeningQuestionInput = {
  id?: string | null;
  question_text: string;
  options: ScreeningOptionInput[];
};

export type ScreeningOptionPublic = {
  id: string;
  option_text: string;
  sort_order: number;
};

export type ScreeningOptionAdmin = ScreeningOptionPublic & {
  is_correct: boolean;
};

export type ScreeningQuestionPublic = {
  id: string;
  question_text: string;
  sort_order: number;
  options: ScreeningOptionPublic[];
};

export type ScreeningQuestionAdmin = {
  id: string;
  question_text: string;
  sort_order: number;
  options: ScreeningOptionAdmin[];
};

/**
 * Validate the shape of screening questions coming in from API payloads.
 * Throws with a plain-English message on the first problem.
 */
export function validateScreeningQuestions(raw: unknown): ScreeningQuestionInput[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    throw new Error('screening_questions must be an array');
  }
  const questions: ScreeningQuestionInput[] = [];
  raw.forEach((entry, qIdx) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`screening_questions[${qIdx}] must be an object`);
    }
    const obj = entry as Record<string, unknown>;
    const text = String(obj.question_text ?? '').trim();
    if (!text) {
      throw new Error(`screening_questions[${qIdx}].question_text is required`);
    }
    const rawOptions = obj.options;
    if (!Array.isArray(rawOptions) || rawOptions.length < 2) {
      throw new Error(`Question "${text}" must have at least 2 options`);
    }
    let correctCount = 0;
    const options: ScreeningOptionInput[] = rawOptions.map((opt, oIdx) => {
      if (!opt || typeof opt !== 'object') {
        throw new Error(`Question "${text}" option ${oIdx + 1} must be an object`);
      }
      const optObj = opt as Record<string, unknown>;
      const optText = String(optObj.option_text ?? '').trim();
      if (!optText) {
        throw new Error(`Question "${text}" option ${oIdx + 1} must have option_text`);
      }
      const isCorrect = Boolean(optObj.is_correct);
      if (isCorrect) correctCount += 1;
      return { option_text: optText, is_correct: isCorrect };
    });
    if (correctCount !== 1) {
      throw new Error(`Question "${text}" must have exactly one correct option`);
    }
    questions.push({ question_text: text, options });
  });
  return questions;
}

/**
 * Replace the set of screening questions for a job.
 * Deletes all existing questions (cascade removes options + past answers snapshot
 * is NOT deleted because answers keep their own is_correct flag).
 */
export async function replaceScreeningQuestions(
  client: PoolClient,
  jobId: string,
  questions: ScreeningQuestionInput[],
): Promise<void> {
  await client.query('DELETE FROM job_screening_questions WHERE job_id = $1', [jobId]);
  for (let qIdx = 0; qIdx < questions.length; qIdx += 1) {
    const q = questions[qIdx];
    const qRes = await client.query(
      `INSERT INTO job_screening_questions (job_id, question_text, sort_order)
       VALUES ($1, $2, $3) RETURNING id`,
      [jobId, q.question_text, qIdx],
    );
    const questionId = qRes.rows[0].id as string;
    for (let oIdx = 0; oIdx < q.options.length; oIdx += 1) {
      const opt = q.options[oIdx];
      await client.query(
        `INSERT INTO job_screening_options (question_id, option_text, is_correct, sort_order)
         VALUES ($1, $2, $3, $4)`,
        [questionId, opt.option_text, Boolean(opt.is_correct), oIdx],
      );
    }
  }
}

/**
 * Load screening questions for a job. Includes is_correct flag — intended
 * for HR / admin consumers. Strip before returning to applicants.
 */
export async function loadScreeningQuestionsAdmin(jobId: string): Promise<ScreeningQuestionAdmin[]> {
  const qRes = await dbQuery(
    `SELECT id, question_text, sort_order
       FROM job_screening_questions
      WHERE job_id = $1
      ORDER BY sort_order ASC, created_at ASC`,
    [jobId],
  );
  if (qRes.rows.length === 0) return [];
  const questionIds = qRes.rows.map((r: any) => r.id);
  const optRes = await dbQuery(
    `SELECT id, question_id, option_text, is_correct, sort_order
       FROM job_screening_options
      WHERE question_id = ANY($1::uuid[])
      ORDER BY sort_order ASC, created_at ASC`,
    [questionIds],
  );
  const optionsByQ = new Map<string, ScreeningOptionAdmin[]>();
  for (const row of optRes.rows as any[]) {
    const arr = optionsByQ.get(row.question_id) ?? [];
    arr.push({
      id: row.id,
      option_text: row.option_text,
      is_correct: Boolean(row.is_correct),
      sort_order: row.sort_order,
    });
    optionsByQ.set(row.question_id, arr);
  }
  return qRes.rows.map((r: any) => ({
    id: r.id,
    question_text: r.question_text,
    sort_order: r.sort_order,
    options: optionsByQ.get(r.id) ?? [],
  }));
}

/** Applicant-safe view — omits `is_correct` from options. */
export async function loadScreeningQuestionsPublic(jobId: string): Promise<ScreeningQuestionPublic[]> {
  const full = await loadScreeningQuestionsAdmin(jobId);
  return full.map((q) => ({
    id: q.id,
    question_text: q.question_text,
    sort_order: q.sort_order,
    options: q.options.map(({ id, option_text, sort_order }) => ({ id, option_text, sort_order })),
  }));
}

export type ScoredAnswer = {
  question_id: string;
  selected_option_id: string | null;
  is_correct: boolean;
  question_text: string;
};

export type ScreeningScoreResult = {
  totalQuestions: number;
  correctCount: number;
  wrongQuestions: ScoredAnswer[];
  answers: ScoredAnswer[];
};

/**
 * Score an applicant's answers against the job's screening questions.
 * Returns per-answer scoring. Caller decides pass/fail policy.
 */
export async function scoreScreeningAnswers(
  client: PoolClient,
  jobId: string,
  rawAnswers: unknown,
): Promise<ScreeningScoreResult> {
  const questions = await loadScreeningQuestionsAdminTx(client, jobId);
  if (questions.length === 0) {
    return { totalQuestions: 0, correctCount: 0, wrongQuestions: [], answers: [] };
  }

  const answersArr = Array.isArray(rawAnswers) ? rawAnswers : [];
  const chosenByQ = new Map<string, string | null>();
  for (const entry of answersArr) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const qId = String(e.question_id ?? '').trim();
    const oId = String(e.selected_option_id ?? '').trim();
    if (!qId) continue;
    chosenByQ.set(qId, oId || null);
  }

  // Every job question must have an answer.
  for (const q of questions) {
    if (!chosenByQ.has(q.id)) {
      throw new Error(`You must answer all screening questions before applying.`);
    }
  }

  const answers: ScoredAnswer[] = [];
  const wrongQuestions: ScoredAnswer[] = [];
  let correctCount = 0;
  for (const q of questions) {
    const chosen = chosenByQ.get(q.id) ?? null;
    const chosenOpt = chosen ? q.options.find((o) => o.id === chosen) : null;
    const isCorrect = Boolean(chosenOpt?.is_correct);
    const scored: ScoredAnswer = {
      question_id: q.id,
      selected_option_id: chosenOpt ? chosenOpt.id : null,
      is_correct: isCorrect,
      question_text: q.question_text,
    };
    answers.push(scored);
    if (isCorrect) correctCount += 1;
    else wrongQuestions.push(scored);
  }

  return {
    totalQuestions: questions.length,
    correctCount,
    wrongQuestions,
    answers,
  };
}

async function loadScreeningQuestionsAdminTx(
  client: PoolClient,
  jobId: string,
): Promise<ScreeningQuestionAdmin[]> {
  const qRes = await client.query(
    `SELECT id, question_text, sort_order
       FROM job_screening_questions
      WHERE job_id = $1
      ORDER BY sort_order ASC, created_at ASC`,
    [jobId],
  );
  if (qRes.rows.length === 0) return [];
  const questionIds = qRes.rows.map((r: any) => r.id);
  const optRes = await client.query(
    `SELECT id, question_id, option_text, is_correct, sort_order
       FROM job_screening_options
      WHERE question_id = ANY($1::uuid[])
      ORDER BY sort_order ASC, created_at ASC`,
    [questionIds],
  );
  const optionsByQ = new Map<string, ScreeningOptionAdmin[]>();
  for (const row of optRes.rows as any[]) {
    const arr = optionsByQ.get(row.question_id) ?? [];
    arr.push({
      id: row.id,
      option_text: row.option_text,
      is_correct: Boolean(row.is_correct),
      sort_order: row.sort_order,
    });
    optionsByQ.set(row.question_id, arr);
  }
  return qRes.rows.map((r: any) => ({
    id: r.id,
    question_text: r.question_text,
    sort_order: r.sort_order,
    options: optionsByQ.get(r.id) ?? [],
  }));
}

/** Persist the applicant's answers alongside a submitted application. */
export async function persistScreeningAnswers(
  client: PoolClient,
  applicationId: string,
  scored: ScoredAnswer[],
): Promise<void> {
  for (const answer of scored) {
    await client.query(
      `INSERT INTO application_screening_answers (
         application_id, question_id, selected_option_id, is_correct
       ) VALUES ($1, $2, $3, $4)`,
      [applicationId, answer.question_id, answer.selected_option_id, answer.is_correct],
    );
  }
}
