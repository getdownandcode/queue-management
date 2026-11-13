import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, send } from '../api';
import Navbar from '../components/Navbar';
import TokenRow from '../components/TokenRow';

export default function QueueDetail() {
  const { id } = useParams();
  const [queue, setQueue] = useState(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    try { setQueue(await api(`/queues/${id}`)); setError(''); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    load();
    const refresh = setInterval(load, 30000);
    const clock = setInterval(() => setNow(Date.now()), 30000);
    return () => { clearInterval(refresh); clearInterval(clock); };
  }, [load]);

  async function action(path, method = 'POST', body = {}) {
    setBusy(true); setError('');
    try { await send(path, method, body); await load(); return true; }
    catch (e) { setError(e.message); return false; } finally { setBusy(false); }
  }

  async function add(e) {
    e.preventDefault();
    if (await action(`/queues/${id}/tokens`, 'POST', { name })) setName('');
  }

  async function cancel(tokenId) {
    if (window.confirm('Cancel this waiting token?')) await action(`/queues/${id}/tokens/${tokenId}/cancel`);
  }

  function waitingTime(token) {
    const created = new Date(`${token.created_at.replace(' ', 'T')}Z`).getTime();
    const minutes = Math.max(0, Math.floor((now - created) / 60000));
    return `${minutes} min waiting`;
  }

  return (
    <>
      <Navbar />
      <main className="container">
        {loading ? <p className="muted">Loading queue…</p> : !queue ? (
          <div className="error" role="alert">{error || 'Queue not found.'}</div>
        ) : (
          <>
            <div className="topline">
              <h1>{queue.name}</h1>
              <nav>
                <Link to="/queues">All queues</Link>
                <Link to={`/dashboard?queue=${id}`}>Analytics</Link>
              </nav>
            </div>
            {error && <div className="error" role="alert">{error}</div>}
            <section className="card">
              <h2>Currently serving</h2>
              {queue.serving ? (
                <div className="serving-banner">
                  <strong>Token #{queue.serving.token_number}</strong>
                  <span>{queue.serving.name}</span>
                  <div className="serving-actions">
                    <button disabled={busy} onClick={() => action(`/queues/${id}/tokens/${queue.serving.id}/done`)}>Mark done</button>
                  </div>
                </div>
              ) : (
                <p className="muted">No one is being served.</p>
              )}
              <button disabled={busy || queue.waiting.length === 0} onClick={() => action(`/queues/${id}/serve`)}>Serve next</button>
            </section>
            <section className="card">
              <h2>Add a person</h2>
              <form className="form-row" onSubmit={add}>
                <input aria-label="Person name" maxLength={100} required value={name} onChange={e => setName(e.target.value)} placeholder="Name" />
                <button disabled={busy}>{busy ? 'Adding…' : 'Add to queue'}</button>
              </form>
            </section>
            <section className="card">
              <h2>Waiting ({queue.waiting.length})</h2>
              {queue.waiting.length === 0 ? <p className="muted">No one is waiting.</p> : queue.waiting.map((token, index) => (
                <TokenRow key={token.id} token={token} index={index} count={queue.waiting.length} busy={busy} waitingSince={waitingTime(token)}
                  onMove={(tokenId, direction) => action(`/queues/${id}/tokens/${tokenId}/move`, 'PATCH', { direction })}
                  onCancel={cancel} />
              ))}
            </section>
          </>
        )}
      </main>
    </>
  );
}
