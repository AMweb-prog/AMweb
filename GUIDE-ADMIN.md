# Guide de l'admin AMweb

L'admin se trouve sur **amweb.ma/admin**. Elle permet de :

- recevoir toutes les demandes envoyées par les formulaires du site (contact, audit gratuit, rendez-vous, questions des articles) ;
- modifier les **prix et délais**, les **réalisations**, les **avis clients** et les **articles Conseils** (FR, EN, AR) ;
- **publier** le site en un clic quand le contenu change.

Les boutons WhatsApp du site restent en place. Les formulaires, eux, envoient la demande dans l'admin. Si l'envoi échoue (coupure, panne), le visiteur voit un bouton « Envoyer sur WhatsApp » avec son message déjà rédigé : aucune demande n'est perdue.

---

## Comment ça marche

```
Visiteur ──formulaire──▶ /api/submit (Vercel) ──▶ Supabase (table demandes) ──▶ admin
                                     └──▶ email de notification (Brevo, plus tard)

Toi (admin) ──modifie──▶ Supabase ──« Publier le site »──▶ Vercel reconstruit le site (1 à 2 min)
```

- **Supabase** (gratuit) : la base de données, les comptes de connexion et le stockage des images.
- **Vercel** (déjà utilisé) : héberge le site, les petites fonctions `/api` et reconstruit le site.
- Le site reste **statique et rapide** : les pages sont fabriquées à la publication, pas à chaque visite.

### Ce qui change dans le dépôt GitHub

| Dossier / fichier | Rôle |
|---|---|
| `build/` | Le générateur du site (Python). Les pages sont créées dans `dist/` à chaque déploiement. |
| `build/data/defaults.json` | Le contenu de secours, utilisé tant que Supabase n'est pas branché. |
| `admin/` | L'interface d'administration. |
| `api/` + `lib/` | Les fonctions serveur : réception des formulaires, publication, maintien en éveil. |
| `supabase/schema.sql`, `supabase/seed.sql` | La structure de la base, puis le contenu actuel du site. |
| `vercel.json` | Les réglages Vercel (commande de build, dossier `dist`, sécurité de l'admin, tâche quotidienne). |
| `script.js`, `style.css`, `assets/` | Toujours là, inchangés dans leur rôle. |

Les pages HTML qui étaient à la racine (`index.html`, `en/`, `ar/`, `conseils/`…) sont maintenant **générées automatiquement** : elles ne doivent plus être dans le dépôt (étape 0).

---

## Étape 0 : nettoyer l'ancien contenu généré (une seule fois)

J'ai déposé les nouveaux fichiers dans ton dossier, mais je ne peux pas supprimer de fichiers sur ton ordinateur. Dans ton dossier `AMweb`, ouvre un terminal (PowerShell) et lance :

```powershell
git rm -r --cached --ignore-unmatch index.html offres.html confidentialite.html conseils.html mentions-legales.html creation-site-web-kenitra.html creation-site-web-rabat.html creation-site-web-sale.html sitemap.xml offres.js amweb.webp robots.txt en ar conseils assets/data/realisations.js
Remove-Item -Recurse -Force index.html, offres.html, confidentialite.html, conseils.html, mentions-legales.html, creation-site-web-kenitra.html, creation-site-web-rabat.html, creation-site-web-sale.html, sitemap.xml, offres.js, amweb.webp, robots.txt, en, ar, conseils, assets\data\realisations.js -ErrorAction SilentlyContinue
```

**Ne supprime pas** `google9c16dcc0829422ad.html` : il prouve à Google Search Console que le site t'appartient.

> Tu peux faire l'étape 0 et pousser tout de suite : sans Supabase, le site se construit avec le contenu de secours et reste identique pour les visiteurs. Seuls les formulaires proposeront WhatsApp tant que les étapes 1 à 5 ne sont pas faites.

---

## Étape 1 : créer le projet Supabase (5 min)

1. Va sur **supabase.com** et crée un compte (avec Google, ou avec contact@amweb.ma).
2. **New project** :
   - Name : `amweb`
   - Database password : clique sur **Generate a password** et garde-le dans ton gestionnaire de mots de passe.
   - Region : **West EU (Paris)** ou **Central EU (Frankfurt)**, au plus près du Maroc.
   - Laisse les autres options par défaut et valide.
3. Attends 1 à 2 minutes que le projet soit prêt.

## Étape 2 : créer les tables (2 min)

1. Menu de gauche : **SQL Editor** puis **New query**.
2. Ouvre `supabase/schema.sql` dans VS Code, copie **tout** le contenu, colle-le et clique sur **Run**. Résultat attendu : « Success. No rows returned ».
3. Nouvelle requête : fais de même avec `supabase/seed.sql`. Cela importe les prix et les 18 articles actuels.

Les deux fichiers peuvent être relancés sans risque : rien n'est dupliqué ni écrasé.

## Étape 3 : créer ton compte admin (3 min)

1. **Authentication** puis **Users** puis **Add user** puis **Create new user** :
   - Email : `contact@amweb.ma`
   - Password : un mot de passe solide (au moins 12 caractères)
   - Coche **Auto Confirm User**
2. Retourne dans **SQL Editor**, nouvelle requête, colle puis lance :
   ```sql
   insert into public.admins (user_id, email)
   select id, email from auth.users where email = 'contact@amweb.ma'
   on conflict do nothing;
   ```
3. **Bloque les inscriptions** : **Authentication** puis **Sign In / Providers**, désactive **Allow new users to sign up**, puis **Save**.
   Même si quelqu'un créait un compte, il ne verrait rien : seuls les comptes de la table `admins` ont accès. C'est une deuxième sécurité.
4. **Lien « mot de passe oublié »** : **Authentication** puis **URL Configuration** :
   - Site URL : `https://www.amweb.ma`
   - Redirect URLs : ajoute `https://www.amweb.ma/admin/`

Pour ajouter un associé plus tard, refais les points 1 et 2 avec son email.

## Étape 4 : récupérer les clés (1 min)

**Project Settings** puis **API Keys** (ou bouton **Connect** en haut) :

| Ce que tu copies | Où le trouver | Secret ? |
|---|---|---|
| **Project URL** | `https://xxxx.supabase.co` | Non |
| **Publishable key** | commence par `sb_publishable_` | Non, elle est faite pour être publique |
| **Secret key** | commence par `sb_secret_` (bouton Reveal) | **OUI** : ne la donne à personne, ne la mets jamais dans le code |

Si ton projet n'affiche que les anciennes clés `anon` et `service_role` (de longs textes commençant par `eyJ`), elles fonctionnent aussi : `anon` remplace la publishable, `service_role` remplace la secret. Supabase prévoit de retirer ces anciennes clés fin 2026, donc préfère les nouvelles si tu as le choix.

## Étape 5 : réglages Vercel (5 min)

### 5a. Variables d'environnement

Vercel, projet AMweb, **Settings** puis **Environment Variables**. Ajoute chaque ligne pour **Production** et **Preview** :

| Nom | Valeur |
|---|---|
| `SUPABASE_URL` | la Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | la clé `sb_publishable_…` (ou l'ancienne `anon` : dans ce cas nomme-la `SUPABASE_ANON_KEY`) |
| `SUPABASE_SECRET_KEY` | la clé `sb_secret_…` (ou l'ancienne `service_role` : dans ce cas nomme-la `SUPABASE_SERVICE_ROLE_KEY`). Coche **Sensitive**. |
| `IP_SALT` | n'importe quelle phrase longue et aléatoire, par ex. `kenitra-7Qm2-plage-91xT` |

### 5b. Le bouton « Publier »

1. **Settings** puis **Git** puis **Deploy Hooks** : nom `admin`, branche `main`, **Create Hook**.
2. Copie l'URL obtenue et ajoute la variable `VERCEL_DEPLOY_HOOK_URL` avec cette URL (coche **Sensitive**).

### 5c. Réglages de build

**Settings** puis **Build and Deployment** :
- Framework Preset : **Other**
- Build Command, Output Directory, Install Command : **aucun override** (interrupteurs désactivés). `vercel.json` s'en charge : `python3 build/site.py`, sortie `dist`.
- Root Directory : vide.

## Étape 6 : publier le code (toi)

Fais ton commit et ton push comme d'habitude. Dans Vercel, ouvre le déploiement, onglet **Build Logs**. Tu dois voir :

```
[data] Supabase: 18 articles, 0 realisations, 0 avis
Done: site written to /vercel/path0/dist/ (content: supabase)
```

Si tu vois `content: defaults`, les variables de l'étape 5a manquent ou ont été ajoutées après le build : fais **Redeploy**.

## Étape 7 : tester (3 min)

1. Ouvre **amweb.ma/admin** et connecte-toi.
2. Dans un autre onglet, envoie le formulaire de contact du site avec tes infos : la demande apparaît dans **Demandes** (bouton **Actualiser** ou attends une minute).
3. Dans **Offres**, change un prix, **Enregistrer**, puis **Publier le site**. Après 1 à 2 minutes, recharge le site avec Ctrl+F5 : le nouveau prix apparaît partout. Remets ensuite le vrai prix et republie.

---

## Utilisation au quotidien

### Demandes
- Les nouvelles demandes ont un point vert ; le nombre s'affiche dans le menu et dans l'onglet du navigateur.
- Clique sur une demande pour la voir en entier, puis réponds par **email**, **WhatsApp** (message de départ prérempli) ou **appel**.
- Change le **statut** : Nouveau, En cours, Traité, Archivé. Les **notes** sont privées et s'enregistrent toutes seules.
- Préfère **Archivé** à **Supprimer** : supprimer est définitif.
- L'admin vérifie les nouvelles demandes toutes les minutes tant qu'elle est ouverte.

### Contenu (Offres, Réalisations, Avis, Articles)
1. Modifie, puis clique sur **Enregistrer**. C'est sauvegardé, mais **pas encore en ligne**.
2. En haut apparaît « Modifications non publiées » (un point orange sur mobile).
3. Clique sur **Publier le site** : le site est reconstruit et à jour en 1 à 2 minutes.

Astuces :
- **Prix dans un texte** : dans un article, écris `{{prix:vitrine}}`, `{{prix:ecommerce}}` ou `{{prix:premium}}` (ou utilise le menu « Insérer un prix »). Le prix à jour s'affiche, et il suivra tes futurs changements tout seul. De même : `{{duree:vitrine}}` et `{{duree:ecommerce}}`.
- **Réalisations** : un projet ne s'affiche que s'il a une image. L'image est redimensionnée et compressée automatiquement. La section reste cachée tant qu'il n'y a ni projet ni avis.
- **Avis** : publie uniquement de vrais avis, avec l'accord du client.
- **Articles** : chaque article existe en français, et l'anglais et l'arabe sont facultatifs. Pour traduire, ouvre l'onglet de la langue, puis **Partir du texte FR** : le texte est copié en brouillon, tu le traduis, tu coches **En ligne** et tu enregistres. Les versions EN et AR ne s'affichent que si la version française est en ligne.
- **Adresse d'un article** (`/conseils/mon-article.html`) : remplie automatiquement depuis le titre. Elle ne peut plus changer ensuite, pour ne pas casser les liens et le référencement.
- **Aperçu** : le bouton **Aperçu** au-dessus du contenu montre l'article avant publication.

---

## Relier l'admin du site à l'ERP (amweb-erp)

Le site et l'ERP utilisent **le même projet Supabase**, celui de l'ERP (`dddnvcblzwjmlglqiivr`). Les demandes du site sont dans une seule table `demandes`, lue par les deux interfaces :

- un message envoyé sur amweb.ma apparaît dans **amweb.ma/admin** et, en direct, dans la page **Demandes du site** de l'ERP (menu Commercial) ;
- l'ERP affiche aussi un message à l'écran, un compteur dans le menu et l'alerte dans la cloche ;
- le statut et les notes changés d'un côté sont visibles de l'autre ;
- le bouton **Créer le prospect** ajoute la demande au CRM (étape Nouveau, source « Site web ») et garde le lien entre les deux.

Dans l'ERP, les rôles **admin** et **responsable** voient les demandes. Les **membres** ne les voient pas : c'est imposé par la base de données (RLS). Les admins de l'ERP peuvent aussi ouvrir amweb.ma/admin avec le même email et le même mot de passe.

Pour ne jamais gêner l'ERP, les éléments du site portent des noms qui lui sont propres : la fonction `site_is_admin()` et la table `temoignages` pour les avis affichés sur le site. La table `avis` reste celle des avis clients de l'ERP.

Installation, dans le projet Supabase **de l'ERP** (SQL Editor, un fichier par New query) :

1. `supabase/erp-repair.sql` : remet l'ERP exactement comme ses migrations le définissent. Indispensable si une ancienne version de `schema.sql` du site (avant le 24/10/2026) a été lancée dans ce projet, sans effet sinon.
2. `supabase/schema.sql`, puis `supabase/seed.sql`, puis `supabase/erp-link.sql`.
3. Authentication > URL Configuration : **garder** la Site URL de l'ERP et **ajouter** `https://www.amweb.ma/admin/` dans Redirect URLs.
4. Vercel (projet du site) : `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (ou `SUPABASE_ANON_KEY`) et `SUPABASE_SECRET_KEY` (ou `SUPABASE_SERVICE_ROLE_KEY`) avec les valeurs du projet de l'ERP, puis **Redeploy**.
5. Pousser le code du site et celui de l'ERP (son `index.html` compilé inclut la nouvelle page).

Tous ces fichiers peuvent être relancés sans risque.

---

## Notifications par email (plus tard, avec Brevo)

Quand tu activeras Brevo :
1. Brevo, **Senders, Domains & Dedicated IPs** : ajoute et vérifie l'expéditeur `contact@amweb.ma`. Idéalement, authentifie aussi le domaine `amweb.ma` (Brevo donne les enregistrements DNS à ajouter).
2. Brevo, **SMTP & API** puis **API Keys** : crée une clé.
3. Vercel : ajoute `BREVO_API_KEY` (Sensitive). Facultatif : `NOTIFY_EMAIL` (qui reçoit les alertes, par défaut `contact@amweb.ma`) et `NOTIFY_SENDER` (l'expéditeur, par défaut `contact@amweb.ma`).
4. Redeploy. Chaque nouvelle demande t'enverra alors un email avec un bouton « Ouvrir dans l'admin ». Le bouton « Répondre » de ta messagerie répond directement au client.

Sans Brevo, tout fonctionne quand même : les demandes arrivent dans l'admin.

---

## À savoir

- **Mise en veille de Supabase gratuit** : un projet sans activité pendant 7 jours est mis en pause. Une tâche Vercel (`/api/keepalive`, chaque jour à 7 h UTC) l'empêche. Si le projet est quand même en pause :
  - les formulaires basculent sur WhatsApp ;
  - une publication échoue **volontairement**, et l'ancienne version du site reste en ligne.

  Dans ce cas, ouvre le tableau de bord Supabase, clique sur **Restore project**, puis republie.
- **Sécurité** :
  - les données sont protégées par des règles RLS : seule une personne connectée **et** inscrite dans la table `admins` peut lire ou modifier ;
  - la clé secrète ne quitte jamais Vercel ;
  - l'admin n'est pas indexée par Google et ne peut pas être affichée dans un autre site ;
  - les formulaires ont un piège anti-robots et une limite de 5 envois par 10 minutes et par personne.
- **Sauvegarde** : Supabase gratuit ne propose pas de sauvegarde téléchargeable. De temps en temps, va dans **Table Editor**, ouvre `demandes` puis **Export to CSV**.
- **Données personnelles** : les demandes contiennent des noms, emails et téléphones. Supprime ou archive ce qui ne sert plus. La page Confidentialité du site en parle déjà.

## En cas de problème

| Symptôme | Solution |
|---|---|
| L'admin affiche « Configuration incomplète » | `SUPABASE_URL` ou la clé publishable manque dans Vercel. Ajoute-la puis Redeploy. |
| « Ce compte n'a pas accès à l'admin » | Refais l'étape 3, point 2 (table `admins`) avec le bon email. |
| « Email ou mot de passe incorrect » | Utilise **Mot de passe oublié ?** ou change-le dans Supabase, **Authentication** puis **Users**. |
| « Publication impossible : VERCEL_DEPLOY_HOOK_URL manque » | Étape 5b. |
| La publication tourne mais le site ne change pas | Vercel, **Deployments** : ouvre le dernier et lis les logs. Si « cannot read Supabase », le projet Supabase est en pause (voir ci-dessus). Pense aussi à Ctrl+F5. |
| Les formulaires proposent toujours WhatsApp | La clé secrète manque dans Vercel, ou Supabase est en pause. Vercel, onglet **Logs**, regarde les lignes `[submit]`. |
| « permission denied » dans l'admin | Relance `supabase/schema.sql` dans le SQL Editor (sans risque). |
