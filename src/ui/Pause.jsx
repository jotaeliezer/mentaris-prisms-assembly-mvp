export default function Pause({ bridge, snapshot }) {
  const canSave = !!(snapshot && snapshot.assemblyId);
  return (
    <div id="pause" className="overlay">
      <div className="panel">
        <p className="eyebrow">Holding position</p>
        <h2>Paused</h2>
        <p className="lede">
          {canSave
            ? 'The sector waits. Save and leave keeps this assembly where you are.'
            : 'The sector waits. Resume when you are ready.'}
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
          {canSave ? 'Save and leave' : 'Leave flight'}
        </button>
      </div>
    </div>
  );
}
