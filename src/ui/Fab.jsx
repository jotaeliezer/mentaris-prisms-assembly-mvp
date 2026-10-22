import { useState } from 'react';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'basics', label: 'By hand', icon: '/images/categories/basics.svg' },
  { id: 'alloys', label: 'Alloys', icon: '/images/categories/alloys.svg' },
  { id: 'weapons', label: 'Weapons', icon: '/images/categories/weapons.svg' },
  { id: 'ship', label: 'Ship improvements', icon: '/images/categories/ship.svg' },
  { id: 'hud', label: 'HUD tools', icon: '/images/categories/hud.svg' },
  { id: 'abilities', label: 'Abilities', icon: '/images/categories/abilities.svg' },
  { id: 'construction', label: 'Construction', icon: '/images/categories/construction.svg' },
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
  const category = selected ? CATEGORIES.find((cat) => cat.id === selected.category) : null;

  return (
    <div id="fab" className="overlay">
      <div className="panel fab-panel fab-wide">
        <p className="eyebrow">Fabrication bay</p>
        <h2>Count recipes</h2>
        <p className="lede" id="fab-copy">
          {snapshot.fabCopy}
        </p>
        <div className="fab-cats" role="tablist" aria-label="Recipe categories">
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
                }}
              >
                {cat.icon ? <img className="fab-cat-icon" src={cat.icon} alt="" /> : null}
                {cat.label}
              </button>
            );
          })}
        </div>
        <div className="fab-layout">
          <div className="fab-icon-grid" role="list">
            {visible.map((recipe) => (
              <button
                key={recipe.id}
                id={'craft-' + recipe.id}
                type="button"
                role="listitem"
                className={`fab-icon-btn${selectedId === recipe.id ? ' is-hot' : ''}${recipe.ready ? '' : ' is-short'}`}
                aria-label={recipe.name}
                aria-pressed={selectedId === recipe.id}
                onClick={() => {
                  beep(bridge);
                  setSelectedId(recipe.id);
                }}
              >
                {itemPicture(recipe)}
              </button>
            ))}
          </div>
          <aside className="fab-info" aria-live="polite">
            {selected ? (
              <>
                <div className="fab-info-head">
                  {itemPicture(selected)}
                  <div>
                    <p className="fab-readout-name">{selected.name}</p>
                    {category ? <p className="fab-info-cat">{category.label}</p> : null}
                  </div>
                </div>
                <p className="fab-readout-body">{selected.about || 'A fabrication count.'}</p>
                <p className="fab-info-label">Recipe</p>
                <ul className="fab-recipe">
                  {(selected.costs || []).map((cost) => (
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
              <p className="fab-readout-body">Choose an icon to read the item and its recipe.</p>
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
            Resume flight
          </button>
        </div>
      </div>
    </div>
  );
}
