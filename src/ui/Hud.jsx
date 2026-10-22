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

function arcPoint(angleDeg, radius) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    left: Math.cos(rad) * radius,
    bottom: Math.sin(rad) * radius,
  };
}

function hotbarPose(index, selected, count, open) {
  const n = Math.max(count, 1);
  let delta = index - selected;
  if (delta > n / 2) delta -= n;
  if (delta < -n / 2) delta += n;
  if (open) {
    const span = 132;
    const start = 16;
    const t = n <= 1 ? 0.5 : index / (n - 1);
    const angle = start + span * t;
    const scale = index === selected ? 1.28 : 1;
    return { ...arcPoint(angle, 196), scale, visible: true };
  }
  const angle = 50 + delta * (360 / n);
  const visible = angle > -6 && angle < 104;
  const scale = delta === 0 ? 1.62 : Math.abs(delta) === 1 ? 1.02 : 0.86;
  return { ...arcPoint(angle, 158), scale, visible };
}

function cargoPose(index, count) {
  const rows = Math.max(1, Math.ceil(count / 2));
  const along = Math.floor(index / 2);
  const band = index % 2;
  const t = rows <= 1 ? 0.5 : along / (rows - 1);
  const angle = 14 + 152 * t;
  return { ...arcPoint(angle, band === 0 ? 348 : 268), scale: 0.78, visible: true };
}

function ringStyle(pose) {
  return {
    left: pose.left,
    bottom: pose.bottom,
    transform: `translate(-50%, 50%) scale(${pose.scale})`,
    opacity: pose.visible ? 1 : 0,
    pointerEvents: pose.visible ? 'auto' : 'none',
    zIndex: Math.round(pose.scale * 10),
  };
}

function SlotFace({ icon, mark, color, iconFilter }) {
  if (icon) {
    return <img src={icon} alt="" draggable="false" style={iconFilter && iconFilter !== 'none' ? { filter: iconFilter } : undefined} />;
  }
  return (
    <span className="hotbar-swatch" style={{ background: color }}>
      {mark}
    </span>
  );
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
  const showHull = !!(hull && hull.visible);
  const [pointer, setPointer] = useState(null);

  function inventoryGesture(area) {
    return cargoOpen || !!snapshot.held || area === 'hull';
  }

  useEffect(() => {
    function onMove(event) {
      setPointer({ x: event.clientX, y: event.clientY });
    }
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  function beginDrag(event, area, index, slot) {
    if (!slot.available) {
      if (inventoryGesture(area)) bridge.emit('inventoryClick', { area, index });
      else if (area === 'hotbar') bridge.emit('selectHotbar', index);
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      area,
      index,
      mark: slot.mark,
      icon: slot.icon || '',
      iconFilter: slot.iconFilter || 'none',
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
      if (inventoryGesture(drag.area)) {
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
        {hud.mainStar ? (
          <div
            className="main-star"
            aria-label={
              'Main star ' +
              hud.mainStar.name +
              '. ' +
              (hud.mainStar.up ? 'Up. The lair is open.' : 'Down. The lair is shut.')
            }
          >
            <div className="main-star-arc" aria-hidden="true">
              <span className="main-star-horizon" />
              <span
                className={`main-star-body${hud.mainStar.up ? '' : ' is-down'}`}
                style={{ left: hud.mainStar.x + '%', top: hud.mainStar.y + '%' }}
              />
            </div>
            <span className="main-star-name">{hud.mainStar.label || hud.mainStar.name}</span>
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
      {showHull && (
        <div id="hull" className="hull-drawer" aria-label="Hull">
          <p className="hull-title">Hull</p>
          <div className="hull-grid">
            {hullSlots.map((slot) => (
              <div
                key={slot.accept}
                className={`hull-slot-row${slot.canLevel ? ' has-raise' : ''}`}
                data-slot-area="hull"
                data-slot-index={slot.index}
              >
                <button
                  type="button"
                  className={`hotbar-slot hull-slot${slot.available ? ' lit' : ' empty'}${
                    drag && drag.area === 'hull' && drag.index === slot.index ? ' lifting' : ''
                  }`}
                  aria-label={
                    slot.available
                      ? slot.levelLabel
                        ? slot.name + ', ' + slot.levelLabel
                        : slot.name
                      : slot.slotLabel
                  }
                  {...slotProps('hull', slot)}
                >
                  <span className="hull-slot-label">{slot.slotLabel}</span>
                  {slot.available ? (
                    <SlotFace icon={slot.icon} iconFilter={slot.iconFilter} mark={slot.mark} color={slot.color} />
                  ) : null}
                  {slot.levelLabel ? <span className="hull-level">{slot.levelLabel}</span> : null}
                </button>
                {slot.canLevel ? (
                  <button
                    type="button"
                    className={`hull-level-btn${slot.levelReady ? '' : ' is-short'}`}
                    aria-label={
                      'Raise ' +
                      slot.slotLabel +
                      ' to level ' +
                      (Number(slot.level) + 1) +
                      '. Costs 3 Pale ore. Stand-in.'
                    }
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      bridge.emit('raiseBow');
                    }}
                  >
                    {slot.levelAction}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
      {slots.length > 0 && (
        <div
          className={`hotbar-dock${snapshot.mapUnlocked ? ' hotbar-clear-map' : ''}`}
        >
          {(snapshot.notices || []).some((note) => note.kind === 'loot') ? (
            <div className="loot-toasts" aria-live="polite">
              {(snapshot.notices || [])
                .filter((note) => note.kind === 'loot')
                .map((note) => (
                  <div key={note.id} className="craft-toast loot-toast">
                    {note.text}
                  </div>
                ))}
            </div>
          ) : null}
          {cargoOpen && snapshot.held ? (
            <p className="cargo-held">
              Holding {snapshot.held.name}
              {snapshot.held.count > 1 ? ' × ' + snapshot.held.count : ''}. Click a slot to place it.
            </p>
          ) : null}
          {cargoOpen && (
            <div id="cargo" className="cargo-arc" role="dialog" aria-label="Cargo">
              {cargoSlots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  className={`hotbar-slot ring-slot cargo-slot${slot.available ? '' : ' empty'}${
                    drag && drag.area === 'cargo' && drag.index === slot.index ? ' lifting' : ''
                  }`}
                  style={ringStyle(cargoPose(slot.index, cargoSlots.length))}
                  aria-label={slot.available ? slot.label : 'Empty cargo'}
                  {...slotProps('cargo', slot)}
                >
                  {slot.available ? (
                    <SlotFace icon={slot.icon} iconFilter={slot.iconFilter} mark={slot.mark} color={slot.color} />
                  ) : null}
                  {slot.badge ? <span className="hotbar-badge">{slot.badge}</span> : null}
                </button>
              ))}
            </div>
          )}
          <div id="hotbar" className="hotbar" role="toolbar" aria-label="Ship tools">
            {slots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                className={`hotbar-slot ring-slot${slot.selected ? ' selected' : ''}${slot.available ? '' : ' empty'}${
                  drag && drag.area === 'hotbar' && drag.index === slot.index ? ' lifting' : ''
                }`}
                style={ringStyle(hotbarPose(slot.index, hotbar.selected || 0, slots.length, cargoOpen))}
                aria-pressed={slot.selected ? 'true' : 'false'}
                aria-label={
                  slot.available ? slot.label + ', slot ' + slot.key : 'Empty slot ' + slot.key
                }
                {...slotProps('hotbar', slot)}
              >
                <span className="hotbar-key">{slot.key}</span>
                {slot.available ? (
                  <SlotFace icon={slot.icon} iconFilter={slot.iconFilter} mark={slot.mark} color={slot.color} />
                ) : null}
                {slot.badge ? <span className="hotbar-badge">{slot.badge}</span> : null}
              </button>
            ))}
          </div>
        </div>
      )}
      {drag ? (
        <div className="drag-ghost" style={{ left: drag.x, top: drag.y }}>
          <SlotFace icon={drag.icon} iconFilter={drag.iconFilter} mark={drag.mark} color={drag.color} />
        </div>
      ) : snapshot.held && pointer ? (
        <div className="drag-ghost" style={{ left: pointer.x, top: pointer.y }}>
          <SlotFace icon={snapshot.held.icon} iconFilter={snapshot.held.iconFilter} mark={snapshot.held.mark} color={snapshot.held.color} />
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
