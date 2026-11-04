import { useState } from 'react';

export default function TaskItem({ task, onToggle, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [activity, setActivity] = useState(task.activity);
  const [time, setTime] = useState(task.scheduled_time?.slice(0, 5));

  const saveEdit = () => {
    onEdit(task.id, { activity, scheduled_time: time });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="task-row">
        <input value={activity} onChange={(e) => setActivity(e.target.value)} style={{ marginBottom: 0 }} />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ marginBottom: 0, width: 110 }} />
        <button className="btn" onClick={saveEdit}>Save</button>
        <button className="btn secondary" onClick={() => setEditing(false)}>Cancel</button>
      </div>
    );
  }

  return (
    <div className={`task-row ${task.is_done ? 'done' : ''}`}>
      <input type="checkbox" checked={task.is_done} onChange={() => onToggle(task)} />
      <span className="task-activity">
        {task.activity}{' '}
        <small style={{ color: '#888' }}>({task.scheduled_time?.slice(0, 5)})</small>
        {task.carried_over && <span className="badge" style={{ marginLeft: 6 }}>carried over</span>}
      </span>
      <button className="btn secondary" onClick={() => setEditing(true)}>Edit</button>
      <button className="btn danger" onClick={() => onDelete(task.id)}>Delete</button>
    </div>
  );
}
