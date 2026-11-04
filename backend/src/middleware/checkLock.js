const pool = require('../db/pool');

// Blocks a user's request if their account is currently locked
// (triggered by repeated unlawful-content flags — see utils/contentFilter.js).
async function checkLock(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT is_locked, lock_expires_at FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.is_locked) {
      const now = new Date();
      if (user.lock_expires_at && now < new Date(user.lock_expires_at)) {
        const minutesLeft = Math.ceil((new Date(user.lock_expires_at) - now) / 60000);
        return res.status(403).json({
          error: `Account temporarily locked due to repeated policy violations. Try again in ${minutesLeft} minute(s).`,
        });
      }
      // Lock has expired — clear it
      await pool.query(
        'UPDATE users SET is_locked = FALSE, lock_expires_at = NULL WHERE id = $1',
        [req.user.id]
      );
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error checking account status' });
  }
}

module.exports = checkLock;
