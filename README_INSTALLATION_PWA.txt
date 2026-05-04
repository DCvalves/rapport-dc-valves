MARCHE A SUIVRE - PWA DC VALVES

1. Fichiers a mettre en ligne
   - index.html
   - manifest.json
   - service-worker.js
   - dc_valves_logo.png
   - dossier icons avec icon-192.png et icon-512.png

2. Hebergement HTTPS recommande
   Option simple : GitHub Pages
   - Creer un depot GitHub, par exemple rapport-dc-valves
   - Envoyer tous les fichiers ci-dessus a la racine du depot
   - Aller dans Settings > Pages
   - Source : Deploy from a branch
   - Branch : main / root
   - Attendre l'adresse HTTPS fournie par GitHub Pages

3. Installation sur iPad
   - Ouvrir l'adresse HTTPS dans Safari
   - Appuyer sur Partager
   - Choisir Ajouter a l'ecran d'accueil
   - Nommer l'app DC Valves
   - Ouvrir ensuite depuis l'icone creee

4. Important
   - La PWA doit etre ouverte au moins une fois avec internet pour que le mode hors ligne soit mis en cache.
   - Les donnees sont sauvegardees localement dans l'iPad via localStorage.
   - Pour conserver/transferer un rapport, utiliser Exporter les donnees.
   - Pour PDF sur iPad : Exporter en PDF / Imprimer > aperçu > partager > Enregistrer dans Fichiers.

5. Mise a jour
   - Remplacer les fichiers sur l'hebergement.
   - Si l'iPad garde l'ancienne version, changer CACHE_NAME dans service-worker.js, par exemple dc-valves-rapport-v2.


Version v3 : correction affichage Moteur sur iPad, ajout tension 380V et champ Taille de la membrane.


Version v5 : corrections mise en page Type, Moteur, légendes photos et dates du rapport de temps.


Version v15 : ajout de la numérotation automatique de rapport.
Format : R-AAAAMMJJ-CLIENT-TECH-HHMMSS-CODE.
Le numéro se génère automatiquement quand Client et Technicien sont remplis, sans écraser un numéro existant.


Version v16 : format numéro de rapport R-DCVALVES-AAMMJJ-TECH-HHMM et blocage export/impression sans numéro.


ENREGISTREMENT DANS UN FICHIER EXCEL COMMUN
------------------------------------------
Cette version contient le code nécessaire pour envoyer chaque export PDF/impression et chaque export de données vers un fichier Google Sheets commun.

Activation :
1. Créer un Google Sheet nommé par exemple "Suivi rapports DC Valves".
2. Dans ce fichier : Extensions > Apps Script.
3. Coller le contenu du fichier google-apps-script.gs.
4. Déployer > Nouveau déploiement > Application web.
5. Exécuter en tant que : Moi.
6. Accès : Tout utilisateur disposant du lien.
7. Copier l'URL du Web App.
8. Dans index.html, remplacer :
   const COMMON_EXCEL_WEB_APP_URL = '';
   par :
   const COMMON_EXCEL_WEB_APP_URL = 'URL_DU_WEB_APP';
9. Replacer les fichiers sur GitHub et faire Commit changes.

Sans cette URL, la PWA continue de fonctionner normalement, mais ne peut pas écrire dans le fichier commun.


VERSION v19
- URL Google Apps Script intégrée.
- Les exports PDF/impression et JSON envoient les données vers le Google Sheet commun.
