const pool = require('../db/pool');

// Runs once daily at/after the configured cutoff hour. For every user, checks
// whether today's plan was created or revised today. If not, sends a nudge.
async function runPlanNotRevisedCheck() {
  const today = new Date().toISOString().slice(0, 10);

  try {
    const { rows: users } = await pool.query('SELECT id FROM users');

    for (const user of users) {
      const { rows } = await pool.query(
        `SELECT last_revised_at FROM plans WHERE user_id = $1 AND plan_date = $2`,
        [user.id, today]
      );
      const plan = rows[0];
      const revisedToday =
        plan && plan.last_revised_at && plan.last_revised_at.toISOString().slice(0, 10) === today;

      if (!revisedToday) {
        const { rows: existing } = await pool.query(
          `SELECT 1 FROM notifications
           WHERE user_id = $1 AND type = 'plan_not_revised' AND created_at::date = $2`,
          [user.id, today]
        );
        if (existing.length === 0) {
          await pool.query(
            `INSERT INTO notifications (user_id, type, message) VALUES ($1, 'plan_not_revised', $2)`,
            [user.id, "You haven't set or revised today's plan yet — take a moment to update it."]
          );
        }
      }
    }
    console.log('[plan-not-revised] Check complete.');
  } catch (err) {
    console.error('[plan-not-revised] Job failed:', err);
  }
}

module.exports = runPlanNotRevisedCheck;
