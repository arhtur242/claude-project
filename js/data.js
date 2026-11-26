import { getState, replaceState } from './storage.js';
import { h, isoDate } from './util.js';

const KEYS = ['tasks', 'domains', 'entries', 'checkins'];

export const dataView = {
  id: 'donnees',
  label: 'Données',
  init(root) {
    const status = h('p', { class: 'hint', role: 'status' });
    const file = h('input', {
      type: 'file', accept: 'application/json,.json', 'aria-label': 'Fichier de sauvegarde à importer',
      async onchange(e) {
        const f = e.target.files[0];
        e.target.value = '';
        if (!f) return;
        try {
          const data = JSON.parse(await f.text());
          if (!data || typeof data !== 'object' || !KEYS.every((k) => Array.isArray(data[k]))) throw new Error('format');
          if (!confirm('Remplacer toutes les données actuelles par celles du fichier ?')) return;
          replaceState({ ...data, timer: null });
          status.textContent = 'Données importées.';
        } catch {
          status.textContent = 'Import impossible : ce fichier n’est pas une sauvegarde de Suivi.';
        }
      },
    });

    root.append(
      h('h2', {}, 'Données'),
      h('p', { class: 'hint' }, 'Tout est stocké dans ce navigateur, sur cet appareil. Exporte régulièrement une sauvegarde, et utilise-la pour passer d’un appareil à l’autre.'),
      h('div', { class: 'add-form' },
        h('button', {
          type: 'button', class: 'primary',
          onclick() {
            const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' });
            const a = h('a', { href: URL.createObjectURL(blob), download: `suivi-${isoDate()}.json` });
            a.click();
            URL.revokeObjectURL(a.href);
            status.textContent = 'Sauvegarde exportée.';
          },
        }, 'Exporter une sauvegarde'),
        h('label', { class: 'goal' }, 'Importer', file)),
      status);
  },
};
