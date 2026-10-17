# Web de l’Infantil Or a GitHub Pages

La web i l’app Android són projectes independents. La publicació de Pages inclou exclusivament la web de `public/ui/`.

## Desar els comentaris de l’entrenador

1. Obre el partit i el vídeo. Afegeix o edita les marques.
2. Toca **Desa l’anàlisi**. El navegador descarrega `SHUM-jornada-N-analisi.json` amb el partit, l’enllaç del vídeo, els temps, les categories, els autors i els comentaris.
3. Conserva aquest fitxer a la carpeta de Drive del partit i comparteix-lo amb l’entrenador.
4. En qualsevol dispositiu, obre el mateix partit i toca **Obre una anàlisi** per triar el JSON. Pots editar-lo i desar una nova versió.

El JSON no incorpora el vídeo. Un MP4 local s’ha de tornar a seleccionar; un vídeo de Drive necessita els permisos corresponents. Les marques actuals es reemplacen en importar, amb avís previ si n’hi ha. La còpia general d’Ajustos només conté fitxes, notes i alineacions; cada anàlisi es desa des del partit.

El navegador conserva un esborrany com a comoditat. El fitxer descarregat és la còpia portable que cal conservar; un dispositiu diferent no sincronitza els canvis automàticament. Pages no inclou una base de dades ni l’autenticació de Sites. Per sincronització automàtica cal un servei extern amb autenticació i permisos.

## Compilar i publicar

Executa `npm run check` i `npm run build:pages`, o directament `node scripts/build-pages.mjs` sense instal·lar dependències. El resultat és `pages-dist/`, amb rutes relatives que funcionen també dins de `/nom-del-repositori/`.

El workflow `.github/workflows/pages.yml` publica aquest directori a GitHub Pages quan s’executa manualment amb **Run workflow**. Al repositori, selecciona **Settings → Pages → Source → GitHub Actions**. Repositori publicat: https://github.com/xavikai/shum-infantil-or. Web: https://xavikai.github.io/shum-infantil-or/. El workflow també s’executa automàticament amb cada push a main.

La versió existent de Sites conserva les seves API i D1; el build de Pages les substitueix per la gestió d’anàlisis amb fitxers i no fa peticions a `/api/`.

## Rànquings i alineacions
Les fitxes permeten editar posició, minuts, edat al partit, gols, gols encaixats i targetes blaves, vermelles i grogues. Les dades desconegudes queden buides; un zero és un valor confirmat. Les alineacions i estadístiques es conserven tant a la còpia general com al JSON d'anàlisi del partit. Els rànquings són parcials segons les actes incorporades. Els porters només entren al rànquing amb minuts i gols encaixats informats a totes les seves actes incorporades. L'ordre per defecte és menys gols totals i es pot comparar per gols cada 60 minuts. Les edats no s'infereixen de la categoria.

## Àmbits dels rànquings
El selector compartit de golejadors, porters i targetes permet triar Només SHUM (tota la lliga), Últim partit del SHUM (els dos equips), Lliga grup 8 o Tot Infantil Or. Aquest últim carrega els deu grups oficials i ofereix un filtre per grup. Les actes es consulten des del navegador amb tres peticions simultànies i es conserva una còpia durant una hora; Actualitza Infantil Or força una consulta nova. Les dades de minuts, gols encaixats i targetes no disponibles continuen pendents. No es barregen jugadors de grups diferents encara que coincideixin els noms.

## Vídeos dels partits
Els vídeos que veuen tots els visitants es publiquen a `public/ui/videos.json`: una entrada per partit amb `match_id` (l'`id` del partit a `league.json`) i l'enllaç de Drive. Per afegir-ne un, puja el vídeo a la carpeta LLIGA_OR, comparteix-lo com a «Qualsevol persona amb l'enllaç», afegeix la línia al fitxer i fes push a main. L'enllaç que s'escriu a la fitxa d'un partit només es desa en aquell navegador i al JSON d'anàlisi; no es publica per a la resta de visitants.

## Gols encaixats
Les actes de FECAPA no indiquen els gols encaixats per porter. Quan l'acta d'un equip només inclou un porter (P), la web li assigna els gols del rival. Si n'hi ha dos, queden pendents fins que s'informin a la fitxa del partit. Un valor introduït manualment sempre té prioritat.

## Equips del SHUM
La web inclou tots els equips del SHUM (club 320 de FECAPA) de la temporada. La llista és a `public/ui/teams.json`: per a cada equip, la competició (`idc`), el grup (`phase`), el nom oficial de l'equip a FECAPA i si l'acta apunta gols per jugador (`playerGoals`). A prebenjamí i benjamí l'acta apunta tots els gols al capità, i per això s'amaga el rànquing de golejadors. Les dades de cada equip són a `public/ui/data/<equip>.json`. Per afegir un equip nou, afegeix-ne l'entrada a `teams.json`: la tasca automàtica en crearà el fitxer de dades.

Cada visitant tria l'equip al selector «Equip que segueixes». La web el recorda en aquell navegador, i també es pot compartir un enllaç directe amb `?equip=<id>`, per exemple `?equip=alevi-plata-a`. Les notes, alineacions manuals i còpies es desen per equip. Els identificadors dels partits de l'Infantil Or no han canviat, de manera que es conserven les notes, les marques i els vídeos que ja hi havia.

## Actualització automàtica des de FECAPA
El workflow `.github/workflows/pages.yml` també s'executa sol: cada 3 hores, i cada hora els dissabtes i diumenges de 10 h a 0 h. Executa `scripts/update-teams.mjs`, que consulta el calendari de cada equip i només llegeix les actes noves, les que han canviat o les dels darrers quatre dies. Si hi ha canvis, desa un commit «Actualitza dades de FECAPA» i torna a publicar la web; si no n'hi ha, no publica res. Si un equip falla (FECAPA no respon, canvia el format o el grup s'ha reduït a menys de la meitat), aquell equip conserva l'última còpia bona i la resta s'actualitzen igualment. Es pot forçar des de GitHub: **Actions → Web a GitHub Pages → Run workflow**. Abans de fer canvis a mà, fes **Fetch/Pull** a GitHub Desktop per incorporar els commits automàtics.

## Vídeos automàtics des de Drive (només Infantil Or)
Els vídeos només existeixen per a l'Infantil Or; als altres equips la web no mostra «Vídeo pendent» ni la secció d'anàlisi de vídeo. El programa `tools/drive-videos.gs` (Google Apps Script) mira cada hora la carpeta LLIGA_OR de Drive i vincula cada vídeo nou al partit corresponent de l'Infantil Or afegint-lo a `public/ui/videos.json`. GitHub torna a publicar la web sol.

El nom del fitxer ha de ser `Local-Visitant_GolsLocal-GolsVisitant.mp4`, amb paraules del nom de cada equip (i la lletra de l'equip si cal): `Cubelles-Shum_8-0.mp4`, `Shum-SantJust_4-3.mp4`, `CerdanyolaB-SHUM_2-1.mp4`. Es vincula si hi ha un sol partit jugat amb aquests equips i aquest resultat. No substitueix mai un vídeo que ja estigui vinculat. Fa que el vídeo es pugui veure amb l'enllaç. Els fitxers que no pot vincular apareixen al registre d'execucions de l'script.

Configuració, una sola vegada:
1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token. Repository access: només `xavikai/shum-infantil-or`. Permissions → Contents: **Read and write**. Copia el token.
2. Amb el compte del centre, obre https://script.new, esborra el contingut, enganxa `tools/drive-videos.gs` i desa el projecte amb el nom «SHUM vídeos».
3. ⚙ Configuració del projecte → Propietats de l'script → afegeix `GITHUB_TOKEN` amb el token.
4. Editor → tria la funció `vinculaVideos` → Executa. Accepta els permisos de Drive i de connexió externa. Al registre ha de dir «Cap vídeo nou per vincular» o «Vinculat: …».
5. Tria la funció `activaCadaHora` → Executa. A partir d'aquí s'executa sol cada hora.
