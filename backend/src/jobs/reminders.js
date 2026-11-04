const pool = require('../db/pool');

// Runs frequently (e.g. every 15 minutes). Finds tasks whose scheduled time
// has passed today but are still not done, and haven't already been notified.
async function runMissedTaskReminders() {
  const today = new Date().toISOString().slice(0, 10);
  const nowTime = new Date().toTimeString().slice(0, 8);

  try {
    const { rows: overdueTasks } = await pool.query(
      `SELECT t.* FROM tasks t
       WHERE t.scheduled_date = $1
         AND t.scheduled_time <= $2
         AND t.is_done = FALSE
         AND NOT EXISTS (
           SELECT 1 FROM notifications n
           WHERE n.related_task_id = t.id AND n.type = 'missed_task'
         )`,
      [today, nowTime]
    );

    for (const task of overdueTasks) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, message, related_task_id)
         VALUES ($1, 'missed_task', $2, $3)`,
        [task.user_id, `"${task.activity}" was scheduled for ${task.scheduled_time} and hasn't been marked done yet.`, task.id]
      );
    }

    if (overdueTasks.length) {
      console.log(`[reminders] Sent ${overdueTasks.length} missed-task notification(s).`);
    }
  } catch (err) {
    console.error('[reminders] Job failed:', err);
  }
}

module.exports = runMissedTaskReminders;
