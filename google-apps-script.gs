const SHEET_NAME = 'Rapports';
// Optionnel : si le script n'est pas créé depuis le Google Sheet, colle ici l'ID du fichier Google Sheets.
// L'ID est la partie entre /d/ et /edit dans l'URL du Google Sheet.
const SPREADSHEET_ID = '';

const MAIN_HEADERS = [
  'Date enregistrement',
  'Action',
  'N° rapport',
  'Date rapport',
  'Technicien',
  'Client',
  'N° commande',
  'Marque vanne',
  'N° série',
  'Repère / Tag',
  'Installation',
  'Type vanne',
  'Référence interne',
  'Total heures',
  'Total km'
];

const FIELD_LABELS = {
  reportNumber:'Numéro rapport', internalRef:'Référence interne', valveBrand:'Marque de la vanne', serialNumber:'Numéro de série', tagNo:'Repère / Tag', plant:'Installation', valveType:'Type de vanne', dn:'DN', pn:'PN', cvKv:'CV/KV',
  connectionFlanges:'Raccordement - Brides', connectionWafer:'Raccordement - Wafer', connectionBw:'Raccordement - BW', connectionThreaded:'Raccordement - Taraudé',
  orientationVertical:'Orientation - verticale', orientationHorizontal:'Orientation - horizontale',
  typeGlobeValve:'Type - Robinet soupape', typeBallValve:'Type - Vanne à boule', typeButterflyValve:'Type - Vanne papillon', typeButterflySimple:'Type - Papillon à manchette', typeButterflyDouble:'Type - Papillon double excentrique', typeButterflyTriple:'Type - Papillon triple excentrique', typeGateValve:'Type - Vanne gate', typeVBallValve:'Type - Vanne V ball', type3WayValve:'Type - Vanne 3 voies', typeDesuperheater:'Type - Désurchauffeur', typeSteamConditioningValve:'Type - Vanne de conditionnement vapeur', typeOther:'Type - Autres', typeOtherText:'Type - Précision autre',
  motorBrand:'Moteur - Marque', motorModel:'Moteur - Modèle', motorTypeSe:'Moteur - Type SE', motorTypeDe:'Moteur - Type DE', motorLimitNo:'Moteur - Fin de course NO', motorLimitNf:'Moteur - Fin de course NF', motorElectric:'Moteur - Électrique', motorPneumatic:'Moteur - Pneumatique', solenoid24v:'Électrovanne - 24V', solenoid230v:'Électrovanne - 230V', motorVoltage24v:'Moteur - Tension 24V', motorVoltage230v:'Moteur - Tension 230V', motorVoltage380v:'Moteur - Tension 380V', motorSetting:'Moteur - Tarage', motorMembraneSize:'Moteur - Taille de la membrane', motorRemarks:'Moteur - Remarque',
  positionerBrand:'Positionneur - Marque', positionerModel:'Positionneur - Modèle', positionerFeedbackYes:'Positionneur - Recopieur Oui', positionerFeedbackNo:'Positionneur - Recopieur Non', positionerTestOk:'Positionneur - Test OK', positionerTestNotOk:'Positionneur - Test NON OK', positionerAdjustment:'Positionneur - Réglage', positionerPressure:'Positionneur - Pression', positionerVoltage24v:'Positionneur - 24V', positionerVoltage230v:'Positionneur - 230V', positionerRemarks:'Positionneur - Remarque',
  workDisassembly:'Travaux - Démontage', workMembrane:'Travaux - Remplacement membrane', workSeals:'Travaux - Remplacement joints et O-rings', workLapping:'Travaux - Rodage siège/clapet', workReassembly:'Travaux - Remontage', workPacking:'Travaux - Remplacement bourrage', workTest:'Travaux - Test et calibration', workOther:'Travaux - Autre', workOtherText:'Travaux - Précision autre', workRemarks:'Remarques travaux',
  sparePartInquiry:'Recommandation - Demande pièces rechange', overhaulDcValves:'Recommandation - Révision DC Valves', valveModification:'Recommandation - Modification vanne', visitService:'Recommandation - Intervention service DC Valves', recommendationText:'Recommandation - Remarques',
  company:'Société', companyPhone:'Téléphone', street:'Rue', web:'Site web', town:'Localité', dcContact:'Contact DC Valves', reportDate:'Date', technician:'Technicien', customer:'Client', orderNo:'N° commande', desiredService:'Défaut constaté ou service demandé', necessaryMaterial:'Matériel nécessaire', totalHours:'Total heures', totalKm:'Kilométrage total'
};

function doGet() {
  return jsonOutput({ ok:true, message:'Web App DC Valves active. Utilise un POST depuis la PWA.' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const data = parsePayload(e);
    const ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error('Aucun Google Sheet actif. Crée le script depuis le Google Sheet ou renseigne SPREADSHEET_ID.');

    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    const fields = (data.rawData && data.rawData.fields) ? data.rawData.fields : {};

    const dynamicHeaders = Object.keys(fields).map(key => FIELD_LABELS[key] || key);
    const headers = unique([...MAIN_HEADERS, ...dynamicHeaders, 'Données complètes JSON']);
    ensureHeaders(sheet, headers);

    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const rowObject = buildRowObject(data, fields);
    const row = currentHeaders.map(header => header in rowObject ? rowObject[header] : '');
    sheet.appendRow(row);

    return jsonOutput({ ok:true, reportNumber:data.reportNumber || '' });
  } catch (err) {
    return jsonOutput({ ok:false, error:String(err) });
  } finally {
    lock.releaseLock();
  }
}

function parsePayload(e) {
  if (e && e.parameter && e.parameter.payload) return JSON.parse(e.parameter.payload);
  const content = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
  if (content.indexOf('payload=') === 0) return JSON.parse(decodeURIComponent(content.replace(/^payload=/, '')));
  return JSON.parse(content);
}

function buildRowObject(data, fields) {
  const obj = {
    'Date enregistrement': data.savedAt || new Date().toISOString(),
    'Action': data.actionType || '',
    'N° rapport': data.reportNumber || fields.reportNumber || '',
    'Date rapport': data.reportDate || fields.reportDate || '',
    'Technicien': data.technician || fields.technician || '',
    'Client': data.customer || fields.customer || '',
    'N° commande': data.orderNo || fields.orderNo || '',
    'Marque vanne': data.valveBrand || fields.valveBrand || '',
    'N° série': data.serialNumber || fields.serialNumber || '',
    'Repère / Tag': data.tagNo || fields.tagNo || '',
    'Installation': data.plant || fields.plant || '',
    'Type vanne': data.valveType || fields.valveType || '',
    'Référence interne': data.internalRef || fields.internalRef || '',
    'Total heures': data.totalHours || fields.totalHours || '',
    'Total km': data.totalKm || fields.totalKm || '',
    'Données complètes JSON': JSON.stringify(data.rawData || {})
  };

  Object.keys(fields).forEach(key => {
    obj[FIELD_LABELS[key] || key] = normalizeValue(fields[key]);
  });

  return obj;
}

function normalizeValue(value) {
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (value === null || value === undefined) return '';
  return value;
}

function ensureHeaders(sheet, headers) {
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    styleHeader(sheet, headers.length);
    return;
  }

  const existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].filter(String);
  const missing = headers.filter(h => existing.indexOf(h) === -1);
  if (missing.length) {
    sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
  }
  styleHeader(sheet, sheet.getLastColumn());
}

function styleHeader(sheet, colCount) {
  sheet.getRange(1, 1, 1, colCount)
    .setFontWeight('bold')
    .setBackground('#0AAED0')
    .setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);
}

function unique(arr) {
  return arr.filter((item, index) => arr.indexOf(item) === index);
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
