const pool = require('../db/pool');

// Checks activity text against the unlawful_keywords table.
// Returns the matched keyword row, or null if clean.
async function findMatch(text) {
  const { rows } = await pool.query(
    'SELECT keyword, category FROM unlawful_keywords WHERE active = TRUE'
  );
  const lower = text.toLowerCase();
  return rows.find((row) => lower.includes(row.keyword.toLowerCase())) || null;
}

// Records a flagged attempt, and locks the account if the user has
// exceeded the flag threshold within the configured time window.
// Returns { locked: boolean, lockExpiresAt: Date|null }
async function recordFlagAndMaybeLock(userId, attemptedText, matchedKeyword) {
  await pool.query(
    'INSERT INTO flagged_attempts (user_id, attempted_text, matched_keyword) VALUES ($1, $2, $3)',
    [userId, attemptedText, matchedKeyword]
  );

  const windowMinutes = parseInt(process.env.FLAG_WINDOW_MINUTES || '10', 10);
  const threshold = parseInt(process.env.FLAG_THRESHOLD || '3', 10);
  const lockDurationMinutes = parseInt(process.env.LOCK_DURATION_MINUTES || '60', 10);

  const { rows } = await pool.query(
    `SELECT COUNT(*) FROM flagged_attempts
     WHERE user_id = $1 AND attempted_at > NOW() - INTERVAL '${windowMinutes} minutes'`,
    [userId]
  );
  const recentCount = parseInt(rows[0].count, 10);

  if (recentCount >= threshold) {
    const lockExpiresAt = new Date(Date.now() + lockDurationMinutes * 60000);
    await pool.query(
      'UPDATE users SET is_locked = TRUE, lock_expires_at = $2 WHERE id = $1',
      [userId, lockExpiresAt]
    );
    await pool.query(
      `INSERT INTO notifications (user_id, type, message) VALUES ($1, 'content_flagged', $2)`,
      [userId, `Your account has been temporarily locked for ${lockDurationMinutes} minutes due to repeated policy-violating task entries.`]
    );
    return { locked: true, lockExpiresAt };
  }

  return { locked: false, lockExpiresAt: null };
}

module.exports = { findMatch, recordFlagAndMaybeLock };
