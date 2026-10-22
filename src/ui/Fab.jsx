import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'basics', label: 'Direct', icon: '/images/categories/basics.png' },
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
  const [hoverId, setHoverId] = useState(null);
  const [point, setPoint] = useState(null);
  const hideTimer = useRef(null);
  const cardRef = useRef(null);
  const following = useRef(true);
  const visible = recipes.filter((recipe) => filter === 'all' || recipe.category === filter);
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
    following.current = true;
    setHoverId(id);
    if (Number.isFinite(x) && Number.isFinite(y)) setPoint({ x, y });
  }

  function scheduleHide() {
    clearHide();
    hideTimer.current = window.setTimeout(() => setHoverId(null), 220);
  }

  useEffect(() => () => clearHide(), []);

  useEffect(() => {
    if (!hoverId) return undefined;
    function onMove(event) {
      if (!following.current) return;
      setPoint({ x: event.clientX, y: event.clientY });
    }
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [hoverId]);

  function cardStyle() {
    if (!point) return { left: 8, top: 8 };
    const width = 320;
    const height = cardRef.current ? cardRef.current.offsetHeight : 300;
    let left = point.x + 18;
    let top = point.y + 18;
    const maxX = window.innerWidth - width - 8;
    const maxY = window.innerHeight - height - 8;
    if (left > maxX) left = point.x - width - 18;
    if (top > maxY) top = point.y - height - 18;
    return { left: Math.max(8, left), top: Math.max(8, top) };
  }

  const card = hovered && point ? (
    <aside
      ref={cardRef}
      className="fab-info fab-info-float"
      style={cardStyle()}
      onPointerEnter={() => {
        following.current = false;
        clearHide();
      }}
      onPointerLeave={scheduleHide}
    >
      <div className="fab-info-head">
        {itemPicture(hovered)}
        <div>
          <p className="fab-readout-name">{hovered.name}</p>
          {category ? <p className="fab-info-cat">{category.label}</p> : null}
        </div>
      </div>
      <p className="fab-readout-body">{hovered.about || 'A fabrication count.'}</p>
      <p className="fab-info-label">Inputs</p>
      <ul className="fab-recipe">
        {(hovered.costs || []).map((cost) => (
          <li key={cost.id}>
            {itemPicture(cost)}
            <span>
              {cost.n} {cost.name}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn btn-primary"
        disabled={!hovered.ready}
        onClick={() => {
          if (!hovered.ready) return;
          beep(bridge);
          bridge.emit('craft', hovered.id);
        }}
      >
        {hovered.ready ? 'Fabricate' : 'Missing materials'}
      </button>
    </aside>
  ) : null;

  return (
    <div id="fab" className="overlay">
      <div className="panel fab-panel fab-wide">
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
                  setHoverId(null);
                  setPoint(null);
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
                className={`fab-icon-btn${hoverId === recipe.id ? ' is-hot' : ''}${recipe.ready ? '' : ' is-short'}`}
                aria-label={recipe.name}
                onPointerEnter={(event) => {
                  if (event.pointerType === 'touch') return;
                  showCard(recipe.id, event.clientX, event.clientY);
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType === 'touch') return;
                  scheduleHide();
                }}
                onPointerDown={(event) => {
                  if (event.pointerType !== 'touch') return;
                  showCard(recipe.id, event.clientX, event.clientY);
                  following.current = false;
                }}
              >
                {itemPicture(recipe)}
                <span className="fab-icon-name">{recipe.name}</span>
              </button>
            ))}
          </div>
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
    </div>
  );
}
