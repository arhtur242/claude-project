# Suivi

Application web de gestion de tâches, avec suivi du temps de travail et de la progression par domaine.
JavaScript natif (modules ES), sans dépendance ni étape de build. Les données restent dans le navigateur (`localStorage`).

## Lancer

Les modules ES ne se chargent pas depuis `file://`, il faut un petit serveur local :

```bash
npm start            # ou : python3 -m http.server 8000
```

Puis ouvrir http://localhost:8000.

## Structure

```
index.html
css/style.css
js/main.js       navigation entre les sections
js/storage.js    état de l'app + sauvegarde localStorage
js/util.js       petits utilitaires (DOM, dates, durées)
js/tasks.js      section Tâches
```
