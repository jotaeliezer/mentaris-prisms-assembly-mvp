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

function StubSlots({ category }) {
  return (
    <div className="missions fab-stubs">
      <button className="btn" type="button" disabled>
        {category}
        <span>Coming soon</span>
      </button>
      <button className="btn" type="button" disabled>
        Slot reserved
        <span>Coming soon</span>
      </button>
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
            <StubSlots category={active.label} />
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
