import { useEffect, useRef, useState } from 'react';
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

/** t=0 is on the bottom edge, t=1 is on the right edge. The middle bows toward the corner. */
function quarterPoint(t, radius, center) {
  const phi = Math.PI * (1.5 - t * 0.5);
  return {
    right: center + Math.cos(phi) * radius,
    bottom: center + Math.sin(phi) * radius,
  };
}

/**
 * Cargo sits on the bottom-right quarter of a circle whose center is inside the
 * screen. Bands are spaced so slot centers never land on each other. The hotbar
 * uses two shorter arcs just inside that fan.
 */
function arcLayout(viewW, viewH) {
  const edge = 28;
  const cargoPitch = 52;
  const cargoRadial = 56;
  const hotPitch = 60;
  const hotRadial = 64;
  const hotClear = 58;
  let best = null;
  for (let bands = 2; bands <= 5; bands += 1) {
    const per = Math.ceil(40 / bands);
    const minInner = (cargoPitch * Math.max(1, per - 1)) / (Math.PI / 2);
    const hotInnerMin = (hotPitch * 4) / (Math.PI / 2);
    const cargoInner = Math.max(minInner, hotInnerMin + hotRadial + hotClear);
    const cargoOuter = cargoInner + (bands - 1) * cargoRadial;
    if (!best || cargoOuter < best.cargoOuter) {
      best = {
        bands,
        cargoInner,
        cargoOuter,
        hotOuter: cargoInner - hotClear,
        hotRadial,
        cargoRadial,
      };
    }
  }
  const reach = best.cargoOuter + edge + 24;
  const fit = Math.min(1, (Math.max(viewW, 320) - 8) / reach, (Math.max(viewH, 320) - 8) / reach);
  const scale = (value) => value * fit;
  return {
    bands: best.bands,
    center: scale(best.cargoOuter + edge),
    cargoOuter: scale(best.cargoOuter),
    cargoRadial: scale(best.cargoRadial),
    hotOuter: scale(best.hotOuter),
    hotRadial: scale(best.hotRadial),
    fit,
    closedRadius: 172,
    closedCenter: 194,
  };
}

function hotbarPose(index, selected, count, open, layout) {
  const n = Math.max(count, 1);
  if (open) {
    const row = index < 5 ? 0 : 1;
    const along = index % 5;
    const t = along / 4;
    const radius = layout.hotOuter - row * layout.hotRadial;
    return {
      ...quarterPoint(t, radius, layout.center),
      scale: (index === selected ? 1.08 : 1) * layout.fit,
      visible: true,
      z: index === selected ? 7 : 5,
    };
  }
  let delta = index - selected;
  if (delta > n / 2) delta -= n;
  if (delta < -n / 2) delta += n;
  const t = 0.5 + delta * 0.28;
  const visible = t > 0.02 && t < 0.98;
  const scale = delta === 0 ? 1.42 : Math.abs(delta) === 1 ? 1 : 0.9;
  return {
    ...quarterPoint(t, layout.closedRadius, layout.closedCenter),
    scale,
    visible,
    z: delta === 0 ? 6 : 3,
  };
}

function cargoPose(index, layout) {
  const band = index % layout.bands;
  const along = Math.floor(index / layout.bands);
  const per = Math.ceil(40 / layout.bands);
  const t = per <= 1 ? 0.5 : along / (per - 1);
  const radius = layout.cargoOuter - band * layout.cargoRadial;
  return { ...quarterPoint(t, radius, layout.center), scale: layout.fit, visible: true, z: 2 };
}

function platePath(center, outer, inner, box, bleed, t0, t1) {
  const steps = 24;
  const pts = [];
  const push = (t, radius) => {
    const point = quarterPoint(t, radius, center);
    pts.push({ x: box - bleed - point.right, y: box - bleed - point.bottom });
  };
  for (let i = 0; i <= steps; i += 1) push(t0 + ((t1 - t0) * i) / steps, outer);
  for (let i = steps; i >= 0; i -= 1) push(t0 + ((t1 - t0) * i) / steps, inner);
  if (!pts.length) return '';
  return (
    'M ' +
    pts.map((point) => point.x.toFixed(1) + ' ' + point.y.toFixed(1)).join(' L ') +
    ' Z'
  );
}

function ArcPlate({ size, center, outer, inner, tone, t0 = -0.1, t1 = 1.1, bleed = 56 }) {
  if (!(outer > inner + 6) || !size) return null;
  const box = size + bleed;
  const d = platePath(center, outer, Math.max(8, inner), box, bleed, t0, t1);
  return (
    <svg
      className={`arc-plate arc-plate-${tone}`}
      width={box}
      height={box}
      style={{ right: -bleed, bottom: -bleed }}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
function ringStyle(pose) {
  return {
    right: pose.right,
    bottom: pose.bottom,
    opacity: pose.visible ? 1 : 0,
    pointerEvents: pose.visible ? 'auto' : 'none',
    zIndex: pose.z || Math.round(pose.scale * 10),
    '--slot-scale': String(pose.scale),
  };
}

function useViewport() {
  const [size, setSize] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));
  useEffect(() => {
    function onResize() {
      setSize({ w: window.innerWidth, h: window.innerHeight });
    }
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
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
  const tipTimer = useRef(null);

  function showSlotTip(slot, event) {
    if (!slot.available && !slot.slotLabel) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setTip({
      name: slot.available ? slot.name || slot.label : slot.slotLabel,
      x: rect.left,
      y: rect.top,
    });
    if (tipTimer.current) window.clearTimeout(tipTimer.current);
    tipTimer.current = window.setTimeout(() => setTip(null), 3000);
  }

  useEffect(() => () => {
    if (tipTimer.current) window.clearTimeout(tipTimer.current);
  }, []);
  const hull = snapshot.hullRack;
  const hullSlots = hull && Array.isArray(hull.slots) ? hull.slots : [];
  const showHull = !!(hull && hull.visible);
  const [pointer, setPointer] = useState(null);
  const view = useViewport();
  const layout = arcLayout(view.w, view.h);

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

  function onHotbarWheel(event, slot) {
    if (!cargoOpen || !slot.available) return;
    event.preventDefault();
    event.stopPropagation();
    bridge.emit('shiftOne', { index: slot.index, dir: event.deltaY > 0 ? 1 : -1 });
  }

  function slotProps(area, slot) {
    return {
      'data-slot-area': area,
      'data-slot-index': slot.index,
      onPointerDown: (event) => beginDrag(event, area, slot.index, slot),
      onPointerMove: moveDrag,
      onPointerUp: endDrag,
      onPointerCancel: () => setDrag(null),
      onMouseEnter: (event) => showSlotTip(slot, event),
      onWheel: area === 'hotbar' ? (event) => onHotbarWheel(event, slot) : undefined,
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
                  {slot.available ? (
                    <SlotFace icon={slot.icon} iconFilter={slot.iconFilter} mark={slot.mark} color={slot.color} />
                  ) : null}
                </button>
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
            <p className="cargo-held" style={{ right: layout.center, bottom: layout.center }}>
              Holding {snapshot.held.name}
              {snapshot.held.count > 1 ? ' × ' + snapshot.held.count : ''}. Click a slot to place it.
            </p>
          ) : null}
          {cargoOpen && (
            <ArcPlate
              size={layout.center + 96}
              center={layout.center}
              outer={layout.cargoOuter + 68}
              inner={layout.cargoOuter - (layout.bands - 1) * layout.cargoRadial - 68}
              tone="cargo"
            />
          )}
          {cargoOpen && (
            <ArcPlate
              size={layout.center + 96}
              center={layout.center}
              outer={layout.hotOuter + 66}
              inner={layout.hotOuter - layout.hotRadial - 66}
              tone="hot"
            />
          )}
          {cargoOpen && (
            <div id="cargo" className="cargo-arc" role="dialog" aria-label="Cargo">
              {cargoSlots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  className={`hotbar-slot ring-slot cargo-slot${slot.available ? '' : ' empty'}${
                    drag && drag.area === 'cargo' && drag.index === slot.index ? ' lifting' : ''
                  }`}
                  style={ringStyle(cargoPose(slot.index, layout))}
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
                style={ringStyle(hotbarPose(slot.index, hotbar.selected || 0, slots.length, cargoOpen, layout))}
                aria-pressed={slot.selected ? 'true' : 'false'}
                aria-label={
                  slot.available ? slot.label + ', slot ' + slot.key : 'Empty slot ' + slot.key
                }
                {...slotProps('hotbar', slot)}
              >
                <span className={`hotbar-key${String(slot.key).length > 1 ? ' is-wide' : ''}`}>{slot.key}</span>
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
