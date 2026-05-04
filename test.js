
    const STORAGE_KEY = 'rapport_intervention_dc_valves_v2';
    const EXPORT_STATUS_KEY = STORAGE_KEY + '_export_status_v1';
    const COMMON_EXCEL_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxc-NURqj3X4CAdln4ICuocz2gOj8KS1sVOI4UDkiznSwWSPPbd5vxKlR4uipUqrPDz/exec'; // URL Web App Google Apps Script pour alimenter le fichier commun
    let photoCount = 0;
    let isPrinting = false;
    let resizeTimer = null;
    let currentReportExported = false;
    let currentReportExportHash = '';

    function qs(selector, root = document) {
      return root.querySelector(selector);
    }

    function qsa(selector, root = document) {
      return Array.from(root.querySelectorAll(selector));
    }

    function collectData() {
      const data = { fields:{}, photos:[], mainPhoto:'', signatures:{} };

      qsa('[data-field]').forEach(el => {
        const key = el.dataset.field;
        data.fields[key] = el.type === 'checkbox' ? el.checked : el.value;
      });

      const mainPhotoImg = qs('#mainPhotoBox img');
      data.mainPhoto = mainPhotoImg ? mainPhotoImg.src : '';

      qsa('.photo-card').forEach(card => {
        const captionInput = qs('[data-caption]', card);
        data.photos.push({
          image: card.dataset.image || '',
          caption: captionInput ? captionInput.value : ''
        });
      });

      ['sigTech', 'sigClient'].forEach(id => {
        const canvas = document.getElementById(id);
        if (canvas) data.signatures[id] = canvas.toDataURL('image/png');
      });

      return data;
    }


    function saveLocal() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(collectData()));
      } catch (error) {
        console.warn('Sauvegarde locale impossible.', error);
      }
    }

    function loadLocal() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) applyData(JSON.parse(saved));
      } catch (error) {
        console.warn('Chargement local impossible.', error);
      }
    }

    function applyData(data) {
      if (!data || !data.fields) return;

      qsa('[data-field]').forEach(el => {
        const key = el.dataset.field;
        if (!(key in data.fields)) return;
        if (el.type === 'checkbox') el.checked = !!data.fields[key];
        else el.value = data.fields[key] ?? '';
      });

      if (data.mainPhoto) setMainPhoto(data.mainPhoto);
      else clearMainPhoto();

      const grid = document.getElementById('photoGrid');
      if (grid) {
        grid.innerHTML = '';
        photoCount = 0;
        const photos = data.photos || [];
        if (photos.length) photos.forEach(photo => addPhotoCard(photo));
        else for (let i = 0; i < 6; i++) addPhotoCard();
      }

      setTimeout(() => {
        ['sigTech', 'sigClient'].forEach(id => {
          setupSignature(id);
          if (data.signatures && data.signatures[id]) drawSignatureImage(id, data.signatures[id]);
        });
      }, 50);
    }

    function getReportFileBaseName() {
      const field = qs('[data-field="reportNumber"]');
      const value = field ? field.value.trim() : '';
      if (!value) return '';
      return value.replace(/[^a-zA-Z0-9-_]/g, '_');
    }

    function getCurrentReportFingerprint() {
      return JSON.stringify(collectData());
    }

    function markCurrentReportDirty() {
      currentReportExported = false;
      currentReportExportHash = '';
      try { localStorage.removeItem(EXPORT_STATUS_KEY); } catch (error) {}
    }

    function markCurrentReportExported() {
      currentReportExported = true;
      currentReportExportHash = getCurrentReportFingerprint();
      try {
        localStorage.setItem(EXPORT_STATUS_KEY, JSON.stringify({
          reportNumber: getReportFileBaseName(),
          hash: currentReportExportHash
        }));
      } catch (error) {}
    }

    function loadCurrentReportExportStatus() {
      try {
        const raw = localStorage.getItem(EXPORT_STATUS_KEY);
        if (!raw) return;
        const status = JSON.parse(raw);
        const reportNumber = getReportFileBaseName();
        const hash = getCurrentReportFingerprint();
        currentReportExported = !!(status && status.reportNumber === reportNumber && status.hash === hash);
        currentReportExportHash = currentReportExported ? hash : '';
      } catch (error) {
        currentReportExported = false;
        currentReportExportHash = '';
      }
    }

    function isCurrentReportExported() {
      return currentReportExported && currentReportExportHash && currentReportExportHash === getCurrentReportFingerprint();
    }

    async function exportJsonFileOnly() {
      const data = collectData();
      const safeReportNumber = getReportFileBaseName();
      if (!safeReportNumber) {
        alert('Le numéro de rapport est obligatoire avant l’exportation des données.');
        return false;
      }

      const fileName = `${safeReportNumber}.json`;
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type:'application/json' });

      if ('showSaveFilePicker' in window) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [{
              description: 'Fichier JSON',
              accept: { 'application/json': ['.json'] }
            }]
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          return true;
        } catch (error) {
          if (error && error.name === 'AbortError') return false;
        }
      }

      if ('File' in window && navigator.share) {
        try {
          const file = new File([blob], fileName, { type:'application/json' });
          if (!navigator.canShare || navigator.canShare({ files:[file] })) {
            await navigator.share({
              files:[file],
              title:fileName,
              text:'Export des données du rapport DC Valves'
            });
            return true;
          }
        } catch (error) {
          if (error && (error.name === 'AbortError' || error.name === 'NotAllowedError')) return false;
        }
      }

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      return true;
    }

    async function downloadJson() {
      if (!requireReportNumber()) return false;
      const exported = await exportJsonFileOnly();
      if (!exported) return false;
      markCurrentReportExported();
      await saveToCommonExcel('export_donnees');
      return true;
    }

    function importJson(event) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          applyData(JSON.parse(reader.result));
        } catch (error) {
          alert('Le fichier importé n’est pas un JSON valide.');
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    }

    async function resetReport() {
      if (!confirm('Créer un nouveau rapport et effacer les champs actuels ?')) return;

      if (!isCurrentReportExported()) {
        const shouldExport = confirm('Voulez-vous exporter les données avant de créer un nouveau rapport ?');
        if (shouldExport) {
          const exported = await downloadJson();
          // Si la fenêtre d’exportation est fermée/annulée, on ne fait rien : le rapport reste ouvert.
          if (!exported) return;
        }
      }

      clearCurrentReportFields();
    }

    function clearCurrentReportFields() {
      qsa('[data-field]').forEach(el => {
        if (el.type === 'checkbox') el.checked = false;
        else el.value = '';
      });

      clearMainPhoto();

      const grid = document.getElementById('photoGrid');
      if (grid) {
        grid.innerHTML = '';
        photoCount = 0;
        for (let i = 0; i < 6; i++) addPhotoCard();
      }

      clearSignature('sigTech');
      clearSignature('sigClient');

      const lock = document.getElementById('photoHeaderLock');
      if (lock) lock.checked = true;
      setPhotoHeaderLockState();
      syncPhotoHeader();

      const dateField = qs('[data-field="reportDate"]');
      if (dateField) dateField.value = new Date().toISOString().slice(0, 10);
      const reportField = qs('[data-field="reportNumber"]');
      if (reportField) reportField.value = '';
      updateReportRequiredVisualState();
      syncDocumentTitleWithReportNumber();
      currentReportExported = false;
      currentReportExportHash = '';
      try { localStorage.removeItem(EXPORT_STATUS_KEY); } catch (error) {}
      saveLocal();
    }

    function printReport() {
      if (isPrinting) return;
      updateReportRequiredVisualState();
      if (!requireReportNumber()) return;
      isPrinting = true;
      calculateHours();

      const safeTitle = getReportFileBaseName();
      if (!safeTitle) {
        alert('Le numéro de rapport est obligatoire avant l’exportation PDF / impression.');
        isPrinting = false;
        return;
      }

      // Le titre du document sert de nom proposé par Safari/Chrome lors de l'enregistrement PDF.
      // On le conserve au numéro du rapport pour fiabiliser le nom du PDF exporté/imprimé.
      document.title = safeTitle;
      saveLocal();

      // Envoi Google Sheets en arrière-plan : ne bloque jamais l'ouverture de la fenêtre d'impression.
      saveToCommonExcel('pdf_impression').catch(error => {
        console.warn('Envoi Google Sheets différé/échoué :', error);
      });

      document.body.classList.add('print-mode');

      // Appel direct obligatoire sur iPad/Safari : un setTimeout peut casser l'action utilisateur.
      try {
        window.print();
      } catch (error) {
        console.error('Impression impossible :', error);
        document.body.classList.remove('print-mode');
        isPrinting = false;
        alert('La fenêtre d’impression n’a pas pu s’ouvrir. Réessaie depuis Safari ou réinstalle l’app depuis l’écran d’accueil.');
      }

      setTimeout(() => {
        document.body.classList.remove('print-mode');
        isPrinting = false;
      }, 15000);
    }

    window.addEventListener('beforeprint', () => {
      syncDocumentTitleWithReportNumber();
    });

    window.addEventListener('afterprint', () => {
      document.body.classList.remove('print-mode');
      isPrinting = false;
    });

    window.addEventListener('focus', () => {
      setTimeout(() => {
        document.body.classList.remove('print-mode');
        isPrinting = false;
      }, 300);
    });

    function addPhotoCard(photo = {}) {
      photoCount++;
      const grid = document.getElementById('photoGrid');
      if (!grid) return;

      const card = document.createElement('div');
      card.className = 'photo-card';
      card.dataset.image = photo.image || '';
      card.innerHTML = `
        <div class="photo-box">${photo.image ? `<img src="${photo.image}" alt="Photo ${photoCount}">` : '<span class="small">Aucune photo</span>'}</div>
        <div class="photo-caption">
          <b>Photo ${photoCount} :</b><span>Légende :</span>
          <input data-caption placeholder="" value="${escapeHtml(photo.caption || '')}">
        </div>
        <div class="photo-actions no-print photo-source-actions">
          <button type="button" class="album-btn">Album</button>
          <input type="file" accept="image/*" class="album-input" hidden>
          <button type="button" class="camera-btn">Prendre une photo</button>
          <input type="file" accept="image/*" capture="environment" class="camera-input" hidden>
          <button type="button" class="delete-btn">Supprimer</button>
        </div>`;

      const captionInput = qs('[data-caption]', card);
      if (captionInput) {
        captionInput.addEventListener('input', () => { markCurrentReportDirty(); saveLocal(); });
        captionInput.addEventListener('change', () => { markCurrentReportDirty(); saveLocal(); });
      }

      const albumInput = qs('.album-input', card);
      const cameraInput = qs('.camera-input', card);
      const albumBtn = qs('.album-btn', card);
      const cameraBtn = qs('.camera-btn', card);
      const deleteBtn = qs('.delete-btn', card);

      albumBtn.addEventListener('click', () => albumInput.click());
      cameraBtn.addEventListener('click', () => cameraInput.click());
      albumInput.addEventListener('change', e => loadPhoto(e, card));
      cameraInput.addEventListener('change', e => loadPhoto(e, card));
      deleteBtn.addEventListener('click', () => {
        card.remove();
        renumberPhotos();
        markCurrentReportDirty();
        saveLocal();
      });

      grid.appendChild(card);
    }

    function loadPhoto(event, card) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        card.dataset.image = reader.result;
        qs('.photo-box', card).innerHTML = `<img src="${reader.result}" alt="Photo ajoutée">`;
        markCurrentReportDirty();
        saveLocal();
      };
      reader.readAsDataURL(file);
      event.target.value = '';
    }

    function loadMainPhoto(event) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => setMainPhoto(reader.result);
      reader.readAsDataURL(file);
      event.target.value = '';
    }

    function setMainPhoto(src) {
      const box = document.getElementById('mainPhotoBox');
      if (!box) return;
      box.innerHTML = `<img src="${src}" alt="Photo principale">`;
      markCurrentReportDirty();
      saveLocal();
    }

    function clearMainPhoto() {
      const box = document.getElementById('mainPhotoBox');
      if (!box) return;
      box.innerHTML = '<span class="small">Aucune photo principale</span>';
      markCurrentReportDirty();
      saveLocal();
    }

    function renumberPhotos() {
      qsa('.photo-card').forEach((card, idx) => {
        const label = qs('.photo-caption b', card);
        if (label) label.textContent = `Photo ${idx + 1} :`;
      });
      photoCount = qsa('.photo-card').length;
    }

    function escapeHtml(str) {
      return String(str).replace(/[&<>'"]/g, c => ({
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        "'":'&#39;',
        '"':'&quot;'
      }[c]));
    }

    function minutesBetween(start, end) {
      if (!start || !end) return 0;
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      let a = sh * 60 + sm;
      let b = eh * 60 + em;
      if (Number.isNaN(a) || Number.isNaN(b)) return 0;
      if (b < a) b += 1440;
      return b - a;
    }

    function calculateHours() {
      const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      let total = 0;
      const fields = collectData().fields;

      days.forEach(d => {
        total += minutesBetween(fields['as' + d], fields['ae' + d]);
        total += minutesBetween(fields['ws' + d], fields['we' + d]);
        total += minutesBetween(fields['ds' + d], fields['de' + d]);
      });

      const h = Math.floor(total / 60);
      const m = total % 60;
      const totalField = qs('[data-field="totalHours"]');
      if (totalField) totalField.value = `${h}:${String(m).padStart(2, '0')}`;
    }

    function setupSignature(id) {
      const canvas = document.getElementById(id);
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const oldImage = canvas.width && canvas.height ? canvas.toDataURL('image/png') : null;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();

      canvas.width = Math.max(rect.width * ratio, 1);
      canvas.height = Math.max(rect.height * ratio, 1);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#111';

      if (oldImage) drawSignatureImage(id, oldImage);

      let drawing = false;
      let last = null;

      function pos(e) {
        const r = canvas.getBoundingClientRect();
        const p = e.touches ? e.touches[0] : e;
        return { x:p.clientX - r.left, y:p.clientY - r.top };
      }

      function start(e) {
        markCurrentReportDirty();
        drawing = true;
        last = pos(e);
        e.preventDefault();
      }

      function move(e) {
        if (!drawing) return;
        const p = pos(e);
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        last = p;
        e.preventDefault();
      }

      function end() {
        drawing = false;
      }

      canvas.onmousedown = start;
      canvas.onmousemove = move;
      canvas.onmouseup = end;
      canvas.onmouseleave = end;
      canvas.ontouchstart = start;
      canvas.ontouchmove = move;
      canvas.ontouchend = end;
    }

    function clearSignature(id) {
      const canvas = document.getElementById(id);
      if (!canvas) return;
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      markCurrentReportDirty();
    }

    function drawSignatureImage(id, src) {
      const canvas = document.getElementById(id);
      if (!canvas || !src) return;

      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        const ratio = window.devicePixelRatio || 1;
        ctx.drawImage(img, 0, 0, canvas.width / ratio, canvas.height / ratio);
      };
      img.src = src;
    }



    function buildCommonExcelPayload(actionType) {
      const data = collectData();
      const fields = data.fields || {};
      return {
        actionType,
        savedAt: new Date().toISOString(),
        reportNumber: fields.reportNumber || '',
        reportDate: fields.reportDate || '',
        technician: fields.technician || '',
        customer: fields.customer || '',
        orderNo: fields.orderNo || '',
        valveBrand: fields.valveBrand || '',
        serialNumber: fields.serialNumber || '',
        tagNo: fields.tagNo || '',
        plant: fields.plant || '',
        valveType: fields.valveType || '',
        internalRef: fields.internalRef || '',
        totalHours: fields.totalHours || '',
        totalKm: fields.totalKm || '',
        rawData: data
      };
    }

    function queueCommonExcelPayload(payload) {
      try {
        const key = STORAGE_KEY + '_pending_common_sheet';
        const pending = JSON.parse(localStorage.getItem(key) || '[]');
        pending.push(payload);
        localStorage.setItem(key, JSON.stringify(pending.slice(-50)));
      } catch (error) {
        console.warn('Mise en file locale impossible.', error);
      }
    }

    async function postCommonExcelPayload(payload) {
      const body = 'payload=' + encodeURIComponent(JSON.stringify(payload));
      await fetch(COMMON_EXCEL_WEB_APP_URL, {
        method:'POST',
        mode:'no-cors',
        headers:{ 'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8' },
        body
      });
    }

    async function flushCommonExcelQueue() {
      if (!COMMON_EXCEL_WEB_APP_URL) return;
      const key = STORAGE_KEY + '_pending_common_sheet';
      let pending = [];
      try {
        pending = JSON.parse(localStorage.getItem(key) || '[]');
      } catch (error) {
        pending = [];
      }
      if (!pending.length) return;

      const remaining = [];
      for (const payload of pending) {
        try {
          await postCommonExcelPayload(payload);
        } catch (error) {
          remaining.push(payload);
        }
      }
      try {
        if (remaining.length) localStorage.setItem(key, JSON.stringify(remaining));
        else localStorage.removeItem(key);
      } catch (error) {
        console.warn('Nettoyage file locale impossible.', error);
      }
    }

    async function saveToCommonExcel(actionType) {
      if (!COMMON_EXCEL_WEB_APP_URL) return false;

      const payload = buildCommonExcelPayload(actionType);
      try {
        await flushCommonExcelQueue();
        await postCommonExcelPayload(payload);
        return true;
      } catch (error) {
        console.warn('Enregistrement dans Google Sheets impossible :', error);
        queueCommonExcelPayload(payload);
        alert('Le rapport a été traité, mais l’enregistrement automatique dans Google Sheets n’a pas pu être envoyé maintenant. Il sera réessayé au prochain export avec une connexion internet.');
        return false;
      }
    }

    function formatDateForReportNumber(value) {
      const source = value ? new Date(value) : new Date();
      const now = Number.isNaN(source.getTime()) ? new Date() : source;
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      return `${yy}${mm}${dd}`;
    }

    function sanitizeReportPart(value, maxLength = 10) {
      return String(value || '')
        .trim()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '')
        .slice(0, maxLength);
    }

    function generateReportNumber() {
      const customer = sanitizeReportPart(qs('[data-field="customer"]')?.value, 12);
      const technician = sanitizeReportPart(qs('[data-field="technician"]')?.value, 10);

      if (!customer || !technician) return '';

      const date = formatDateForReportNumber(qs('[data-field="reportDate"]')?.value || '');
      const now = new Date();
      const time = [
        String(now.getHours()).padStart(2, '0'),
        String(now.getMinutes()).padStart(2, '0')
      ].join('');

      return `R-DCVALVES-${date}-${customer}-${technician}-${time}`;
    }



    function updateReportRequiredVisualState() {
      ['customer', 'technician'].forEach(key => {
        const el = qs(`[data-field="${key}"]`);
        if (!el) return;
        el.classList.toggle('report-required-missing', !String(el.value || '').trim());
      });
    }

    function getFirstMissingReportField() {
      return ['customer', 'technician']
        .map(key => qs(`[data-field="${key}"]`))
        .find(el => el && !String(el.value || '').trim()) || null;
    }

    function focusFirstMissingReportField() {
      const el = getFirstMissingReportField();
      if (!el) return false;
      setTimeout(() => {
        el.scrollIntoView({ behavior:'smooth', block:'center' });
        el.focus({ preventScroll:true });
      }, 50);
      return true;
    }

    function syncDocumentTitleWithReportNumber() {
      const safeTitle = getReportFileBaseName();
      if (safeTitle) document.title = safeTitle;
    }

    function setReportNumberValue(number) {
      const field = qs('[data-field="reportNumber"]');
      if (!field) return false;
      if (number && field.value !== number) {
        field.value = number;
        syncDocumentTitleWithReportNumber();
        saveLocal();
      }
      return !!number;
    }

    function updateAutomaticReportNumber(silent = true) {
      updateReportRequiredVisualState();
      const number = generateReportNumber();
      if (!number) {
        if (!silent) {
          alert('Remplis d’abord le client et le technicien pour générer le numéro de rapport.');
          focusFirstMissingReportField();
        }
        return false;
      }
      return setReportNumberValue(number);
    }

    function ensureReportNumber(force = false, silent = false) {
      updateReportRequiredVisualState();
      const field = qs('[data-field="reportNumber"]');
      if (!field) return false;

      // Le numéro est verrouillé : il doit toujours refléter les champs Client + Technicien.
      // On le régénère donc dès que ces champs sont disponibles, même s’il existe déjà.
      const updated = updateAutomaticReportNumber(true);
      if (updated) return true;

      if (!silent) {
        alert('Remplis d’abord le client et le technicien pour générer le numéro de rapport.');
        focusFirstMissingReportField();
      }
      return false;
    }

    function requireReportNumber() {
      return ensureReportNumber(true, false);
    }

    function bindReportNumberAuto() {
      ['customer', 'technician', 'reportDate'].forEach(key => {
        const el = qs(`[data-field="${key}"]`);
        if (!el) return;

        // Génération automatique silencieuse dès que Client + Technicien sont remplis.
        // Aucune pop-up pendant la saisie.
        el.addEventListener('input', () => updateAutomaticReportNumber(true));
        el.addEventListener('change', () => updateAutomaticReportNumber(true));
        el.addEventListener('blur', () => updateAutomaticReportNumber(true));
      });
    }

    const PHOTO_HEADER_MAP = {
      pValveBrand:'valveBrand',
      pSerialNumber:'serialNumber',
      pTagNo:'tagNo',
      pPlant:'plant',
      pInternalRef:'internalRef',
      pValveType:'valveType'
    };

    function getPhotoHeaderLock() {
      const lock = document.getElementById('photoHeaderLock');
      return !lock || lock.checked;
    }

    function setPhotoHeaderLockState() {
      const locked = getPhotoHeaderLock();
      qsa(Object.keys(PHOTO_HEADER_MAP).map(key => `[data-field="${key}"]`).join(',')).forEach(el => {
        el.readOnly = locked;
        el.title = locked ? 'Champ verrouillé : valeur synchronisée depuis le rapport d’inspection.' : 'Champ déverrouillé : modification manuelle possible.';
      });

      const state = document.getElementById('photoHeaderSyncState');
      if (state) {
        state.textContent = locked
          ? 'Champs photos verrouillés : copie automatique depuis la première page.'
          : 'Champs photos déverrouillés : modification manuelle possible, avec synchronisation bidirectionnelle.';
      }
    }

    function copyValue(sourceKey, targetKey) {
      const source = qs(`[data-field="${sourceKey}"]`);
      const target = qs(`[data-field="${targetKey}"]`);
      if (!source || !target) return;
      if (target.value !== source.value) target.value = source.value;
    }

    function syncPhotoHeader(changedField = '') {
      const locked = getPhotoHeaderLock();

      Object.entries(PHOTO_HEADER_MAP).forEach(([photoKey, inspectionKey]) => {
        if (locked) {
          copyValue(inspectionKey, photoKey);
          return;
        }

        if (changedField === photoKey) {
          copyValue(photoKey, inspectionKey);
        } else {
          copyValue(inspectionKey, photoKey);
        }
      });

      setPhotoHeaderLockState();
      saveLocal();
    }

    function bindSyncedFields() {
      const sourceKeys = Object.values(PHOTO_HEADER_MAP);
      const photoKeys = Object.keys(PHOTO_HEADER_MAP);

      [...sourceKeys, ...photoKeys].forEach(key => {
        const el = qs(`[data-field="${key}"]`);
        if (!el) return;
        ['input', 'change'].forEach(eventName => {
          el.addEventListener(eventName, () => syncPhotoHeader(key));
        });
      });

      const lock = document.getElementById('photoHeaderLock');
      if (lock) {
        lock.addEventListener('change', () => {
          setPhotoHeaderLockState();
          if (lock.checked) syncPhotoHeader();
          saveLocal();
        });
      }
    }

    function init() {
      const grid = document.getElementById('photoGrid');
      if (grid && qsa('.photo-card').length === 0) {
        for (let i = 0; i < 6; i++) addPhotoCard();
      }

      setupSignature('sigTech');
      setupSignature('sigClient');

      const dateField = qs('[data-field="reportDate"]');
      if (dateField && !dateField.value) {
        dateField.value = new Date().toISOString().slice(0, 10);
      }

      bindSyncedFields();
      bindReportNumberAuto();
      flushCommonExcelQueue();

      qsa('input, textarea, select').forEach(el => {
        el.addEventListener('input', () => {
          if (el.dataset.field !== 'reportNumber') markCurrentReportDirty();
          saveLocal();
        });
        el.addEventListener('change', () => {
          if (el.dataset.field !== 'reportNumber') markCurrentReportDirty();
          saveLocal();
        });
      });

      loadLocal();
      ensureReportNumber(false, true);
      loadCurrentReportExportStatus();
      setPhotoHeaderLockState();
      syncPhotoHeader();
    }

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').catch(error => {
          console.warn('Service worker non enregistré.', error);
        });
      });
    }

    window.addEventListener('load', init);

    window.addEventListener('orientationchange', () => {
      if (isPrinting) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setupSignature('sigTech');
        setupSignature('sigClient');
        saveLocal();
      }, 500);
    });
  