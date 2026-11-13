import { NavLink, useNavigate } from 'react-router-dom';
import { clearToken } from '../api';

export default function Navbar() {
  const navigate = useNavigate();
  return (
    <div className="nav">
      <div className="nav-inner">
        <strong>Queue Manager</strong>
        <div className="nav-links">
          <NavLink to="/queues">Queues</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <button className="outline" onClick={() => { clearToken(); navigate('/login'); }}>Log out</button>
        </div>
      </div>
    </div>
  );
}
