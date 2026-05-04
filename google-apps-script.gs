const SHEET_NAME = 'Rapports';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    const data = JSON.parse(e.postData.contents || '{}');

    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
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
        'Total km',
        'Données complètes JSON'
      ]);
    }

    sheet.appendRow([
      data.savedAt || new Date().toISOString(),
      data.actionType || '',
      data.reportNumber || '',
      data.reportDate || '',
      data.technician || '',
      data.customer || '',
      data.orderNo || '',
      data.valveBrand || '',
      data.serialNumber || '',
      data.tagNo || '',
      data.plant || '',
      data.valveType || '',
      data.internalRef || '',
      data.totalHours || '',
      data.totalKm || '',
      JSON.stringify(data.rawData || {})
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok:true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok:false, error:String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
