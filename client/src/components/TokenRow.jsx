export default function TokenRow({ token, index, count, busy, onMove, onCancel, waitingSince }) {
  return (
    <div className="token-row">
      <span className="pos">{index + 1}</span>
      <span className="token-no">Token #{token.token_number}</span>
      <span className="token-name">{token.name}</span>
      <span className="wait">{waitingSince}</span>
      <div className="token-controls">
        <button className="outline icon" aria-label="Move up" disabled={busy || index === 0} onClick={() => onMove(token.id, 'up')}>↑</button>
        <button className="outline icon" aria-label="Move down" disabled={busy || index === count - 1} onClick={() => onMove(token.id, 'down')}>↓</button>
        <button className="danger icon" aria-label={`Cancel token ${token.token_number}`} disabled={busy} onClick={() => onCancel(token.id)}>✕</button>
      </div>
    </div>
  );
}
