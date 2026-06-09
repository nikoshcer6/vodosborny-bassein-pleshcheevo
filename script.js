// ====================== ИНИЦИАЛИЗАЦИЯ ======================
mapboxgl.accessToken = 'pk.eyJ1IjoibWlpZ2FpayIsImEiOiJjbGNybnF4cnYwMmt2M3ZzMXcydG4wcTllIn0.kxQ57R-Ecbl30by21dbelw';

const basemaps = {
    light: 'mapbox://styles/mapbox/light-v11',
    satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
    streets: 'mapbox://styles/mapbox/streets-v12',
    outdoors: 'mapbox://styles/mapbox/outdoors-v12',
    dark: 'mapbox://styles/mapbox/dark-v11'
};

const rasterBasemaps = {
    osm: {
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        attribution: '© OpenStreetMap contributors', maxZoom: 19
    },
    openTopoMap: {
        tiles: ['https://tile.opentopomap.org/{z}/{x}/{y}.png'],
        attribution: '© OpenTopoMap, © OpenStreetMap', maxZoom: 17
    }
};

mapboxgl.setRTLTextPlugin('https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js', null, true);

const centerCoords = [38.8888, 56.7073];
const initialZoom = 9;
const map = new mapboxgl.Map({
    container: 'map', style: basemaps.light,
    center: centerCoords, zoom: initialZoom, minZoom: 0, maxZoom: 18
});
map.on('error', (e) => console.warn('Mapbox error:', e?.error || e));

// ====================== ГИДРОХИМИЯ: ОПИСАНИЯ ПОКАЗАТЕЛЕЙ ======================
const chemInfo = {
    chemPH:            { label: 'pH',                    units: 'безразмерная величина (шкала 0–14)' },
    chemBPK:           { label: 'БПК',                   units: 'мг О₂/дм³' },
    chemGelezo:        { label: 'Железо',                units: 'мг/дм³' },
    chemIonyAmonia:    { label: 'Ионы аммония',          units: 'мг/дм³' },
    chemKadmiy:        { label: 'Кадмий',                units: 'мкг/дм³' },
    chemKalciy:        { label: 'Кальций',               units: 'мг/дм³' },
    chemMedy:          { label: 'Медь',                  units: 'мкг/дм³' },
    chemNefteprodukty: { label: 'Нефтепродукты',         units: 'мг/дм³' },
    chemNitratIony:    { label: 'Нитрат-ионы',           units: 'мг/дм³' },
    chemNitritIony:    { label: 'Нитрит-ионы',           units: 'мг/дм³' },
    chemRastvKislorod: { label: 'Растворённый кислород', units: 'мг/дм³' },
    chemSvinec:        { label: 'Свинец',                units: 'мкг/дм³' },
    chemSulfaty:       { label: 'Сульфаты',              units: 'мг/дм³' },
    chemFosfatIony:    { label: 'Фосфат-ионы',           units: 'мг/дм³' },
    chemHloridy:       { label: 'Хлориды',               units: 'мг/дм³' },
    chemCink:          { label: 'Цинк',                  units: 'мкг/дм³' }
};

// Ключ активного химического слоя
let activeChemKey = null;

// ====================== КОНФИГУРАЦИЯ СЛОЁВ ======================
function chemPaint() {
    return {
        'circle-radius': 14,
        'circle-color': [
            'case',
            ['<', ['get', 'AvgPDK'], 0.95],  '#27ae60',
            ['<=', ['get', 'AvgPDK'], 1.1],  '#e67e22',
            '#e74c3c'
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
    };
}

const layerConfig = {
    gidroLine: {
        id: 'gidro-line', sourceId: 'gidro-line-source',
        file: 'data/gidro_line_done2.geojson', type: 'line',
        paint: { 'line-color': '#3498db', 'line-width': 2.5, 'line-opacity': 0.85 },
        active: true
    },
    basin: {
        id: 'basin', sourceId: 'basin-source',
        file: 'data/bas.geojson', type: 'fill',
        paint: { 'fill-color': '#2b7a4b', 'fill-opacity': 0.3, 'fill-outline-color': '#1a5a3a' },
        linePaint: { 'line-color': '#2b7a4b', 'line-width': 2 },
        active: true
    },
    natpark: {
        id: 'natpark', sourceId: 'natpark-source',
        file: 'data/NatPartk_boundaries.geojson', type: 'natpark', active: true
    },
    gidroBas: {
        id: 'gidro-bas', sourceId: 'gidro-bas-source',
        file: 'data/gidro_bas.geojson', type: 'fill',
        paint: { 'fill-color': '#2ecc71', 'fill-opacity': 0.15, 'fill-outline-color': '#27ae60' },
        linePaint: { 'line-color': '#27ae60', 'line-width': 1.5 },
        active: false
    },
    monitoring: {
        id: 'monitoring', sourceId: 'monitoring-source',
        file: 'data/monitoring_points.geojson', type: 'circle',
        paint: { 'circle-radius': 7, 'circle-color': '#e74c3c', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' },
        active: false, hasLabels: true
    },
    sewage: {
        id: 'sewage', sourceId: 'sewage-source',
        file: 'data/sewage_lines.geojson', type: 'line',
        paint: { 'line-color': '#e67e22', 'line-width': 2, 'line-dasharray': [4, 4] },
        active: false
    },
    yaroslavl: {
        id: 'yaroslavl', sourceId: 'yaroslavl-source',
        file: 'data/Yaroslavskaya.geojson', type: 'boundary',
        outerPaint: { 'line-color': '#8a6000', 'line-width': 5 },
        midPaint:   { 'line-color': '#f39c12', 'line-width': 2.5 },
        innerPaint: { 'line-color': '#8a6000', 'line-width': 0.8 },
        active: false
    },
    perZalBound: {
        id: 'per-zal-bound', sourceId: 'per-zal-bound-source',
        file: 'data/Per-zal_boundaries.geojson', type: 'boundary',
        outerPaint: { 'line-color': '#7a7a00', 'line-width': 5 },
        midPaint:   { 'line-color': '#f1c40f', 'line-width': 2.5 },
        innerPaint: { 'line-color': '#7a7a00', 'line-width': 0.8 },
        active: false
    },
    perZalGO: {
        id: 'per-zal-go', sourceId: 'per-zal-go-source',
        file: 'data/Per-zalGO.geojson', type: 'boundary',
        outerPaint: { 'line-color': '#7a3a00', 'line-width': 5 },
        midPaint:   { 'line-color': '#e67e22', 'line-width': 2.5 },
        innerPaint: { 'line-color': '#7a3a00', 'line-width': 0.8 },
        active: false
    },
    // 16 гидрохимических слоёв
    chemPH:           { id: 'chem-ph',           sourceId: 'chem-ph-src',           file: 'data/chemistry/pH.geojson',              type: 'circle', paint: chemPaint(), active: false, hasLabels: true, labelField: 'AvgPDK', yearFilter: true, sliderId: 'chem-year-slider', chemLayer: true },
    chemBPK:          { id: 'chem-bpk',          sourceId: 'chem-bpk-src',          file: 'data/chemistry/BPK.geojson',             type: 'circle', paint: chemPaint(), active: false, hasLabels: true, labelField: 'AvgPDK', yearFilter: true, sliderId: 'chem-year-slider', chemLayer: true },
    chemGelezo:       { id: 'chem-gelezo',       sourceId: 'chem-gelezo-src',       file: 'data/chemistry/gelezo.geojson',          type: 'circle', paint: chemPaint(), active: false, hasLabels: true, labelField: 'AvgPDK', yearFilter: true, sliderId: 'chem-year-slider', chemLayer: true },
    chemIonyAmonia:   { id: 'chem-iony-amonia',  sourceId: 'chem-iony-amonia-src',  file: 'data/chemistry/iony_amonia.geojson',     type: 'circle', paint: chemPaint(), active: false, hasLabels: true, labelField: 'AvgPDK', yearFilter: true, sliderId: 'chem-year-slider', chemLayer: true },
    chemKadmiy:       { id: 'chem-kadmiy',       sourceId: 'chem-kadmiy-src',       file: 'data/chemistry/kadmiy.geojson',          type: 'circle', paint: chemPaint(), active: false, hasLabels: true, labelField: 'AvgPDK', yearFilter: true, sliderId: 'chem-year-slider', chemLayer: true },
    chemKalciy:       { id: 'chem-kalciy',       sourceId: 'chem-kalciy-src',       file: 'data/chemistry/kalciy.geojson',          type: 'circle', paint: chemPaint(), active: false, hasLabels: true, labelField: 'AvgPDK', yearFilter: true, sliderId: 'chem-year-slider', chemLayer: true },
    chemMedy:         { id: 'chem-medy',         sourceId: 'chem-medy-src',         file: 'data/chemistry/medy.geojson',            type: 'circle', paint: chemPaint(), active: false, hasLabels: true, labelField: 'AvgPDK', yearFilter: true, sliderId: 'chem-year-slider', chemLayer: true },
    chemNefteprodukty:{ id: 'chem-neft',         sourceId: 'chem-neft-src',         file: 'data/chemistry/nefteprodukty.geojson',   type: 'circle', paint: chemPaint(), active: false, hasLabels: true, labelField: 'AvgPDK', yearFilter: true, sliderId: 'chem-year-slider', chemLayer: true },
    chemNitratIony:   { id: 'chem-nitrat',       sourceId: 'chem-nitrat-src',       file: 'data/chemistry/nitrat_iony.geojson',     type: 'circle', paint: chemPaint(), active: false, hasLabels: true, labelField: 'AvgPDK', yearFilter: true, sliderId: 'chem-year-slider', chemLayer: true },
    chemNitritIony:   { id: 'chem-nitrit',       sourceId: 'chem-nitrit-src',       file: 'data/chemistry/nitrit_iony.geojson',     type: 'circle', paint: chemPaint(), active: false, hasLabels: true, labelField: 'AvgPDK', yearFilter: true, sliderId: 'chem-year-slider', chemLayer: true },
    chemRastvKislorod:{ id: 'chem-kislorod',     sourceId: 'chem-kislorod-src',     file: 'data/chemistry/rastvor_kislorod.geojson',type: 'circle', paint: chemPaint(), active: false, hasLabels: true, labelField: 'AvgPDK', yearFilter: true, sliderId: 'chem-year-slider', chemLayer: true },
    chemSvinec:       { id: 'chem-svinec',       sourceId: 'chem-svinec-src',       file: 'data/chemistry/svinec.geojson',          type: 'circle', paint: chemPaint(), active: false, hasLabels: true, labelField: 'AvgPDK', yearFilter: true, sliderId: 'chem-year-slider', chemLayer: true },
    chemSulfaty:      { id: 'chem-sulfaty',      sourceId: 'chem-sulfaty-src',      file: 'data/chemistry/sulfaty.geojson',         type: 'circle', paint: chemPaint(), active: false, hasLabels: true, labelField: 'AvgPDK', yearFilter: true, sliderId: 'chem-year-slider', chemLayer: true },
    chemFosfatIony:   { id: 'chem-fosfat',       sourceId: 'chem-fosfat-src',       file: 'data/chemistry/fosfat_iony.geojson',     type: 'circle', paint: chemPaint(), active: false, hasLabels: true, labelField: 'AvgPDK', yearFilter: true, sliderId: 'chem-year-slider', chemLayer: true },
    chemHloridy:      { id: 'chem-hloridy',      sourceId: 'chem-hloridy-src',      file: 'data/chemistry/hloridy.geojson',         type: 'circle', paint: chemPaint(), active: false, hasLabels: true, labelField: 'AvgPDK', yearFilter: true, sliderId: 'chem-year-slider', chemLayer: true },
    chemCink:         { id: 'chem-cink',         sourceId: 'chem-cink-src',         file: 'data/chemistry/cink.geojson',            type: 'circle', paint: chemPaint(), active: false, hasLabels: true, labelField: 'AvgPDK', yearFilter: true, sliderId: 'chem-year-slider', chemLayer: true },
    stokVody: {
        id: 'stok-vody', sourceId: 'stok-vody-source',
        file: 'data/stok_vody.geojson', type: 'circle',
        paint: {
            'circle-radius': ['interpolate', ['linear'], ['get', 'Avg'], 0, 6, 11.56, 9, 84.61, 14, 6415, 22],
            'circle-color': ['case', ['<', ['get', 'Avg'], 11.56], '#a8d0f0', ['<=', ['get', 'Avg'], 84.61], '#3a8fc7', '#0d3b6e'],
            'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff', 'circle-opacity': 0.92
        },
        active: false, hasLabels: true, labelField: 'Avg',
        yearFilter: true, sliderId: 'stok-year-slider-container', hasPopup: true
    },
    // Пешие маршруты экспедиции
    routePesh1: { id: 'route-pesh-1', sourceId: 'route-pesh-1-src', file: 'data/route2024/Route_pesh_1.geojson', type: 'route', routeType: 'pesh', active: false },
    routePesh2: { id: 'route-pesh-2', sourceId: 'route-pesh-2-src', file: 'data/route2024/Route_pesh_2.geojson', type: 'route', routeType: 'pesh', active: false },
    routePesh3: { id: 'route-pesh-3', sourceId: 'route-pesh-3-src', file: 'data/route2024/Route_pesh_3.geojson', type: 'route', routeType: 'pesh', active: false },
    routePesh4: { id: 'route-pesh-4', sourceId: 'route-pesh-4-src', file: 'data/route2024/Route_pesh_4.geojson', type: 'route', routeType: 'pesh', active: false },
    routePesh5: { id: 'route-pesh-5', sourceId: 'route-pesh-5-src', file: 'data/route2024/Route_pesh_5.geojson', type: 'route', routeType: 'pesh', active: false },
    routePesh6: { id: 'route-pesh-6', sourceId: 'route-pesh-6-src', file: 'data/route2024/Route_pesh_6.geojson', type: 'route', routeType: 'pesh', active: false },
    // Водные маршруты экспедиции
    routeW1: { id: 'route-w-1', sourceId: 'route-w-1-src', file: 'data/route2024/Route_w_1.geojson', type: 'route', routeType: 'water', active: false },
    routeW2: { id: 'route-w-2', sourceId: 'route-w-2-src', file: 'data/route2024/Route_w_2.geojson', type: 'route', routeType: 'water', active: false },
    routeW3: { id: 'route-w-3', sourceId: 'route-w-3-src', file: 'data/route2024/Route_w_3.geojson', type: 'route', routeType: 'water', active: false },
    routeW4: { id: 'route-w-4', sourceId: 'route-w-4-src', file: 'data/route2024/Route_w_4.geojson', type: 'route', routeType: 'water', active: false },
    routeW5: { id: 'route-w-5', sourceId: 'route-w-5-src', file: 'data/route2024/Route_w_5.geojson', type: 'route', routeType: 'water', active: false },
    // Точки обследования притоков Трубежа
    pointsProb1: {
        id: 'points-prob-1', sourceId: 'points-prob-1-src',
        file: 'data/points_prob_1.geojson', type: 'circle',
        paint: {
            'circle-radius': 7,
            'circle-color': '#8e44ad',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
        },
        active: false
    },
    // Гидрохимия экспедиции 2024
    chem2024PH: {
        id: 'chem2024-ph', sourceId: 'chem2024-ph-src',
        file: 'data/chemistry2024/pH2024.geojson', type: 'circle',
        paint: chemPaint(), active: false, hasLabels: true, labelField: 'AvgPDK'
    },
    chem2024IonyAmonia: {
        id: 'chem2024-iony-amonia', sourceId: 'chem2024-iony-amonia-src',
        file: 'data/chemistry2024/iony_amonia2024.geojson', type: 'circle',
        paint: chemPaint(), active: false, hasLabels: true, labelField: 'AvgPDK'
    },
    chem2024NitritIony: {
        id: 'chem2024-nitrit-iony', sourceId: 'chem2024-nitrit-iony-src',
        file: 'data/chemistry2024/nitrit_iony2024.geojson', type: 'circle',
        paint: chemPaint(), active: false, hasLabels: true, labelField: 'AvgPDK'
    },
    chem2024Fosfaty: {
        id: 'chem2024-fosfaty', sourceId: 'chem2024-fosfaty-src',
        file: 'data/chemistry2024/fosfaty2024.geojson', type: 'circle',
        paint: chemPaint(), active: false, hasLabels: true, labelField: 'AvgPDK'
    },
    // Исторические растровые карты
    rasterPereslavl1808: {
        id: 'raster-pereslavl-1808',
        sourceId: 'raster-pereslavl-1808-src',
        type: 'raster',
        tiles: ['data/rasters/pereslavl1808/{z}/{x}/{y}.png'],
        tileSize: 256,
        opacity: 0.85,
        active: false
    }
};

// ====================== ГИДРОГРАФИЯ MAPBOX ======================
function addMapBoxHydrography() {
    const sourceId = 'mapbox-hydro-source';
    if (!map.getSource(sourceId)) {
        map.addSource(sourceId, { type: 'vector', url: 'mapbox://mapbox.mapbox-streets-v8' });
    }
    if (!map.getLayer('mapbox-water-fill')) {
        map.addLayer({ id: 'mapbox-water-fill', type: 'fill', source: sourceId, 'source-layer': 'water', minzoom: 0,
            paint: { 'fill-color': '#c5e0ff', 'fill-opacity': 1, 'fill-outline-color': '#6498d2' } });
    }
    if (!map.getLayer('mapbox-waterway')) {
        map.addLayer({ id: 'mapbox-waterway', type: 'line', source: sourceId, 'source-layer': 'waterway', minzoom: 2,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#6498d2',
                'line-width': ['interpolate', ['linear'], ['zoom'],
                    2,  ['match', ['get', 'class'], ['river'], 0.6, ['canal'], 0.5, 0.2],
                    6,  ['match', ['get', 'class'], ['river'], 1.2, ['canal'], 1.0, ['stream'], 0.6, 0.4],
                    10, ['match', ['get', 'class'], ['river'], 2.5, ['canal'], 2.0, ['stream'], 1.2, ['ditch', 'drain'], 0.8, 0.6],
                    14, ['match', ['get', 'class'], ['river'], 5.0, ['canal'], 4.0, ['stream'], 2.5, ['ditch', 'drain'], 1.5, 1.0]
                ],
                'line-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.5, 5, 0.75, 8, 0.85]
            }
        }, 'mapbox-water-fill');
    }
    if (!map.getLayer('mapbox-water-outline')) {
        map.addLayer({ id: 'mapbox-water-outline', type: 'line', source: sourceId, 'source-layer': 'water', minzoom: 0,
            paint: { 'line-color': '#6498d2', 'line-width': 3 } });
    }
}

function setMapBoxWaterVisibility(visible) {
    const v = visible ? 'visible' : 'none';
    ['mapbox-water-fill','mapbox-waterway','mapbox-water-outline'].forEach(id => {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', v);
    });
}

function setupMapBoxWaterToggle() {
    const t = document.getElementById('mapbox-water-toggle');
    if (t) { t.checked = true; t.addEventListener('change', e => setMapBoxWaterVisibility(e.target.checked)); }
}

function hideMapboxBuiltinWater() {
    map.getStyle().layers.forEach(layer => {
        if (layer.id.includes('water') && !layer.id.startsWith('mapbox-water')) {
            if (map.getLayer(layer.id)) map.setLayoutProperty(layer.id, 'visibility', 'none');
        }
    });
}

// ====================== ФИЛЬТР ПО ГОДАМ ======================
function setupYearSlider(years, sliderId, layerKey) {
    const sorted = years.sort((a, b) => a - b);
    const container = document.getElementById(sliderId);
    if (!container) return;
    const vId = `${sliderId}-val`, iId = `${sliderId}-inp`;
    container.innerHTML = `
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#5a4a2a;margin-bottom:4px;">
            <span>${sorted[0]}</span>
            <strong id="${vId}" style="color:#2c2c2c;">${sorted[0]}</strong>
            <span>${sorted[sorted.length-1]}</span>
        </div>
        <input type="range" id="${iId}" min="0" max="${sorted.length-1}" step="1" value="0"
               style="width:100%;cursor:pointer;accent-color:#d3e1a3;">`;
    applyYearFilter(layerKey, sorted[0]);
    document.getElementById(iId).addEventListener('input', e => {
        const yr = sorted[parseInt(e.target.value)];
        document.getElementById(vId).textContent = yr;
        applyYearFilter(layerKey, yr);
    });
}

function applyYearFilter(layerKey, year) {
    const config = layerConfig[layerKey];
    if (!config) return;
    const f = ['==', ['get', 'Year'], year];
    if (map.getLayer(config.id)) map.setFilter(config.id, f);
    if (map.getLayer(`${config.id}-labels`)) map.setFilter(`${config.id}-labels`, f);
}

// ====================== УПРАВЛЕНИЕ ХИМИЧЕСКИМИ СЛОЯМИ ======================
function setupChemControls() {
    const checkbox = document.getElementById('chem-checkbox');
    const select   = document.getElementById('chem-select');
    const helpBtn  = document.getElementById('chem-help-btn');
    const tooltip  = document.getElementById('chem-tooltip');
    const slider   = document.getElementById('chem-year-slider');

    if (!checkbox || !select) return;

    // Инициализация: показываем/скрываем панель
    checkbox.addEventListener('change', () => {
        const on = checkbox.checked;
        document.getElementById('chem-controls').style.display = on ? 'block' : 'none';
        if (on) {
            switchChemLayer(select.value);
        } else {
            if (activeChemKey) {
                setLayerVisibility(activeChemKey, false);
                activeChemKey = null;
            }
        }
    });

    // Смена показателя
    select.addEventListener('change', () => {
        if (checkbox.checked) switchChemLayer(select.value);
        updateChemTooltip(select.value);
    });

    // Tooltip по кнопке ?
    helpBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const info = chemInfo[select.value];
        if (!info) return;
        tooltip.innerHTML = `<span style="color:#2c2c2c;font-size:11px;">Единицы измерения: ${info.units}</span><br>
            <em style="font-size:10px;color:#5a4a2a;">Подробнее — в разделе «Экологические показатели»</em>`;
        tooltip.style.display = tooltip.style.display === 'block' ? 'none' : 'block';
    });

    // Закрытие tooltip кликом вне
    document.addEventListener('click', (e) => {
        if (!tooltip.contains(e.target) && e.target !== helpBtn) {
            tooltip.style.display = 'none';
        }
    });
}

function switchChemLayer(newKey) {
    // Скрываем предыдущий
    if (activeChemKey && activeChemKey !== newKey) {
        setLayerVisibility(activeChemKey, false);
    }
    activeChemKey = newKey;
    setLayerVisibility(newKey, true);

    // Перезапускаем ползунок для нового слоя
    const config = layerConfig[newKey];
    if (!config) return;
    const source = map.getSource(config.sourceId);
    if (!source) return;
    const data = source._data;
    if (data && data.features) {
        const years = [...new Set(
            data.features.map(f => f.properties?.Year).filter(y => y != null)
        )];
        if (years.length > 0) setupYearSlider(years, 'chem-year-slider', newKey);
    }
}

function updateChemTooltip(key) {
    // tooltip обновится при следующем клике на ?
}

// ====================== ПЕРЕКЛЮЧАТЕЛЬ ГИДРОХИМИИ 2024 ======================
let activeChem2024Key = null;

function setupChem2024Controls() {
    const checkbox = document.getElementById('chem2024-checkbox');
    const select   = document.getElementById('chem2024-select');
    if (!checkbox || !select) return;

    checkbox.addEventListener('change', () => {
        const on = checkbox.checked;
        document.getElementById('chem2024-controls').style.display = on ? 'block' : 'none';
        if (on) {
            switchChem2024Layer(select.value);
        } else {
            if (activeChem2024Key) { setLayerVisibility(activeChem2024Key, false); activeChem2024Key = null; }
        }
    });

    select.addEventListener('change', () => {
        if (checkbox.checked) switchChem2024Layer(select.value);
    });
}

function switchChem2024Layer(newKey) {
    if (activeChem2024Key && activeChem2024Key !== newKey) setLayerVisibility(activeChem2024Key, false);
    activeChem2024Key = newKey;
    setLayerVisibility(newKey, true);
}

// ====================== ЗАГРУЗКА СЛОЁВ ======================
async function loadAllLayers() {
    for (const [key, config] of Object.entries(layerConfig)) {
        await loadLayer(key, config);
    }
    for (const [key, config] of Object.entries(layerConfig)) {
        setLayerVisibility(key, config.alwaysOn || config.active || false);
    }
    syncCheckboxes();
    setupChemControls();
    setupChem2024Controls();
}

async function loadLayer(key, config) {
    // Растровые слои не требуют fetch — подключаются напрямую через тайлы
    if (config.type === 'raster') {
        if (!map.getSource(config.sourceId)) {
            map.addSource(config.sourceId, {
                type: 'raster',
                tiles: config.tiles,
                tileSize: config.tileSize || 256
            });
        }
        if (!map.getLayer(config.id)) {
            const initVis = config.active ? 'visible' : 'none';
            map.addLayer({
                id: config.id, type: 'raster', source: config.sourceId,
                layout: { visibility: initVis },
                paint: { 'raster-opacity': config.opacity || 0.85 }
            });
        }
        return;
    }

    try {
        const response = await fetch(config.file);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        if (!map.getSource(config.sourceId)) {
            map.addSource(config.sourceId, { type: 'geojson', data });
        }

        if (config.yearFilter && data.features && config.sliderId && !config.chemLayer) {
            const years = [...new Set(data.features.map(f => f.properties?.Year).filter(y => y != null))];
            if (years.length > 0) setupYearSlider(years, config.sliderId, key);
        }

        if (!map.getLayer(config.id)) {
            const initVis = (config.active && !config.chemLayer) ? 'visible' : 'none';
            if (config.type === 'fill') {
                map.addLayer({ id: `${config.id}-fill`, type: 'fill', source: config.sourceId, paint: config.paint, layout: { visibility: initVis } });
                if (config.linePaint) map.addLayer({ id: `${config.id}-line`, type: 'line', source: config.sourceId, paint: config.linePaint, layout: { visibility: initVis } });
            } else if (config.type === 'line') {
                map.addLayer({ id: config.id, type: 'line', source: config.sourceId, paint: config.paint, layout: { visibility: initVis } });
            } else if (config.type === 'natpark') {
                map.addLayer({ id: `${config.id}-fill`, type: 'fill', source: config.sourceId, paint: { 'fill-color': '#c8a96e', 'fill-opacity': 0.15 }, layout: { visibility: initVis } });
                map.addLayer({ id: config.id, type: 'line', source: config.sourceId, paint: { 'line-color': '#8B5E3C', 'line-width': 2.5 }, layout: { visibility: initVis } });
            } else if (config.type === 'boundary') {
                map.addLayer({ id: `${config.id}-outer`, type: 'line', source: config.sourceId, paint: config.outerPaint, layout: { visibility: initVis } });
                map.addLayer({ id: `${config.id}-mid`,   type: 'line', source: config.sourceId, paint: config.midPaint,   layout: { visibility: initVis } });
                map.addLayer({ id: `${config.id}-inner`, type: 'line', source: config.sourceId, paint: config.innerPaint, layout: { visibility: initVis } });
            } else if (config.type === 'route') {
                const isPesh = config.routeType === 'pesh';
                map.addLayer({
                    id: config.id, type: 'line', source: config.sourceId,
                    layout: { visibility: initVis, 'line-join': 'round', 'line-cap': 'round' },
                    paint: {
                        'line-color': isPesh ? '#e67e22' : '#8e44ad',
                        'line-width': 2.5,
                        'line-opacity': 0.9,
                        'line-dasharray': [6, 4]
                    }
                });
                map.addLayer({
                    id: `${config.id}-highlight`, type: 'line', source: config.sourceId,
                    layout: { visibility: initVis, 'line-join': 'round', 'line-cap': 'round' },
                    paint: { 'line-color': '#ffe066', 'line-width': 7, 'line-opacity': 0 }
                });
            } else if (config.type === 'circle') {
                map.addLayer({ id: config.id, type: 'circle', source: config.sourceId, paint: config.paint, layout: { visibility: initVis } });
                if (config.hasLabels) {
                    const isVal = !!config.labelField;
                    map.addLayer({
                        id: `${config.id}-labels`, type: 'symbol', source: config.sourceId,
                        minzoom: isVal ? 10 : 0,
                        layout: {
                            visibility: initVis,
                            'text-field': isVal ? ['number-format', ['get', config.labelField], { 'max-fraction-digits': 1 }] : ['get', 'name'],
                            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                            'text-size': isVal ? 10 : 11,
                            'text-offset': isVal ? [0, 0] : [0, -1.2],
                            'text-anchor': isVal ? 'center' : 'bottom'
                        },
                        paint: {
                            'text-color': isVal ? '#ffffff' : '#2c2c2c',
                            'text-halo-color': isVal ? 'rgba(0,0,0,0.3)' : '#ffffff',
                            'text-halo-width': 1.5
                        }
                    });
                }
            }
        }
    } catch (err) {
        console.warn(`Failed to load ${config.file}:`, err);
    }
}

function setLayerVisibility(key, visible) {
    const config = layerConfig[key];
    if (!config) return;
    const v = visible ? 'visible' : 'none';
    if (config.type === 'raster') {
        if (map.getLayer(config.id)) map.setLayoutProperty(config.id, 'visibility', v);
    } else if (config.type === 'fill') {
        if (map.getLayer(`${config.id}-fill`)) map.setLayoutProperty(`${config.id}-fill`, 'visibility', v);
        if (map.getLayer(`${config.id}-line`)) map.setLayoutProperty(`${config.id}-line`, 'visibility', v);
    } else if (config.type === 'line') {
        if (map.getLayer(config.id)) map.setLayoutProperty(config.id, 'visibility', v);
    } else if (config.type === 'natpark') {
        if (map.getLayer(`${config.id}-fill`)) map.setLayoutProperty(`${config.id}-fill`, 'visibility', v);
        if (map.getLayer(config.id)) map.setLayoutProperty(config.id, 'visibility', v);
    } else if (config.type === 'boundary') {
        ['outer','mid','inner'].forEach(s => {
            if (map.getLayer(`${config.id}-${s}`)) map.setLayoutProperty(`${config.id}-${s}`, 'visibility', v);
        });
    } else if (config.type === 'route') {
        if (map.getLayer(config.id)) map.setLayoutProperty(config.id, 'visibility', v);
        if (map.getLayer(`${config.id}-highlight`)) map.setLayoutProperty(`${config.id}-highlight`, 'visibility', v);
    } else if (config.type === 'circle') {
        if (map.getLayer(config.id)) map.setLayoutProperty(config.id, 'visibility', v);
        if (config.hasLabels && map.getLayer(`${config.id}-labels`)) map.setLayoutProperty(`${config.id}-labels`, 'visibility', v);
    }
    config.active = visible;
}

function setupLayerCheckboxes() {
    document.querySelectorAll('.layer-checkbox').forEach(cb => {
        const key = cb.getAttribute('data-layer');
        const config = layerConfig[key];
        if (config) { cb.checked = config.active !== false; cb.disabled = !!config.alwaysOn; }
        cb.addEventListener('change', e => setLayerVisibility(e.target.getAttribute('data-layer'), e.target.checked));
    });

    // Показываем ползунок стока только при включённом слое
    const stokCb = document.querySelector('[data-layer="stokVody"]');
    if (stokCb) {
        stokCb.addEventListener('change', (e) => {
            const slider = document.getElementById('stok-year-slider-container');
            if (slider) slider.style.display = e.target.checked ? 'block' : 'none';
        });
    }
}

function syncCheckboxes() {
    document.querySelectorAll('.layer-checkbox').forEach(cb => {
        const key = cb.getAttribute('data-layer');
        const config = layerConfig[key];
        if (config) cb.checked = config.active || false;
    });
}

// ====================== ПОДЛОЖКИ ======================
function setupBasemapSwitcher() {
    const select = document.getElementById('basemap-select');
    if (!select) return;
    const BLANK = { version: 8, sources: {}, layers: [] };
    select.addEventListener('change', e => {
        const val = e.target.value;
        const cc = map.getCenter(), cz = map.getZoom();
        if (rasterBasemaps[val]) {
            map.setStyle(BLANK);
            map.once('style.load', () => {
                const cfg = rasterBasemaps[val];
                map.addSource(`raster-${val}`, { type: 'raster', tiles: cfg.tiles, tileSize: 256, attribution: cfg.attribution, maxzoom: cfg.maxZoom });
                map.addLayer({ id: `raster-layer-${val}`, type: 'raster', source: `raster-${val}` });
                loadAllLayers(); map.setCenter(cc); map.setZoom(cz);
            });
        } else if (basemaps[val]) {
            map.setStyle(basemaps[val]);
            map.once('style.load', () => setTimeout(() => {
                hideMapboxBuiltinWater(); addMapBoxHydrography(); loadAllLayers(); setupMapBoxWaterToggle();
                map.setCenter(cc); map.setZoom(cz);
            }, 300));
        }
    });
}

function setupControls() {
    map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');
    map.addControl(new mapboxgl.NavigationControl(), 'bottom-left');
    document.getElementById('reset-view-btn').addEventListener('click', resetView);
    document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);
    document.getElementById('measure-btn').addEventListener('click', toggleMeasureMode);
}

function resetView() { map.flyTo({ center: centerCoords, zoom: initialZoom, duration: 1000 }); disableMeasureMode(); }
function toggleFullscreen() { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }

// ====================== МОДАЛЬНЫЕ ОКНА ======================
function setupModals() {
    const modals = {
        'about-btn':    'about-modal',
        'tools-modal-btn': 'tools-modal',
        'ecology-btn':  'ecology-modal'
    };
    Object.entries(modals).forEach(([btnId, modalId]) => {
        const btn = document.getElementById(btnId);
        const modal = document.getElementById(modalId);
        if (btn && modal) btn.addEventListener('click', () => modal.classList.add('show'));
    });
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => document.querySelectorAll('.modal').forEach(m => m.classList.remove('show')));
    });
    window.addEventListener('click', e => {
        if (e.target.classList.contains('modal')) e.target.classList.remove('show');
    });
}

// ====================== ЗАПУСК ======================
map.on('load', () => {
    hideMapboxBuiltinWater();
    addMapBoxHydrography();
    loadAllLayers();
    setupControls();
    setupLayerCheckboxes();
    setupBasemapSwitcher();
    setupModals();
    setupMapBoxWaterToggle();
    map.once('idle', () => {
        // Порядок слоёв снизу вверх:
        // подложка → basin → natpark → глобальная гидрография → локальная гидрография → остальные слои

        // 1. basin и natpark — выше подложки, но ниже глобальной гидрографии
        if (map.getLayer('basin-fill'))    map.moveLayer('basin-fill',    'mapbox-water-fill');
        if (map.getLayer('basin-line'))    map.moveLayer('basin-line',    'mapbox-water-fill');
        if (map.getLayer('natpark-fill'))  map.moveLayer('natpark-fill',  'mapbox-water-fill');
        if (map.getLayer('natpark'))       map.moveLayer('natpark',       'mapbox-water-fill');

        // 2. Локальная гидрография — под глобальной (глобальная будет выше)
        if (map.getLayer('gidro-line'))    map.moveLayer('gidro-line',    'mapbox-water-fill');

        setupRiverInteraction();
        setupStokPopup();
        setupRouteInteraction();
        setupPointsProb();
    });
});

// ====================== ТОЧКИ ОБСЛЕДОВАНИЯ ПРИТОКОВ ТРУБЕЖА ======================
let probPopup = null;

function setupPointsProb() {
    const layerId = layerConfig.pointsProb1.id;
    if (!map.getLayer(layerId)) return;

    map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });

    map.on('click', layerId, e => {
        const props = e.features[0]?.properties;
        if (!props) return;

        const name        = props.name        || '—';
        const description = props.description || '';
        const foto        = (props.foto && props.foto !== 'null') ? props.foto : null;

        if (probPopup) probPopup.remove();
        probPopup = new mapboxgl.Popup({
            closeButton: true, closeOnClick: false,
            maxWidth: '280px', className: 'prob-popup'
        })
        .setLngLat(e.lngLat)
        .setHTML(`
            <div class="prob-popup-inner">
                <div class="prob-popup-title">${name}</div>
                ${foto ? `<img class="prob-popup-photo" src="data/expedition_photo/${foto}" alt="${name}" onerror="this.style.display='none'">` : ''}
                ${description ? `<div class="prob-popup-text">${description}</div>` : ''}
            </div>
        `)
        .addTo(map);
    });
}

// ====================== ИНФОРМАЦИЯ О РЕКАХ ======================
// Текстовые описания — ключ совпадает с полем SEM9, фото берётся из атрибута photo
const riverInfo = {
    'Трубеж':   'Река Трубеж — правый приток озера Плещеево длиной около 37 км. Протекает через город Переславль-Залесский и исторически служила важным водным путём. В нижнем течении образует живописную пойму с богатой водной растительностью.',
    'Векса':    'Река Векса — левый приток озера Плещеево. Берёт начало в болотах и впадает в озеро с северо-западной стороны. Характеризуется спокойным течением и густой прибрежной растительностью.',
    'Куротень': 'Река Куротень — один из притоков водосборного бассейна Плещеева озера. Протекает по лесистой местности, отличается чистой водой и живописными берегами.',
    'Язёвка':   'Река Язёвка — небольшой приток в водосборном бассейне Плещеева озера. Впадает в озеро с южной стороны, проходя через сельскохозяйственные угодья.'
};

let riverPopup = null;

function setupRiverInteraction() {
    const sourceId = layerConfig.gidroLine.sourceId;
    const baseLayerId = layerConfig.gidroLine.id;
    if (!map.getSource(sourceId)) return;

    if (!map.getLayer('gidro-line-highlight')) {
        map.addLayer({ id: 'gidro-line-highlight', type: 'line', source: sourceId,
            paint: { 'line-color': '#ffe066', 'line-width': 6, 'line-opacity': 0 } });
    }

    map.on('mousemove', baseLayerId, e => {
        const props = e.features[0]?.properties;
        const name = props?.SEM9;
        const hasPhoto = props?.photo && props.photo !== 'null' && props.photo !== null;
        if (name && (riverInfo[name] || hasPhoto)) {
            map.getCanvas().style.cursor = 'pointer';
            map.setPaintProperty('gidro-line-highlight', 'line-opacity', 1);
            map.setFilter('gidro-line-highlight', ['==', ['get', 'SEM9'], name]);
        } else {
            map.getCanvas().style.cursor = '';
            map.setPaintProperty('gidro-line-highlight', 'line-opacity', 0);
        }
    });

    map.on('mouseleave', baseLayerId, () => {
        map.getCanvas().style.cursor = '';
        map.setPaintProperty('gidro-line-highlight', 'line-opacity', 0);
    });

    map.on('click', baseLayerId, e => {
        const props = e.features[0]?.properties;
        const name = props?.SEM9;
        const photo = (props?.photo && props.photo !== 'null' && props.photo !== null) ? props.photo : null;
        const description = riverInfo[name] || null;
        if (!name || (!description && !photo)) return;

        if (riverPopup) riverPopup.remove();
        riverPopup = new mapboxgl.Popup({
            closeButton: true, closeOnClick: false,
            maxWidth: '260px', className: 'river-popup'
        })
        .setLngLat(e.lngLat)
        .setHTML(`<div class="river-popup-inner">
            <div class="river-popup-title">${name}</div>
            ${photo ? `<img class="river-popup-photo" src="data/water_photo/${photo}" alt="${name}" onerror="this.style.display='none'">` : ''}
            ${description ? `<div class="river-popup-text">${description}</div>` : ''}
        </div>`)
        .addTo(map);
    });
}

// ====================== СТОК ВОДЫ ======================
let stokPopup = null, highlightedBasinName = null;

function setupStokPopup() {
    const layerId = layerConfig.stokVody.id;
    if (!map.getLayer(layerId)) return;
    map.on('mousemove', layerId, e => {
        map.getCanvas().style.cursor = 'pointer';
        const name = e.features[0]?.properties?.Name;
        if (name && name !== highlightedBasinName) { highlightedBasinName = name; highlightBasin(name); }
    });
    map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; if (!stokPopup) clearBasinHighlight(); });
    map.on('click', layerId, e => {
        const props = e.features[0]?.properties;
        if (!props) return;
        const name = props.Name || '—';
        const avg  = props.Avg  != null ? Number(props.Avg).toFixed(1)  : '—';
        const max  = props.Max  != null ? Number(props.Max).toFixed(1)  : '—';
        const sum  = props.Sum  != null ? Number(props.Sum).toFixed(1)  : '—';
        const year = props.Year || '—';
        highlightBasin(name);
        if (stokPopup) stokPopup.remove();
        const base = parseFloat(avg)||1, maxF = parseFloat(max)||1, sumF = parseFloat(sum)||1;
        const scale = 60 / Math.max(base, maxF, sumF);
        const hA = Math.max(4, Math.round(base*scale)), hM = Math.max(4, Math.round(maxF*scale)), hS = Math.max(4, Math.round(sumF*scale));
        stokPopup = new mapboxgl.Popup({ closeButton: true, closeOnClick: false, maxWidth: '280px', className: 'stok-popup' })
            .setLngLat(e.lngLat)
            .setHTML(`<div class="stok-popup-inner">
                <div class="stok-popup-title">${name}</div>
                <div class="stok-popup-year">Год: ${year}</div>
                <div class="stok-chart">
                    <div class="stok-bar-wrap"><div class="stok-bar" style="height:${hA}px;background:#3a8fc7;"></div><div class="stok-bar-label">${avg}</div><div class="stok-bar-name">Средний</div></div>
                    <div class="stok-bar-wrap"><div class="stok-bar" style="height:${hM}px;background:#0d3b6e;"></div><div class="stok-bar-label">${max}</div><div class="stok-bar-name">Макс.</div></div>
                    <div class="stok-bar-wrap"><div class="stok-bar" style="height:${hS}px;background:#a8d0f0;border:1px solid #3a8fc7;"></div><div class="stok-bar-label">${sum}</div><div class="stok-bar-name">Сумм.</div></div>
                </div>
                <div class="stok-units">тыс.м³/год</div>
            </div>`)
            .addTo(map);
        stokPopup.on('close', () => { stokPopup = null; clearBasinHighlight(); });
    });
}

function highlightBasin(name) {
    if (!map.getSource('gidro-bas-source')) return;
    if (map.getLayer('gidro-bas-fill')) {
        map.setLayoutProperty('gidro-bas-fill', 'visibility', 'visible');
        map.setLayoutProperty('gidro-bas-line', 'visibility', 'visible');
        map.setPaintProperty('gidro-bas-fill', 'fill-color', ['case', ['==', ['get', 'name_point'], name], '#3a8fc7', '#2ecc71']);
        map.setPaintProperty('gidro-bas-fill', 'fill-opacity', ['case', ['==', ['get', 'name_point'], name], 0.35, 0.05]);
    }
}

function clearBasinHighlight() {
    highlightedBasinName = null;
    if (!map.getLayer('gidro-bas-fill')) return;
    map.setPaintProperty('gidro-bas-fill', 'fill-color', '#2ecc71');
    map.setPaintProperty('gidro-bas-fill', 'fill-opacity', 0.15);
    if (!layerConfig.gidroBas.active) {
        map.setLayoutProperty('gidro-bas-fill', 'visibility', 'none');
        map.setLayoutProperty('gidro-bas-line', 'visibility', 'none');
    }
}

// ====================== МАРШРУТЫ ЭКСПЕДИЦИИ ======================
let routePopup = null;

function setupRouteInteraction() {
    const routeKeys = Object.keys(layerConfig).filter(k => layerConfig[k].type === 'route');

    routeKeys.forEach(key => {
        const config = layerConfig[key];
        const layerId = config.id;
        const highlightId = `${config.id}-highlight`;

        map.on('mousemove', layerId, (e) => {
            map.getCanvas().style.cursor = 'pointer';
            if (map.getLayer(highlightId)) {
                map.setPaintProperty(highlightId, 'line-opacity', 1);
            }
        });

        map.on('mouseleave', layerId, () => {
            map.getCanvas().style.cursor = '';
            if (map.getLayer(highlightId)) {
                map.setPaintProperty(highlightId, 'line-opacity', 0);
            }
        });

        map.on('click', layerId, (e) => {
            const props = e.features[0]?.properties;
            if (!props) return;

            const fid      = props.fid      || '—';
            const name     = props.name     || '—';
            const lengthKm = props.length_km|| '—';
            const date     = props.date     || '—';
            const typeLabel = config.routeType === 'pesh' ? 'пеший' : 'водный';

            if (routePopup) routePopup.remove();
            routePopup = new mapboxgl.Popup({
                closeButton: true, closeOnClick: false,
                maxWidth: '200px', className: 'route-popup'
            })
            .setLngLat(e.lngLat)
            .setHTML(`
                <div style="font-size:12px;line-height:1.6;padding:4px 2px;">
                    <div style="font-weight:600;margin-bottom:4px;">${name}</div>
                    <div style="color:#5a4a2a;">№${fid} · ${typeLabel}</div>
                    <div>${lengthKm} км · ${date}</div>
                </div>
            `)
            .addTo(map);
        });
    });
}

// ====================== ИЗМЕРЕНИЕ ======================
let measureMode = false, measurePoints = [], measurePopups = [];

function toggleMeasureMode() { measureMode ? disableMeasureMode() : enableMeasureMode(); }

function enableMeasureMode() {
    measureMode = true;
    map.getCanvas().style.cursor = 'crosshair';
    document.getElementById('measure-btn')?.classList.add('active');
    const s = document.getElementById('measure-status');
    if (s) { s.textContent = 'Кликайте на карту для измерения. ESC или кнопка — выход.'; s.classList.remove('hidden'); }
    if (!map.getSource('measure-source')) {
        map.addSource('measure-source', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({ id: 'measure-line', type: 'line', source: 'measure-source', paint: { 'line-color': '#e74c3c', 'line-width': 2.5, 'line-dasharray': [4, 3] } });
        map.addLayer({ id: 'measure-points', type: 'circle', source: 'measure-source', filter: ['==', '$type', 'Point'], paint: { 'circle-radius': 5, 'circle-color': '#e74c3c', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } });
    }
    map.on('click', onMeasureClick);
    document.addEventListener('keydown', onMeasureEsc);
}

function onMeasureClick(e) {
    if (!measureMode) return;
    const pt = [e.lngLat.lng, e.lngLat.lat];
    measurePoints.push(pt);
    updateMeasureSource();
    if (measurePoints.length >= 2) {
        const prev = measurePoints[measurePoints.length - 2];
        const d = calcDist(prev[1], prev[0], pt[1], pt[0]);
        const label = d < 1000 ? d.toFixed(0)+' м' : (d/1000).toFixed(2)+' км';
        const p = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, className: 'measure-label', offset: [0, -6] })
            .setLngLat([(prev[0]+pt[0])/2, (prev[1]+pt[1])/2]).setHTML(`<span>${label}</span>`).addTo(map);
        measurePopups.push(p);
    }
    updateMeasureStatus();
}

function updateMeasureSource() {
    if (!map.getSource('measure-source')) return;
    const features = [];
    if (measurePoints.length >= 2) features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: measurePoints } });
    measurePoints.forEach(p => features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: p } }));
    map.getSource('measure-source').setData({ type: 'FeatureCollection', features });
}

function updateMeasureStatus() {
    const s = document.getElementById('measure-status');
    if (!s) return;
    if (measurePoints.length < 2) { s.textContent = 'Добавьте ещё точку. ESC — выход.'; return; }
    let total = 0;
    for (let i = 1; i < measurePoints.length; i++) total += calcDist(measurePoints[i-1][1], measurePoints[i-1][0], measurePoints[i][1], measurePoints[i][0]);
    s.textContent = `Итого: ${total < 1000 ? total.toFixed(0)+' м' : (total/1000).toFixed(2)+' км'} (${measurePoints.length} точек). ESC — выход.`;
}

function onMeasureEsc(e) { if (e.key === 'Escape') disableMeasureMode(); }

function disableMeasureMode() {
    measureMode = false;
    map.getCanvas().style.cursor = '';
    document.getElementById('measure-btn')?.classList.remove('active');
    const s = document.getElementById('measure-status');
    if (s) s.classList.add('hidden');
    measurePoints = [];
    measurePopups.forEach(p => p.remove()); measurePopups = [];
    updateMeasureSource();
    map.off('click', onMeasureClick);
    document.removeEventListener('keydown', onMeasureEsc);
}

function calcDist(lat1, lon1, lat2, lon2) {
    const R = 6371000, f1 = lat1*Math.PI/180, f2 = lat2*Math.PI/180;
    const df = (lat2-lat1)*Math.PI/180, dl = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(df/2)**2 + Math.cos(f1)*Math.cos(f2)*Math.sin(dl/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function showNotification(message, type = 'info') {
    const el = document.createElement('div');
    el.className = `notification ${type}`; el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => { el.style.animation = 'slideOut 0.3s ease'; setTimeout(() => el.remove(), 300); }, 3000);
}
// ====================== СВОРАЧИВАНИЕ ЛЕГЕНДЫ ======================
function toggleLegend() {
    const body = document.getElementById('legend-body');
    const btn  = document.getElementById('legend-toggle');
    if (!body || !btn) return;
    const collapsed = body.style.display === 'none';
    body.style.display = collapsed ? 'block' : 'none';
    btn.innerHTML = collapsed ? '&#x25B2;' : '&#x25BC;';
}
// ====================== ПЕРЕКЛЮЧЕНИЕ ГРУПП МАРШРУТОВ ======================
function toggleRouteMaster(enabled) {
    const selector = document.getElementById('routes-type-selector');
    if (selector) selector.style.display = enabled ? 'block' : 'none';

    const peshCb  = document.getElementById('routes-pesh-toggle');
    const waterCb = document.getElementById('routes-water-toggle');

    if (enabled) {
        toggleRouteGroup('pesh',  peshCb  ? peshCb.checked  : true);
        toggleRouteGroup('water', waterCb ? waterCb.checked : true);
    } else {
        toggleRouteGroup('pesh',  false);
        toggleRouteGroup('water', false);
    }
}

function toggleRouteGroup(type, visible) {
    Object.entries(layerConfig).forEach(([key, config]) => {
        if (config.type === 'route' && config.routeType === type) {
            setLayerVisibility(key, visible);
        }
    });
}