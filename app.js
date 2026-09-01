/* ==========================================================================
   GTA SA SAMP STALKER MAP - INTERACTIVE CORE ENGINE WITH ADMIN PANEL
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
    // ----------------------------------------------------------------------
    // 0. CLOUDINARY UPLOAD CONFIG (загрузка фото)
    // Imgur больше не выдаёт новые Client-ID (регистрация закрыта с 2025),
    // поэтому фото грузим на Cloudinary — там это официально поддерживаемый
    // и бесплатный (25 ГБ) способ анонимной загрузки прямо из браузера.
    //
    // Как получить эти два значения (5 минут):
    // 1) Зарегистрируйся на https://cloudinary.com (бесплатный план хватит с запасом)
    // 2) На Dashboard скопируй "Cloud name" -> вставь в CLOUDINARY_CLOUD_NAME
    // 3) Зайди в Settings -> Upload -> Upload presets -> Add upload preset
    //    -> Signing Mode поставь "Unsigned" -> Save
    //    -> скопируй имя пресета -> вставь в CLOUDINARY_UPLOAD_PRESET
    // ----------------------------------------------------------------------
    const CLOUDINARY_CLOUD_NAME = 'z7zrvru6';
    const CLOUDINARY_UPLOAD_PRESET = 'sampzona';

    // ----------------------------------------------------------------------
    // 1. DATA & MAP DEFINITIONS
    // ----------------------------------------------------------------------
    const ZONE_STYLES = {
        safe:      { color: 'rgba(46, 204, 113, 0.35)', border: '#2ecc71', label: 'Безопасная зона' },
        contested: { color: 'rgba(230, 126, 34, 0.40)', border: '#e67e22', label: 'Оспариваемая зона' },
        danger:    { color: 'rgba(255, 71, 87, 0.35)',  border: '#ff4757', label: 'Опасная зона' }
    };

    // 9 Вариаций Карт + скрытый черновик для Адм/Мод
    const MAP_VERSIONS = [
        { id: 'map1', label: 'Карта #1' },
        { id: 'map2', label: 'Карта #2' },
        { id: 'map3', label: 'Карта #3' },
        { id: 'map4', label: 'Карта #4' },
        { id: 'map5', label: 'Карта #5' },
        { id: 'map6', label: 'Карта #6' },
        { id: 'map7', label: 'Карта #7' },
        { id: 'map8', label: 'Карта #8' },
        { id: 'map9', label: 'Карта #9' },
        { id: 'map_draft', label: '🔒 Черновик', adminOnly: true }
    ];

    const MARKER_TYPES_INFO = {
        // Аномалии и нычки зоны
        zharka:            { name: 'Жарка', icon: '<i class="fa-solid fa-fire-flame-curved"></i>' },
        gazirovka:         { name: 'Газировка', icon: '<i class="fa-solid fa-vial"></i>' },
        elektra:           { name: 'Электра', icon: '<i class="fa-solid fa-bolt"></i>' },
        tramplin:          { name: 'Трамплин', icon: '<i class="fa-solid fa-tornado"></i>' },
        medusa:            { name: 'Медуза', icon: '<i class="fa-solid fa-atom"></i>' },
        voda:              { name: 'Вода', icon: '<i class="fa-solid fa-droplet"></i>' },
        luna:              { name: 'Луна', icon: '<i class="fa-solid fa-moon"></i>' },
        nychka_zona:       { name: 'Нычка', icon: '<i class="fa-solid fa-box-archive"></i>' },

        // Аномалии и нычки LV
        lomot_myasa:       { name: 'Ломоть мяса', icon: '<i class="fa-solid fa-drumstick-bite"></i>' },
        alenkiy_cvetochek: { name: 'Аленький цветочек', icon: '<i class="fa-solid fa-clover"></i>' },
        vyvert:            { name: 'Выверт', icon: '<i class="fa-solid fa-recycle"></i>' },
        kolobok:           { name: 'Колобок', icon: '<i class="fa-solid fa-sun"></i>' },
        nychka:            { name: 'Нычка', icon: '<i class="fa-solid fa-box-archive"></i>' },
        konteyner:         { name: 'Контейнер', icon: '<i class="fa-solid fa-boxes-stacked"></i>' },
        tochka_skanirovaniya: { name: 'Точка сканирования', icon: '<i class="fa-solid fa-satellite-dish"></i>' },
        zolotaya_rybka:    { name: 'Золотая рыбка', icon: '<i class="fa-solid fa-fish"></i>' },

        // Прочее
        ranenny_brodyaga:   { name: 'Раненный бродяга', icon: '<i class="fa-solid fa-user-ninja"></i>' },
        ranenny_stalker:   { name: 'Раненный сталкер', icon: '<i class="fa-solid fa-user-doctor"></i>' },
        ranenaya_zhertva:  { name: 'Раненая жертва', icon: '<i class="fa-solid fa-user-injured"></i>' },
        mesto_lovli_ryby:  { name: 'Место ловли рыбы', icon: '<i class="fa-solid fa-fish-fins"></i>' },

        // Базы Фракций
        base_stalker:      { name: 'База сталкеров', icon: '<i class="fa-solid fa-radiation"></i>' },
        base_bandit:       { name: 'База бандитов', icon: '<i class="fa-solid fa-skull-crossbones"></i>' },
        base_mutant:       { name: 'База мутантов', icon: '<i class="fa-solid fa-paw"></i>' },
        base_enclave:      { name: 'Анклав', icon: '<i class="fa-solid fa-shield-halved"></i>' }
    };

    let currentMapId = localStorage.getItem('gta_sa_stalker_current_map') || MAP_VERSIONS[0].id;
    if (!MAP_VERSIONS.some(m => m.id === currentMapId)) currentMapId = MAP_VERSIONS[0].id;

    function markersStorageKey() { return 'gta_sa_stalker_all_markers_v2'; }
    function zonesStorageKey() { return 'gta_sa_stalker_all_zones_v2'; }

    function loadAllMarkers() {
        const stored = localStorage.getItem(markersStorageKey());
        if (stored) {
            try { return JSON.parse(stored); } catch (e) { console.error(e); }
        }
        const legacy = localStorage.getItem('gta_sa_stalker_markers_map1');
        if (legacy) {
            try {
                const parsed = JSON.parse(legacy);
                return parsed.map(m => ({ ...m, mapId: m.mapId || 'map1' }));
            } catch (e) {}
        }
        return [];
    }

    function loadAllZones() {
        const stored = localStorage.getItem(zonesStorageKey());
        if (stored) {
            try { return JSON.parse(stored); } catch (e) { console.error(e); }
        }
        const legacy = localStorage.getItem('gta_sa_stalker_zones_map1');
        if (legacy) {
            try {
                const parsed = JSON.parse(legacy);
                return parsed.map(z => ({ ...z, mapId: z.mapId || 'map1' }));
            } catch (e) {}
        }
        return [];
    }

    function saveAllMarkersToStorage() {
        localStorage.setItem(markersStorageKey(), JSON.stringify(allMarkersData));
    }

    function saveAllZonesToStorage() {
        localStorage.setItem(zonesStorageKey(), JSON.stringify(allZonesData));
    }

    let allMarkersData = loadAllMarkers();
    let allZonesData = loadAllZones();

    // ----------------------------------------------------------------------
    // 1b. LOAD PUBLISHED data.json (общий источник данных для ВСЕХ посетителей)
    //
    // Как это работает:
    // - data.json лежит рядом с index.html и деплоится на Netlify вместе с сайтом.
    // - Все обычные посетители при заходе на сайт подтягивают его содержимое —
    //   так все видят одни и те же точки.
    // - Если ты (админ) наполняешь карту, твои правки продолжают жить в
    //   localStorage твоего браузера (черновик), пока ты не нажмёшь
    //   "Экспорт JSON" — эта кнопка скачивает файл data.json, который нужно
    //   положить в репозиторий рядом с index.html и передеплоить сайт.
    // - Чтобы у обычных посетителей не оставались устаревшие данные из их
    //   собственного localStorage, каждый экспорт получает метку версии
    //   (version), и если версия в data.json новее той, что уже сохранена в
    //   браузере посетителя, локальные данные перезаписываются свежими.
    // ----------------------------------------------------------------------
    const DATA_VERSION_KEY = 'gta_sa_stalker_data_version';
    const ANNOUNCEMENT_STORAGE_KEY = 'gta_sa_stalker_announcement';

    let announcementData = { text: '', active: false };

    async function loadPublishedData() {
        try {
            const res = await fetch(`data.json?_=${Date.now()}`, { cache: 'no-store' });
            if (res.ok) {
                const remote = await res.json();
                const remoteVersion = String(remote.version || '');
                const localVersion = localStorage.getItem(DATA_VERSION_KEY);

                if (!localVersion || remoteVersion !== localVersion) {
                    allMarkersData = Array.isArray(remote.markers) ? remote.markers : [];
                    allZonesData = Array.isArray(remote.zones) ? remote.zones : [];
                    saveAllMarkersToStorage();
                    saveAllZonesToStorage();
                    localStorage.setItem(DATA_VERSION_KEY, remoteVersion);
                }
            }
        } catch (e) {
            console.warn('Не удалось загрузить data.json, использую localStorage:', e);
        }

        // Загрузка объявления карты
        try {
            const aRes = await fetch(`announcement.json?_=${Date.now()}`, { cache: 'no-store' });
            if (aRes.ok) {
                const aData = await aRes.json();
                if (aData && typeof aData.text === 'string') {
                    announcementData = aData;
                    return;
                }
            }
        } catch (e) {}

        const storedA = localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY);
        if (storedA) {
            try { announcementData = JSON.parse(storedA); } catch (e) {}
        }
    }

    // ----------------------------------------------------------------------
    // 2. STATE MANAGEMENT & DOM ELEMENTS
    // ----------------------------------------------------------------------
    let currentScale = 0.5;
    let currentX = -400;
    let currentY = -400;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;

    let activeFilters = new Set(Object.keys(MARKER_TYPES_INFO).concat(['zone_safe', 'zone_contested', 'zone_danger']));

    let currentMapStyle = 'radar';
    let showLabels = true;
    let isAdminMode = false;
    let activeSelectedMarker = null;
    let isDrawingZone = false;
    let drawZonePoints = [];
    let pendingZoneId = '';
    let pendingZoneName = '';
    let pendingZoneType = 'danger';
    let pendingZoneMapId = 'all';

    // State for Distance Measurement Ruler
    let isRulerActive = false;
    let rulerPointA = null;
    let rulerPointB = null;

    // DOM Elements
    const mapViewport = document.getElementById('mapViewport');
    const mapContainer = document.getElementById('mapContainer');
    const mapBgLayer = document.getElementById('mapBgLayer');
    const markersLayer = document.getElementById('markersLayer');
    const zonesSvgLayer = document.getElementById('zonesSvgLayer');
    const zoneDrawSvgLayer = document.getElementById('zoneDrawSvgLayer');
    const rulerSvgLayer = document.getElementById('rulerSvgLayer');
    const coordsHud = document.getElementById('coordsHud');
    const coordsVal = document.getElementById('coordsVal');
    const zoomLevelVal = document.getElementById('zoomLevelVal');
    const detailsCard = document.getElementById('detailsCard');
    const searchInput = document.getElementById('searchInput');
    const searchBadge = document.getElementById('searchBadge');
    const searchResultsDropdown = document.getElementById('searchResultsDropdown');

    // Admin, Ruler & Announcement DOM Elements
    const btnToggleAdmin = document.getElementById('btnToggleAdmin');
    const adminHudBanner = document.getElementById('adminHudBanner');
    const cardAdminActions = document.getElementById('cardAdminActions');
    const markerModal = document.getElementById('markerModal');
    const markerForm = document.getElementById('markerForm');
    const modalTitle = document.getElementById('modalTitle');
    const btnEditMarker = document.getElementById('btnEditMarker');
    const btnSaveMarker = document.getElementById('btnSaveMarker');
    const btnDeleteMarker = document.getElementById('btnDeleteMarker');
    const btnExportJson = document.getElementById('btnExportJson');
    const btnResetMarkers = document.getElementById('btnResetMarkers');
    const mapVersionSelect = document.getElementById('mapVersionSelect');
    const zoneManagerList = document.getElementById('zoneManagerList');

    const btnRuler = document.getElementById('btnRuler');
    const rulerDrawBanner = document.getElementById('rulerDrawBanner');
    const rulerHint = document.getElementById('rulerHint');
    const btnCancelRuler = document.getElementById('btnCancelRuler');

    const topAnnouncementBanner = document.getElementById('topAnnouncementBanner');
    const announcementText = document.getElementById('announcementText');
    const btnEditAnnouncement = document.getElementById('btnEditAnnouncement');
    const btnExportAnnouncement = document.getElementById('btnExportAnnouncement');
    const announcementModal = document.getElementById('announcementModal');
    const announcementForm = document.getElementById('announcementForm');

    // ----------------------------------------------------------------------
    // 3. MAP BACKGROUND & COORDINATES (3000x3000 Canvas)
    // ----------------------------------------------------------------------
    function initMapBackground() {
        mapBgLayer.style.backgroundImage = 'url("full_map.jpg")';
    }

    // Convert Canvas 2D pixels (0..3000) to real GTA SA SAMP world coordinates (-3000..+3000)
    function canvasToSAMPCoords(cx, cy) {
        const sampX = ((-3000 + (cx / 3000) * 6000)).toFixed(1);
        const sampY = ((3000 - (cy / 3000) * 6000)).toFixed(1);
        const sampZ = (15.0).toFixed(1);
        return { x: sampX, y: sampY, z: sampZ };
    }

    // Convert SAMP world coordinates (-3000..+3000) to Canvas 2D pixels (0..3000)
    function sampToCanvasCoords(sx, sy) {
        const cx = Math.round(((parseFloat(sx) + 3000) / 6000) * 3000);
        const cy = Math.round(((3000 - parseFloat(sy)) / 6000) * 3000);
        return { x: cx, y: cy };
    }

    // ----------------------------------------------------------------------
    // 4. RENDER HAZARD ZONES & SIDEBAR ZONE MANAGER
    // ----------------------------------------------------------------------
    function getVisibleZones() {
        if (currentMapId === 'map_draft') {
            return allZonesData.filter(z => z.mapId === 'map_draft');
        }
        return allZonesData.filter(z => (z.mapId || 'all') === 'all' || z.mapId === currentMapId);
    }

    function renderHazardZones() {
        zonesSvgLayer.innerHTML = '';
        zonesSvgLayer.style.pointerEvents = isAdminMode ? 'auto' : 'none';

        const visibleZones = getVisibleZones();
        const zoneCounts = { safe: 0, contested: 0, danger: 0 };

        visibleZones.forEach(zone => {
            const zType = zone.type || 'danger';
            zoneCounts[zType] = (zoneCounts[zType] || 0) + 1;

            if (!activeFilters.has(`zone_${zType}`)) return;

            const style = ZONE_STYLES[zType] || ZONE_STYLES.danger;
            const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            polygon.setAttribute('points', zone.points);
            polygon.setAttribute('fill', style.color);
            polygon.setAttribute('stroke', style.border);
            polygon.setAttribute('stroke-width', '3');
            polygon.setAttribute('stroke-dasharray', '6,4');
            polygon.setAttribute('data-id', zone.id);

            if (isAdminMode) {
                polygon.classList.add('admin-clickable');
                polygon.style.pointerEvents = 'auto';
                polygon.style.cursor = 'pointer';
                polygon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openZoneModal(zone);
                });
            } else {
                polygon.style.pointerEvents = 'none';
            }

            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = `${zone.name} (${zone.mapId === 'all' || !zone.mapId ? 'Все карты' : zone.mapId})`;
            polygon.appendChild(title);

            zonesSvgLayer.appendChild(polygon);
        });

        ['safe', 'contested', 'danger'].forEach(t => {
            const el = document.getElementById(`count-zone-${t}`);
            if (el) el.textContent = zoneCounts[t] || 0;
        });

        const hazardBadge = document.getElementById('hazardZonesCount');
        if (hazardBadge) hazardBadge.textContent = `${visibleZones.length} Зоны`;

        renderZoneManagerList();
    }

    function renderZoneManagerList() {
        if (!zoneManagerList) return;
        const visibleZones = getVisibleZones();

        if (visibleZones.length === 0) {
            zoneManagerList.innerHTML = '<p class="zone-empty-hint">Зон пока нет. Добавьте зону через админ-панель.</p>';
            return;
        }

        zoneManagerList.innerHTML = '';
        visibleZones.forEach(zone => {
            const zType = zone.type || 'danger';
            const card = document.createElement('div');
            card.className = 'zone-item-card';

            const mapLabel = zone.mapId === 'all' || !zone.mapId ? 'Все карты' : `Карта #${zone.mapId.replace('map', '')}`;

            card.innerHTML = `
                <span class="marker-icon-preview zone-${zType}">
                    <i class="fa-solid fa-draw-polygon"></i>
                </span>
                <div class="zone-item-info">
                    <span class="zone-item-title">${zone.name}</span>
                    <span class="zone-item-map-tag">${mapLabel}</span>
                </div>
                <div class="zone-item-actions">
                    <button class="btn-zone-action focus" title="Фокус на зоне"><i class="fa-solid fa-crosshairs"></i></button>
                    ${isAdminMode ? `<button class="btn-zone-action edit" title="Редактировать"><i class="fa-solid fa-pen-to-square"></i></button>` : ''}
                    ${isAdminMode ? `<button class="btn-zone-action delete" title="Точечно удалить зону"><i class="fa-solid fa-trash"></i></button>` : ''}
                </div>
            `;

            const btnFocus = card.querySelector('.focus');
            btnFocus.addEventListener('click', () => focusOnZone(zone));

            if (isAdminMode) {
                const btnEdit = card.querySelector('.edit');
                if (btnEdit) btnEdit.addEventListener('click', () => openZoneModal(zone));

                const btnDelete = card.querySelector('.delete');
                if (btnDelete) btnDelete.addEventListener('click', () => deleteZone(zone.id, zone.name));
            }

            zoneManagerList.appendChild(card);
        });
    }

    function focusOnZone(zone) {
        const points = parsePointsString(zone.points);
        if (points.length === 0) return;
        let sumX = 0, sumY = 0;
        points.forEach(p => { sumX += p[0]; sumY += p[1]; });
        const centerX = sumX / points.length;
        const centerY = sumY / points.length;

        currentScale = 0.8;
        const rect = mapViewport.getBoundingClientRect();
        currentX = (rect.width / 2) - (centerX * currentScale);
        currentY = (rect.height / 2) - (centerY * currentScale);
        updateTransform();

        const poly = zonesSvgLayer.querySelector(`polygon[data-id="${zone.id}"]`);
        if (poly) {
            poly.style.strokeWidth = '6';
            poly.style.stroke = '#fff';
            setTimeout(() => {
                renderHazardZones();
            }, 1800);
        }
    }

    function deleteZone(zoneId, zoneName) {
        if (confirm(`Вы уверены, что хотите удалить зону "${zoneName}"?`)) {
            allZonesData = allZonesData.filter(z => z.id !== zoneId);
            saveAllZonesToStorage();
            renderHazardZones();
        }
    }

    // ----------------------------------------------------------------------
    // 5. RENDER MARKERS
    // ----------------------------------------------------------------------
    function getVisibleMarkers() {
        if (currentMapId === 'map_draft') {
            return allMarkersData.filter(m => m.mapId === 'map_draft');
        }
        return allMarkersData.filter(m => (m.mapId || 'all') === 'all' || m.mapId === currentMapId);
    }

    function matchesQuery(item, query) {
        if (!query) return true;
        const q = String(query).trim().toLowerCase();
        if (!q) return true;
        const name = String(item.name || '').toLowerCase();
        const location = String(item.location || '').toLowerCase();
        const desc = String(item.desc || '').toLowerCase();
        const typeName = String(getTypeName(item.type) || '').toLowerCase();

        return name.includes(q) || location.includes(q) || desc.includes(q) || typeName.includes(q);
    }

    function renderMarkers() {
        markersLayer.innerHTML = '';
        let visibleCount = 0;

        const counts = {};
        Object.keys(MARKER_TYPES_INFO).forEach(k => counts[k] = 0);

        const visibleMarkers = getVisibleMarkers();

        visibleMarkers.forEach(item => {
            if (counts[item.type] !== undefined) counts[item.type]++;

            if (!activeFilters.has(item.type)) return;

            const query = searchInput.value;
            if (!matchesQuery(item, query)) return;

            visibleCount++;

            const marker = document.createElement('div');
            marker.className = `map-marker ${item.type}`;
            marker.style.left = `${item.x}px`;
            marker.style.top = `${item.y}px`;
            marker.setAttribute('data-id', item.id);

            const info = MARKER_TYPES_INFO[item.type] || { icon: '<i class="fa-solid fa-location-dot"></i>' };

            marker.innerHTML = `
                <div class="marker-inner">
                    ${info.icon}
                </div>
                ${showLabels ? `<div class="marker-label">${item.name}</div>` : ''}
            `;

            marker.addEventListener('click', (e) => {
                e.stopPropagation();
                openMarkerDetails(item);
            });

            markersLayer.appendChild(marker);
        });

        Object.keys(counts).forEach(key => {
            const countEl = document.getElementById(`count-${key}`);
            if (countEl) countEl.textContent = counts[key];
        });

        document.getElementById('totalMarkersCount').textContent = visibleCount;
    }

    // ----------------------------------------------------------------------
    // 6. PAN & ZOOM ENGINE
    // ----------------------------------------------------------------------
    function updateTransform() {
        mapContainer.style.transform = `translate(${currentX}px, ${currentY}px) scale(${currentScale})`;
        zoomLevelVal.textContent = `${Math.round(currentScale * 100)}%`;
        const markerScale = Math.max(0.4, Math.min(1.1, 0.72 / Math.sqrt(currentScale)));
        markersLayer.style.setProperty('--marker-scale', markerScale.toFixed(2));
    }

    let isClickAction = true;

    mapViewport.addEventListener('mousedown', (e) => {
        if (e.target.closest('.map-marker') || e.target.closest('.hud-btn') || e.target.closest('.marker-details-card') || e.target.closest('.admin-hud-banner') || e.target.closest('.modal-overlay')) return;
        isDragging = true;
        isClickAction = true;
        dragStartX = e.clientX - currentX;
        dragStartY = e.clientY - currentY;
    });

    window.addEventListener('mousemove', (e) => {
        if (isDragging) {
            isClickAction = false;
            currentX = e.clientX - dragStartX;
            currentY = e.clientY - dragStartY;
            updateTransform();
        }

        const rect = mapViewport.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - currentX) / currentScale;
        const mouseY = (e.clientY - rect.top - currentY) / currentScale;

        if (mouseX >= 0 && mouseX <= 3000 && mouseY >= 0 && mouseY <= 3000) {
            const samp = canvasToSAMPCoords(mouseX, mouseY);
            coordsVal.textContent = `/tp ${samp.x} ${samp.y} ${samp.z}`;

            if (isRulerActive && rulerPointA && !rulerPointB) {
                renderRulerLayer({ x: mouseX, y: mouseY });
            }
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (e.target.closest('.map-marker') || e.target.closest('.hud-btn') || e.target.closest('.marker-details-card') || e.target.closest('.admin-hud-banner') || e.target.closest('.modal-overlay')) {
            isDragging = false;
            return;
        }

        if (isDragging && isClickAction) {
            const rect = mapViewport.getBoundingClientRect();
            const clickX = Math.round((e.clientX - rect.left - currentX) / currentScale);
            const clickY = Math.round((e.clientY - rect.top - currentY) / currentScale);

            if (clickX >= 0 && clickX <= 3000 && clickY >= 0 && clickY <= 3000) {
                if (isRulerActive) {
                    handleRulerMapClick(clickX, clickY);
                } else if (isAdminMode) {
                    if (isDrawingZone) {
                        drawZonePoints.push([clickX, clickY]);
                        renderZoneDrawPreview();
                    } else {
                        openAddMarkerModal(clickX, clickY);
                    }
                }
            }
        }
        isDragging = false;
    });

    mapViewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = 1.15;
        let newScale = e.deltaY < 0 ? currentScale * zoomFactor : currentScale / zoomFactor;
        newScale = Math.min(Math.max(newScale, 0.2), 3.0);

        const rect = mapViewport.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        currentX = mouseX - (mouseX - currentX) * (newScale / currentScale);
        currentY = mouseY - (mouseY - currentY) * (newScale / currentScale);
        currentScale = newScale;

        updateTransform();
    }, { passive: false });

    // ----------------------------------------------------------------------
    // 6b. TOUCH SUPPORT (mobile pan / pinch-to-zoom)
    // ----------------------------------------------------------------------
    let touchMode = null; // 'pan' | 'pinch' | null
    let touchMoved = false;
    let pinchStartDist = 0;
    let pinchStartScale = 1;
    let pinchCenter = { x: 0, y: 0 };

    function touchDistance(t0, t1) {
        return Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
    }
    function touchMidpoint(t0, t1, rect) {
        return {
            x: (t0.clientX + t1.clientX) / 2 - rect.left,
            y: (t0.clientY + t1.clientY) / 2 - rect.top
        };
    }
    function applyZoomAt(anchorX, anchorY, newScale) {
        newScale = Math.min(Math.max(newScale, 0.2), 3.0);
        currentX = anchorX - (anchorX - currentX) * (newScale / currentScale);
        currentY = anchorY - (anchorY - currentY) * (newScale / currentScale);
        currentScale = newScale;
        updateTransform();
    }

    mapViewport.addEventListener('touchstart', (e) => {
        if (e.target.closest('.map-marker') || e.target.closest('.hud-btn') || e.target.closest('.marker-details-card') || e.target.closest('.admin-hud-banner') || e.target.closest('.modal-overlay')) {
            touchMode = null;
            return;
        }

        touchMoved = false;

        if (e.touches.length === 1) {
            touchMode = 'pan';
            dragStartX = e.touches[0].clientX - currentX;
            dragStartY = e.touches[0].clientY - currentY;
        } else if (e.touches.length === 2) {
            touchMode = 'pinch';
            const rect = mapViewport.getBoundingClientRect();
            pinchStartDist = touchDistance(e.touches[0], e.touches[1]);
            pinchStartScale = currentScale;
            pinchCenter = touchMidpoint(e.touches[0], e.touches[1], rect);
        }
    }, { passive: true });

    mapViewport.addEventListener('touchmove', (e) => {
        if (!touchMode) return;
        e.preventDefault();
        touchMoved = true;

        if (touchMode === 'pan' && e.touches.length === 1) {
            currentX = e.touches[0].clientX - dragStartX;
            currentY = e.touches[0].clientY - dragStartY;
            updateTransform();
        } else if (touchMode === 'pinch' && e.touches.length === 2) {
            const rect = mapViewport.getBoundingClientRect();
            const dist = touchDistance(e.touches[0], e.touches[1]);
            const mid = touchMidpoint(e.touches[0], e.touches[1], rect);
            const newScale = pinchStartScale * (dist / Math.max(pinchStartDist, 1));
            applyZoomAt(mid.x, mid.y, newScale);
            pinchCenter = mid;
        }
    }, { passive: false });

    mapViewport.addEventListener('touchend', (e) => {
        if (touchMode === 'pan' && !touchMoved && e.changedTouches.length === 1) {
            const t = e.changedTouches[0];
            const rect = mapViewport.getBoundingClientRect();
            const tapX = Math.round((t.clientX - rect.left - currentX) / currentScale);
            const tapY = Math.round((t.clientY - rect.top - currentY) / currentScale);

            if (tapX >= 0 && tapX <= 3000 && tapY >= 0 && tapY <= 3000) {
                if (isRulerActive) {
                    handleRulerMapClick(tapX, tapY);
                } else if (isAdminMode) {
                    if (isDrawingZone) {
                        drawZonePoints.push([tapX, tapY]);
                        renderZoneDrawPreview();
                    } else {
                        openAddMarkerModal(tapX, tapY);
                    }
                }
            }
        }

        if (e.touches.length === 0) {
            touchMode = null;
            touchMoved = false;
        } else if (e.touches.length === 1) {
            // Went from pinch back down to one finger — restart panning cleanly.
            touchMode = 'pan';
            dragStartX = e.touches[0].clientX - currentX;
            dragStartY = e.touches[0].clientY - currentY;
        }
    }, { passive: true });

    // ----------------------------------------------------------------------
    // 7. MARKER DETAILS PANEL
    // ----------------------------------------------------------------------
    function openMarkerDetails(item) {
        markerModal.classList.add('hidden');
        activeSelectedMarker = item;
        document.getElementById('cardTitle').textContent = item.name;
        document.getElementById('cardBadge').textContent = (item.mapId === 'all' || !item.mapId) ? 'ВСЕ КАРТЫ' : `КАРТА #${item.mapId.replace('map', '')}`;
        document.getElementById('cardType').textContent = getTypeName(item.type);
        document.getElementById('cardLocation').textContent = item.location;
        document.getElementById('cardDesc').textContent = item.desc;

        const photoWrap = document.getElementById('cardPhotoWrap');
        const photoEl = document.getElementById('cardPhoto');
        if (item.photo) {
            photoEl.src = item.photo;
            photoWrap.classList.remove('hidden');
        } else {
            photoEl.src = '';
            photoWrap.classList.add('hidden');
        }

        if (isAdminMode) {
            cardAdminActions.classList.remove('hidden');
        } else {
            cardAdminActions.classList.add('hidden');
        }

        detailsCard.classList.remove('hidden');

        document.getElementById('btnCopyCoords').onclick = () => {
            const samp = canvasToSAMPCoords(item.x, item.y);
            const cmd = `/tp ${samp.x} ${samp.y} ${samp.z}`;
            navigator.clipboard.writeText(cmd);
            alert(`Команда телепорта скопирована:\n${cmd}`);
        };

        // --- URL SHARING ---
        document.getElementById('btnShareMarker').onclick = () => {
            const btn = document.getElementById('btnShareMarker');
            const url = new URL(window.location.href);
            url.searchParams.set('marker', item.id);
            url.searchParams.set('map', item.mapId || 'all');
            navigator.clipboard.writeText(url.toString()).then(() => {
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Ссылка скопирована!';
                btn.disabled = true;
                setTimeout(() => {
                    btn.innerHTML = '<i class="fa-solid fa-share-nodes"></i> Поделиться точкой';
                    btn.disabled = false;
                }, 2000);
            }).catch(() => {
                prompt('Скопируйте ссылку:', url.toString());
            });
        };
    }

    function getTypeName(type) {
        return (MARKER_TYPES_INFO[type] && MARKER_TYPES_INFO[type].name) || type;
    }

    document.getElementById('closeDetails').addEventListener('click', () => {
        detailsCard.classList.add('hidden');
        activeSelectedMarker = null;
    });

    // ----------------------------------------------------------------------
    // 8. ADMIN & MODERATOR ROLES, AUTHENTICATION & MODALS (SHA-256)
    // ----------------------------------------------------------------------
    // Default SHA-256 hashes: "goyda312" for Admin, "xerox312" for Cartographer (Moderator)
    const DEFAULT_ADMIN_HASH = '00356afc944e76450667d70a52b803cebeeb633c260ebe8b9b4e642e72d96f0e';
    const DEFAULT_MOD_HASH   = 'ad9dafae71b15b8ec21cb8e8a0ab8915f8d05d84b4a5e74bef09ae91c1a3eea6';

    let currentRole = null; // null | 'admin' | 'moderator'

    async function sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function getAdminHash() {
        return localStorage.getItem('gta_sa_stalker_admin_hash') || DEFAULT_ADMIN_HASH;
    }

    function getModHash() {
        return localStorage.getItem('gta_sa_stalker_mod_hash') || DEFAULT_MOD_HASH;
    }

    function isSessionAuthed() {
        const role = sessionStorage.getItem('gta_sa_stalker_user_role');
        return (role === 'admin' || role === 'moderator') ? role : null;
    }

    function setRoleState(role) {
        currentRole = role;
        isAdminMode = !!role;

        const adminStatusText = adminHudBanner ? adminHudBanner.querySelector('.admin-status') : null;
        const resetBtn = document.getElementById('btnResetMarkers');

        if (role) {
            sessionStorage.setItem('gta_sa_stalker_user_role', role);
            btnToggleAdmin.classList.add('active');
            btnToggleAdmin.innerHTML = `<i class="fa-solid fa-right-from-bracket"></i> <span>Выйти (${role === 'admin' ? 'Админ' : 'Картограф'})</span>`;
            adminHudBanner.classList.remove('hidden');

            if (adminStatusText) {
                adminStatusText.innerHTML = role === 'admin'
                    ? '<i class="fa-solid fa-pen-to-square"></i> АДМИН-ПАНЕЛЬ'
                    : '<i class="fa-solid fa-user-pen"></i> РЕЖИМ КАРТОГРАФА';
            }

            // Экспорт JSON доступен и Админу, и Картографу
            if (btnExportJson) {
                btnExportJson.style.display = (role === 'admin' || role === 'moderator') ? 'inline-flex' : 'none';
            }

            // Очистка карты и экспорт объявления — только для Главного Админа
            document.querySelectorAll('.admin-only-feature').forEach(el => {
                el.style.display = (role === 'admin') ? 'inline-flex' : 'none';
            });
            if (resetBtn) {
                resetBtn.style.display = (role === 'admin') ? 'inline-flex' : 'none';
            }

            if (activeSelectedMarker) cardAdminActions.classList.remove('hidden');
            if (coordsHud) coordsHud.classList.remove('hidden');
        } else {
            sessionStorage.removeItem('gta_sa_stalker_user_role');
            btnToggleAdmin.classList.remove('active');
            btnToggleAdmin.innerHTML = '<i class="fa-solid fa-user-gear"></i> <span>Авторизация</span>';
            adminHudBanner.classList.add('hidden');
            cardAdminActions.classList.add('hidden');
            if (coordsHud) coordsHud.classList.add('hidden');
            if (isDrawingZone) stopZoneDraw();

            // При выходе — если были на черновике, уходим на map1
            if (currentMapId === 'map_draft') {
                currentMapId = 'map1';
                localStorage.setItem('gta_sa_stalker_current_map', currentMapId);
            }
        }

        // Перестраиваем селектор: черновик доступен только авторизованным
        refreshMapSelector();

        // Скрываем/показываем опцию черновика в модалках маркера и зоны
        ['markerMapId', 'zoneMapId'].forEach(selectId => {
            const opt = document.querySelector(`#${selectId} option[value="map_draft"]`);
            if (opt) opt.style.display = role ? '' : 'none';
        });

        renderHazardZones();
    }

    // Перестраивает <select> выбора карты с учётом роли текущего пользователя
    function refreshMapSelector() {
        if (!mapVersionSelect) return;
        const visibleMaps = MAP_VERSIONS.filter(m => !m.adminOnly || isAdminMode);
        mapVersionSelect.innerHTML = visibleMaps
            .map(m => `<option value="${m.id}"${m.adminOnly ? ' class="draft-option"' : ''}>${m.label}</option>`)
            .join('');
        // Если текущий выбор недоступен (напр. черновик после выхода) — сбросить на map1
        if (!visibleMaps.some(m => m.id === currentMapId)) {
            currentMapId = 'map1';
            localStorage.setItem('gta_sa_stalker_current_map', currentMapId);
        }
        mapVersionSelect.value = currentMapId;
    }

    // Auto-restore active role on refresh
    const initialRole = isSessionAuthed();
    if (initialRole) {
        setRoleState(initialRole);
    }

    btnToggleAdmin.addEventListener('click', () => {
        if (isAdminMode) {
            setRoleState(null);
            alert('Вы вышли из учетной записи.');
        } else {
            const restored = isSessionAuthed();
            if (restored) {
                setRoleState(restored);
            } else {
                document.getElementById('adminPasswordInput').value = '';
                document.getElementById('adminAuthModal').classList.remove('hidden');
            }
        }
    });

    // Login Form
    const adminAuthForm = document.getElementById('adminAuthForm');
    if (adminAuthForm) {
        adminAuthForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const entered = document.getElementById('adminPasswordInput').value.trim();
            const enteredHash = await sha256(entered);

            if (enteredHash === getAdminHash()) {
                document.getElementById('adminAuthModal').classList.add('hidden');
                setRoleState('admin');
                alert('Успешный вход! Активирован режим Администратора (полный доступ).');
            } else if (enteredHash === getModHash()) {
                document.getElementById('adminAuthModal').classList.add('hidden');
                setRoleState('moderator');
                alert('Успешный вход! Активирован режим Картографа (редактирование меток/зон и экспорт JSON).');
            } else {
                alert('Неверный пароль доступа!');
            }
        });
    }

    document.getElementById('closeAdminAuthModal')?.addEventListener('click', () => document.getElementById('adminAuthModal').classList.add('hidden'));
    document.getElementById('btnCancelAdminAuth')?.addEventListener('click', () => document.getElementById('adminAuthModal').classList.add('hidden'));

    // ----------------------------------------------------------------------
    // ЗАГРУЗКА ФОТО ЧЕРЕЗ CLOUDINARY
    // Вместо хранения фото как base64 (тяжело, не влезет в localStorage/JSON
    // при сотнях точек) — файл загружается на Cloudinary, а в маркере хранится
    // только короткая ссылка на картинку.
    //
    // pendingImageFile — новый файл, выбранный в этой сессии модалки, ещё
    //                     не загруженный на Cloudinary (загрузится при сохранении).
    // existingPhotoUrl  — уже сохранённая ссылка на фото (при редактировании).
    // photoRemoved      — пользователь явно нажал "удалить фото".
    // ----------------------------------------------------------------------
    let pendingImageFile = null;
    let existingPhotoUrl = null;
    let photoRemoved = false;

    const imgUploadArea = document.getElementById('imgUploadArea');
    const imgUploadInput = document.getElementById('markerImageInput');
    const imgUploadPreview = document.getElementById('imgUploadPreview');
    const imgUploadPlaceholder = document.getElementById('imgUploadPlaceholder');
    const imgRemoveBtn = document.getElementById('imgRemoveBtn');

    // Показывает превью (по локальному base64 для нового файла ИЛИ по
    // готовому URL для уже сохранённого фото). Ничего не грузит на сервер.
    function showImagePreview(srcUrl) {
        imgUploadPreview.src = srcUrl;
        imgUploadPreview.classList.remove('hidden');
        imgUploadPlaceholder.style.display = 'none';
        imgRemoveBtn.classList.remove('hidden');
    }

    function clearImagePreview() {
        pendingImageFile = null;
        existingPhotoUrl = null;
        photoRemoved = false;
        imgUploadPreview.src = '';
        imgUploadPreview.classList.add('hidden');
        imgUploadPlaceholder.style.display = '';
        imgRemoveBtn.classList.add('hidden');
        imgUploadInput.value = '';
    }

    function handleSelectedFile(file) {
        if (!file || !file.type.startsWith('image/')) return;
        if (file.size > 5 * 1024 * 1024) { alert('Файл слишком большой (максимум 5 МБ)'); return; }
        pendingImageFile = file;
        photoRemoved = false;
        // локальное превью — только для отображения в модалке, на сервер не уходит
        const reader = new FileReader();
        reader.onload = (e) => showImagePreview(e.target.result);
        reader.readAsDataURL(file);
    }

    // Загружает файл на Cloudinary (анонимно, через unsigned upload preset)
    // и возвращает прямую ссылку на изображение.
    async function uploadPhoto(file) {
        if (!CLOUDINARY_CLOUD_NAME || CLOUDINARY_CLOUD_NAME === 'ВСТАВЬ_СВОЙ_CLOUD_NAME' ||
            !CLOUDINARY_UPLOAD_PRESET || CLOUDINARY_UPLOAD_PRESET === 'ВСТАВЬ_СВОЙ_UPLOAD_PRESET') {
            throw new Error('Не настроены CLOUDINARY_CLOUD_NAME / CLOUDINARY_UPLOAD_PRESET в app.js');
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (!res.ok || !data.secure_url) {
            throw new Error(data?.error?.message || 'Ошибка загрузки на Cloudinary');
        }
        return data.secure_url;
    }

    imgUploadArea.addEventListener('click', (e) => {
        if (e.target === imgRemoveBtn || imgRemoveBtn.contains(e.target)) return;
        imgUploadInput.click();
    });

    imgUploadInput.addEventListener('change', () => {
        handleSelectedFile(imgUploadInput.files[0]);
    });

    imgRemoveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        photoRemoved = true;
        pendingImageFile = null;
        existingPhotoUrl = null;
        imgUploadPreview.src = '';
        imgUploadPreview.classList.add('hidden');
        imgUploadPlaceholder.style.display = '';
        imgRemoveBtn.classList.add('hidden');
        imgUploadInput.value = '';
    });

    // Drag & Drop photo
    imgUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); imgUploadArea.classList.add('drag-over'); });
    imgUploadArea.addEventListener('dragleave', () => imgUploadArea.classList.remove('drag-over'));
    imgUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        imgUploadArea.classList.remove('drag-over');
        handleSelectedFile(e.dataTransfer.files[0]);
    });

    const cardPhotoWrap = document.getElementById('cardPhotoWrap');
    const cardPhoto = document.getElementById('cardPhoto');
    cardPhotoWrap.addEventListener('click', () => {
        const lb = document.createElement('div');
        lb.className = 'photo-lightbox';
        const img = document.createElement('img');
        img.src = cardPhoto.src;
        lb.appendChild(img);
        lb.addEventListener('click', () => lb.remove());
        document.body.appendChild(lb);
    });

    function openAddMarkerModal(cx, cy) {
        const samp = canvasToSAMPCoords(cx, cy);
        modalTitle.innerHTML = '<i class="fa-solid fa-location-dot"></i> Добавление новой метки';
        document.getElementById('markerId').value = '';
        document.getElementById('markerName').value = `Новая метка #${allMarkersData.length + 1}`;
        document.getElementById('markerMapId').value = currentMapId;
        document.getElementById('markerType').value = 'zharka';
        document.getElementById('markerLocation').value = 'Zone Sector';
        document.getElementById('markerX').value = samp.x;
        document.getElementById('markerY').value = samp.y;
        document.getElementById('markerDesc').value = 'Описание точки, артефактов или секретного лута.';
        clearImagePreview();

        markerModal.classList.remove('hidden');
    }

    btnEditMarker.addEventListener('click', () => {
        if (!activeSelectedMarker) return;
        const samp = canvasToSAMPCoords(activeSelectedMarker.x, activeSelectedMarker.y);
        modalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Редактирование метки';
        document.getElementById('markerId').value = activeSelectedMarker.id;
        document.getElementById('markerName').value = activeSelectedMarker.name;
        document.getElementById('markerMapId').value = activeSelectedMarker.mapId || 'all';
        document.getElementById('markerType').value = activeSelectedMarker.type;
        document.getElementById('markerLocation').value = activeSelectedMarker.location;
        document.getElementById('markerX').value = samp.x;
        document.getElementById('markerY').value = samp.y;
        document.getElementById('markerDesc').value = activeSelectedMarker.desc;

        pendingImageFile = null;
        photoRemoved = false;
        if (activeSelectedMarker.photo) {
            existingPhotoUrl = activeSelectedMarker.photo;
            showImagePreview(activeSelectedMarker.photo);
        } else {
            existingPhotoUrl = null;
            clearImagePreview();
        }

        markerModal.classList.remove('hidden');
    });

    btnDeleteMarker.addEventListener('click', () => {
        if (!activeSelectedMarker) return;
        if (confirm(`Вы уверены, что хотите удалить метку "${activeSelectedMarker.name}"?`)) {
            allMarkersData = allMarkersData.filter(m => m.id !== activeSelectedMarker.id);
            saveAllMarkersToStorage();
            renderMarkers();
            detailsCard.classList.add('hidden');
            activeSelectedMarker = null;
        }
    });

    markerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('markerId').value;
        const name = document.getElementById('markerName').value.trim();
        const mapId = document.getElementById('markerMapId').value;
        const type = document.getElementById('markerType').value;
        const location = document.getElementById('markerLocation').value.trim();
        const sampX = parseFloat(document.getElementById('markerX').value);
        const sampY = parseFloat(document.getElementById('markerY').value);
        const desc = document.getElementById('markerDesc').value.trim();

        // Определяем итоговое фото: новый файл нужно сначала загрузить на Cloudinary
        let photo = photoRemoved ? null : existingPhotoUrl;

        if (pendingImageFile) {
            const originalLabel = btnSaveMarker.innerHTML;
            btnSaveMarker.disabled = true;
            btnSaveMarker.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Загрузка фото...';
            try {
                photo = await uploadPhoto(pendingImageFile);
            } catch (err) {
                alert('Не удалось загрузить фото: ' + err.message);
                btnSaveMarker.disabled = false;
                btnSaveMarker.innerHTML = originalLabel;
                return;
            }
            btnSaveMarker.disabled = false;
            btnSaveMarker.innerHTML = originalLabel;
        }

        const canvasCoords = sampToCanvasCoords(sampX, sampY);

        if (id) {
            const item = allMarkersData.find(m => m.id === id);
            if (item) {
                item.name = name;
                item.mapId = mapId;
                item.type = type;
                item.location = location;
                item.x = canvasCoords.x;
                item.y = canvasCoords.y;
                item.desc = desc;
                item.photo = photo;
            }
        } else {
            const newMarker = {
                id: `custom-${Date.now()}`,
                mapId, type, name, location,
                x: canvasCoords.x, y: canvasCoords.y,
                desc, photo
            };
            allMarkersData.push(newMarker);
        }

        saveAllMarkersToStorage();
        renderMarkers();
        markerModal.classList.add('hidden');
        detailsCard.classList.add('hidden');
    });

    document.getElementById('closeModal').addEventListener('click', () => markerModal.classList.add('hidden'));
    document.getElementById('btnCancelModal').addEventListener('click', () => markerModal.classList.add('hidden'));

    // JSON Export & Import
    // Экспорт создаёт файл data.json с новой меткой версии (version).
    // Чтобы опубликовать изменения для ВСЕХ посетителей сайта:
    // 1) нажми эту кнопку — скачается data.json;
    // 2) положи его рядом с index.html в репозитории (заменив старый файл);
    // 3) задеплой сайт на Netlify заново (push в git — если подключён автодеплой,
    //    либо перетащи папку проекта в Netlify Drop).
    btnExportJson.addEventListener('click', () => {
        const newVersion = String(Date.now());
        const exportObj = { version: newVersion, markers: allMarkersData, zones: allZonesData };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "data.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        // запоминаем версию как "текущую" в этом браузере, чтобы при
        // следующей загрузке страницы твои же локальные правки не были
        // затёрты (они и есть содержимое этого файла)
        localStorage.setItem(DATA_VERSION_KEY, newVersion);
        alert('Файл data.json скачан.');
    });

    btnResetMarkers.addEventListener('click', () => {
        if (currentRole !== 'admin') {
            alert('Функция полной очистки карты доступна только Главным Администраторам!');
            return;
        }
        if (confirm('Полностью очистить все метки и зоны на всех картах? Это действие нельзя отменить.')) {
            allMarkersData = [];
            allZonesData = [];
            saveAllMarkersToStorage();
            saveAllZonesToStorage();
            renderMarkers();
            renderHazardZones();
            detailsCard.classList.add('hidden');
            activeSelectedMarker = null;
            alert('Все карты очищены!');
        }
    });

    // ----------------------------------------------------------------------
    // 9. MAP VARIATIONS SWITCHER (1..9)
    // ----------------------------------------------------------------------
    function switchMap(newMapId) {
        currentMapId = newMapId;
        localStorage.setItem('gta_sa_stalker_current_map', currentMapId);
        detailsCard.classList.add('hidden');
        activeSelectedMarker = null;

        // Показываем/скрываем баннер "режим черновика"
        const draftBanner = document.getElementById('draftModeBanner');
        if (draftBanner) {
            draftBanner.classList.toggle('hidden', currentMapId !== 'map_draft');
        }

        renderMarkers();
        renderHazardZones();
    }

    if (mapVersionSelect) {
        // Первичное заполнение с учётом роли (refreshMapSelector вызывается и из setRoleState)
        refreshMapSelector();
        mapVersionSelect.addEventListener('change', () => switchMap(mapVersionSelect.value));
    }

    // ----------------------------------------------------------------------
    // 10. SIDEBAR FILTERS & CONTROLS
    // ----------------------------------------------------------------------
    document.querySelectorAll('.filter-card input').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const val = e.target.value;
            if (e.target.checked) {
                activeFilters.add(val);
                e.target.closest('.filter-card').classList.add('active');
            } else {
                activeFilters.delete(val);
                e.target.closest('.filter-card').classList.remove('active');
            }
            renderMarkers();
            renderHazardZones();
        });
    });

    // #selectAllTypes — глобальная кнопка "Все" для всех секций (присутствует в секции зоны)
    const selectAllBtn = document.getElementById('selectAllTypes');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            document.querySelectorAll('.filter-card input').forEach(cb => {
                cb.checked = true;
                cb.closest('.filter-card').classList.add('active');
                activeFilters.add(cb.value);
            });
            renderMarkers();
            renderHazardZones();
        });
    }

    searchInput.addEventListener('input', () => {
        renderMarkers();
        updateSearchDropdown();
    });
    searchInput.addEventListener('focus', () => updateSearchDropdown());

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box')) {
            searchResultsDropdown?.classList.add('hidden');
        }
    });

    document.getElementById('clearSearch').addEventListener('click', () => {
        searchInput.value = '';
        renderMarkers();
        updateSearchDropdown();
    });

    document.getElementById('zoomIn').addEventListener('click', () => { currentScale = Math.min(currentScale * 1.25, 3.0); updateTransform(); });
    document.getElementById('zoomOut').addEventListener('click', () => { currentScale = Math.max(currentScale / 1.25, 0.2); updateTransform(); });

    document.getElementById('btnResetView').addEventListener('click', () => {
        currentScale = 0.5;
        currentX = -400;
        currentY = -400;
        updateTransform();
    });

    // ----------------------------------------------------------------------
    // 14. SEARCH ENHANCEMENTS & DROPDOWN
    // ----------------------------------------------------------------------
    function updateSearchDropdown() {
        if (!searchResultsDropdown) return;
        const query = searchInput.value.trim().toLowerCase();

        if (!query) {
            if (searchBadge) searchBadge.classList.add('hidden');
            searchResultsDropdown.classList.add('hidden');
            searchResultsDropdown.innerHTML = '';
            return;
        }

        const visibleMarkers = getVisibleMarkers();
        const matched = visibleMarkers.filter(m => activeFilters.has(m.type) && matchesQuery(m, query));

        if (searchBadge) {
            searchBadge.textContent = matched.length;
            if (matched.length > 0) {
                searchBadge.classList.remove('hidden');
            } else {
                searchBadge.classList.add('hidden');
            }
        }

        if (matched.length === 0) {
            searchResultsDropdown.innerHTML = '<div class="search-result-item" style="cursor:default; color:var(--text-muted);">Ничего не найдено</div>';
            searchResultsDropdown.classList.remove('hidden');
            return;
        }

        searchResultsDropdown.innerHTML = '';
        matched.slice(0, 12).forEach(item => {
            const row = document.createElement('div');
            row.className = 'search-result-item';
            const typeInfo = MARKER_TYPES_INFO[item.type] || { icon: '<i class="fa-solid fa-location-dot"></i>' };
            const mapTag = (item.mapId === 'all' || !item.mapId) ? 'Все карты' : `Карта #${item.mapId.replace('map', '')}`;

            row.innerHTML = `
                <div class="search-result-icon ${item.type}">${typeInfo.icon}</div>
                <div class="search-result-info">
                    <div class="search-result-title">${item.name}</div>
                    <div class="search-result-sub">${item.location} • ${mapTag}</div>
                </div>
            `;

            row.addEventListener('click', (e) => {
                e.stopPropagation();
                searchResultsDropdown.classList.add('hidden');
                focusOnMarker(item);
            });

            searchResultsDropdown.appendChild(row);
        });

        searchResultsDropdown.classList.remove('hidden');
    }

    function focusOnMarker(marker) {
        if (marker.mapId && marker.mapId !== 'all' && marker.mapId !== currentMapId) {
            switchMap(marker.mapId);
        }

        currentScale = 1.2;
        const rect = mapViewport.getBoundingClientRect();
        currentX = (rect.width / 2) - (marker.x * currentScale);
        currentY = (rect.height / 2) - (marker.y * currentScale);
        updateTransform();

        openMarkerDetails(marker);

        setTimeout(() => {
            const el = document.querySelector(`.map-marker[data-id="${marker.id}"]`);
            if (el) {
                el.classList.add('marker-highlight');
                setTimeout(() => el.classList.remove('marker-highlight'), 2500);
            }
        }, 100);
    }

    // ----------------------------------------------------------------------
    // 15. DISTANCE MEASUREMENT RULER
    // ----------------------------------------------------------------------
    function toggleRulerMode(forceState) {
        isRulerActive = forceState !== undefined ? forceState : !isRulerActive;

        if (isRulerActive) {
            if (isDrawingZone) stopZoneDraw();
            rulerPointA = null;
            rulerPointB = null;
            btnRuler?.classList.add('active');
            rulerDrawBanner?.classList.remove('hidden');
            if (rulerHint) rulerHint.textContent = 'Кликните по карте, чтобы поставить первую точку (A)';
            renderRulerLayer();
        } else {
            rulerPointA = null;
            rulerPointB = null;
            btnRuler?.classList.remove('active');
            rulerDrawBanner?.classList.add('hidden');
            if (rulerSvgLayer) rulerSvgLayer.innerHTML = '';
        }
    }

    btnRuler?.addEventListener('click', () => toggleRulerMode());
    btnCancelRuler?.addEventListener('click', () => toggleRulerMode(false));

    function handleRulerMapClick(cx, cy) {
        const samp = canvasToSAMPCoords(cx, cy);
        const pt = { cx, cy, sampX: parseFloat(samp.x), sampY: parseFloat(samp.y) };

        if (!rulerPointA || (rulerPointA && rulerPointB)) {
            rulerPointA = pt;
            rulerPointB = null;
            if (rulerHint) rulerHint.textContent = 'Двигайте мышь и кликните вторую точку (B) для завершения измерения';
        } else {
            rulerPointB = pt;
            const dist = Math.hypot(rulerPointB.sampX - rulerPointA.sampX, rulerPointB.sampY - rulerPointA.sampY).toFixed(1);
            if (rulerHint) rulerHint.textContent = `Дистанция A-B: ${dist} м. Кликните карту для нового измерения.`;
        }
        renderRulerLayer();
    }

    function renderRulerLayer(hoverCanvasPos) {
        if (!rulerSvgLayer || !isRulerActive) return;
        rulerSvgLayer.innerHTML = '';

        const ptA = rulerPointA;
        const ptB = rulerPointB || (hoverCanvasPos ? {
            cx: hoverCanvasPos.x,
            cy: hoverCanvasPos.y,
            sampX: parseFloat(canvasToSAMPCoords(hoverCanvasPos.x, hoverCanvasPos.y).x),
            sampY: parseFloat(canvasToSAMPCoords(hoverCanvasPos.x, hoverCanvasPos.y).y)
        } : null);

        if (ptA) {
            const circleA = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circleA.setAttribute('cx', ptA.cx);
            circleA.setAttribute('cy', ptA.cy);
            circleA.setAttribute('r', 9);
            circleA.setAttribute('fill', '#00e5ff');
            circleA.setAttribute('stroke', '#fff');
            circleA.setAttribute('stroke-width', '3');
            rulerSvgLayer.appendChild(circleA);

            const textA = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textA.setAttribute('x', ptA.cx);
            textA.setAttribute('y', ptA.cy - 14);
            textA.setAttribute('fill', '#00e5ff');
            textA.setAttribute('font-size', '14');
            textA.setAttribute('font-weight', 'bold');
            textA.setAttribute('text-anchor', 'middle');
            textA.textContent = 'A';
            rulerSvgLayer.appendChild(textA);
        }

        if (ptA && ptB) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', ptA.cx);
            line.setAttribute('y1', ptA.cy);
            line.setAttribute('x2', ptB.cx);
            line.setAttribute('y2', ptB.cy);
            line.setAttribute('stroke', '#00e5ff');
            line.setAttribute('stroke-width', '4');
            line.setAttribute('stroke-dasharray', '8,4');
            rulerSvgLayer.appendChild(line);

            const circleB = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circleB.setAttribute('cx', ptB.cx);
            circleB.setAttribute('cy', ptB.cy);
            circleB.setAttribute('r', 9);
            circleB.setAttribute('fill', '#00e5ff');
            circleB.setAttribute('stroke', '#fff');
            circleB.setAttribute('stroke-width', '3');
            rulerSvgLayer.appendChild(circleB);

            const textB = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textB.setAttribute('x', ptB.cx);
            textB.setAttribute('y', ptB.cy - 14);
            textB.setAttribute('fill', '#00e5ff');
            textB.setAttribute('font-size', '14');
            textB.setAttribute('font-weight', 'bold');
            textB.setAttribute('text-anchor', 'middle');
            textB.textContent = 'B';
            rulerSvgLayer.appendChild(textB);

            const midX = (ptA.cx + ptB.cx) / 2;
            const midY = (ptA.cy + ptB.cy) / 2;
            const distMeters = Math.hypot(ptB.sampX - ptA.sampX, ptB.sampY - ptA.sampY).toFixed(1);

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', midX - 50);
            rect.setAttribute('y', midY - 15);
            rect.setAttribute('width', 100);
            rect.setAttribute('height', 24);
            rect.setAttribute('rx', 6);
            rect.setAttribute('fill', 'rgba(10, 14, 20, 0.9)');
            rect.setAttribute('stroke', '#00e5ff');
            rect.setAttribute('stroke-width', '1.5');
            rulerSvgLayer.appendChild(rect);

            const distText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            distText.setAttribute('x', midX);
            distText.setAttribute('y', midY + 2);
            distText.setAttribute('fill', '#fff');
            distText.setAttribute('font-size', '12');
            distText.setAttribute('font-weight', 'bold');
            distText.setAttribute('text-anchor', 'middle');
            distText.textContent = `${distMeters} м`;
            rulerSvgLayer.appendChild(distText);
        }
    }

    // ----------------------------------------------------------------------
    // 16. COORDS HUD CLICK TO COPY & TOAST
    // ----------------------------------------------------------------------
    if (coordsHud) {
        coordsHud.addEventListener('click', () => {
            const txt = coordsVal ? coordsVal.textContent : '';
            if (!txt || txt.includes('Наведите')) return;

            navigator.clipboard.writeText(txt).then(() => {
                showToastNotification(`Скопировано: ${txt}`);
            }).catch(() => {
                prompt('Скопируйте команду телепорта:', txt);
            });
        });
    }

    function showToastNotification(msg) {
        const existing = document.querySelector('.coords-copied-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'coords-copied-toast';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    }

    // ----------------------------------------------------------------------
    // 17. ANNOUNCEMENT MODAL & EVENT HANDLERS
    // ----------------------------------------------------------------------
    function saveAnnouncementData() {
        localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, JSON.stringify(announcementData));
        renderAnnouncementBanner();
    }

    function renderAnnouncementBanner() {
        if (!topAnnouncementBanner || !announcementText) return;

        if (announcementData.active && announcementData.text && announcementData.text.trim() && !sessionStorage.getItem('announcement_closed')) {
            announcementText.textContent = announcementData.text;
            topAnnouncementBanner.classList.remove('hidden');
        } else {
            topAnnouncementBanner.classList.add('hidden');
        }
    }

    document.getElementById('closeAnnouncement')?.addEventListener('click', () => {
        sessionStorage.setItem('announcement_closed', 'true');
        renderAnnouncementBanner();
    });

    btnEditAnnouncement?.addEventListener('click', () => {
        if (currentRole !== 'admin') {
            alert('Редактирование объявления доступно только Главным Администраторам!');
            return;
        }
        document.getElementById('announcementTextInput').value = announcementData.text || '';
        document.getElementById('announcementActiveInput').checked = !!announcementData.active;
        announcementModal?.classList.remove('hidden');
    });

    document.getElementById('closeAnnouncementModal')?.addEventListener('click', () => announcementModal?.classList.add('hidden'));
    document.getElementById('btnCancelAnnouncement')?.addEventListener('click', () => announcementModal?.classList.add('hidden'));

    announcementForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = document.getElementById('announcementTextInput').value.trim();
        const active = document.getElementById('announcementActiveInput').checked;
        announcementData = { text, active };
        sessionStorage.removeItem('announcement_closed');
        saveAnnouncementData();
        announcementModal?.classList.add('hidden');
        alert('Объявление карты успешно сохранено!');
    });

    btnExportAnnouncement?.addEventListener('click', () => {
        if (currentRole !== 'admin') {
            alert('Функция доступна только Главным Администраторам!');
            return;
        }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(announcementData, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "announcement.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        alert('Файл announcement.json скачан. Положите его в корень сайта рядом с index.html!');
    });

    document.getElementById('btnToggleLabels').addEventListener('click', () => { showLabels = !showLabels; renderMarkers(); });
    document.getElementById('fullScreen').addEventListener('click', () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else if (document.exitFullscreen) document.exitFullscreen();
    });

    const sidebar = document.getElementById('sidebar');
    const openSidebarBtn = document.getElementById('openSidebarBtn');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');

    function isMobileViewport() {
        return window.matchMedia('(max-width: 768px)').matches;
    }

    function setSidebarOpen(open) {
        sidebar.classList.toggle('collapsed', !open);
        openSidebarBtn.classList.toggle('hidden', open);
        // Backdrop is only meaningful on mobile (CSS keeps it invisible/inert on desktop),
        // but we still toggle it consistently so it's ready if the viewport resizes.
        sidebarBackdrop.classList.toggle('hidden', !(open && isMobileViewport()));
    }

    document.getElementById('toggleSidebar').addEventListener('click', () => setSidebarOpen(false));
    openSidebarBtn.addEventListener('click', () => setSidebarOpen(true));
    sidebarBackdrop.addEventListener('click', () => setSidebarOpen(false));

    // On phones the sidebar starts collapsed (it would otherwise cover the whole map);
    // on desktop/tablet it starts open like before.
    setSidebarOpen(!isMobileViewport());

    let lastIsMobile = isMobileViewport();
    window.addEventListener('resize', () => {
        const nowMobile = isMobileViewport();
        if (nowMobile !== lastIsMobile) {
            lastIsMobile = nowMobile;
            setSidebarOpen(!nowMobile);
        }
    });

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            const mode = btn.getAttribute('data-map-style');
            btn.classList.add('active');
            currentMapStyle = mode;

            if (mode === 'tactical') {
                mapBgLayer.style.filter = 'brightness(0.7) hue-rotate(90deg) contrast(1.2)';
            } else if (mode === 'satellite') {
                mapBgLayer.style.filter = 'brightness(1.1) contrast(1.1) saturate(1.3)';
            } else {
                mapBgLayer.style.filter = 'none';
            }
        });
    });

    // ----------------------------------------------------------------------
    // 11. ZONES: RECTANGULAR COORDINATES & POLYGON DRAWING
    // ----------------------------------------------------------------------
    const zoneModal = document.getElementById('zoneModal');
    const zoneForm = document.getElementById('zoneForm');
    const btnAddZone = document.getElementById('btnAddZone');
    const btnDeleteZone = document.getElementById('btnDeleteZone');
    const btnRedrawZone = document.getElementById('btnRedrawZone');
    const btnMakeRectZone = document.getElementById('btnMakeRectZone');
    const zoneDrawBanner = document.getElementById('zoneDrawBanner');
    const zoneDrawCount = document.getElementById('zoneDrawCount');
    const btnUndoZonePoint = document.getElementById('btnUndoZonePoint');
    const btnFinishZoneDraw = document.getElementById('btnFinishZoneDraw');
    const btnCancelZoneDraw = document.getElementById('btnCancelZoneDraw');

    function parsePointsString(str) {
        if (!str || !str.trim()) return [];
        return str.trim().split(/\s+/).map(pair => {
            const [x, y] = pair.split(',').map(Number);
            return [x, y];
        }).filter(p => !isNaN(p[0]) && !isNaN(p[1]));
    }

    function pointsToString(points) {
        return points.map(p => `${p[0]},${p[1]}`).join(' ');
    }

    // Smart Rectangular SAMP coords calculator
    if (btnMakeRectZone) {
        btnMakeRectZone.addEventListener('click', () => {
            const p1Str = document.getElementById('rectPoint1') ? document.getElementById('rectPoint1').value : '';
            const p2Str = document.getElementById('rectPoint2') ? document.getElementById('rectPoint2').value : '';
            const gzStr = document.getElementById('rectGangZoneInput') ? document.getElementById('rectGangZoneInput').value : '';

            let nums = [];

            if (gzStr.trim()) {
                nums = gzStr.match(/[-+]?\d*\.?\d+/g)?.map(Number) || [];
            }

            if (nums.length < 4) {
                const nums1 = p1Str.match(/[-+]?\d*\.?\d+/g)?.map(Number) || [];
                const nums2 = p2Str.match(/[-+]?\d*\.?\d+/g)?.map(Number) || [];
                nums = [...nums1, ...nums2];
            }

            if (nums.length < 4) {
                alert('Не удалось извлечь 4 координаты (X1, Y1, X2, Y2). Заполните Точку 1 (X, Y) и Точку 2 (X, Y) или вставьте 4 числа в нижнее поле!');
                return;
            }

            const x1 = nums[0], y1 = nums[1], x2 = nums[2], y2 = nums[3];
            const minX = Math.min(x1, x2);
            const maxX = Math.max(x1, x2);
            const minY = Math.min(y1, y2);
            const maxY = Math.max(y1, y2);

            const cTL = sampToCanvasCoords(minX, maxY);
            const cTR = sampToCanvasCoords(maxX, maxY);
            const cBR = sampToCanvasCoords(maxX, minY);
            const cBL = sampToCanvasCoords(minX, minY);

            const pointsStr = `${cTL.x},${cTL.y} ${cTR.x},${cTR.y} ${cBR.x},${cBR.y} ${cBL.x},${cBL.y}`;
            document.getElementById('zonePoints').value = pointsStr;
            alert('Ровная прямоугольная зона успешно рассчитана!');
        });
    }

    function renderZoneDrawPreview() {
        zoneDrawSvgLayer.innerHTML = '';
        if (drawZonePoints.length > 0) {
            if (drawZonePoints.length > 1) {
                const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
                poly.setAttribute('points', drawZonePoints.map(p => p.join(',')).join(' '));
                poly.setAttribute('fill', 'rgba(0, 229, 255, 0.15)');
                poly.setAttribute('stroke', '#00e5ff');
                poly.setAttribute('stroke-width', '3');
                poly.setAttribute('stroke-dasharray', '8,5');
                zoneDrawSvgLayer.appendChild(poly);
            }
            drawZonePoints.forEach((p, idx) => {
                const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                c.setAttribute('cx', p[0]);
                c.setAttribute('cy', p[1]);
                c.setAttribute('r', 8);
                c.setAttribute('fill', '#00e5ff');
                c.setAttribute('stroke', '#fff');
                c.setAttribute('stroke-width', '2');
                zoneDrawSvgLayer.appendChild(c);

                const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                t.setAttribute('x', p[0]);
                t.setAttribute('y', p[1] - 14);
                t.setAttribute('fill', '#00e5ff');
                t.setAttribute('font-size', '14');
                t.setAttribute('text-anchor', 'middle');
                t.textContent = idx + 1;
                zoneDrawSvgLayer.appendChild(t);
            });
        }
        zoneDrawCount.textContent = drawZonePoints.length;
    }

    function startZoneDraw(existingId, existingName, existingType, existingMapId) {
        isAdminMode = true;
        btnToggleAdmin.classList.add('active');
        adminHudBanner.classList.add('hidden');
        zoneModal.classList.add('hidden');
        markerModal.classList.add('hidden');
        detailsCard.classList.add('hidden');

        isDrawingZone = true;
        drawZonePoints = [];
        pendingZoneId = existingId || '';
        pendingZoneName = existingName || `Новая зона #${allZonesData.length + 1}`;
        pendingZoneType = existingType || 'danger';
        pendingZoneMapId = existingMapId || currentMapId;

        zoneDrawBanner.classList.remove('hidden');
        renderZoneDrawPreview();
    }

    function stopZoneDraw() {
        isDrawingZone = false;
        drawZonePoints = [];
        zoneDrawSvgLayer.innerHTML = '';
        zoneDrawBanner.classList.add('hidden');
        if (isAdminMode) adminHudBanner.classList.remove('hidden');
    }

    if (btnAddZone) btnAddZone.addEventListener('click', () => startZoneDraw(null, null, 'danger', currentMapId));
    if (btnRedrawZone) btnRedrawZone.addEventListener('click', () => {
        startZoneDraw(
            document.getElementById('zoneId').value,
            document.getElementById('zoneName').value.trim(),
            document.getElementById('zoneType').value,
            document.getElementById('zoneMapId').value
        );
    });

    if (btnUndoZonePoint) btnUndoZonePoint.addEventListener('click', () => { drawZonePoints.pop(); renderZoneDrawPreview(); });
    if (btnCancelZoneDraw) btnCancelZoneDraw.addEventListener('click', () => stopZoneDraw());
    if (btnFinishZoneDraw) btnFinishZoneDraw.addEventListener('click', () => {
        if (drawZonePoints.length < 3) { alert('Нужно минимум 3 точки, чтобы получилась зона.'); return; }
        const pointsStr = pointsToString(drawZonePoints);
        stopZoneDraw();
        openZoneModal({
            id: pendingZoneId,
            name: pendingZoneName,
            type: pendingZoneType,
            mapId: pendingZoneMapId,
            points: pointsStr
        });
    });

    function openZoneModal(zone) {
        if (zone) {
            document.getElementById('zoneModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Редактирование зоны';
            document.getElementById('zoneId').value = zone.id || '';
            document.getElementById('zoneName').value = zone.name || `Новая зона`;
            document.getElementById('zoneType').value = zone.type || 'danger';
            document.getElementById('zoneMapId').value = zone.mapId || 'all';
            document.getElementById('zonePoints').value = zone.points || '';
            btnDeleteZone.style.display = zone.id ? 'inline-block' : 'none';
        } else {
            document.getElementById('zoneModalTitle').innerHTML = '<i class="fa-solid fa-draw-polygon"></i> Новая зона';
            document.getElementById('zoneId').value = '';
            document.getElementById('zoneName').value = `Новая зона #${allZonesData.length + 1}`;
            document.getElementById('zoneType').value = 'danger';
            document.getElementById('zoneMapId').value = currentMapId;
            document.getElementById('zonePoints').value = '';
            btnDeleteZone.style.display = 'none';
        }
        zoneModal.classList.remove('hidden');
    }

    document.getElementById('closeZoneModal').addEventListener('click', () => zoneModal.classList.add('hidden'));
    document.getElementById('btnCancelZoneModal').addEventListener('click', () => zoneModal.classList.add('hidden'));

    zoneForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('zoneId').value;
        const name = document.getElementById('zoneName').value.trim();
        const type = document.getElementById('zoneType').value;
        const mapId = document.getElementById('zoneMapId').value;
        const pointsRaw = document.getElementById('zonePoints').value.trim();

        const parsed = parsePointsString(pointsRaw);
        if (parsed.length < 3) {
            alert('Некорректные координаты: нужно минимум 3 точки в формате "x,y x,y x,y". Вы можете нажать «Рассчитать ровную зону» или «Рисовать по карте».');
            return;
        }
        const points = pointsToString(parsed);

        if (id) {
            const z = allZonesData.find(x => x.id === id);
            if (z) { z.name = name; z.type = type; z.mapId = mapId; z.points = points; }
        } else {
            allZonesData.push({ id: `zone-${Date.now()}`, name, type, mapId, points });
        }

        saveAllZonesToStorage();
        renderHazardZones();
        zoneModal.classList.add('hidden');
    });

    btnDeleteZone.addEventListener('click', () => {
        const id = document.getElementById('zoneId').value;
        if (id && confirm('Удалить эту зону?')) {
            allZonesData = allZonesData.filter(z => z.id !== id);
            saveAllZonesToStorage();
            renderHazardZones();
            zoneModal.classList.add('hidden');
        }
    });

    // ----------------------------------------------------------------------
    // 12. URL SHARING — auto-open marker from ?marker=ID&map=mapX
    // ----------------------------------------------------------------------
    function openMarkerFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const markerId = params.get('marker');
        const mapParam = params.get('map');

        if (!markerId) return;

        // Switch to the correct map version if specified
        if (mapParam && mapParam !== 'all' && MAP_VERSIONS.some(m => m.id === mapParam)) {
            currentMapId = mapParam;
            if (mapVersionSelect) mapVersionSelect.value = currentMapId;
            localStorage.setItem('gta_sa_stalker_current_map', currentMapId);
        }

        renderMarkers();
        renderHazardZones();

        const marker = allMarkersData.find(m => m.id === markerId);
        if (!marker) return;

        // Center the map on the marker
        const rect = mapViewport.getBoundingClientRect();
        currentScale = 1.2;
        currentX = (rect.width / 2) - (marker.x * currentScale);
        currentY = (rect.height / 2) - (marker.y * currentScale);
        updateTransform();

        // Open the details card
        openMarkerDetails(marker);

        // Briefly highlight the marker element
        setTimeout(() => {
            const el = document.querySelector(`.map-marker[data-id="${marker.id}"]`);
            if (el) {
                el.classList.add('marker-highlight');
                setTimeout(() => el.classList.remove('marker-highlight'), 2000);
            }
        }, 100);
    }

    // ----------------------------------------------------------------------
    // 13. GROUP FILTER TOGGLES (Все / Нет per section)
    // ----------------------------------------------------------------------
    document.querySelectorAll('.group-none').forEach(btn => {
        btn.addEventListener('click', () => {
            const group = btn.dataset.group;
            const section = document.querySelector(`.filter-section[data-group="${group}"]`);
            if (!section) return;
            section.querySelectorAll('.filter-card input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
                cb.closest('.filter-card').classList.remove('active');
                activeFilters.delete(cb.value);
            });
            renderMarkers();
            renderHazardZones();
        });
    });

    document.querySelectorAll('.group-all').forEach(btn => {
        // The existing #selectAllTypes for section 1 is handled separately,
        // but we also cover all sections uniformly here
        btn.addEventListener('click', () => {
            const group = btn.dataset.group;
            const section = document.querySelector(`.filter-section[data-group="${group}"]`);
            if (!section) return;
            section.querySelectorAll('.filter-card input[type="checkbox"]').forEach(cb => {
                cb.checked = true;
                cb.closest('.filter-card').classList.add('active');
                activeFilters.add(cb.value);
            });
            renderMarkers();
            renderHazardZones();
        });
    });

    // ----------------------------------------------------------------------
    // INITIAL START
    // ----------------------------------------------------------------------
    initMapBackground();
    await loadPublishedData();
    renderAnnouncementBanner();
    renderHazardZones();
    renderMarkers();
    updateTransform();

    // Open marker from URL after initial render
    openMarkerFromUrl();
});
