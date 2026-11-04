const pool = require('../db/pool');

// Runs once daily (e.g. just after midnight). For every incomplete task
// scheduled "yesterday", creates a copy in today's plan with carried_over = true,
// preserving original_scheduled_date. The user can freely edit/delete it afterward.
// Progress for the original day is NOT touched retroactively — it reflects
// exactly what was completed on that day, which is correct by design.
async function runRolloverJob() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const today = new Date().toISOString().slice(0, 10);

  try {
    const { rows: incompleteTasks } = await pool.query(
      `SELECT * FROM tasks WHERE scheduled_date = $1 AND is_done = FALSE`,
      [yesterdayStr]
    );

    for (const task of incompleteTasks) {
      // Ensure today's plan exists for this user
      let planRes = await pool.query(
        'SELECT * FROM plans WHERE user_id = $1 AND plan_date = $2',
        [task.user_id, today]
      );
      let plan = planRes.rows[0];
      if (!plan) {
        const insertPlan = await pool.query(
          'INSERT INTO plans (user_id, plan_date) VALUES ($1, $2) RETURNING *',
          [task.user_id, today]
        );
        plan = insertPlan.rows[0];
      }

      await pool.query(
        `INSERT INTO tasks
           (plan_id, user_id, activity, scheduled_date, scheduled_time, carried_over, original_scheduled_date)
         VALUES ($1, $2, $3, $4, $5, TRUE, $6)`,
        [
          plan.id,
          task.user_id,
          task.activity,
          today,
          task.scheduled_time,
          task.original_scheduled_date || task.scheduled_date,
        ]
      );

      await pool.query(
        `INSERT INTO notifications (user_id, type, message, related_task_id)
         VALUES ($1, 'task_rolled_over', $2, $3)`,
        [task.user_id, `"${task.activity}" was not completed and has been moved to today's plan.`, task.id]
      );
    }

    console.log(`[rollover] Processed ${incompleteTasks.length} incomplete task(s) from ${yesterdayStr}.`);
  } catch (err) {
    console.error('[rollover] Job failed:', err);
  }
}

module.exports = runRolloverJob;
