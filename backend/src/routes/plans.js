const express = require('express');
const pool = require('../db/pool');
const authenticate = require('../middleware/auth');
const checkLock = require('../middleware/checkLock');

const router = express.Router();

// GET /api/plans/:date  (date = YYYY-MM-DD) — get or lazily create today's plan, with its tasks
router.get('/:date', authenticate, async (req, res) => {
  const { date } = req.params;
  try {
    let planRes = await pool.query(
      'SELECT * FROM plans WHERE user_id = $1 AND plan_date = $2',
      [req.user.id, date]
    );
    let plan = planRes.rows[0];

    if (!plan) {
      const insertRes = await pool.query(
        'INSERT INTO plans (user_id, plan_date) VALUES ($1, $2) RETURNING *',
        [req.user.id, date]
      );
      plan = insertRes.rows[0];
    }

    const tasksRes = await pool.query(
      'SELECT * FROM tasks WHERE plan_id = $1 ORDER BY scheduled_time ASC',
      [plan.id]
    );

    res.json({ plan, tasks: tasksRes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching plan' });
  }
});

// PUT /api/plans/:date/revise — marks that the user actively revised today's plan
// (used to suppress the "plan not revised" notification)
router.put('/:date/revise', authenticate, checkLock, async (req, res) => {
  const { date } = req.params;
  try {
    const { rows } = await pool.query(
      `UPDATE plans SET last_revised_at = NOW()
       WHERE user_id = $1 AND plan_date = $2 RETURNING *`,
      [req.user.id, date]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Plan not found for that date' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error revising plan' });
  }
});

module.exports = router;
