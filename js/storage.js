const KEY = 'suivi-taches-v1';

const defaults = () => ({
  tasks: [],     // { id, title, domainId, priority 1-3, due, done, createdAt, doneAt }
  domains: [],   // { id, name, color, weeklyGoal (heures) }
  entries: [],   // { id, domainId, taskId, date, minutes, note, createdAt }
  checkins: [],  // { id, domainId, date, level 1-10, note }
  timer: null,   // { start, domainId, taskId, note } quand un chrono tourne
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaults(), ...JSON.parse(raw) } : defaults();
  } catch {
    return defaults();
  }
}

let state = load();
const listeners = new Set();

export const getState = () => state;
export const subscribe = (fn) => listeners.add(fn);
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// Modifie l'état, sauvegarde, puis prévient les vues.
export function update(fn) {
  fn(state);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* stockage plein ou bloqué */ }
  listeners.forEach((l) => l(state));
}

export function replaceState(next) {
  state = { ...defaults(), ...next };
  update(() => {});
}
