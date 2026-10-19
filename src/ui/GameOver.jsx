export default function GameOver({ bridge }) {
  return (
    <div id="game-over" className="overlay gameover-overlay">
      <div className="panel gameover-panel">
        <p className="eyebrow">Hull breach</p>
        <h2>Game over</h2>
        <p className="lede">
          The ship came apart on this layer. Everything you were carrying is floating at the wreck.
          Respawn and fly back to pick it up.
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
