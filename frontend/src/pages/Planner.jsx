import { useEffect, useState } from 'react';
import client from '../api/client';
import TaskItem from '../components/TaskItem';
import { useAuth } from '../context/AuthContext';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function Planner() {
  const [date, setDate] = useState(todayStr());
  const [tasks, setTasks] = useState([]);
  const [activity, setActivity] = useState('');
  const [time, setTime] = useState('09:00');
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(null);
  const { user } = useAuth();
  const done = tasks.filter((t) => t.is_done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const loadPlan = async () => {
    const res = await client.get(`/plans/${date}`);
    setTasks(res.data.tasks);
  };

  useEffect(() => { loadPlan(); }, [date]);

  const addTask = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await client.post('/tasks', { activity, scheduled_date: date, scheduled_time: time });
      setActivity('');
      loadPlan();
    } catch (err) {
      const data = err.response?.data;
      setError(data?.error || 'Failed to add task');
      if (data?.locked) setLocked(data.lockExpiresAt);
    }
  };

  const toggleTask = async (task) => {
    await client.put(`/tasks/${task.id}/toggle`, { is_done: !task.is_done });
    loadPlan();
  };

  const editTask = async (id, updates) => {
    try {
      await client.put(`/tasks/${id}`, updates);
      loadPlan();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to edit task');
    }
  };

  const deleteTask = async (id) => {
    await client.delete(`/tasks/${id}`);
    loadPlan();
  };

  const revisePlan = async () => {
    await client.put(`/plans/${date}/revise`);
    loadPlan();
  };

  return (
    <div className="container">
      <h2>Hello, {user?.name?.split(' ')[0]}</h2>
      <div className="orn">&#10022; &#10022; &#10022;</div>

      <div className="card">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button className="btn secondary" onClick={revisePlan}>Mark today's plan as revised</button>
      </div>

      <div className="card">
        <div className="bar"><i style={{ width: pct + '%' }} /></div>
        <p className="hint">{done} of {tasks.length} tasks done &middot; {pct}%</p>
      </div>

      {locked && (
        <div className="card" style={{ background: '#fee2e2' }}>
          Your account is temporarily locked until {new Date(locked).toLocaleTimeString()}.
        </div>
      )}

      <div className="card">
        <h3>Tasks</h3>
        {tasks.length === 0 && <p style={{ color: '#888' }}>No tasks yet for this day.</p>}
        {tasks.map((t) => (
          <TaskItem key={t.id} task={t} onToggle={toggleTask} onEdit={editTask} onDelete={deleteTask} />
        ))}
      </div>

      <div className="card">
        <h3>Add Task</h3>
        <form onSubmit={addTask}>
          <input placeholder="Activity" value={activity} onChange={(e) => setActivity(e.target.value)} required />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}
          <button className="btn" type="submit">Add</button>
        </form>
      </div>
    </div>
  );
}
