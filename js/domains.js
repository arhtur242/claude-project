import { getState, update, subscribe, uid } from './storage.js';
import { h, fmtDuration, safeColor } from './util.js';

const PALETTE = ['#0f6b6e', '#3b5bdb', '#c2255c', '#e08a00', '#5f3dc4', '#2b8a3e', '#d9480f', '#1c7ed6'];

export const domainsView = {
  id: 'domaines',
  label: 'Domaines',
  init(root) {
    const name = h('input', { type: 'text', placeholder: 'Ex. Programmation système', required: true, 'aria-label': 'Nom du domaine' });
    const color = h('input', { type: 'color', value: PALETTE[0], 'aria-label': 'Couleur du domaine' });
    const goal = h('input', { type: 'number', min: 0, step: 0.5, placeholder: 'Objectif h/sem.', 'aria-label': 'Objectif hebdomadaire en heures' });

    const form = h('form', {
      class: 'add-form',
      onsubmit(e) {
        e.preventDefault();
        const n = name.value.trim();
        if (!n) return;
        update((s) => s.domains.push({ id: uid(), name: n, color: color.value, weeklyGoal: Math.max(0, Number(goal.value) || 0) }));
        name.value = '';
        goal.value = '';
        color.value = PALETTE[getState().domains.length % PALETTE.length];
        name.focus();
      },
    }, name, color, goal, h('button', { type: 'submit', class: 'primary' }, 'Créer le domaine'));

    const list = h('ul', { class: 'domain-list' });
    root.append(
      h('h2', {}, 'Domaines'),
      h('p', { class: 'hint' }, 'Un domaine est un sujet que tu veux faire progresser : une matière, un projet, une compétence. Fixe un objectif d’heures par semaine pour suivre ton rythme.'),
      form, list);

    function item(d) {
      const st = getState();
      const minutes = st.entries.filter((e) => e.domainId === d.id).reduce((a, e) => a + e.minutes, 0);
      const openTasks = st.tasks.filter((t) => t.domainId === d.id && !t.done).length;
      return h('li', { class: 'domain' },
        h('i', { class: 'dot big', style: `background:${safeColor(d.color)}` }),
        h('div', { class: 'grow' },
          h('h3', {}, d.name),
          h('span', { class: 'meta flat' }, `${fmtDuration(minutes)} au total · ${openTasks} tâche${openTasks > 1 ? 's' : ''} à faire`)),
        h('label', { class: 'goal' }, 'Objectif',
          h('input', {
            type: 'number', min: 0, step: 0.5, value: d.weeklyGoal, 'aria-label': 'Objectif hebdomadaire de ' + d.name + ' en heures',
            onchange(e) { update(() => { d.weeklyGoal = Math.max(0, Number(e.target.value) || 0); }); },
          }), 'h/sem.'),
        h('button', {
          type: 'button', class: 'ghost', 'aria-label': 'Supprimer le domaine ' + d.name,
          onclick() {
            if (!confirm(`Supprimer le domaine « ${d.name} » ? Les tâches et le temps enregistrés sont conservés, sans domaine.`)) return;
            update((s) => {
              s.domains = s.domains.filter((x) => x.id !== d.id);
              s.checkins = s.checkins.filter((c) => c.domainId !== d.id);
              [...s.tasks, ...s.entries].forEach((x) => { if (x.domainId === d.id) x.domainId = null; });
              if (s.timer && s.timer.domainId === d.id) s.timer.domainId = null;
            });
          },
        }, 'Supprimer'));
    }

    function render() {
      const ds = getState().domains;
      list.replaceChildren(...(ds.length ? ds.map(item) : [h('li', { class: 'empty' }, 'Aucun domaine. Crée le premier ci-dessus.')]));
    }
    subscribe(render);
    render();
  },
};
