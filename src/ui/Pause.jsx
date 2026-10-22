export default function Pause({ bridge }) {
  return (
    <div id="pause" className="overlay">
      <div className="panel">
        <p className="eyebrow">Holding position</p>
        <h2>Paused</h2>
        <p className="lede">
          The sector waits. Save and leave keeps this flight on this browser. You can launch it later without signing in.
        </p>
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
        <button
          id="save-leave"
          className="btn"
          type="button"
          onClick={() => {
            bridge.emit('uiBeep');
            bridge.emit('saveAndLeave');
          }}
        >
          Save and leave
        </button>
        <button
          id="leave-flight"
          className="btn"
          type="button"
          onClick={() => {
            bridge.emit('uiBeep');
            bridge.emit('leaveFlight');
          }}
        >
          Leave without saving
        </button>
      </div>
    </div>
  );
}
