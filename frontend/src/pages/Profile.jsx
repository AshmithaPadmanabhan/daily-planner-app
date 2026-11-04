import { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [bio, setBio] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setRole(user.role);
      setBio(user.bio || '');
    }
  }, [user]);

  const save = async (e) => {
    e.preventDefault();
    const res = await client.put('/users/me', { name, role, bio });
    setUser((prev) => ({ ...prev, ...res.data }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const uploadPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('photo', file);
    const res = await client.post('/users/me/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setUser((prev) => ({ ...prev, profile_photo_url: res.data.profile_photo_url }));
  };

  if (!user) return null;

  return (
    <div className="container">
      <h2>Profile</h2>

      <div className="card" style={{ textAlign: 'center' }}>
        {user.profile_photo_url ? (
          <img
            src={user.profile_photo_url}
            alt="Profile"
            style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '4px solid #c9a24a' }}
          />
        ) : (
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#e5e7eb', margin: '0 auto' }} />
        )}
        <div style={{ marginTop: 10 }}>
          <input type="file" accept="image/*" onChange={uploadPhoto} />
        </div>
      </div>

      <form onSubmit={save} className="card">
        <label style={{ fontSize: 13, color: '#666' }}>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required />

        <label style={{ fontSize: 13, color: '#666' }}>Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="student">Student</option>
          <option value="worker">Worker</option>
          <option value="other">Other</option>
        </select>

        <label style={{ fontSize: 13, color: '#666' }}>Bio</label>
        <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />

        <button className="btn" type="submit">Save Changes</button>
        {saved && <p style={{ color: 'green', fontSize: 13 }}>Saved!</p>}
      </form>

      <button className="btn secondary" onClick={logout}>Log Out</button>
    </div>
  );
}
