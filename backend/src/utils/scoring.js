const pool = require('../db/pool');

// Weights for the daily score formula — tune as needed.
const COMPLETION_WEIGHT = 0.7;
const ON_TIME_WEIGHT = 0.3;

// Recalculates daily_progress for a given user + date, based on
// tasks whose scheduled_date / completed_date match that date.
// IMPORTANT: a task counts toward the day it was COMPLETED, not
// the day it was originally scheduled (per project spec).
async function recalculateDailyProgress(userId, dateStr) {
  const scheduledRes = await pool.query(
    `SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND scheduled_date = $2`,
    [userId, dateStr]
  );
  const tasksScheduled = parseInt(scheduledRes.rows[0].count, 10);

  const completedRes = await pool.query(
    `SELECT scheduled_time, completed_time FROM tasks
     WHERE user_id = $1 AND completed_date = $2 AND is_done = TRUE`,
    [userId, dateStr]
  );
  const tasksCompleted = completedRes.rows.length;
  const tasksOnTime = completedRes.rows.filter(
    (t) => t.completed_time && t.scheduled_time && t.completed_time <= t.scheduled_time
  ).length;

  const completionRate = tasksScheduled > 0 ? (tasksCompleted / tasksScheduled) * 100 : 0;
  const onTimeRate = tasksCompleted > 0 ? (tasksOnTime / tasksCompleted) * 100 : 0;
  const dailyScore = completionRate * COMPLETION_WEIGHT + onTimeRate * ON_TIME_WEIGHT;

  await pool.query(
    `INSERT INTO daily_progress
       (user_id, progress_date, tasks_scheduled, tasks_completed, tasks_completed_on_time,
        completion_rate, on_time_rate, daily_score)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id, progress_date) DO UPDATE SET
       tasks_scheduled = EXCLUDED.tasks_scheduled,
       tasks_completed = EXCLUDED.tasks_completed,
       tasks_completed_on_time = EXCLUDED.tasks_completed_on_time,
       completion_rate = EXCLUDED.completion_rate,
       on_time_rate = EXCLUDED.on_time_rate,
       daily_score = EXCLUDED.daily_score`,
    [userId, dateStr, tasksScheduled, tasksCompleted, tasksOnTime, completionRate, onTimeRate, dailyScore]
  );

  await updateOverallProgress(userId);

  return { tasksScheduled, tasksCompleted, tasksOnTime, completionRate, onTimeRate, dailyScore };
}

// Incrementally folds the latest daily_score into the user's lifetime
// overall_progress_score, without recalculating from full history each time.
// Recomputed as a straight average over all daily_progress rows for accuracy
// (cheap enough at this scale; switch to a true incremental formula if the
// history grows very large).
async function updateOverallProgress(userId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS days, COALESCE(AVG(daily_score), 0) AS avg_score,
            COALESCE(SUM(tasks_completed), 0) AS total_completed,
            COALESCE(SUM(tasks_scheduled), 0) AS total_scheduled
     FROM daily_progress WHERE user_id = $1`,
    [userId]
  );
  const { days, avg_score, total_completed, total_scheduled } = rows[0];

  await pool.query(
    `UPDATE users SET
       overall_progress_score = $2,
       total_days_tracked = $3,
       total_tasks_completed = $4,
       total_tasks_scheduled = $5,
       updated_at = NOW()
     WHERE id = $1`,
    [userId, avg_score, days, total_completed, total_scheduled]
  );
}

module.exports = { recalculateDailyProgress, updateOverallProgress };
