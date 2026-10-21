import { useEffect, useState } from 'react';
import { readPilotName } from '../game/pilot.js';
import { GearIcon } from './SettingsPanel.jsx';
import SessionControls from './SessionControls.jsx';

const HINT_TICK_MS = 32;
const HINT_CAP_MS = 1400;

function typewriterPlan(length) {
  if (length <= 1 || length * HINT_TICK_MS <= HINT_CAP_MS) {
    return { interval: HINT_TICK_MS, chunk: 1 };
  }
  const perChar = Math.floor(HINT_CAP_MS / length);
  if (perChar >= 16) return { interval: perChar, chunk: 1 };
  const ticks = Math.max(1, Math.floor(HINT_CAP_MS / 28));
  return { interval: 28, chunk: Math.ceil(length / ticks) };
}

function HintBar({ text, besideMap }) {
  const full = text || '';
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!full) {
      setCount(0);
      return undefined;
    }
    const reduce =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setCount(full.length);
      return undefined;
    }
    const { interval, chunk } = typewriterPlan(full.length);
    setCount(0);
    let shown = 0;
    let timer = 0;
    const started = performance.now();
    const tick = () => {
      shown = Math.min(full.length, shown + chunk);
      setCount(shown);
      if (shown >= full.length) return;
      timer = window.setTimeout(tick, interval);
    };
    const begin = () => {
      const hud = document.getElementById('hud');
      const opacity = hud ? Number.parseFloat(getComputedStyle(hud).opacity) : 1;
      if (opacity < 0.45 && performance.now() - started < 5000) {
        timer = window.setTimeout(begin, 80);
        return;
      }
      tick();
    };
    begin();
    return () => window.clearTimeout(timer);
  }, [full]);

  if (!full) return <p id="hint" className="hint" hidden />;

  const typing = count < full.length;
  return (
    <p
      id="hint"
      className={`hint${besideMap ? ' hint-beside-map' : ''}${typing ? ' hint-typing' : ''}`}
    >
      <span className="hint-full" role="status">
        {full}
      </span>
      <span aria-hidden="true">{full.slice(0, count)}</span>
      {typing ? <span className="hint-caret" aria-hidden="true" /> : null}
    </p>
  );
}

export default function Hud({ bridge, snapshot, showFlightGear, flightSettingsOpen, onFlightGear }) {
  const hud = snapshot.hud || {};
  const hullPct = Number.isFinite(hud.hullPct) ? hud.hullPct : 100;
  const hullLow = hullPct <= 35;
  const hullCrit = hullPct <= 15;
  const hotbar = hud.hotbar;
  const slots = hotbar && Array.isArray(hotbar.slots) ? hotbar.slots : [];
  const cargo = snapshot.cargoHold;
  const cargoSlots = cargo && Array.isArray(cargo.slots) ? cargo.slots : [];
  const cargoOpen = !!snapshot.cargoOpen;
  const [drag, setDrag] = useState(null);
  const [tip, setTip] = useState(null);
  const hull = snapshot.hullRack;
  const hullSlots = hull && Array.isArray(hull.slots) ? hull.slots : [];
  const hullOpen = !!snapshot.hullOpen;
  const [pointer, setPointer] = useState(null);

  useEffect(() => {
    function onMove(event) {
      setPointer({ x: event.clientX, y: event.clientY });
    }
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  function beginDrag(event, area, index, slot) {
    if (!slot.available) {
      if (cargoOpen || hullOpen) bridge.emit('inventoryClick', { area, index });
      else if (area === 'hotbar') bridge.emit('selectHotbar', index);
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      area,
      index,
      mark: slot.mark,
      color: slot.color,
      x0: event.clientX,
      y0: event.clientY,
      x: event.clientX,
      y: event.clientY,
    });
  }

  function moveDrag(event) {
    if (!drag) return;
    setDrag((current) =>
      current ? { ...current, x: event.clientX, y: event.clientY } : current
    );
  }

  function endDrag(event) {
    if (!drag) return;
    const moved = Math.hypot(event.clientX - drag.x0, event.clientY - drag.y0) > 6;
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    const slotEl = hit && hit.closest ? hit.closest('[data-slot-area]') : null;
    if (moved && slotEl) {
      const toArea = slotEl.getAttribute('data-slot-area');
      const toIndex = Number(slotEl.getAttribute('data-slot-index'));
      if (toArea && (toArea !== drag.area || toIndex !== drag.index)) {
        bridge.emit('inventoryDrag', {
          fromArea: drag.area,
          fromIndex: drag.index,
          toArea,
          toIndex,
        });
      }
    } else if (!moved) {
      if (cargoOpen || hullOpen) {
        bridge.emit('inventoryClick', { area: drag.area, index: drag.index });
      } else if (drag.area === 'hotbar') {
        bridge.emit('selectHotbar', drag.index);
      }
    }
    setDrag(null);
  }

  function slotProps(area, slot) {
    return {
      'data-slot-area': area,
      'data-slot-index': slot.index,
      onPointerDown: (event) => beginDrag(event, area, slot.index, slot),
      onPointerMove: moveDrag,
      onPointerUp: endDrag,
      onPointerCancel: () => setDrag(null),
      onMouseEnter: (event) => {
        if (!slot.available && !slot.slotLabel) return;
        setTip({
          name: slot.available ? slot.name : slot.slotLabel,
          x: event.clientX,
          y: event.clientY,
        });
      },
      onMouseMove: (event) => {
        setTip((current) => (current ? { ...current, x: event.clientX, y: event.clientY } : current));
      },
      onMouseLeave: () => setTip(null),
    };
  }

  const introShip = snapshot.intro && snapshot.intro.ship != null ? snapshot.intro.ship : 1;
  return (
    <div id="hud" className="hud" style={{ opacity: introShip }}>
      <div className="hud-top">
        <div
          id="hull-readout"
          className={`hull-readout${hullLow ? ' low' : ''}${hullCrit ? ' crit' : ''}`}
        >
          <div
            className="hull-meter"
            role="meter"
            aria-label="Hull integrity"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={hullPct}
            aria-valuetext={hud.hull ?? '100'}
          >
            <div className="hull-meter-fill" style={{ width: `${hullPct}%` }} />
          </div>
        </div>
        {hud.compass ? (
          <div
            className="layer-compass"
            aria-label={
              'Layer ' +
              hud.compass.layer +
              '. Ship is ' +
              (hud.compass.along < 0.33 ? 'far left' : hud.compass.along > 0.66 ? 'far right' : 'near the middle') +
              ' on this layer.'
            }
          >
            <strong className="layer-compass-num">{hud.compass.layer}</strong>
            <div className="layer-compass-track">
              <span className="layer-compass-line" />
              <span
                className="layer-compass-dot"
                style={{ left: `${hud.compass.along * 100}%` }}
              />
            </div>
          </div>
        ) : null}
        <div className="flight-tools">
          <span className="pilot-name">{readPilotName()}</span>
          {showFlightGear ? (
            <button
              type="button"
              className="flight-gear"
              aria-label="Settings"
              aria-haspopup="dialog"
              aria-expanded={flightSettingsOpen ? 'true' : 'false'}
              aria-controls="flight-settings"
              onClick={onFlightGear}
            >
              <GearIcon />
            </button>
          ) : null}
          <SessionControls
            bridge={bridge}
            variant="chip"
            inGame
            missionId={snapshot.missionId || 'add'}
          />
        </div>
      </div>
      <HintBar text={hud.hint || ''} besideMap={!!snapshot.mapUnlocked} />
      {hullOpen && (
        <div id="hull" className="hull-drawer" role="dialog" aria-label="Hull">
          <p className="hull-title">Hull</p>
          <div className="hull-grid">
            {hullSlots.map((slot) => (
              <button
                key={slot.accept}
                type="button"
                className={`hotbar-slot hull-slot${slot.available ? '' : ' empty'}${
                  drag && drag.area === 'hull' && drag.index === slot.index ? ' lifting' : ''
                }`}
                aria-label={slot.available ? slot.name : slot.slotLabel}
                {...slotProps('hull', slot)}
              >
                <span className="hull-slot-label">{slot.slotLabel}</span>
                {slot.available ? (
                  <span className="hotbar-swatch" style={{ background: slot.color }}>
                    {slot.mark}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      )}
      {slots.length > 0 && (
        <div
          className={`hotbar-dock${snapshot.mapUnlocked ? ' hotbar-clear-map' : ''}`}
        >
          {cargoOpen && snapshot.held ? (
            <p className="cargo-held">
              Holding {snapshot.held.name}
              {snapshot.held.count > 1 ? ' × ' + snapshot.held.count : ''}. Click a slot to place it.
            </p>
          ) : null}
          {cargoOpen && (
            <div id="cargo" className="cargo-drawer" role="dialog" aria-label="Cargo">
              <div className="cargo-grid">
                {cargoSlots.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    className={`hotbar-slot cargo-slot${slot.available ? '' : ' empty'}${
                      drag && drag.area === 'cargo' && drag.index === slot.index ? ' lifting' : ''
                    }`}
                    aria-label={slot.available ? slot.label : 'Empty cargo'}
                    {...slotProps('cargo', slot)}
                  >
                    {slot.available ? (
                      <span className="hotbar-swatch" style={{ background: slot.color }}>
                        {slot.mark}
                      </span>
                    ) : null}
                    {slot.badge ? <span className="hotbar-badge">{slot.badge}</span> : null}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div id="hotbar" className="hotbar" role="toolbar" aria-label="Ship tools">
            {slots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                className={`hotbar-slot${slot.selected ? ' selected' : ''}${slot.available ? '' : ' empty'}${
                  drag && drag.area === 'hotbar' && drag.index === slot.index ? ' lifting' : ''
                }`}
                aria-pressed={slot.selected ? 'true' : 'false'}
                aria-label={
                  slot.available ? slot.label + ', slot ' + slot.key : 'Empty slot ' + slot.key
                }
                {...slotProps('hotbar', slot)}
              >
                <span className="hotbar-key">{slot.key}</span>
                {slot.available ? (
                  <span className="hotbar-swatch" style={{ background: slot.color }}>
                    {slot.mark}
                  </span>
                ) : null}
                {slot.badge ? <span className="hotbar-badge">{slot.badge}</span> : null}
              </button>
            ))}
          </div>
        </div>
      )}
      {drag ? (
        <div className="drag-ghost" style={{ left: drag.x, top: drag.y }}>
          <span className="hotbar-swatch" style={{ background: drag.color }}>
            {drag.mark}
          </span>
        </div>
      ) : snapshot.held && pointer ? (
        <div className="drag-ghost" style={{ left: pointer.x, top: pointer.y }}>
          <span className="hotbar-swatch" style={{ background: snapshot.held.color }}>
            {snapshot.held.mark}
          </span>
          {snapshot.held.count > 1 ? <span className="hotbar-badge">{snapshot.held.count}</span> : null}
        </div>
      ) : null}
      {snapshot.rockTip ? (
        <div className="rock-tip" style={{ left: snapshot.rockTip.x, top: snapshot.rockTip.y }}>
          {snapshot.rockTip.stars}
        </div>
      ) : null}
      {tip ? (
        <div className="slot-tip" style={{ left: tip.x, top: tip.y }}>
          {tip.name}
        </div>
      ) : null}
    </div>
  );
}
