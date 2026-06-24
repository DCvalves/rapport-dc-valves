APPLICATION ANDROID / PWA - DC VALVES

Contenu du dossier
- index.html : application Rapport d'intervention DC Valves
- manifest.json : paramètres d'installation Android
- service-worker.js : cache hors ligne
- dc_valves_logo.png : logo
- icons/icon-192.png et icons/icon-512.png : icônes Android

Installation sur tablette Android
1. Hébergez tout le contenu de ce dossier sur une adresse HTTPS.
   Option simple : GitHub Pages, Netlify, OVH, IONOS, etc.
2. Ouvrez l'adresse de l'application dans Google Chrome sur la tablette.
3. Menu Chrome ⋮ > Installer l'application ou Ajouter à l'écran d'accueil.
4. Validez le nom : DC Valves.
5. Ouvrez l'application depuis l'icône créée sur l'écran d'accueil.

Important
- La première ouverture doit se faire avec Internet. Ensuite, l'application est mise en cache pour fonctionner hors ligne.
- Les rapports sont sauvegardés localement sur la tablette.
- Utilisez « Exporter les données » pour conserver/transférer un rapport.
- Utilisez « Exporter en PDF / Imprimer » pour générer un PDF depuis la tablette.

Mise en ligne rapide via GitHub Pages
1. Créez un dépôt GitHub, par exemple dc-valves-app.
2. Envoyez tous les fichiers du dossier à la racine du dépôt.
3. GitHub > Settings > Pages.
4. Source : Deploy from a branch.
5. Branch : main / root.
6. Ouvrez l'URL HTTPS fournie sur la tablette.

Remarque
Ceci est une PWA Android installable. Elle se comporte comme une application sur la tablette, sans passer par le Play Store. Pour obtenir un fichier APK natif, il faudra emballer cette PWA avec Android Studio / Trusted Web Activity / PWABuilder après mise en ligne HTTPS.
