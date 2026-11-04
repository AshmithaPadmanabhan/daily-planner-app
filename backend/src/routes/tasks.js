const express = require('express');
const pool = require('../db/pool');
const authenticate = require('../middleware/auth');
const checkLock = require('../middleware/checkLock');
const { findMatch, recordFlagAndMaybeLock } = require('../utils/contentFilter');
const { recalculateDailyProgress } = require('../utils/scoring');

const router = express.Router();

// POST /api/tasks — create a new task under a plan (auto-creates plan if missing)
router.post('/', authenticate, checkLock, async (req, res) => {
  const { activity, scheduled_date, scheduled_time } = req.body;
  if (!activity || !scheduled_date || !scheduled_time) {
    return res.status(400).json({ error: 'activity, scheduled_date, and scheduled_time are required' });
  }

  try {
    // --- Content safety check ---
    const match = await findMatch(activity);
    if (match) {
      const { locked, lockExpiresAt } = await recordFlagAndMaybeLock(req.user.id, activity, match.keyword);
      await pool.query(
        `INSERT INTO notifications (user_id, type, message) VALUES ($1, 'content_flagged', $2)`,
        [req.user.id, `A task you tried to add ("${activity.slice(0, 40)}...") could not be added as it may reference unlawful activity.`]
      );
      return res.status(422).json({
        error: 'This task could not be added as it may reference unlawful activity.',
        locked,
        lockExpiresAt,
      });
    }

    // Find or create the plan for that date
    let planRes = await pool.query(
      'SELECT * FROM plans WHERE user_id = $1 AND plan_date = $2',
      [req.user.id, scheduled_date]
    );
    let plan = planRes.rows[0];
    if (!plan) {
      const insertPlan = await pool.query(
        'INSERT INTO plans (user_id, plan_date, last_revised_at) VALUES ($1, $2, NOW()) RETURNING *',
        [req.user.id, scheduled_date]
      );
      plan = insertPlan.rows[0];
    } else {
      await pool.query('UPDATE plans SET last_revised_at = NOW() WHERE id = $1', [plan.id]);
    }

    const taskRes = await pool.query(
      `INSERT INTO tasks (plan_id, user_id, activity, scheduled_date, scheduled_time, original_scheduled_date)
       VALUES ($1, $2, $3, $4, $5, $4) RETURNING *`,
      [plan.id, req.user.id, activity, scheduled_date, scheduled_time]
    );

    await recalculateDailyProgress(req.user.id, scheduled_date);

    res.status(201).json(taskRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error creating task' });
  }
});

// PUT /api/tasks/:id — edit a task (activity, scheduled_date, scheduled_time)
router.put('/:id', authenticate, checkLock, async (req, res) => {
  const { id } = req.params;
  const { activity, scheduled_date, scheduled_time } = req.body;

  try {
    if (activity) {
      const match = await findMatch(activity);
      if (match) {
        const { locked, lockExpiresAt } = await recordFlagAndMaybeLock(req.user.id, activity, match.keyword);
        return res.status(422).json({
          error: 'This edit could not be saved as it may reference unlawful activity.',
          locked,
          lockExpiresAt,
        });
      }
    }

    const { rows } = await pool.query(
      `UPDATE tasks SET
         activity = COALESCE($3, activity),
         scheduled_date = COALESCE($4, scheduled_date),
         scheduled_time = COALESCE($5, scheduled_time),
         updated_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.id, activity, scheduled_date, scheduled_time]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Task not found' });

    await recalculateDailyProgress(req.user.id, rows[0].scheduled_date);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating task' });
  }
});

// PUT /api/tasks/:id/toggle — mark done / undone.
// Completion is recorded against TODAY (or the date supplied), NOT the original scheduled date.
router.put('/:id/toggle', authenticate, checkLock, async (req, res) => {
  const { id } = req.params;
  const { is_done, completed_date, completed_time } = req.body;

  try {
    const now = new Date();
    const today = completed_date || now.toISOString().slice(0, 10);
    const nowTime = completed_time || now.toTimeString().slice(0, 8);

    const { rows } = await pool.query(
      `UPDATE tasks SET
         is_done = $3,
         completed_date = CASE WHEN $3 = TRUE THEN $4 ELSE NULL END,
         completed_time = CASE WHEN $3 = TRUE THEN $5 ELSE NULL END,
         updated_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.id, is_done, today, nowTime]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Task not found' });

    const task = rows[0];
    // Recalculate progress for the day it was completed on (and the original day, in
    // case it was un-toggled — that day's counts may need to shrink back down).
    await recalculateDailyProgress(req.user.id, task.scheduled_date);
    if (task.completed_date && task.completed_date !== task.scheduled_date) {
      await recalculateDailyProgress(req.user.id, task.completed_date);
    }

    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error toggling task' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', authenticate, checkLock, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Task not found' });

    await recalculateDailyProgress(req.user.id, rows[0].scheduled_date);
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting task' });
  }
});

module.exports = router;
