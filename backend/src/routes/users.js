const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('../db/pool');
const authenticate = require('../middleware/auth');

const router = express.Router();

// Photo upload storage config — saves to /uploads, served statically by server.js
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `user_${req.user.id}_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

// GET /api/users/me
router.get('/me', authenticate, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, email, role, bio, profile_photo_url,
            overall_progress_score, total_days_tracked,
            total_tasks_completed, total_tasks_scheduled, created_at
     FROM users WHERE id = $1`,
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

// PUT /api/users/me — edit name, role, bio
router.put('/me', authenticate, async (req, res) => {
  const { name, role, bio } = req.body;
  const { rows } = await pool.query(
    `UPDATE users SET
       name = COALESCE($2, name),
       role = COALESCE($3, role),
       bio = COALESCE($4, bio),
       updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, email, role, bio, profile_photo_url`,
    [req.user.id, name, role, bio]
  );
  res.json(rows[0]);
});

// POST /api/users/me/photo — upload/replace profile photo
router.post('/me/photo', authenticate, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No valid image file uploaded' });
  const photoUrl = `/uploads/${req.file.filename}`;
  const { rows } = await pool.query(
    `UPDATE users SET profile_photo_url = $2, updated_at = NOW() WHERE id = $1
     RETURNING id, profile_photo_url`,
    [req.user.id, photoUrl]
  );
  res.json(rows[0]);
});

module.exports = router;
