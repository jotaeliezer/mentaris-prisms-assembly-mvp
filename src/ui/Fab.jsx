import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'basics', label: 'Immediate Fabrication', icon: '/images/categories/basics.png' },
  { id: 'alloys', label: 'Alloys', icon: '/images/categories/alloys.png' },
  { id: 'weapons', label: 'Weapons', icon: '/images/categories/weapons.png' },
  { id: 'ship', label: 'Ship improvements', icon: '/images/categories/ship.png' },
  { id: 'hud', label: 'HUD tools', icon: '/images/categories/hud.png' },
  { id: 'abilities', label: 'Abilities', icon: '/images/categories/abilities.png' },
  { id: 'construction', label: 'Construction', icon: '/images/categories/construction.png' },
];

function beep(bridge) {
  bridge.emit('uiBeep');
}

function itemPicture(item) {
  if (!item || !item.icon) return null;
  return (
    <img
      src={item.icon}
      alt=""
      style={item.iconFilter && item.iconFilter !== 'none' ? { filter: item.iconFilter } : undefined}
    />
  );
}

export default function Fab({ bridge, snapshot }) {
  const recipes = Array.isArray(snapshot.recipes) ? snapshot.recipes : [];
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const [point, setPoint] = useState(null);
  const hideTimer = useRef(null);
  const [onlyReady, setOnlyReady] = useState(false);
  const [costTip, setCostTip] = useState(null);
  const visible = recipes.filter((recipe) => {
    if (onlyReady && !recipe.ready) return false;
    return filter === 'all' || recipe.category === filter;
  });
  const selected = recipes.find((recipe) => recipe.id === selectedId) || null;
  const hovered = recipes.find((recipe) => recipe.id === hoverId) || null;
  const category = hovered ? CATEGORIES.find((cat) => cat.id === hovered.category) : null;

  function clearHide() {
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }

  function showCard(id, x, y) {
    clearHide();
    setHoverId(id);
    if (Number.isFinite(x) && Number.isFinite(y)) setPoint({ x, y });
  }

  function scheduleHide() {
    clearHide();
    hideTimer.current = window.setTimeout(() => setHoverId(null), 160);
  }

  useEffect(() => () => clearHide(), []);

  function cardStyle() {
    if (!point) return { left: 8, top: 8 };
    const width = 300;
    let left = point.x + 16;
    let top = point.y + 16;
    if (left > window.innerWidth - width - 8) left = point.x - width - 16;
    if (top > window.innerHeight - 220) top = Math.max(8, point.y - 200);
    return { left: Math.max(8, left), top: Math.max(8, top) };
  }

  const cargoSlots = snapshot.cargoHold && Array.isArray(snapshot.cargoHold.slots) ? snapshot.cargoHold.slots : [];
  const cargoShown = cargoSlots.filter((slot) => slot.available);
  const barSlots =
    snapshot.hud && snapshot.hud.hotbar && Array.isArray(snapshot.hud.hotbar.slots)
      ? snapshot.hud.hotbar.slots.filter((slot) => slot.available)
      : [];

  const card = hovered && point ? (
    <aside className="fab-info fab-info-float" style={cardStyle()} onPointerEnter={clearHide} onPointerLeave={scheduleHide}>
      <p className="fab-readout-name">{hovered.name}</p>
      {category ? <p className="fab-info-cat">{category.label}</p> : null}
      <p className="fab-readout-body">{hovered.about || 'A fabrication count.'}</p>
    </aside>
  ) : null;

  return (
    <div id="fab" className="overlay">
      <div className="panel fab-panel fab-wide">
        <button
          type="button"
          className={`btn fab-ready-toggle${onlyReady ? ' active' : ''}`}
          aria-pressed={onlyReady}
          onClick={() => {
            beep(bridge);
            setOnlyReady((current) => !current);
            setSelectedId(null);
          }}
        >
          {onlyReady ? 'Show all' : 'Craftable only'}
        </button>
        <p className="eyebrow">Fabrication bay</p>
        <h2>Fabrication index</h2>
        <p className="lede" id="fab-copy">
          {snapshot.fabCopy}
        </p>
        <div className="fab-cats" role="tablist" aria-label="Fabrication groups">
          {CATEGORIES.map((cat) => {
            const count =
              cat.id === 'all' ? recipes.length : recipes.filter((recipe) => recipe.category === cat.id).length;
            if (cat.id !== 'all' && !count) return null;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={filter === cat.id}
                className={`btn fab-cat${filter === cat.id ? ' active' : ''}`}
                onClick={() => {
                  beep(bridge);
                  setFilter(cat.id);
                  setSelectedId(null);
                }}
              >
                {cat.icon ? <img className="fab-cat-icon" src={cat.icon} alt="" /> : null}
                {cat.label}
              </button>
            );
          })}
        </div>
        <div className="fab-layout">
          <div className="fab-icon-grid">
            {visible.map((recipe) => (
              <button
                key={recipe.id}
                id={'craft-' + recipe.id}
                type="button"
                className={`fab-icon-btn${selectedId === recipe.id ? ' is-hot' : ''}${recipe.ready ? '' : ' is-short'}`}
                aria-pressed={selectedId === recipe.id}
                aria-label={recipe.name}
                onPointerEnter={(event) => showCard(recipe.id, event.clientX, event.clientY)}
                onPointerLeave={scheduleHide}
                onClick={() => {
                  beep(bridge);
                  setSelectedId(recipe.id);
                }}
              >
                {itemPicture(recipe)}
                <span className="fab-icon-name">{recipe.name}</span>
              </button>
            ))}
            {!visible.length ? <p className="fab-readout-body">Nothing in this group can be fabricated right now.</p> : null}
          </div>
          <aside className="fab-side" aria-live="polite">
            {selected ? (
              <>
                <p className="fab-readout-name">{selected.name}</p>
                <div className="fab-cost-row">
                  {(selected.costs || []).map((cost) => (
                    <div
                      key={cost.id}
                      className="fab-cost"
                      onPointerEnter={(event) =>
                        setCostTip({
                          name: cost.name,
                          have: cost.have,
                          x: event.clientX,
                          y: event.clientY,
                        })
                      }
                      onPointerMove={(event) =>
                        setCostTip((current) =>
                          current ? { ...current, x: event.clientX, y: event.clientY } : current
                        )
                      }
                      onPointerLeave={() => setCostTip(null)}
                    >
                      {itemPicture(cost)}
                      <span className="fab-cost-badge">{cost.n}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!selected.ready}
                  onClick={() => {
                    if (!selected.ready) return;
                    beep(bridge);
                    bridge.emit('craft', selected.id);
                  }}
                >
                  {selected.ready ? 'Fabricate' : 'Missing materials'}
                </button>
              </>
            ) : (
              <p className="fab-readout-body">Click an icon. Its inputs sit here.</p>
            )}
          </aside>
        </div>
        <div className="fab-cargo" aria-label="Hold">
          <p className="eyebrow">Hotbar</p>
          {barSlots.length ? (
            <div className="fab-cargo-row">
              {barSlots.map((slot) => (
                <div key={slot.id} className="fab-cost fab-cargo-slot">
                  {itemPicture(slot)}
                  <span className="fab-cost-badge">{slot.badge || '1'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="fab-readout-body">Hotbar is empty.</p>
          )}
          <p className="eyebrow">Cargo</p>
          {cargoShown.length ? (
            <div className="fab-cargo-row">
              {cargoShown.map((slot) => (
                <div key={slot.id} className="fab-cost fab-cargo-slot">
                  {itemPicture(slot)}
                  <span className="fab-cost-badge">{slot.badge || '1'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="fab-readout-body">Cargo is empty.</p>
          )}
        </div>
        <div className="missions fab-footer">
          <button
            id="close-fab"
            className="btn"
            type="button"
            onClick={() => {
              beep(bridge);
              bridge.emit('setFab', false);
            }}
          >
            Close
          </button>
        </div>
      </div>
      {card && typeof document !== 'undefined' ? createPortal(card, document.body) : null}
      {costTip && typeof document !== 'undefined'
        ? createPortal(
            <div className="fab-name-pop" style={{ left: costTip.x + 14, top: costTip.y + 16 }}>
              <p className="fab-readout-name">{costTip.name}</p>
              <p className="fab-readout-body">{costTip.have || 0} in the hold</p>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
