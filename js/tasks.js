import { getState, update, subscribe, uid } from './storage.js';
import { h, isoDate, fmtDuration, safeColor } from './util.js';

const PRIORITY = { 3: 'Haute', 2: 'Normale', 1: 'Basse' };

export const tasksView = {
  id: 'taches',
  label: 'Tâches',
  init(root) {
    let filter = 'open';

    const title = h('input', { type: 'text', placeholder: 'Nouvelle tâche', required: true, 'aria-label': 'Titre de la tâche' });
    const domain = h('select', { 'aria-label': 'Domaine' });
    const priority = h('select', { 'aria-label': 'Priorité' },
      [3, 2, 1].map((p) => h('option', { value: p, selected: p === 2 }, PRIORITY[p])));
    const due = h('input', { type: 'date', 'aria-label': 'Échéance' });

    const form = h('form', {
      class: 'add-form',
      onsubmit(e) {
        e.preventDefault();
        const t = title.value.trim();
        if (!t) return;
        update((s) => s.tasks.push({
          id: uid(), title: t, domainId: domain.value || null, priority: Number(priority.value),
          due: due.value || null, done: false, createdAt: Date.now(), doneAt: null,
        }));
        title.value = '';
        due.value = '';
        title.focus();
      },
    }, title, domain, priority, due, h('button', { type: 'submit', class: 'primary' }, 'Ajouter'));

    const filterButtons = [['open', 'À faire'], ['done', 'Terminées'], ['all', 'Toutes']].map(([k, label]) =>
      h('button', { type: 'button', class: 'chip-btn', 'data-filter': k, onclick() { filter = k; render(); } }, label));

    const list = h('ul', { class: 'task-list' });

    root.append(h('h2', {}, 'Tâches'), form,
      h('div', { class: 'filters', role: 'group', 'aria-label': 'Filtrer les tâches' }, filterButtons), list);

    function fillDomains() {
      const current = domain.value;
      domain.replaceChildren(
        h('option', { value: '' }, 'Sans domaine'),
        ...getState().domains.map((d) => h('option', { value: d.id }, d.name)));
      domain.value = current;
      if (domain.value !== current) domain.value = '';
    }

    function item(t) {
      const st = getState();
      const d = st.domains.find((x) => x.id === t.domainId);
      const spent = st.entries.filter((e) => e.taskId === t.id).reduce((a, e) => a + e.minutes, 0);
      const late = !t.done && t.due && t.due < isoDate();
      return h('li', { class: 'task' + (t.done ? ' done' : '') },
        h('label', { class: 'check' },
          h('input', {
            type: 'checkbox', checked: t.done,
            onchange(e) { update(() => { t.done = e.target.checked; t.doneAt = t.done ? Date.now() : null; }); },
          }),
          h('span', { class: 'title' }, t.title)),
        h('span', { class: 'meta' },
          d && h('span', {}, h('i', { class: 'dot', style: `background:${safeColor(d.color)}` }), d.name),
          t.priority === 3 && h('span', {}, 'Priorité haute'),
          t.due && h('span', { class: late ? 'late' : '' }, 'Échéance ' + t.due),
          spent > 0 && h('span', {}, fmtDuration(spent) + ' travaillées')),
        h('button', {
          type: 'button', class: 'ghost', 'aria-label': 'Supprimer la tâche ' + t.title,
          onclick() {
            update((s) => {
              s.tasks = s.tasks.filter((x) => x.id !== t.id);
              s.entries.forEach((e) => { if (e.taskId === t.id) e.taskId = null; });
              if (s.timer && s.timer.taskId === t.id) s.timer.taskId = null;
            });
          },
        }, 'Supprimer'));
    }

    function render() {
      fillDomains();
      filterButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
      const all = getState().tasks;
      let shown = all.filter((t) => filter === 'all' || (filter === 'done') === t.done);
      shown = filter === 'done'
        ? shown.sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0))
        : shown.sort((a, b) =>
            a.done - b.done || b.priority - a.priority ||
            (a.due || '9999').localeCompare(b.due || '9999') || a.createdAt - b.createdAt);
      list.replaceChildren(...(shown.length
        ? shown.map(item)
        : [h('li', { class: 'empty' }, filter === 'done' ? 'Aucune tâche terminée pour l’instant.' : 'Rien à faire. Ajoute une tâche ci-dessus.')]));
    }

    subscribe(render);
    render();
  },
};
