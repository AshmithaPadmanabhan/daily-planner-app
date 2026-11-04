const express = require('express');
const pool = require('../db/pool');
const authenticate = require('../middleware/auth');

const router = express.Router();

// GET /api/progress/daily/:date
router.get('/daily/:date', authenticate, async (req, res) => {
  const { date } = req.params;
  const { rows } = await pool.query(
    'SELECT * FROM daily_progress WHERE user_id = $1 AND progress_date = $2',
    [req.user.id, date]
  );
  res.json(rows[0] || null);
});

// GET /api/progress/monthly/:year/:month  — e.g. /api/progress/monthly/2026/8
router.get('/monthly/:year/:month', authenticate, async (req, res) => {
  const { year, month } = req.params;
  const { rows } = await pool.query(
    `SELECT * FROM daily_progress
     WHERE user_id = $1
       AND EXTRACT(YEAR FROM progress_date) = $2
       AND EXTRACT(MONTH FROM progress_date) = $3
     ORDER BY progress_date ASC`,
    [req.user.id, year, month]
  );

  const avgScore = rows.length
    ? rows.reduce((sum, r) => sum + parseFloat(r.daily_score), 0) / rows.length
    : 0;

  res.json({
    year: parseInt(year, 10),
    month: parseInt(month, 10),
    days: rows,
    average_score: avgScore.toFixed(2),
  });
});

// GET /api/progress/overall — the permanent, never-reset lifetime stat
router.get('/overall', authenticate, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT overall_progress_score, total_days_tracked,
            total_tasks_completed, total_tasks_scheduled
     FROM users WHERE id = $1`,
    [req.user.id]
  );
  res.json(rows[0]);
});

module.exports = router;
