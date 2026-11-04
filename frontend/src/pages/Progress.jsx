import { useEffect, useState } from 'react';
import client from '../api/client';

const cheer = (s) =>
  s >= 80 ? 'Magnificent! You are in full bloom ✿' : s >= 50 ? 'Lovely progress, keep going!' : 'Every small step counts ✨';

export default function Progress() {
  const now = new Date();
  const [monthly, setMonthly] = useState(null);
  const [overall, setOverall] = useState(null);

  useEffect(() => {
    client.get(`/progress/monthly/${now.getFullYear()}/${now.getMonth() + 1}`).then((r) => setMonthly(r.data));
    client.get('/progress/overall').then((r) => setOverall(r.data));
  }, []);

  const score = overall ? parseFloat(overall.overall_progress_score) : 0;

  return (
    <div className="container">
      <h2>Your Progress</h2>
      <div className="orn">✦ ✦ ✦</div>

      <div className="card" style={{ textAlign: 'center' }}>
        <h3>Overall Progress</h3>
        <div className="ring" style={{ '--p': score }}><span>{score.toFixed(0)}%</span></div>
        {overall && (
          <p className="hint">
            {overall.total_days_tracked} day(s) tracked · {overall.total_tasks_completed}/{overall.total_tasks_scheduled} tasks completed
          </p>
        )}
        <p className="cheer">{cheer(score)}</p>
      </div>

      <div className="card">
        <h3>This Month</h3>
        {monthly && <p className="hint">Average score: <b>{monthly.average_score}%</b></p>}
        {monthly?.days.map((d) => (
          <div key={d.progress_date} className="task-row">
            <span className="task-activity">{d.progress_date.slice(0, 10)}</span>
            <span className="hint">{d.tasks_completed}/{d.tasks_scheduled}</span>
            <div className="bar" style={{ width: 90 }}><i style={{ width: parseFloat(d.daily_score) + '%' }} /></div>
            <b>{parseFloat(d.daily_score).toFixed(0)}%</b>
          </div>
        ))}
        {monthly && monthly.days.length === 0 && <p className="hint">No progress logged yet this month.</p>}
      </div>
    </div>
  );
}
