import { useState } from 'react';

const CATEGORIES = [
  { id: 'weapons', label: 'Weapons', stub: true },
  { id: 'ship', label: 'Ship improvements', stub: false },
  { id: 'alloys', label: 'Alloys', stub: true },
  { id: 'hud', label: 'HUD tools', stub: true },
  { id: 'abilities', label: 'Abilities', stub: true },
];

function beep(bridge) {
  bridge.emit('uiBeep');
}

const CATEGORY_IDEAS = {
  weapons: [
    ['Arc missile', 'A held charge. Left click arcs it into the rock.'],
    ['Pulse lance', 'A short straight shot at the rock in front of you.'],
    ['Survey flare', 'Marks the rocks on this layer.'],
  ],
  alloys: [
    ['Prism glass', 'Smelted from pale ore. Used in lenses and hull glaze.'],
    ['Belt iron', 'The common structural metal.'],
    ['Amber resin', 'Binder drawn from hard rocks.'],
    ['Void filament', 'A rare thread for blink and quiet gear.'],
  ],
  hud: [
    ['Layer compass', 'Puts the layer number back on the screen.'],
    ['Ore ping', 'Points at dropped ore before it fades.'],
    ['Gate marker', 'A clearer line to the wormhole.'],
  ],
  abilities: [
    ['Repair patch', 'A held hull mend, used from the hotbar.'],
    ['Phase blink', 'A short hop along your aim.'],
    ['Tractor pulse', 'Pulls nearby ore in.'],
    ['Quiet running', 'A brief moment with no bump damage.'],
  ],
};

function StubSlots({ categoryId }) {
  const ideas = CATEGORY_IDEAS[categoryId] || [];
  return (
    <div className="missions fab-stubs">
      {ideas.map(([name, detail]) => (
        <button key={name} className="btn" type="button" disabled>
          {name}
          <span>{detail}</span>
        </button>
      ))}
    </div>
  );
}

function ShipImprovements({ bridge, snapshot }) {
  function act(cmd) {
    beep(bridge);
    bridge.emit(cmd);
  }
  return (
    <div className="missions">
      <button
        id="bank-ore"
        className="btn btn-primary"
        type="button"
        disabled={snapshot.fabBankDisabled}
        onClick={() => act('fabBank')}
      >
        Bank cargo
        <span>{snapshot.fabBankLabel}</span>
      </button>
      <button
        id="fab-drive"
        className="btn btn-primary"
        type="button"
        disabled={snapshot.fabDriveDisabled}
        onClick={() => act('fabDrive')}
      >
        Faster drive
        <span>{snapshot.fabDriveLabel}</span>
      </button>
      <button
        id="fab-hull"
        className="btn btn-primary"
        type="button"
        disabled={snapshot.fabHullDisabled}
        onClick={() => act('fabHull')}
      >
        Sturdier hull
        <span>{snapshot.fabHullLabel}</span>
      </button>
      <button
        id="fab-hint"
        className="btn btn-primary"
        type="button"
        disabled={snapshot.fabHintDisabled}
        onClick={() => act('fabHint')}
      >
        Math hint
        <span>{snapshot.fabHintLabel}</span>
      </button>
      <button
        id="sector-map"
        className="btn btn-primary"
        type="button"
        disabled={snapshot.fabMapDisabled}
        onClick={() => act('fabMap')}
      >
        Sector map
        <span>{snapshot.fabMapLabel}</span>
      </button>
    </div>
  );
}

export default function Fab({ bridge, snapshot }) {
  const [category, setCategory] = useState('ship');
  const active = CATEGORIES.find((c) => c.id === category) || CATEGORIES[1];

  return (
    <div id="fab" className="overlay">
      <div className="panel fab-panel">
        <p className="eyebrow">Fabrication bay</p>
        <h2>Spend banked ore</h2>
        <p className="lede" id="fab-copy">
          {snapshot.fabCopy}
        </p>
        <div className="fab-cats" role="tablist" aria-label="Fabrication categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={category === cat.id}
              className={`btn fab-cat${category === cat.id ? ' active' : ''}`}
              onClick={() => {
                beep(bridge);
                setCategory(cat.id);
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="fab-cat-panel" role="tabpanel">
          {active.stub ? (
            <StubSlots categoryId={active.id} />
          ) : (
            <ShipImprovements bridge={bridge} snapshot={snapshot} />
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
            Resume flight
          </button>
        </div>
      </div>
    </div>
  );
}
