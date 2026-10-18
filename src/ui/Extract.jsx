const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

export default function Extract({ bridge, snapshot }) {
  const extractMode = snapshot.mode === 'extract' || snapshot.extractMode;
  const available = snapshot.extractAvailable;
  const toast = snapshot.extractToast || '';
  const hud = snapshot.hud || {};

  function open() {
    if (!available) return;
    bridge.emit('uiBeep');
    bridge.emit('openExtract', { rockId: available });
  }

  function digit(d) {
    bridge.emit('uiBeep');
    bridge.emit('extractDigit', { digit: d });
  }

  function backspace() {
    bridge.emit('uiBeep');
    bridge.emit('extractDigit', { digit: 'backspace' });
  }

  function submit() {
    bridge.emit('uiBeep');
    bridge.emit('extractSubmit');
  }

  function cancel() {
    bridge.emit('uiBeep');
    bridge.emit('cancelExtract');
  }

  return (
    <>
      {!extractMode && available != null && (
        <button
          id="extract-prompt"
          type="button"
          className="btn btn-primary extract-prompt"
          onClick={open}
        >
          Extract
          <span>E</span>
        </button>
      )}

      {extractMode && (
        <div id="extract" className="overlay extract-overlay">
          <div className="extract-panel">
            <p className="eyebrow">Extraction</p>
            <h2 id="extract-question" className="extract-question">
              {snapshot.extractQuestion || 'Solve to extract'}
            </h2>
            <div
              id="extract-buffer"
              className={`extract-buffer${hud.bufferBad ? ' bad' : ''}`}
            >
              {hud.buffer || '·'}
            </div>
            <div className="extract-numpad" role="group" aria-label="Extract numpad">
              {DIGITS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className="btn extract-key"
                  onClick={() => digit(d)}
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                className="btn extract-key extract-key-wide"
                onClick={backspace}
              >
                ⌫
              </button>
              <button
                type="button"
                className="btn btn-primary extract-key extract-key-wide extract-key-submit"
                onClick={submit}
              >
                Enter
              </button>
            </div>
            <button
              id="cancel-extract"
              type="button"
              className="btn extract-cancel"
              onClick={cancel}
            >
              Cancel · Esc
            </button>
          </div>
        </div>
      )}

      {toast ? (
        <div id="extract-toast" className="extract-toast" role="status">
          {toast}
        </div>
      ) : null}
    </>
  );
}
