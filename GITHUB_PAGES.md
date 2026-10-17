# Web del SHUM a GitHub Pages

La web i l’app Android són projectes independents. La publicació de Pages inclou exclusivament la web de `public/ui/`.

## Web pública de només consulta
La web és pública per al club i només mostra informació: calendari, resultats, classificació, rànquings, alineacions i gols de les actes de FECAPA, i els vídeos de l'Infantil Or. Els visitants no poden desar notes, alineacions, entrenadors, marques ni enllaços de vídeo, i a «Informació» no hi ha cap referència a carpetes de Drive. L'únic que es recorda al navegador és l'equip que segueix cada visitant. Els vídeos només els publica el club des de la carpeta LLIGA_OR de Drive (vegeu «Vídeos automàtics»), o afegint-los a mà a `public/ui/videos.json`.

## Compilar i publicar

Executa `npm run check` i `npm run build:pages`, o directament `node scripts/build-pages.mjs` sense instal·lar dependències. El resultat és `pages-dist/`, amb rutes relatives que funcionen també dins de `/nom-del-repositori/`.

El workflow `.github/workflows/pages.yml` publica aquest directori a GitHub Pages quan s’executa manualment amb **Run workflow**. Al repositori, selecciona **Settings → Pages → Source → GitHub Actions**. Repositori publicat: https://github.com/xavikai/shum-hoquei. Web: https://xavikai.github.io/shum-hoquei/. El workflow també s’executa automàticament amb cada push a main.

La versió existent de Sites conserva les seves API i D1; el build de Pages les substitueix per la gestió d’anàlisis amb fitxers i no fa peticions a `/api/`.

## Rànquings i alineacions
Els rànquings es calculen amb les actes de FECAPA incorporades. Els gols encaixats d'un porter són els del rival quan l'acta en té un de sol; si n'hi ha dos, queden pendents. Els porters s'ordenen per menys gols totals, i també per gols per partit. Les edats no s'infereixen de la categoria.

## Àmbits dels rànquings
El selector de golejadors, porters i targetes permet triar: només el nostre equip, l'últim partit del nostre equip, tota la lliga del nostre grup o tota la categoria. «Tota la categoria» carrega tots els grups de la competició des del navegador i en conserva una còpia durant una hora; «Actualitza la categoria» força una consulta nova. No es barregen jugadors de grups diferents encara que coincideixin els noms.

## Vídeos dels partits
Els vídeos que veuen tots els visitants es publiquen a `public/ui/videos.json`: una entrada per partit amb `match_id` (l'`id` del partit a `league.json`) i l'enllaç de Drive. Per afegir-ne un, puja el vídeo a la carpeta LLIGA_OR, comparteix-lo com a «Qualsevol persona amb l'enllaç», afegeix la línia al fitxer i fes push a main. L'enllaç que s'escriu a la fitxa d'un partit només es desa en aquell navegador i al JSON d'anàlisi; no es publica per a la resta de visitants.

## Gols encaixats
Les actes de FECAPA no indiquen els gols encaixats per porter. Quan l'acta d'un equip només inclou un porter (P), la web li assigna els gols del rival. Si n'hi ha dos, queden pendents fins que s'informin a la fitxa del partit. Un valor introduït manualment sempre té prioritat.

## Equips del SHUM
La web inclou tots els equips del SHUM (club 320 de FECAPA) de la temporada. La llista és a `public/ui/teams.json`: per a cada equip, la competició (`idc`), el grup (`phase`), el nom oficial de l'equip a FECAPA i si l'acta apunta gols per jugador (`playerGoals`). A prebenjamí i benjamí l'acta apunta tots els gols al capità, i per això s'amaga el rànquing de golejadors. Les dades de cada equip són a `public/ui/data/<equip>.json`. Per afegir un equip nou, afegeix-ne l'entrada a `teams.json`: la tasca automàtica en crearà el fitxer de dades.

Cada visitant tria l'equip al selector «Equip que segueixes». La web el recorda en aquell navegador, i també es pot compartir un enllaç directe amb `?equip=<id>`, per exemple `?equip=alevi-plata-a`. Els identificadors dels partits de l'Infantil Or no han canviat, de manera que els vídeos ja vinculats es conserven.

## Actualització automàtica des de FECAPA
El workflow `.github/workflows/pages.yml` també s'executa sol: cada 3 hores, i cada hora els dissabtes i diumenges de 10 h a 0 h. Executa `scripts/update-teams.mjs`, que consulta el calendari de cada equip i només llegeix les actes noves, les que han canviat o les dels darrers quatre dies. Si hi ha canvis, desa un commit «Actualitza dades de FECAPA» i torna a publicar la web; si no n'hi ha, no publica res. Si un equip falla (FECAPA no respon, canvia el format o el grup s'ha reduït a menys de la meitat), aquell equip conserva l'última còpia bona i la resta s'actualitzen igualment. Es pot forçar des de GitHub: **Actions → Web a GitHub Pages → Run workflow**. Abans de fer canvis a mà, fes **Fetch/Pull** a GitHub Desktop per incorporar els commits automàtics.

## Vídeos automàtics des de Drive (només Infantil Or)
Els vídeos només existeixen per a l'Infantil Or; als altres equips la web no mostra «Vídeo pendent» ni la secció d'anàlisi de vídeo. El programa `tools/drive-videos.gs` (Google Apps Script) mira cada hora la carpeta LLIGA_OR de Drive i vincula cada vídeo nou al partit corresponent de l'Infantil Or afegint-lo a `public/ui/videos.json`. GitHub torna a publicar la web sol.

El nom del fitxer ha de ser `Local-Visitant_GolsLocal-GolsVisitant.mp4`, amb paraules del nom de cada equip (i la lletra de l'equip si cal): `Cubelles-Shum_8-0.mp4`, `Shum-SantJust_4-3.mp4`, `CerdanyolaB-SHUM_2-1.mp4`. Es vincula si hi ha un sol partit jugat amb aquests equips i aquest resultat. No substitueix mai un vídeo que ja estigui vinculat. Fa que el vídeo es pugui veure amb l'enllaç. Els fitxers que no pot vincular apareixen al registre d'execucions de l'script.

Configuració, una sola vegada:
1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token. Repository access: només `xavikai/shum-hoquei`. Permissions → Contents: **Read and write**. Copia el token.
2. Amb el compte del centre, obre https://script.new, esborra el contingut, enganxa `tools/drive-videos.gs` i desa el projecte amb el nom «SHUM vídeos».
3. ⚙ Configuració del projecte → Propietats de l'script → afegeix `GITHUB_TOKEN` amb el token.
4. Editor → tria la funció `vinculaVideos` → Executa. Accepta els permisos de Drive i de connexió externa. Al registre ha de dir «Cap vídeo nou per vincular» o «Vinculat: …».
5. Tria la funció `activaCadaHora` → Executa. A partir d'aquí s'executa sol cada hora.
