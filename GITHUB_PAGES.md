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
