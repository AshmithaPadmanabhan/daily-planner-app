require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const planRoutes = require('./routes/plans');
const taskRoutes = require('./routes/tasks');
const progressRoutes = require('./routes/progress');
const notificationRoutes = require('./routes/notifications');

const runRolloverJob = require('./jobs/rollover');
const runMissedTaskReminders = require('./jobs/reminders');
const runPlanNotRevisedCheck = require('./jobs/planNotRevised');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ---- Cron schedules ----
// Rollover: once daily, just after midnight
cron.schedule('5 0 * * *', runRolloverJob);

// Missed-task reminders: every 15 minutes
cron.schedule('*/15 * * * *', runMissedTaskReminders);

// Plan-not-revised check: once daily at the configured cutoff hour
const cutoffHour = parseInt(process.env.PLAN_REVISION_CUTOFF_HOUR || '21', 10);
cron.schedule(`0 ${cutoffHour} * * *`, runPlanNotRevisedCheck);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Planner backend running on port ${PORT}`);
});
