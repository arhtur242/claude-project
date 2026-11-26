import { h } from './util.js';
import { tasksView } from './tasks.js';

// Chaque section expose { id, label, init(root) }.
const views = [tasksView];

const nav = document.getElementById('nav');
const main = document.getElementById('views');
const panels = new Map();

for (const v of views) {
  const panel = h('section', { id: 'view-' + v.id, class: 'panel', 'aria-labelledby': 'tab-' + v.id, hidden: true });
  const tab = h('a', { href: '#' + v.id, id: 'tab-' + v.id, class: 'tab' }, v.label);
  main.append(panel);
  nav.append(tab);
  panels.set(v.id, { panel, tab });
  v.init(panel);
}

function show() {
  const wanted = location.hash.slice(1);
  const id = panels.has(wanted) ? wanted : views[0].id;
  for (const [key, { panel, tab }] of panels) {
    panel.hidden = key !== id;
    if (key === id) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  }
}

addEventListener('hashchange', show);
show();
