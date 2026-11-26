import { getState, update, subscribe, uid } from './storage.js';
import { h, isoDate, weekStart, addDays, fmtDuration, safeColor } from './util.js';

const WEEKS = 8;

// Minutes travaillées par semaine pour un domaine, de la plus ancienne à la semaine en cours.
function weeklyMinutes(entries, domainId) {
  const start = weekStart();
  return Array.from({ length: WEEKS }, (_, i) => {
    const from = isoDate(addDays(start, -7 * (WEEKS - 1 - i)));
    const to = isoDate(addDays(start, -7 * (WEEKS - 2 - i)));
    return entries
      .filter((e) => e.domainId === domainId && e.date >= from && e.date < to)
      .reduce((a, e) => a + e.minutes, 0);
  });
}

function barsSvg(values, color) {
  const w = 160, hgt = 48, bw = 14;
  const gap = (w - bw * values.length) / (values.length - 1);
  const max = Math.max(...values, 1);
  const rects = values.map((v, i) => {
    const bh = v > 0 ? Math.max(2, (v / max) * (hgt - 2)) : 1;
    const last = i === values.length - 1;
    return `<rect x="${(i * (bw + gap)).toFixed(1)}" y="${(hgt - bh).toFixed(1)}" width="${bw}" height="${bh.toFixed(1)}" rx="2" fill="${color}" opacity="${v === 0 ? 0.25 : last ? 1 : 0.55}"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${w} ${hgt}" width="100%" height="${hgt}" preserveAspectRatio="none" aria-hidden="true">${rects}</svg>`;
}

function levelSvg(points, color) {
  const w = 160, hgt = 40;
  const xs = (i) => (points.length === 1 ? w / 2 : (i / (points.length - 1)) * (w - 8) + 4);
  const ys = (lvl) => hgt - 4 - ((lvl - 1) / 9) * (hgt - 8);
  const line = points.map((p, i) => `${xs(i).toFixed(1)},${ys(p.level).toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  return `<svg viewBox="0 0 ${w} ${hgt}" width="100%" height="${hgt}" preserveAspectRatio="none" aria-hidden="true">` +
    (points.length > 1 ? `<polyline points="${line}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke"/>` : '') +
    `<circle cx="${xs(points.length - 1).toFixed(1)}" cy="${ys(last.level).toFixed(1)}" r="3.5" fill="${color}"/></svg>`;
}

function svgBox(html, label) {
  const box = h('div', { class: 'chart', role: 'img', 'aria-label': label });
  box.innerHTML = html; // le HTML ne contient que des nombres et une couleur validée
  return box;
}

export const progressView = {
  id: 'progression',
  label: 'Progression',
  init(root) {
    const wrap = h('div', {});
    root.append(h('h2', {}, 'Progression'), wrap);

    function domainBlock(d) {
      const st = getState();
      const color = safeColor(d.color);
      const weeks = weeklyMinutes(st.entries, d.id);
      const thisWeek = weeks[weeks.length - 1];
      const goalMin = d.weeklyGoal * 60;
      const checkins = st.checkins.filter((c) => c.domainId === d.id).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
      const last = checkins[checkins.length - 1];
      const first = checkins[0];

      const level = h('select', { 'aria-label': 'Niveau de ' + d.name + ' sur 10' },
        Array.from({ length: 10 }, (_, i) => h('option', { value: i + 1, selected: last ? last.level === i + 1 : i === 4 }, `${i + 1} / 10`)));
      const cNote = h('input', { type: 'text', placeholder: 'Ce qui a changé (facultatif)', 'aria-label': 'Note du point de niveau' });
      const checkForm = h('form', {
        class: 'add-form',
        onsubmit(e) {
          e.preventDefault();
          update((s) => s.checkins.push({ id: uid(), domainId: d.id, date: isoDate(), level: Number(level.value), note: cNote.value.trim() }));
        },
      }, level, cNote, h('button', { type: 'submit' }, 'Noter mon niveau'));

      let levelText = 'Aucun point de niveau pour l’instant.';
      if (last) {
        const delta = last.level - first.level;
        levelText = `Niveau ${last.level} / 10` + (checkins.length > 1 ? ` (${delta >= 0 ? '+' : ''}${delta} depuis le ${first.date})` : '') +
          (last.note ? ` — ${last.note}` : '');
      }

      return h('article', { class: 'progress-domain' },
        h('header', {}, h('i', { class: 'dot big', style: `background:${color}` }), h('h3', {}, d.name)),
        h('div', { class: 'progress-grid' },
          h('div', {},
            h('p', { class: 'stat' }, h('strong', {}, fmtDuration(thisWeek)), d.weeklyGoal ? ` sur ${fmtDuration(goalMin)} cette semaine` : ' cette semaine'),
            d.weeklyGoal ? h('progress', { max: goalMin, value: Math.min(thisWeek, goalMin), 'aria-label': 'Objectif de la semaine pour ' + d.name }) : null,
            svgBox(barsSvg(weeks, color), `Temps par semaine sur ${WEEKS} semaines : ${weeks.map((m) => fmtDuration(m)).join(', ')}`),
            h('p', { class: 'meta flat' }, `${WEEKS} dernières semaines, la semaine en cours à droite`)),
          h('div', {},
            h('p', { class: 'stat' }, levelText),
            last ? svgBox(levelSvg(checkins, color), `Évolution du niveau : ${checkins.map((c) => c.level).join(', ')}`) : null,
            checkForm)));
    }

    function render() {
      const st = getState();
      const start = isoDate(weekStart());
      const weekMin = st.entries.filter((e) => e.date >= start).reduce((a, e) => a + e.minutes, 0);
      const doneWeek = st.tasks.filter((t) => t.done && t.doneAt && isoDate(new Date(t.doneAt)) >= start).length;
      wrap.replaceChildren(
        h('p', { class: 'summary' }, h('strong', {}, fmtDuration(weekMin)), ' travaillées et ', h('strong', {}, String(doneWeek)), ` tâche${doneWeek > 1 ? 's' : ''} terminée${doneWeek > 1 ? 's' : ''} cette semaine (depuis le lundi ${start}).`),
        ...(st.domains.length ? st.domains.map(domainBlock) : [h('p', { class: 'empty' }, 'Crée un domaine dans l’onglet Domaines pour suivre ta progression.')]));
    }

    subscribe(render);
    render();
  },
};
