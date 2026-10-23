import { useEffect, useState } from 'react';

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const PANEL_W = 340;
const PANEL_H = 390;
const TYPE_MS = 32;

function TypeLine({ text }) {
  const full = text || '';
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!full) {
      setCount(0);
      return undefined;
    }
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setCount(full.length);
      return undefined;
    }
    setCount(0);
    let shown = 0;
    let timer = 0;
    const tick = () => {
      shown = Math.min(full.length, shown + 1);
      setCount(shown);
      if (shown < full.length) timer = window.setTimeout(tick, TYPE_MS);
    };
    timer = window.setTimeout(tick, TYPE_MS);
    return () => window.clearTimeout(timer);
  }, [full]);

  const typing = count < full.length;
  return (
    <>
      {full.slice(0, count)}
      {typing ? <span className="extract-caret" aria-hidden="true" /> : null}
    </>
  );
}

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
            <h2 id="extract-question" className="extract-question" aria-label={snapshot.extractQuestion || 'Solve to extract'}>
              <TypeLine text={snapshot.extractQuestion || 'Solve to extract'} />
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
                aria-label="Backspace"
                onClick={backspace}
              >
                ⌫
              </button>
              <button type="button" className="btn extract-key" onClick={() => digit('0')}>
                0
              </button>
              <button
                id="cancel-extract"
                type="button"
                className="btn extract-key extract-cancel"
                onClick={cancel}
              >
                Esc
              </button>
            </div>
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
