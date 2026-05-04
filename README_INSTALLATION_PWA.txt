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
