import { useState } from 'react';

const CATEGORIES = [
  { id: 'basics', label: 'By hand' },
  { id: 'alloys', label: 'Alloys' },
  { id: 'weapons', label: 'Weapons' },
  { id: 'ship', label: 'Ship improvements' },
  { id: 'hud', label: 'HUD tools' },
  { id: 'abilities', label: 'Abilities' },
];

function beep(bridge) {
  bridge.emit('uiBeep');
}

export default function Fab({ bridge, snapshot }) {
  const recipes = Array.isArray(snapshot.recipes) ? snapshot.recipes : [];
  const [hoverId, setHoverId] = useState(null);
  const hover = recipes.find((recipe) => recipe.id === hoverId) || null;

  return (
    <div id="fab" className="overlay">
      <div className="panel fab-panel fab-wide">
        <p className="eyebrow">Fabrication bay</p>
        <h2>Count recipes</h2>
        <p className="lede" id="fab-copy">
          {snapshot.fabCopy}
        </p>
        <div className="fab-readout" aria-live="polite">
          {hover ? (
            <>
              <p className="fab-readout-name">{hover.name}</p>
              <p className="fab-readout-body">{hover.about}</p>
            </>
          ) : (
            <p className="fab-readout-body">Hover a card to read what it is and what it is for.</p>
          )}
        </div>
        <div className="fab-board">
          {CATEGORIES.map((cat) => {
            const list = recipes.filter((recipe) => recipe.category === cat.id);
            if (!list.length) return null;
            return (
              <section key={cat.id} className="fab-col" aria-label={cat.label}>
                <h3>{cat.label}</h3>
                <div className="missions fab-recipes">
                  {list.map((recipe) => (
                    <button
                      key={recipe.id}
                      id={'craft-' + recipe.id}
                      className={`btn btn-primary fab-card${hoverId === recipe.id ? ' is-hot' : ''}${
                        recipe.ready ? '' : ' is-short'
                      }`}
                      type="button"
                      aria-disabled={recipe.ready ? 'false' : 'true'}
                      onMouseEnter={() => setHoverId(recipe.id)}
                      onMouseLeave={() => setHoverId((current) => (current === recipe.id ? null : current))}
                      onFocus={() => setHoverId(recipe.id)}
                      onBlur={() => setHoverId((current) => (current === recipe.id ? null : current))}
                      onClick={() => {
                        if (!recipe.ready) return;
                        beep(bridge);
                        bridge.emit('craft', recipe.id);
                      }}
                    >
                      <span className="fab-name">{recipe.name}</span>
                      <span className="fab-cost">{recipe.costText}</span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
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
