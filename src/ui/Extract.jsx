const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const PANEL_W = 340;
const PANEL_H = 430;

function placeExtractPanel(anchor) {
  const vw = anchor && anchor.vw ? anchor.vw : 1280;
  const vh = anchor && anchor.vh ? anchor.vh : 720;
  const width = Math.min(PANEL_W, Math.max(180, vw - 24));
  const height = Math.min(PANEL_H, Math.max(220, vh - 24));
  if (!anchor || !Number.isFinite(anchor.sx) || !Number.isFinite(anchor.sy)) {
    return { left: 16, top: 72 };
  }
  const aim = anchor.aim || 0;
  const dx = -Math.cos(aim);
  const dy = -Math.sin(aim);
  const hx = width / 2;
  const hy = height / 2;
  const along = Math.min(hx / Math.max(0.2, Math.abs(dx)), hy / Math.max(0.2, Math.abs(dy)));
  const gap = (anchor.shipR || 48) + 28;
  const cx = anchor.sx + dx * (gap + along);
  const cy = anchor.sy + dy * (gap + along);
  return {
    left: Math.max(8, Math.min(cx - hx, vw - width - 8)),
    top: Math.max(8, Math.min(cy - hy, vh - height - 8)),
  };
}

export default function Extract({ bridge, snapshot }) {
  const extractMode = snapshot.mode === 'extract' || snapshot.extractMode;
  const toast = snapshot.extractToast || '';
  const hud = snapshot.hud || {};

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

  function onOverlayClick(event) {
    if (event.target !== event.currentTarget) return;
    cancel();
  }

  const place = placeExtractPanel(snapshot.extractAnchor);
  const shownAnswer = hud.buffer
    ? hud.buffer
    : snapshot.fxGreen && snapshot.correctAnswer
      ? snapshot.correctAnswer
      : '·';

  return (
    <>
      {extractMode && (
        <div id="extract" className="overlay extract-overlay" onClick={onOverlayClick}>
          <div
            className="extract-panel"
            style={{ left: place.left, top: place.top }}
            onClick={(event) => event.stopPropagation()}
          >
            <p className="eyebrow">{snapshot.extractRockName || 'Extraction'}</p>
            <h2 id="extract-question" className="extract-question">
              {snapshot.extractQuestion || 'Solve to extract'}
            </h2>
            <div
              id="extract-buffer"
              className={`extract-buffer${hud.bufferBad ? ' bad' : ''}${snapshot.fxGreen ? ' correct' : ''}`}
            >
              {shownAnswer}
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
