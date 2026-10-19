const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const PANEL_W = 340;
const PANEL_H = 430;

function placeExtractPanel(anchor) {
  if (!anchor || !anchor.vw || !anchor.vh) {
    return { left: 16, top: 72 };
  }
  const vw = anchor.vw;
  const vh = anchor.vh;
  const width = Math.min(PANEL_W, vw - 108);
  const height = Math.min(PANEL_H, vh - 24);
  const spots = [
    [16, 16],
    [16, vh - height - 16],
    [vw - width - 96, 16],
    [vw - width - 96, vh - height - 16],
    [16, (vh - height) / 2],
    [vw - width - 96, (vh - height) / 2],
    [(vw - width) / 2, 16],
    [(vw - width) / 2, vh - height - 16],
  ];
  function hitsRock(left, top) {
    const nearestX = Math.max(left, Math.min(anchor.x, left + width));
    const nearestY = Math.max(top, Math.min(anchor.y, top + height));
    return Math.hypot(anchor.x - nearestX, anchor.y - nearestY) < anchor.r + 28;
  }
  const open = spots.filter(([left, top]) => {
    if (left < 8 || top < 8) return false;
    if (left + width > vw - 8 || top + height > vh - 8) return false;
    return !hitsRock(left, top);
  });
  const ranked = (open.length ? open : spots).slice().sort((a, b) => {
    const da = Math.hypot(a[0] + width / 2 - anchor.x, a[1] + height / 2 - anchor.y);
    const db = Math.hypot(b[0] + width / 2 - anchor.x, b[1] + height / 2 - anchor.y);
    return db - da;
  });
  const [left, top] = ranked[0];
  return {
    left: Math.max(8, Math.min(left, vw - width - 8)),
    top: Math.max(8, Math.min(top, vh - height - 8)),
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

  const place = placeExtractPanel(snapshot.extractAnchor);
  const shownAnswer = hud.buffer
    ? hud.buffer
    : snapshot.fxGreen && snapshot.correctAnswer
      ? snapshot.correctAnswer
      : '·';

  return (
    <>
      {extractMode && (
        <div id="extract" className="overlay extract-overlay">
          <div className="extract-panel" style={{ left: place.left, top: place.top }}>
            <p className="eyebrow">Extraction</p>
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
