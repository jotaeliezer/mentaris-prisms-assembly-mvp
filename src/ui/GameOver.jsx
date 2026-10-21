export default function GameOver({ bridge, snapshot }) {
  const reason =
    (snapshot && snapshot.deathReason) || 'The hull reached zero.';
  return (
    <div id="game-over" className="overlay gameover-overlay">
      <div className="panel gameover-panel">
        <h2 className="gameover-title">Game over</h2>
        <p className="gameover-reason">{reason}</p>
        <p className="lede">
          Everything you were carrying is floating at the wreck. Respawn and fly back to pick it up.
        </p>
        <button
          id="respawn"
          className="btn btn-primary"
          type="button"
          onClick={() => {
            bridge.emit('uiBeep');
            bridge.emit('respawn');
          }}
        >
          Respawn
        </button>
      </div>
    </div>
  );
}
