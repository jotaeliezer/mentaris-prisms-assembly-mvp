export default function Pause({ bridge }) {
  return (
    <div id="pause" className="overlay">
      <div className="panel">
        <p className="eyebrow">Holding position</p>
        <h2>Paused</h2>
        <p className="lede">The sector waits. Resume when you are ready.</p>
        <button
          id="resume"
          className="btn btn-primary"
          type="button"
          onClick={() => {
            bridge.emit('uiBeep');
            bridge.emit('setPaused', false);
          }}
        >
          Resume flight
        </button>
      </div>
    </div>
  );
}
