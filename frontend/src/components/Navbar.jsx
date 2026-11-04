import { NavLink } from 'react-router-dom';

export default function Navbar() {
  const cls = ({ isActive }) => (isActive ? 'active' : '');
  return (
    <header className="topnav">
      <span className="brand"><img src="/favicon.svg" alt="" className="logo" />Daily Planner</span>
      <nav className="links">
        <NavLink to="/" end className={cls}>Planner</NavLink>
        <NavLink to="/progress" className={cls}>Progress</NavLink>
        <NavLink to="/profile" className={cls}>Profile</NavLink>
      </nav>
    </header>
  );
}
