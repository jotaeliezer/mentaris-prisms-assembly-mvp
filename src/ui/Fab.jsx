import { useState } from 'react';

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
  const visible = recipes.filter((recipe) => filter === 'all' || recipe.category === filter);
  const selected = recipes.find((recipe) => recipe.id === selectedId) || null;

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
                onClick={() => {
                  beep(bridge);
                  setSelectedId(recipe.id);
                }}
              >
                {itemPicture(recipe)}
                <span className="fab-icon-name">{recipe.name}</span>
              </button>
            ))}
          </div>
          <aside className="fab-side" aria-live="polite">
            {selected ? (
              <>
                <p className="fab-readout-name">{selected.name}</p>
                <div className="fab-cost-row">
                  {(selected.costs || []).map((cost) => (
                    <div key={cost.id} className="fab-cost" title={cost.name}>
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
    </div>
  );
}
