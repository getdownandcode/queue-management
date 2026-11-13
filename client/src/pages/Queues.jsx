import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, send } from '../api';
import Navbar from '../components/Navbar';
export default function Queues() {
  const [queues, setQueues] = useState([]); const [name, setName] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  async function load() { try { setQueues(await api('/queues')); } catch (e) { setError(e.message); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  async function create(e) { e.preventDefault(); setBusy(true); setError(''); try { await send('/queues', 'POST', { name }); setName(''); await load(); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <><Navbar /><main className="container"><h1>Your queues</h1><section className="card"><h2>Create a queue</h2><form className="form-row" onSubmit={create}><input aria-label="Queue name" maxLength={50} required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Front desk" /><button disabled={busy}>{busy ? 'Creating…' : 'Create queue'}</button></form>{error && <div className="error" role="alert">{error}</div>}</section><section className="card"><h2>Queues</h2>{loading ? <p className="muted">Loading queues…</p> : queues.length === 0 ? <p className="muted">No queues yet. Create one to get started.</p> : <ul className="link-list">{queues.map(q => <li key={q.id}><Link to={`/queues/${q.id}`}>{q.name}</Link><span className="muted">{q.waiting_count} waiting</span></li>)}</ul>}</section></main></>;
}
