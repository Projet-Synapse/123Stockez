# 123Stockez

Coffre-fort photo et carnets, construit avec **Expo / React Native**. Un seul code
source pour **iOS, Android, Web** et le **bureau (Linux, macOS, Windows)** via
Electron. Toutes les données — comptes, groupes, albums, photos, carnets — vivent
dans **Supabase** (Postgres + Storage), isolées par utilisateur avec RLS.

---

## 1. Démarrage

```bash
pnpm install
cp .env.example .env       # puis renseignez vos clés Supabase
pnpm start                 # serveur de développement Expo
```

| Commande                           | Effet                                               |
| ---------------------------------- | --------------------------------------------------- |
| `pnpm start`                       | Serveur Expo (QR code, choix de la plateforme)      |
| `pnpm run android` / `ios` / `web` | Lance directement sur une plateforme                |
| `pnpm run desktop:dev`             | Expo web + fenêtre Electron en rechargement à chaud |
| `pnpm run verify`                  | `typecheck` + `lint` — à lancer avant de commiter   |

---

## 2. Qualité de code

ESLint est configuré en _flat config_ ([eslint.config.js](eslint.config.js)) au-dessus
de `eslint-config-expo`, avec Prettier branché en fin de chaîne pour désactiver les
règles de mise en forme conflictuelles.

```bash
pnpm run lint          # 0 erreur attendue
pnpm run lint:fix
pnpm run format        # Prettier sur tout le dépôt
pnpm run typecheck     # tsc --noEmit
pnpm run verify        # typecheck + lint
```

Points de configuration notables :

- Le code vendorisé de `template/` est délibérément assoupli — ce n'est pas notre code.
- `desktop/` et `scripts/` sont traités comme du CommonJS Node, pas du TypeScript.
- `react/no-unescaped-entities` est désactivé : l'interface est en français et les
  apostrophes dans les textes sont normales.
- Les avertissements `react-hooks/exhaustive-deps` restants sont volontairement
  laissés en `warn` : les corriger un par un demande de vérifier chaque écran.

Le workflow [`ci.yml`](.github/workflows/ci.yml) rejoue `typecheck`, `lint` et
`format:check` sur chaque push et PR.

---

## 3. Supabase

### Schéma

Les migrations sont dans [`supabase/migrations/`](supabase/migrations/) :

- `0001_init.sql` — profils, groupes, albums, photos, carnets (champs, entrées,
  valeurs), le bucket de stockage `photos`, et **toutes les politiques RLS**.
- `0002_app_versions.sql` — le manifeste de versions qui alimente le traqueur de
  mises à jour.

Appliquez-les avec la CLI Supabase :

```bash
supabase link --project-ref <votre-ref>
supabase db push
```

…ou collez les deux fichiers dans l'éditeur SQL du tableau de bord.

### Ce que le schéma garantit

- **Isolation par compte.** Chaque table applique `auth.uid() = user_id`. Les
  tables filles (`carnet_fields`, `carnet_entry_values`) héritent de la propriété
  de leur parent. Un client ne peut pas lire les données d'un autre utilisateur,
  même avec une requête forgée.
- **Compteurs fiables.** `album_count`, `photo_count`, `entry_count` et les photos
  de couverture sont maintenus par des _triggers_ Postgres. Le client ne les écrit
  jamais, donc ils ne peuvent pas dériver.
- **Stockage cloisonné.** Les objets sont nommés `<user_id>/<préfixe>_<horodatage>.<ext>`
  et les politiques `storage.objects` n'autorisent l'écriture que dans le dossier
  de l'utilisateur connecté. La lecture est publique (URLs partageables).

### Accès aux données côté application

- [`services/storage.ts`](services/storage.ts) — toutes les lectures/écritures.
- [`services/upload.ts`](services/upload.ts) — envoi binaire multiplateforme.
- [`types/database.ts`](types/database.ts) — formes des lignes renvoyées.

### Authentification

Email + mot de passe, code OTP par email, et Google OAuth. Le retour d'OAuth
diffère selon la plateforme :

| Plateforme    | Mécanisme                                                         |
| ------------- | ----------------------------------------------------------------- |
| Web           | Redirection en place gérée par Supabase                           |
| iOS / Android | `WebBrowser.openAuthSessionAsync` + schéma `onspaceapp://auth`    |
| Bureau        | Navigateur système + protocole `onspaceapp://` capté par Electron |

Déclarez ces URLs de redirection dans **Supabase → Authentication → URL Configuration** :

```
onspaceapp://auth
http://localhost:8081
https://<votre-domaine-web>
```

---

## 4. Multiplateforme

### Mobile et web

Rien de particulier : `pnpm run android|ios|web`. Le seul point sensible est
l'envoi d'images, résolu dans [`services/upload.ts`](services/upload.ts) — `fetch`
vers un `Blob` sur web/bureau, lecture base64 via `expo-file-system` sur mobile,
car `fetch` ne sait pas lire les URIs `file://` de façon fiable.

### Bureau (Linux, macOS, Windows)

Le bureau réutilise **exactement** le bundle web, chargé dans une fenêtre Electron.

```
desktop/main.js      processus principal : fenêtre, protocole app://, mises à jour
desktop/preload.js   pont contextIsolé exposé au rendu (window.stockezDesktop)
desktop/package.json dépendances runtime embarquées (uniquement electron-updater/log)
electron-builder.yml cibles AppImage + deb, dmg (x64/arm64), NSIS
```

Le dépôt suit la structure « deux package.json » d'electron-builder : la racine
porte l'outillage, `desktop/` porte les rares dépendances réellement embarquées —
sinon les ~150 paquets React Native se retrouveraient dans l'installateur.

```bash
pnpm run desktop:install         # une fois, ou après modification de desktop/package.json
pnpm run desktop:dev             # développement
pnpm run desktop:build           # installateurs pour l'OS courant → release/
pnpm run desktop:build:linux     # ou :mac / :win
```

Deux détails d'implémentation qui comptent :

- En production le rendu est servi via un schéma `app://` maison, pas `file://`.
  Le routage client d'expo-router a besoin de chemins absolus, et la session
  Supabase vit dans `localStorage`, qui est lié à une origine réelle.
- Une compilation croisée complète n'est pas possible : un `.dmg` signé exige
  macOS. Le workflow [`release-desktop.yml`](.github/workflows/release-desktop.yml)
  compile donc sur une matrice `ubuntu` / `macos` / `windows`.

---

## 5. Traqueur de versions et mises à jour

Une seule API — [`services/updates.ts`](services/updates.ts) — au-dessus de trois
mécanismes de livraison :

| Plateforme    | Mécanisme                            | Comportement d'installation                                                    |
| ------------- | ------------------------------------ | ------------------------------------------------------------------------------ |
| Bureau        | `electron-updater` + GitHub Releases | Télécharge, **quitte l'application, remplace la version installée, redémarre** |
| iOS / Android | `expo-updates` (OTA)                 | Récupère le nouveau bundle JS et recharge                                      |
| Web           | —                                    | Recharge la page                                                               |

La table `app_versions` de Supabase est la source de vérité partagée : elle permet
d'afficher les notes de version et de marquer une mise à jour comme obligatoire,
même sur les plateformes qui ne peuvent pas s'auto-installer (l'utilisateur est
alors renvoyé vers le store ou la page de téléchargement).

**Sur mobile, l'installation « désinstalle puis réinstalle » n'existe pas** : App
Store et Play Store l'interdisent. `expo-updates` livre le JavaScript à chaud ;
un changement de code natif passe obligatoirement par le store. C'est pourquoi
`checkForUpdate()` donne la priorité à une version store plus récente sur un
bundle OTA.

### Interface

- [`components/feature/UpdateBanner.tsx`](components/feature/UpdateBanner.tsx) —
  bandeau flottant au-dessus de la barre d'onglets, invisible tant qu'il n'y a
  rien à installer, non masquable si la mise à jour est obligatoire.
- L'onglet **Profil** affiche la version installée, l'état et un bouton de
  vérification manuelle.
- [`contexts/UpdateContext.tsx`](contexts/UpdateContext.tsx) vérifie au démarrage,
  toutes les 6 heures, et au retour de l'application au premier plan.

### Publier une version

```bash
# 1. incrémenter la version (app.json et desktop/package.json sont synchronisés
#    automatiquement par scripts/build-desktop.js)
npm version 1.1.0 --no-git-tag-version

# 2. taguer — le workflow compile les 3 OS et publie sur GitHub Releases,
#    puis insère les lignes dans app_versions
git commit -am "release: v1.1.0" && git tag v1.1.0 && git push --follow-tags
```

Pour annoncer une version à la main :

```bash
node scripts/publish-version.js --platforms linux,macos,windows --notes "Correctifs"
```

Secrets à définir dans le dépôt GitHub : `EXPO_PUBLIC_SUPABASE_URL`,
`EXPO_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, et facultativement
`CSC_LINK` / `CSC_KEY_PASSWORD` pour signer le build macOS.

### Mises à jour OTA mobiles

`expo-updates` est installé et `app.json` est configuré (`runtimeVersion` en
politique `appVersion`), mais l'URL du serveur de mises à jour reste à créer :

```bash
npx eas update:configure
```

Tant que ce n'est pas fait, `Updates.isEnabled` est faux et le traqueur retombe
proprement sur le manifeste Supabase.

---

## 6. Points en suspens

- `app.json` porte encore `name`/`slug` = `onspace-app` alors que le produit
  s'appelle 123Stockez. Renommer le `slug` casse le lien avec un projet EAS
  existant, donc c'est laissé tel quel volontairement.
- 31 avertissements `react-hooks/exhaustive-deps` subsistent (aucune erreur).
- Le build bureau n'a pas pu être exécuté de bout en bout dans l'environnement de
  développement (pas d'affichage) — la configuration est en place, le premier
  `pnpm run desktop:build` est à lancer sur une machine de bureau.
