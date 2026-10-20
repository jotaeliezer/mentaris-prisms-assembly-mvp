const KEY = 'mentaris-pilot-name';

export function cleanPilotName(raw) {
  const cleaned = String(raw || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 28);
  return cleaned || 'Pilot';
}

export function readPilotName() {
  try {
    return cleanPilotName(localStorage.getItem(KEY));
  } catch {
    return 'Pilot';
  }
}

export function writePilotName(raw) {
  const name = cleanPilotName(raw);
  try {
    localStorage.setItem(KEY, name);
  } catch {
    /* private mode */
  }
  return name;
}
