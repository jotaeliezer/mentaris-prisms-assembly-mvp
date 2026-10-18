/**
 * Sole Vite runtime entry (see index.html). Phaser game + React overlays.
 * Legacy canvas loop lives under js/ and is only reachable via index.legacy.html.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './ui/App.jsx';
import { bridge } from './bridge/GameBridge.js';
import { createGame } from './game/createGame.js';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App bridge={bridge} />
  </React.StrictMode>
);

createGame(bridge);

export { bridge };
