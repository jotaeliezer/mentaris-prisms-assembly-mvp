import { useState } from 'react';

export default function Title({ bridge }) {
  const [seed, setSeed] = useState('belt-7');

  function start(missionId) {
    bridge.emit('uiBeep');
    bridge.emit('startMission', { missionId, seed: seed.trim() || 'belt-7' });
  }

  return (
    <div id="title" className="overlay">
      <div className="panel">
        <p className="eyebrow">Open sector</p>
        <h1>Mentaris: Prisms of Assembly</h1>
        <p className="lede">
          Pick a mission and a world seed. The same seed builds the same belt. Answer the quota,
          then spend ore to jump. No name, no account.
        </p>
        <label className="seed-field">
          World seed
          <input
            id="seed"
            value={seed}
            maxLength={24}
            autoComplete="off"
            spellCheck={false}
            aria-label="World seed"
            onChange={(e) => setSeed(e.target.value)}
          />
        </label>
        <div className="missions">
          <button id="mission-add" className="btn btn-primary" type="button" onClick={() => start('add')}>
            Addition Drift
            <span>Five addition rocks. The wormhole stays locked until the quota is met.</span>
          </button>
          <button id="mission-sub" className="btn btn-primary" type="button" onClick={() => start('sub')}>
            Subtraction Rift
            <span>Five subtraction rocks, then the same locked wormhole.</span>
          </button>
          <button id="launch" className="btn" type="button" onClick={() => start('roam')}>
            Open belt
            <span>Practice with both operations. No quota and no wormhole.</span>
          </button>
        </div>
        <ul className="keys">
          <li>
            <kbd>W</kbd> thrust
          </li>
          <li>
            <kbd>A</kbd>
            <kbd>D</kbd> strafe
          </li>
          <li>
            <kbd>S</kbd> brake/reverse
          </li>
          <li>Mouse aims the nose</li>
          <li>
            <kbd>Q</kbd> lower layer
          </li>
          <li>
            <kbd>E</kbd> higher layer
          </li>
          <li>Click an asteroid to target</li>
          <li>Digits type the answer</li>
          <li>
            <kbd>⌫</kbd> erase
          </li>
          <li>
            <kbd>F</kbd> fabrication
          </li>
          <li>
            <kbd>P</kbd> pause
          </li>
          <li>
            <kbd>M</kbd> mute
          </li>
        </ul>
      </div>
    </div>
  );
}
