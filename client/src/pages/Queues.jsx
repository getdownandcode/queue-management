import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, send } from '../api';
import Navbar from '../components/Navbar';

export default function Queues() {
  const [queues, setQueues] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  async function load() {
    try { setQueues(await api('/queues')); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { await send('/queues', 'POST', { name }); setName(''); await load(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  function startEdit(queue) { setEditingId(queue.id); setEditName(queue.name); setError(''); }

  async function rename(queue) {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === queue.name) { setEditingId(null); return; }
    setBusy(true); setError('');
    try {
      await send(`/queues/${queue.id}`, 'PATCH', { name: trimmed });
      setEditingId(null);
      await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function remove(queue) {
    if (!window.confirm(`Delete "${queue.name}" and all of its tokens? This cannot be undone.`)) return;
    setBusy(true); setError('');
    try { await send(`/queues/${queue.id}`, 'DELETE'); await load(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <>
      <Navbar />
      <main className="container">
        <h1>Your queues</h1>
        <section className="card">
          <h2>Create a queue</h2>
          <form className="form-row" onSubmit={create}>
            <input aria-label="Queue name" maxLength={50} required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Front desk" />
            <button disabled={busy}>{busy ? 'Creating…' : 'Create queue'}</button>
          </form>
          {error && <div className="error" role="alert">{error}</div>}
        </section>
        <section className="card">
          <h2>Queues</h2>
          {loading ? <p className="muted">Loading queues…</p> : queues.length === 0 ? (
            <p className="muted">No queues yet. Create one to get started.</p>
          ) : (
            <ul className="queue-list">
              {queues.map(q => (
                <li key={q.id} className="queue-item">
                  {editingId === q.id ? (
                    <form className="form-row" onSubmit={e => { e.preventDefault(); rename(q); }}>
                      <input aria-label="New queue name" maxLength={50} required autoFocus value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Escape') setEditingId(null); }} />
                      <button disabled={busy}>Save</button>
                      <button type="button" className="outline" disabled={busy} onClick={() => setEditingId(null)}>Cancel</button>
                    </form>
                  ) : (
                    <>
                      <Link className="queue-link" to={`/queues/${q.id}`}>
                        <span>{q.name}</span>
                        <span className="badge">{q.waiting_count} waiting</span>
                      </Link>
                      <div className="queue-actions">
                        <button className="outline icon" aria-label={`Rename ${q.name}`} disabled={busy} onClick={() => startEdit(q)}>✎</button>
                        <button className="danger icon" aria-label={`Delete ${q.name}`} disabled={busy} onClick={() => remove(q)}>🗑</button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
