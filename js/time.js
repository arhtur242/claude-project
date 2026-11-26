import { getState, update, subscribe, uid } from './storage.js';
import { h, isoDate, fmtDuration, fmtClock, safeColor } from './util.js';

export const timeView = {
  id: 'temps',
  label: 'Temps',
  init(root) {
    // --- Chronomètre ---
    const dom = h('select', { 'aria-label': 'Domaine' });
    const task = h('select', { 'aria-label': 'Tâche' });
    const note = h('input', { type: 'text', placeholder: 'Note (facultatif)', 'aria-label': 'Note' });
    const clock = h('output', { class: 'clock' }, '00:00:00');
    const toggle = h('button', { type: 'button', class: 'primary big', onclick: onToggle }, 'Démarrer');
    const cancel = h('button', { type: 'button', class: 'ghost', hidden: true, onclick: onCancel }, 'Annuler');

    task.addEventListener('change', () => {
      const t = getState().tasks.find((x) => x.id === task.value);
      if (t && t.domainId && !dom.value) dom.value = t.domainId;
    });

    const timerBox = h('div', { class: 'timer' },
      clock,
      h('div', { class: 'timer-fields' }, dom, task, note),
      h('div', { class: 'timer-actions' }, toggle, cancel));

    // --- Saisie manuelle ---
    const mDate = h('input', { type: 'date', value: isoDate(), required: true, 'aria-label': 'Date' });
    const mDom = h('select', { 'aria-label': 'Domaine' });
    const mMin = h('input', { type: 'number', min: 1, step: 1, required: true, placeholder: 'Minutes', 'aria-label': 'Durée en minutes' });
    const mNote = h('input', { type: 'text', placeholder: 'Note (facultatif)', 'aria-label': 'Note' });
    const manual = h('form', {
      class: 'add-form',
      onsubmit(e) {
        e.preventDefault();
        const minutes = Number(mMin.value);
        if (!(minutes > 0)) return;
        update((s) => s.entries.push({
          id: uid(), domainId: mDom.value || null, taskId: null, date: mDate.value || isoDate(),
          minutes, note: mNote.value.trim(), createdAt: Date.now(),
        }));
        mMin.value = '';
        mNote.value = '';
      },
    }, mDate, mDom, mMin, mNote, h('button', { type: 'submit' }, 'Ajouter'));

    const todayTotal = h('span', { class: 'meta flat' });
    const list = h('ul', { class: 'entry-list' });

    root.append(
      h('h2', {}, 'Temps de travail'),
      timerBox,
      h('h3', { class: 'section-title' }, 'Ajouter du temps passé'),
      manual,
      h('h3', { class: 'section-title' }, 'Dernières entrées ', todayTotal),
      list);

    // --- Logique ---
    function fillSelects() {
      const st = getState();
      const domainOptions = () => [h('option', { value: '' }, 'Sans domaine'), st.domains.map((d) => h('option', { value: d.id }, d.name))];
      const keep = (sel, fill) => { const v = sel.value; sel.replaceChildren(...fill().flat()); sel.value = v; if (sel.value !== v) sel.value = ''; };
      keep(dom, domainOptions);
      keep(mDom, domainOptions);
      keep(task, () => [h('option', { value: '' }, 'Sans tâche'), st.tasks.filter((t) => !t.done).map((t) => h('option', { value: t.id }, t.title))]);
    }

    function onToggle() {
      const t = getState().timer;
      if (t) {
        const minutes = (Date.now() - t.start) / 60000;
        update((s) => {
          s.entries.push({ id: uid(), domainId: t.domainId, taskId: t.taskId, date: isoDate(new Date(t.start)), minutes, note: t.note, createdAt: Date.now() });
          s.timer = null;
        });
        note.value = '';
      } else {
        update((s) => { s.timer = { start: Date.now(), domainId: dom.value || null, taskId: task.value || null, note: note.value.trim() }; });
      }
    }

    function onCancel() {
      if (confirm('Abandonner ce chronomètre sans enregistrer le temps ?')) update((s) => { s.timer = null; });
    }

    function tick() {
      const t = getState().timer;
      if (!t) { clock.textContent = '00:00:00'; document.title = 'Suivi'; return; }
      const text = fmtClock(Math.max(0, Math.floor((Date.now() - t.start) / 1000)));
      clock.textContent = text;
      document.title = `${text} · Suivi`;
    }

    function render() {
      fillSelects();
      const t = getState().timer;
      if (t) { dom.value = t.domainId || ''; task.value = t.taskId || ''; note.value = t.note || ''; }
      [dom, task, note].forEach((el) => { el.disabled = Boolean(t); });
      toggle.textContent = t ? 'Arrêter et enregistrer' : 'Démarrer';
      cancel.hidden = !t;
      timerBox.classList.toggle('running', Boolean(t));
      tick();

      const st = getState();
      const today = isoDate();
      const todayMin = st.entries.filter((e) => e.date === today).reduce((a, e) => a + e.minutes, 0);
      todayTotal.textContent = todayMin ? `· aujourd’hui : ${fmtDuration(todayMin)}` : '';
      const recent = [...st.entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 15);
      list.replaceChildren(...(recent.length ? recent.map((e) => {
        const d = st.domains.find((x) => x.id === e.domainId);
        const tk = st.tasks.find((x) => x.id === e.taskId);
        return h('li', { class: 'entry' },
          h('span', { class: 'entry-date' }, e.date),
          h('span', { class: 'grow' },
            d ? h('span', {}, h('i', { class: 'dot', style: `background:${safeColor(d.color)}` }), d.name) : h('span', { class: 'muted' }, 'Sans domaine'),
            tk && ` · ${tk.title}`,
            e.note && h('span', { class: 'muted' }, ` — ${e.note}`)),
          h('strong', {}, fmtDuration(e.minutes)),
          h('button', {
            type: 'button', class: 'ghost', 'aria-label': 'Supprimer cette entrée',
            onclick() { update((s) => { s.entries = s.entries.filter((x) => x.id !== e.id); }); },
          }, 'Supprimer'));
      }) : [h('li', { class: 'empty' }, 'Aucun temps enregistré. Démarre le chronomètre ou ajoute une entrée.')]));
    }

    setInterval(tick, 1000);
    subscribe(render);
    render();
  },
};
