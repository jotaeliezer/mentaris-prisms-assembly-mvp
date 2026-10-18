export default function Clear({ bridge, snapshot }) {
  function act(cmd) {
    bridge.emit('uiBeep');
    bridge.emit(cmd);
  }
  return (
    <div id="clear" className="overlay">
      <div className="panel">
        <p className="eyebrow">Wormhole reached</p>
        <h2 id="clear-title">{snapshot.clearTitle || 'Mission clear'}</h2>
        <p className="lede" id="clear-copy">
          {snapshot.clearCopy}
        </p>
        <div className="missions">
          <button
            id="next-mission"
            className="btn btn-primary"
            type="button"
            onClick={() => act('nextMission')}
          >
            Next mission
          </button>
          <button
            id="replay-mission"
            className="btn"
            type="button"
            onClick={() => act('replayMission')}
          >
            Fly this mission again
          </button>
        </div>
      </div>
    </div>
  );
}
