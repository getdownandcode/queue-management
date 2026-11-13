import { Link, useNavigate } from 'react-router-dom';
import { clearToken } from '../api';
export default function Navbar() {
  const navigate = useNavigate();
  return <div className="nav"><div className="nav-inner"><strong>Queue Manager</strong><div className="nav-links"><Link to="/queues">Queues</Link><Link to="/dashboard">Dashboard</Link><button className="outline" onClick={() => { clearToken(); navigate('/login'); }}>Log out</button></div></div></div>;
}
