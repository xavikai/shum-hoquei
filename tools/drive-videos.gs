/**
 * SHUM · Vincula automàticament els vídeos de Drive als partits de l'Infantil Or.
 *
 * S'executa a Google Apps Script amb el compte propietari de la carpeta LLIGA_OR.
 * Cada hora mira els vídeos de la carpeta, troba el partit de l'Infantil Or que
 * correspon a cada nom de fitxer i afegeix l'enllaç a public/ui/videos.json del
 * repositori de GitHub. GitHub torna a publicar la web automàticament.
 *
 * Nom dels fitxers: Local-Visitant_GolsLocal-GolsVisitant.mp4
 *   Exemples: Cubelles-Shum_8-0.mp4 · Shum-SantJust_4-3.mp4 · CerdanyolaB-SHUM_2-1.mp4
 * N'hi ha prou amb una o més paraules del nom de cada equip, sense espais ni accents:
 *   CerdanyolaB, SantJust, SantCugat, Mataro, Voltrega, Cubelles, Shum.
 *
 * També treu l'opció de descarregar els vídeos de la carpeta a qui només els pot veure.
 *
 * Configuració (una sola vegada): vegeu GITHUB_PAGES.md, apartat «Vídeos automàtics».
 */

const CONFIG = {
  folderId: '180V5ENc5_UtoP1LSNmMiMRQFzfZtMI15', // HOQUEI PATINS / TEMPORADA 2627 / LLIGA_OR
  repo: 'xavikai/shum-hoquei',
  branch: 'main',
  videosPath: 'public/ui/videos.json',
  dataPath: 'public/ui/data/infantil-or.json',
  makePublic: true // fa que cada vídeo nou es pugui veure amb l'enllaç
};

/** Executa-ho a mà per provar-ho; després el disparador ho fa cada hora. */
function vinculaVideos() {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('Falta la propietat GITHUB_TOKEN (Configuració del projecte → Propietats de l’script).');
  const league = JSON.parse(github_(token, 'GET', CONFIG.dataPath, null, true));
  const current = JSON.parse(github_(token, 'GET', CONFIG.videosPath));
  const videosFile = JSON.parse(Utilities.newBlob(Utilities.base64Decode(current.content.replace(/\n/g, ''))).getDataAsString('UTF-8'));

  const files = [];
  const it = DriveApp.getFolderById(CONFIG.folderId).getFiles();
  while (it.hasNext()) {
    const f = it.next();
    if (!/^video\//.test(f.getMimeType())) continue;
    files.push({ id: f.getId(), name: f.getName(), created: f.getDateCreated().toISOString(), file: f });
  }

  protegeixDescarrega_(files);
  const { added, unmatched } = mergeVideos(videosFile, files, league);
  unmatched.forEach(u => Logger.log('Sense partit: ' + u.name + ' (' + u.reason + ')'));
  if (!added.length) { Logger.log('Cap vídeo nou per vincular.'); return; }

  if (CONFIG.makePublic) added.forEach(a => {
    try { a.file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
    catch (e) { Logger.log('No s’ha pogut compartir ' + a.name + ': ' + e.message); }
  });

  const text = JSON.stringify(videosFile, null, 2) + '\n';
  github_(token, 'PUT', CONFIG.videosPath, {
    message: 'Vincula vídeos de Drive: ' + added.map(a => a.name).join(', '),
    content: Utilities.base64Encode(text, Utilities.Charset.UTF_8),
    sha: current.sha,
    branch: CONFIG.branch
  });
  added.forEach(a => Logger.log('Vinculat: ' + a.name + ' → partit ' + a.match_id));
}

/**
 * Treu l'opció de descarregar (i copiar o imprimir) els vídeos a qui només els pot veure.
 * Fa servir l'API de Drive amb el mateix permís de Drive que ja té l'script.
 * Recorda quins vídeos ja ha protegit per no repetir-ho cada hora.
 */
function protegeixDescarrega_(files) {
  const props = PropertiesService.getScriptProperties();
  const done = new Set(JSON.parse(props.getProperty('PROTECTED_IDS') || '[]'));
  let changed = false;
  files.forEach(f => {
    if (done.has(f.id)) return;
    const res = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + f.id + '?supportsAllDrives=true', {
      method: 'patch',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      payload: JSON.stringify({ copyRequiresWriterPermission: true }),
      muteHttpExceptions: true
    });
    if (res.getResponseCode() < 300) { done.add(f.id); changed = true; Logger.log('Sense descàrrega: ' + f.name); }
    else Logger.log('No s’ha pogut treure la descàrrega de ' + f.name + ': ' + res.getContentText().slice(0, 200));
  });
  if (changed) props.setProperty('PROTECTED_IDS', JSON.stringify([...done]));
}

/** Crea el disparador horari. Executa-ho una sola vegada. */
function activaCadaHora() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'vinculaVideos').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('vinculaVideos').timeBased().everyHours(1).create();
  Logger.log('Disparador creat: vinculaVideos cada hora.');
}

/* ---------- Lògica de coincidència (també es prova al repositori) ---------- */

function normalize_(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Paraules d'un nom de fitxer: «CerdanyolaB» → ['cerdanyola','b'] · «SantJust» → ['sant','just']. */
function words_(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]{2,})([A-Z][a-z])/g, '$1 $2')
    .toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/** Llegeix «Local-Visitant_3-2.mp4» → {home:[paraules], away:[paraules], score:[3,2]} o null. */
function parseVideoName(name) {
  const base = String(name).replace(/\.[^.]+$/, '');
  const m = base.match(/^\s*(.+?)\s*[-–]\s*(.+?)\s*[_ ]\s*(\d{1,2})\s*[-–]\s*(\d{1,2})\s*$/);
  if (!m) return null;
  return { home: words_(m[1]), away: words_(m[2]), score: [Number(m[3]), Number(m[4])] };
}

/** Totes les paraules del fitxer han de ser al nom de l'equip; una lletra sola ha de ser la lletra de l'equip (A, B…). */
function teamMatches_(fileWords, team) {
  const teamWords = words_(team), joined = normalize_(team), letter = teamWords.length > 1 && teamWords[teamWords.length - 1].length === 1 ? teamWords[teamWords.length - 1] : null;
  const long = fileWords.filter(w => w.length > 1);
  if (!long.length || long.join('').length < 3) return false;
  return fileWords.every(w => w.length === 1 ? w === letter : joined.indexOf(w) !== -1);
}

/**
 * Afegeix a videosFile.videos els vídeos nous que coincideixen amb un únic partit jugat.
 * No toca mai els partits que ja tenen vídeo (ni els vinculats a mà).
 */
function mergeVideos(videosFile, files, league) {
  videosFile.videos = videosFile.videos || [];
  const linkedMatches = new Set(videosFile.videos.map(v => v.match_id));
  const linkedFiles = new Set(videosFile.videos.map(v => (String(v.video).match(/\/d\/([\w-]+)/) || [])[1]).filter(Boolean));
  const added = [], unmatched = [];
  files.slice().sort((a, b) => String(a.created).localeCompare(String(b.created))).forEach(f => {
    if (linkedFiles.has(f.id)) return;
    const p = parseVideoName(f.name);
    if (!p) { unmatched.push({ name: f.name, reason: 'el nom no segueix Local-Visitant_G-G' }); return; }
    const candidates = league.matches.filter(m => Array.isArray(m.score)
      && m.score[0] === p.score[0] && m.score[1] === p.score[1]
      && teamMatches_(p.home, m.home) && teamMatches_(p.away, m.away));
    if (candidates.length !== 1) { unmatched.push({ name: f.name, reason: candidates.length ? 'hi ha més d’un partit possible' : 'no hi ha cap partit jugat amb aquests equips i resultat' }); return; }
    const match = candidates[0];
    if (linkedMatches.has(match.id)) { unmatched.push({ name: f.name, reason: 'el partit ja té vídeo' }); return; }
    const entry = { match_id: match.id, title: match.home + ' – ' + match.away + ' (' + match.score.join('-') + ')', video: 'https://drive.google.com/file/d/' + f.id + '/view', auto: true };
    videosFile.videos.push(entry);
    linkedMatches.add(match.id); linkedFiles.add(f.id);
    added.push(Object.assign({ name: f.name, file: f.file }, entry));
  });
  return { added, unmatched };
}

function github_(token, method, path, body, raw) {
  const url = 'https://api.github.com/repos/' + CONFIG.repo + '/contents/' + path + (method === 'GET' ? '?ref=' + CONFIG.branch : '');
  const res = UrlFetchApp.fetch(url, {
    method: method.toLowerCase(),
    headers: { Authorization: 'Bearer ' + token, Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    contentType: 'application/json',
    payload: body ? JSON.stringify(body) : undefined,
    muteHttpExceptions: true
  });
  if (res.getResponseCode() >= 300) throw new Error('GitHub ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 300));
  return res.getContentText('UTF-8');
}
