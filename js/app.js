// ============================================================
// IIC AI Generator Team
// 6 modes + Server Boards + Auto-foldering
// ============================================================

const MAX_FILE_SIZE = 12 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1600;
const JPEG_QUALITY = 0.9;

// ============================================================
// MODE DEFINITIONS — prompts adapted from IIC AI PROMPT Notion
// ============================================================
// MODE DEFINITIONS — prompts adapted from IIC AI PROMPT Notion
// Master prompts for Nano Banana Pro
//
// BRAND_VOICE prepended to every prompt to anchor the model in
// TAMBURINS aesthetic. Source: https://www.tamburins.com/kr/
// ============================================================

const BRAND_VOICE = `Brand Anchor — TAMBURINS:
TAMBURINS is a Korean perfume brand operated by IIC (아이아이컴바인드), exploring "undefined beauty."
Aesthetic: editorial, minimal, sculptural, gallery-like. Soft luxurious materials (matte glass, brushed metal, satin ribbon, paper texture, suede, marble).
Color palette: muted naturals, dusty pastels (mint, blush, sand, soft gray), warm beige, deep brown, ivory.
Mood: quiet, refined, slightly poetic — never loud, never cute, never childish.
Collections: SUMMER TAILS (hair perfume + key comb), SUNSHINE (perfume hand + body), BLUE HINOKI (woody/musk), BOTTARI (perfume), EVENING GLOW (perfume hand shell).
Categories: Perfume, Hair perfume, Perfume balm, Perfume oil, Shell perfume hand, Egg lipbalm, Chain hand, Showery body, Car diffuser, Room fragrance, Perfume candle.

`;

const MODES = {
    'bg-replace': {
        id: 'bg-replace', label: '배경 교체', num: '01',
        needs: { product: 'required', reference: 'required', gwp: 'optional', package: 'optional', color: false },
        buildPrompt: (ctx) => `Use Image 1 as the absolute reference.

Lock Composition & Products:
Preserve the exact product position, scale, stacking order, spacing, and camera angle from Image 1.
Do NOT move, rotate, resize, crop, or redesign the products.
Product geometry, edges, proportions, orientation, and alignment must remain identical to Image 1.

Lighting & Shadows:
Match the original lighting direction, softness, and intensity from Image 1.
Preserve realistic contact shadows under the products.

Background Reconstruction (Image 2):
Analyze Image 2 for material, texture, surface quality, depth, and spatial feeling.
Do NOT copy only the color.
Use the texture, material character, and environmental mood of Image 2 to reconstruct a new background space that fits the camera angle and perspective of Image 1.
Remove all objects, people, props, furniture, text from Image 2.
Rebuild a clean, empty background environment inspired by Image 2.

Perspective Matching:
Adapt background planes to the camera height, horizon, and angle of Image 1.

Integration:
Harmonize background exposure, color temperature, and light interaction with the products.
Background should support the products without drawing attention.

Realism:
Photorealistic only. Natural reflections, realistic material response, correct scale.
No stylization, no illustration, no CGI artifacts.

Background Detail Enhancement:
Increase background texture resolution and material clarity subtly and realistically.
${packageBlock(ctx.hasPackage)}${gwpBlock(ctx.hasGWP)}
${ctx.additionalDirection ? `\nUser Direction:\n${ctx.additionalDirection}\n` : ''}
NEGATIVE: change composition, change angle, product redesign, different lighting direction, fake shadows, floating objects, cartoon, illustration, CGI look, AI artifacts, color-only background copy, flat backdrop, over-textured background, HDR look, hyper-detailed surfaces, background stealing attention${ctx.hasGWP ? ', GWP larger than or equal to main product, GWP competing with main product' : ''}.`
    },

    'bg-color': {
        id: 'bg-color', label: '배경 컬러', num: '02',
        needs: { product: 'required', reference: 'hidden', gwp: 'hidden', package: 'hidden', color: true },
        buildPrompt: (ctx) => `Use Image 1 as the absolute reference.

Target: change the background color to ${ctx.colorDescription || ctx.colorHex} (${ctx.colorHex}).

Lock All Objects:
Preserve the exact products, objects, props, positions, scale, spacing, and camera angle from Image 1.
Do NOT move, rotate, resize, crop, add, or remove anything.

Lighting & Shadows:
Preserve the original lighting setup from Image 1.
Do NOT change light direction, softness, intensity, or contrast.

Background Color Adjustment:
Change ONLY the background color to ${ctx.colorHex}${ctx.colorDescription ? ` (${ctx.colorDescription})` : ''}.
Do NOT change background texture, material, grain, or surface detail.
Apply a clean, even color shift that feels naturally photographed.

Integration:
Color temperature and exposure remain consistent with Image 1.
Products and objects must not be recolored or affected.

Realism:
Photorealistic only.
${ctx.additionalDirection ? `\nUser Direction:\n${ctx.additionalDirection}\n` : ''}
NEGATIVE: change composition, change angle, change lighting, change shadows, texture change, material change, recolor products or objects, gradient background, cartoon, illustration, CGI look.`
    },

    'perfume-angle': {
        id: 'perfume-angle', label: '앵글 변경', num: '03',
        needs: { product: 'required', reference: 'hidden', gwp: 'hidden', package: 'hidden', color: false },
        buildPrompt: (ctx) => `Use the uploaded image as the exact product reference.

Preserve the perfume bottle exactly as it is: same shape, proportions, logo placement, label text, cap design and color accuracy. Do not redesign or alter the product.

Change the camera angle to a slightly low angle looking upward from the surface level, making the product appear more premium and dominant.

Transform the image into a high-end professional studio product mood shot.

Enhance the textures of both the product and the background while keeping the same environment.

Background must remain the same wall and surface but upgraded with refined, premium textures.

Lighting should become high-end commercial studio lighting: soft directional key light, subtle rim light outlining the bottle silhouette, elegant reflections on the glass, controlled highlights, cinematic soft shadows.

The perfume glass should look luxurious and expensive with refined transparency, realistic refraction, premium reflections and high-end glass material rendering.

Ultra photorealistic commercial product photography, luxury fragrance advertising style.

8k realism, high-end studio photography.

Keep the original background color palette from the uploaded image.
Do not darken the environment.
Increase the overall brightness of the background while preserving the natural color and texture.
The background should appear softly lit and brighter, similar to a premium studio environment.
Avoid dramatic shadows on the wall.
Ensure the product remains the main focal point.
${ctx.additionalDirection ? `\nUser Direction (camera/mood preference):\n${ctx.additionalDirection}\n` : ''}
NEGATIVE: product redesign, label distortion, different bottle shape, recolor product, darken background, dramatic harsh shadows, plastic-looking glass, over-glossy CGI glass, cartoon, HDR look.`
    },

    'perfume-glass': {
        id: 'perfume-glass', label: '재질 강화', num: '04',
        needs: { product: 'required', reference: 'hidden', gwp: 'hidden', package: 'hidden', color: false },
        buildPrompt: (ctx) => `This is a subtle refinement task, not a redesign.

Use the original image as base.

Task: Enhance the glass material to a premium, photorealistic level while preserving everything else exactly.

[GLOBAL PRESERVATION — CRITICAL]
- keep original background, color tone, and overall mood exactly the same
- preserve composition, proportions, and layout
- do not change lighting balance

[BACKGROUND — LOCKED]
- maintain the exact background from the original image
- preserve color, brightness, and tone with no shift

[PRODUCT — DESIGN LOCK]
- keep product design, shape, and label exactly as is
- preserve all text, typography, and alignment
- no distortion or regeneration of text

[GLASS — PREMIUM MATERIAL ENHANCEMENT]
- enhance glass to ultra high-end, photorealistic quality
- improve clarity, transparency, and depth
- refine internal reflections and subtle refraction
- add clean, sharp edge highlights
- maintain natural realism (not overly glossy, not CGI-like)

[LIGHT INTERACTION]
- refine how light interacts with the glass surface
- subtle realistic reflections only
- no exaggerated highlights or artificial glow

[STRICT RULES]
- no redesign, no lighting change, no background change, no global restyling

[GOAL]
A premium, photorealistic luxury glass material while keeping the original image intact.
${ctx.additionalDirection ? `\n[USER DIRECTION]\n${ctx.additionalDirection}\n` : ''}
Avoid: changed design, distorted text, fake label, plastic-looking glass, over-glossy reflection, CGI look, unrealistic highlights, color shift, background change, lighting change, overprocessed.`
    },

    'ref-composition': {
        id: 'ref-composition', label: '구도 합성', num: '05',
        needs: { product: 'required', reference: 'required', gwp: 'optional', package: 'optional', color: false },
        buildPrompt: (ctx) => `Image 1 = locked product reference.
Image 2 = composition, mood, scene, and camera-reference image.

PRODUCT LOCK (Image 1):
Preserve the exact product identity from Image 1.
Keep the product design, silhouette, proportions, geometry, edges, label, branding, typography, colors, material category, surface character, and construction exactly the same as Image 1.
Do NOT redesign, restyle, or change the product color.
The final product must remain unmistakably the exact same product from Image 1.

REFERENCE COMPOSITION (Image 2):
Rebuild the final image using the shot logic of Image 2.
Match the composition, framing, crop logic, camera distance, lens feeling, perspective, scene structure, product placement style, environmental mood, and photographic intention of Image 2.
If Image 2 contains a product pose, interaction, or object relationship, recreate that same visual logic using the product from Image 1.

SCENE RECONSTRUCTION:
Use Image 2 as the blueprint for the final mood-cut scene.
Reconstruct the background, supporting elements, material atmosphere, light behavior, tonal balance, and scene depth based on Image 2.
Do not copy the exact product or brand from Image 2.
Replace the product/subject role in Image 2 with the exact product from Image 1.

INTEGRATION:
The product from Image 1 must be seamlessly integrated into the scene structure of Image 2.
Match the scale, grounding, contact, perspective, depth separation, reflections, shadow logic, and light interaction.
No floating product, no broken perspective, no fake intersection.

LIGHTING:
Follow the lighting mood, softness, direction, contrast behavior, highlight quality, and editorial feel of Image 2.
Preserve physically believable material response for the product from Image 1.

REALISM AND QUALITY:
Photorealistic only. Premium editorial beauty/product mood-cut. Natural high-end photography. Luxury commercial realism.
The result should look like a real premium campaign photograph, not AI-generated.

STRICT RULES:
Image 1 controls the product identity. Image 2 controls the shot composition, mood, and scene logic.
${packageBlock(ctx.hasPackage)}${gwpBlock(ctx.hasGWP)}
${ctx.additionalDirection ? `\nUser Direction:\n${ctx.additionalDirection}\n` : ''}
NEGATIVE: product redesign, label distortion, recolor product, generic substitute product, floating product, broken perspective, fake contact, collage look, copy of branded elements from Image 2, cartoon, illustration, CGI artifacts, AI-generated look, hyper-sharpness, HDR effect${ctx.hasGWP ? ', GWP larger than or equal to main product, GWP competing with main product' : ''}.`
    },

    'ref-creative': {
        id: 'ref-creative', label: '크리에이티브', num: '06',
        needs: { product: 'required', reference: 'required', gwp: 'optional', package: 'optional', color: false },
        buildPrompt: (ctx) => `Image 1 = absolute product identity reference.
Image 2 = composition, lighting, mood-cut, and scene-reference image.

PRODUCT IDENTITY LOCK (Image 1):
Preserve the exact product from Image 1: same design, silhouette, proportions, geometry, edges, label, branding, typography, material category, finish family, surface character, and most importantly the same original product colors.
Do NOT redesign, recolor, or restyle. Do NOT simplify or replace product details. Do NOT change the brand identity.
The final product must remain unmistakably the exact same product from Image 1.

CREATIVE MOOD-CUT REINTERPRETATION (Image 2):
Use Image 2 not just as a background reference, but as the full visual language for the final shot.
Follow the composition logic, framing style, crop feeling, camera distance, perspective, scene mood, editorial intention, spatial depth, supporting environment, and photographic atmosphere of Image 2.

Rebuild a new scene inspired by Image 2 for the product from Image 1.
Allow a creative premium mood-cut interpretation. Use the environmental styling, material mood, spatial feeling, prop logic, and visual rhythm of Image 2 to stage the product in a refined, editorial way.

If Image 2 contains objects, surfaces, props, supports, gestures, or product interactions, translate those into a scene that works naturally with the exact product from Image 1.
Do not copy irrelevant branded elements literally.
Recreate the visual logic and mood of Image 2 in a believable, high-end photographic way.

COMPOSITION & CAMERA:
Use the compositional language of Image 2: framing, crop logic, camera height, distance, lens feeling, negative space behavior, and viewpoint style.

PRODUCT INTEGRATION:
Integrate the product from Image 1 naturally into the reconstructed scene from Image 2.
Match scale, grounding, support, perspective, reflections, contact shadows, depth separation.
No floating product, no broken perspective, no forced collage effect.

LIGHTING (Match Image 2):
Lighting direction, softness, shadow character, contrast level, highlight behavior, color temperature, and mood follow Image 2.
Relight the product from Image 1 naturally so it feels photographed under the same lighting conditions.

BACKGROUND & ENVIRONMENT:
Reconstruct the full background and environmental mood from Image 2 in a natural, photoreal way.
Do not use a flat copied backdrop. Build real spatial depth, real surface continuity.
Background and props should support the product and mood, but the product must remain the hero.

REALISM:
Photorealistic only. Premium editorial product photography. Natural high-end mood-cut realism. Luxury campaign quality.
The final result should look like a real premium campaign photograph, not an AI-generated image.

STRICT RULES:
Image 1 controls the exact product identity. Image 2 controls the mood-cut language.
Do not change the original product color from Image 1. Do not produce a generic substitute product.
${packageBlock(ctx.hasPackage)}${gwpBlock(ctx.hasGWP)}
${ctx.additionalDirection ? `\nUser Direction:\n${ctx.additionalDirection}\n` : ''}
NEGATIVE: product redesign, label distortion, recolor product, generic substitute product, floating product, broken perspective, fake contact, collage look, copy of branded elements from Image 2, cartoon, illustration, CGI artifacts, AI-generated look, hyper-sharpness, HDR effect${ctx.hasGWP ? ', GWP larger than or equal to main product, GWP competing with main product' : ''}.`
    }
};

function packageBlock(hasPackage) {
    if (!hasPackage) return '';
    return `
Package Composition (box + ribbon):
A package composition image is provided as an additional reference.
Preserve the exact package design — the box shape, the ribbon style/color/material, the brand mark, all printed details.
The package sits alongside the main product as part of the staged composition, naturally positioned and lit consistent with the scene.
Do NOT redesign the package or substitute it.
`;
}

function gwpBlock(hasGWP) {
    if (!hasGWP) return '';
    return `
GWP (Gift-With-Purchase) Object:
A GWP object image is provided.
The GWP is a SUPPORTING element, NOT the hero.
Place it smaller than the main product, positioned to the side or behind, with clearly reduced visual weight.
The MAIN product must remain the unmistakable focal point.
GWP scale should be roughly 30-50% of the main product's visual size.
Preserve the GWP's own material and shape faithfully.
`;
}

// ============================================================
// STATE
// ============================================================
const state = {
    mode: 'ref-composition',
    identity: {
        productName: '',
        additionalItem: ''
    },
    library: {
        activeTab: 'product-official',
        searchQuery: '',
        data: {
            'product-official': [],
            'product-draft': [],
            'package': [],
            'gwp': [],
            'reference-thumbnails': []
        }
    },
    canvas: {
        background: 'studio',     // 'studio' | 'solid'
        solidColor: '#ffffff',    // RGB hex for solid mode
        aspect: '1:1',
        floorPct: 40,
        items: [],
        selectedId: null,
        nextZ: 1,
        nextItemId: 1
    },
    uploads: {
        backgroundReference: null,
        productOverride: null
    },
    color: { hex: '#cce8d6', description: '' },
    options: { resolution: '2k', variations: 1, additionalDirection: '' },
    results: []
};

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 IIC AI Generator — Studio Canvas + 6 modes');
    initNavigation();
    initModeSelector();
    initIdentityInputs();
    initBrowserTabs();
    initBrowserSearch();
    initCanvas();
    initFloorHandle();
    initAspectDropdown();
    initUploads();
    initOptions();
    initDirectionTextarea();
    initColorPicker();
    initGenerate();
    initDownloadAll();
    initOverviewModal();
    await loadBoardData();
    applyMode(state.mode);
    renderBrowser(state.library.activeTab);
    updateCanvasStatus();
    updateDock();
    updateAutoNamePreview();

    // Canvas hint labels (wall/floor) — always visible when canvas is empty.
    // CSS handles fade-out via .has-items class when items are added.

    // First-visit overview modal
    try {
        if (!localStorage.getItem('iic_overview_seen')) {
            setTimeout(() => {
                openOverviewModal('diagram');
                localStorage.setItem('iic_overview_seen', '1');
            }, 600);
        }
    } catch (_) {}
});

// ========== OVERVIEW MODAL ==========
function initOverviewModal() {
    const modal = document.getElementById('overview-modal');
    if (!modal) return;
    document.getElementById('overview-btn')?.addEventListener('click', () => openOverviewModal('diagram'));
    document.querySelectorAll('[data-open-overview]').forEach(el => {
        el.addEventListener('click', () => {
            const target = el.dataset.overviewTarget || 'diagram';
            openOverviewModal(target);
        });
    });
    document.querySelectorAll('[data-close-overview]').forEach(el => {
        el.addEventListener('click', closeOverviewModal);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) closeOverviewModal();
    });

    // Tab switching inside modal
    document.querySelectorAll('.overview-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            switchOverviewTab(tab.dataset.overviewTab);
        });
    });
}

function switchOverviewTab(target) {
    document.querySelectorAll('.overview-tab').forEach(t =>
        t.classList.toggle('active', t.dataset.overviewTab === target));
    document.querySelectorAll('.overview-tab-panel').forEach(p =>
        p.hidden = p.dataset.overviewPanel !== target);
}

function openOverviewModal(tab) {
    const modal = document.getElementById('overview-modal');
    if (!modal) return;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (tab) switchOverviewTab(tab);
}
function closeOverviewModal() {
    const modal = document.getElementById('overview-modal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

// ========== NAV ==========
function initNavigation() {
    const navNumbers = document.querySelectorAll('.nav-number');
    navNumbers.forEach(nav => {
        nav.addEventListener('click', () => {
            const sec = document.querySelector(`section[data-section="${nav.dataset.section}"]`);
            if (!sec) return;
            const top = sec.getBoundingClientRect().top + window.pageYOffset - 76;
            window.scrollTo({ top, behavior: 'smooth' });
        });
    });
    const observer = new IntersectionObserver((entries) => {
        let best = null;
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
        });
        if (!best) return;
        navNumbers.forEach(n => n.classList.toggle('active', n.dataset.section === best.target.dataset.section));
    }, { threshold: [0.2, 0.4, 0.6] });
    document.querySelectorAll('section[data-section]').forEach(s => observer.observe(s));
}

// ========== MODE SELECTOR ==========
function initModeSelector() {
    document.querySelectorAll('.mode-card').forEach(card => {
        card.addEventListener('click', () => applyMode(card.dataset.mode));
    });
}

function applyMode(modeId) {
    if (!MODES[modeId]) return;
    state.mode = modeId;
    const mode = MODES[modeId];

    document.querySelectorAll('.mode-card').forEach(c => {
        c.classList.toggle('active', c.dataset.mode === modeId);
    });

    const needs = mode.needs;
    const refBox = document.querySelector('[data-role="reference"]');
    const productOverrideBox = document.querySelector('[data-role="product-override"]');
    const colorRow = document.getElementById('color-row');
    const studio = document.querySelector('.studio');

    if (refBox) refBox.classList.toggle('hidden-by-mode', needs.reference === 'hidden');
    if (productOverrideBox) productOverrideBox.classList.toggle('hidden-by-mode', needs.product === 'hidden');
    if (colorRow) colorRow.hidden = !needs.color;

    // Single-product modes (02/03/04) don't need composition studio
    const singleProductModes = new Set(['bg-color', 'perfume-angle', 'perfume-glass']);
    if (studio) studio.classList.toggle('hidden-by-mode', singleProductModes.has(modeId));

    const refLabel = document.getElementById('reference-label');
    const refDesc = document.getElementById('reference-desc');
    const refTag = document.getElementById('reference-tag');
    const labels = {
        'bg-replace': { tag: 'BACKGROUND', label: 'Background Reference', desc: '재구성할 배경의 무드·재질·공간감 기준. 색만 복사하지 않고 새 배경 공간을 다시 만듭니다.' },
        'ref-composition': { tag: 'COMPOSITION', label: 'Composition Reference', desc: '원하는 구도·프레이밍·카메라 무드. 제품은 락한 채로 이 레퍼런스의 시각언어로 재촬영합니다.' },
        'ref-creative': { tag: 'CREATIVE', label: 'Creative Reference', desc: '구도·색감·연출 전체 기준. 제품 정체성은 유지한 채 자유롭게 재해석합니다.' }
    };
    const cfg = labels[modeId];
    if (cfg && refTag && refLabel && refDesc) {
        refTag.textContent = cfg.tag;
        refLabel.textContent = cfg.label;
        refDesc.textContent = cfg.desc;
    }

    const dockTag = document.getElementById('dock-mode-tag');
    if (dockTag) dockTag.textContent = `${mode.num} · ${mode.label}`;

    updateDock();
    updateAutoNamePreview();
}

// ========== IDENTITY ==========
function initIdentityInputs() {
    document.getElementById('product-name')?.addEventListener('input', (e) => {
        state.identity.productName = e.target.value.trim();
        updateAutoNamePreview();
    });
    document.getElementById('additional-item')?.addEventListener('input', (e) => {
        state.identity.additionalItem = e.target.value.trim();
    });
}

function updateAutoNamePreview() {
    const el = document.getElementById('auto-name-preview');
    if (!el) return;
    el.textContent = buildFolderName() + '/';
}

function sanitize(str) {
    return String(str || '').replace(/[^a-zA-Z0-9가-힣]+/g, '').substring(0, 40);
}

function buildFolderName() {
    const product = sanitize(state.identity.productName) || 'product';
    const pkg = findCanvasItemByBoard('package');
    const pkgName = pkg ? sanitize(pkg.label) : '';
    return pkgName ? `${product}_${pkgName}` : product;
}

function buildAutoName({ index = 1 } = {}) {
    const product = sanitize(state.identity.productName) || 'product';
    const pkg = findCanvasItemByBoard('package');
    const pkgName = pkg ? sanitize(pkg.label) : '';
    const gwp = findCanvasItemByBoard('gwp');
    const item = sanitize(state.identity.additionalItem);
    const modeNum = MODES[state.mode]?.num || '';

    const parts = [product];
    if (pkgName) parts.push(pkgName);
    if (gwp) parts.push('GWP');
    if (item) parts.push(item);
    if (modeNum) parts.push(`M${modeNum}`);
    if (state.options.variations > 1) parts.push(String(index).padStart(2, '0'));
    return parts.join('_');
}

function findCanvasItemByBoard(boardId) {
    return state.canvas.items.find(it => it.board === boardId);
}

// ========== BOARD DATA (server library) ==========
async function loadBoardData() {
    try {
        const response = await fetch('/api/boards');
        if (response.ok) {
            const data = await response.json();
            if (data?.boards) {
                state.library.data = { ...state.library.data, ...data.boards };
                console.log('📦 Loaded board data from /api/boards');
                return;
            }
        }
    } catch (e) {
        console.log('⚠️ /api/boards unavailable — empty library');
    }
}

// ========== BROWSER ==========
function initBrowserTabs() {
    document.querySelectorAll('.browser-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            state.library.activeTab = tab.dataset.board;
            document.querySelectorAll('.browser-tab').forEach(t => {
                t.classList.toggle('active', t.dataset.board === tab.dataset.board);
            });
            renderBrowser(tab.dataset.board);
        });
    });
}

function initBrowserSearch() {
    document.getElementById('browser-search-input')?.addEventListener('input', (e) => {
        state.library.searchQuery = e.target.value.trim().toLowerCase();
        renderBrowser(state.library.activeTab);
    });
}

function renderBrowser(boardId) {
    const grid = document.getElementById('browser-grid');
    const empty = document.getElementById('browser-empty');
    if (!grid || !empty) return;
    grid.innerHTML = '';

    let items = state.library.data[boardId] || [];

    // Filter by search query
    if (state.library.searchQuery) {
        const q = state.library.searchQuery;
        items = items.filter(it => {
            const hay = `${it.label || ''} ${it.id || ''} ${(it.tags || []).join(' ')}`.toLowerCase();
            return hay.includes(q);
        });
    }

    if (items.length === 0) {
        grid.style.display = 'none';
        empty.hidden = false;
        const emptyP = empty.querySelector('p');
        if (state.library.searchQuery) {
            emptyP.textContent = `"${state.library.searchQuery}" 검색 결과가 없습니다.`;
        } else if (boardId === 'product-official') {
            emptyP.textContent = '공식 누끼 카테고리가 비어있습니다. 서버에 자산이 등록되면 표시됩니다.';
        } else if (boardId === 'product-draft') {
            emptyP.textContent = '임시 누끼가 아직 없습니다.';
        } else if (boardId === 'package') {
            emptyP.textContent = '패키지 자산이 아직 없습니다.';
        } else if (boardId === 'gwp') {
            emptyP.textContent = 'GWP 자산이 아직 없습니다.';
        } else if (boardId === 'reference-thumbnails') {
            emptyP.textContent = '기존 캠페인 썸네일이 아직 없습니다.';
        } else {
            emptyP.textContent = '이 카테고리는 비어있습니다.';
        }
        return;
    }

    grid.style.display = '';
    empty.hidden = true;

    items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'browser-item';
        el.title = `${item.label} — 클릭해서 캔버스에 추가`;

        const img = document.createElement('img');
        img.className = 'browser-item-img';
        img.src = item.thumbnail || item.dataUrl;
        img.alt = item.label;
        img.loading = 'lazy';
        el.appendChild(img);

        if (boardId === 'product-official' || boardId === 'product-draft') {
            const tier = document.createElement('div');
            tier.className = `browser-item-tier ${boardId === 'product-official' ? 'official' : 'draft'}`;
            tier.textContent = boardId === 'product-official' ? 'OFFICIAL' : 'DRAFT';
            el.appendChild(tier);
        } else if (boardId === 'reference-thumbnails') {
            const tier = document.createElement('div');
            tier.className = 'browser-item-tier ref';
            tier.textContent = 'REF';
            el.appendChild(tier);
        }

        const label = document.createElement('div');
        label.className = 'browser-item-label';
        label.textContent = item.label || item.id;
        el.appendChild(label);

        const add = document.createElement('div');
        add.className = 'browser-item-add';
        add.textContent = '+';
        el.appendChild(add);

        el.addEventListener('click', () => addCanvasItem({ ...item, board: boardId }));
        grid.appendChild(el);
    });
}

// ========== CANVAS ==========
function initCanvas() {
    const stage = document.getElementById('canvas-stage');
    const bgOptions = document.getElementById('bg-options');
    const colorInput = document.getElementById('bg-color-input');

    // Background switcher
    document.querySelectorAll('.bg-option').forEach(btn => {
        btn.addEventListener('click', () => {
            const bg = btn.dataset.bg;
            state.canvas.background = bg;
            document.querySelectorAll('.bg-option').forEach(b => b.classList.toggle('active', b === btn));
            if (stage) stage.setAttribute('data-bg', bg);
            if (bgOptions) bgOptions.classList.toggle('solid-mode', bg === 'solid');
            // Apply current solid color when entering solid mode
            if (bg === 'solid' && stage) {
                stage.style.setProperty('--solid-bg', state.canvas.solidColor);
            }
            updateCanvasStatus();
        });
    });

    // Color picker
    if (colorInput) {
        colorInput.addEventListener('input', (e) => {
            const hex = e.target.value;
            state.canvas.solidColor = hex;
            const preview = document.getElementById('bg-solid-preview');
            if (preview) preview.style.setProperty('--solid-bg', hex);
            if (stage && state.canvas.background === 'solid') {
                stage.style.setProperty('--solid-bg', hex);
            }
            updateCanvasStatus();
        });
    }

    // Clear button
    document.getElementById('canvas-clear')?.addEventListener('click', () => {
        if (state.canvas.items.length === 0) return;
        if (confirm('캔버스의 모든 자산을 제거하시겠습니까?')) {
            state.canvas.items = [];
            state.canvas.selectedId = null;
            renderCanvas();
            updateCanvasStatus();
            updateAutoNamePreview();
            updateDock();
        }
    });

    // Deselect on canvas empty area
    document.getElementById('canvas-stage')?.addEventListener('mousedown', (e) => {
        if (e.target.id === 'canvas-stage' ||
            e.target.classList.contains('canvas-bg') ||
            e.target.classList.contains('canvas-floor') ||
            e.target.classList.contains('canvas-items')) {
            state.canvas.selectedId = null;
            renderCanvas();
        }
    });
}

// Aspect dropdown
function initAspectDropdown() {
    const dropdown = document.getElementById('aspect-dropdown');  // <details>
    const trigger = document.getElementById('aspect-trigger');    // <summary>
    const menu = document.getElementById('aspect-menu');
    const current = document.getElementById('aspect-current');
    if (!dropdown || !trigger || !menu || !current) {
        console.warn('[ASPECT] elements missing');
        return;
    }
    console.log('[ASPECT] init with <details>');

    // Native <details> handles open/close. We just need:
    // 1. Outside-click to close (native doesn't do this)
    // 2. Item selection closes
    // 3. ESC to close

    // Outside click — capture phase mousedown
    document.addEventListener('mousedown', (e) => {
        if (!dropdown.open) return;
        if (dropdown.contains(e.target)) return;
        dropdown.removeAttribute('open');
    }, true);

    // ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dropdown.open) {
            dropdown.removeAttribute('open');
        }
    });

    // Item selection
    document.querySelectorAll('.aspect-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const aspect = item.dataset.aspect;
            state.canvas.aspect = aspect;
            current.textContent = aspect;
            document.querySelectorAll('.aspect-item').forEach(i => i.classList.toggle('active', i === item));
            const stage = document.getElementById('canvas-stage');
            if (stage) stage.setAttribute('data-aspect', aspect);
            dropdown.removeAttribute('open');
            updateCanvasStatus();
        });
    });

    // Sync .open class with [open] attribute for CSS chevron rotation
    dropdown.addEventListener('toggle', () => {
        dropdown.classList.toggle('open', dropdown.open);
    });
}

// Floor handle — drag wall/floor boundary
function initFloorHandle() {
    const handle = document.getElementById('floor-handle');
    const stage = document.getElementById('canvas-stage');
    if (!handle || !stage) return;

    handle.addEventListener('mousedown', (e) => {
        if (state.canvas.background !== 'studio') return;
        e.preventDefault();
        handle.classList.add('dragging');

        const stageRect = stage.getBoundingClientRect();
        function onMove(ev) {
            // floor-pct = bottom area height %
            const offsetY = ev.clientY - stageRect.top;
            let pct = ((stageRect.height - offsetY) / stageRect.height) * 100;
            pct = Math.max(10, Math.min(80, pct));
            state.canvas.floorPct = pct;
            stage.style.setProperty('--floor-pct', `${pct}%`);
        }
        function onUp() {
            handle.classList.remove('dragging');
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        }
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    });
}

function addCanvasItem(asset) {
    const stage = document.getElementById('canvas-stage');
    if (!stage) return;

    const newItem = {
        id: `item-${state.canvas.nextItemId++}`,
        assetId: asset.id,
        board: asset.board,
        label: asset.label,
        src: asset.dataUrl || asset.thumbnail,
        xPct: 35 + Math.random() * 10,
        yPct: 30 + Math.random() * 10,
        wPct: 30,
        hPct: 30,
        rotation: 0,
        z: state.canvas.nextZ++,
        // Alpha bbox — computed async after image loads
        bbox: null
    };
    state.canvas.items.push(newItem);
    state.canvas.selectedId = newItem.id;
    renderCanvas();
    updateCanvasStatus();
    updateAutoNamePreview();
    updateDock();
    toast(`${asset.label} 추가됨`);

    // Compute alpha bbox in background — when ready, re-render to fit selection box
    computeAlphaBBox(newItem.src).then(bbox => {
        if (bbox) {
            newItem.bbox = bbox;
            renderCanvas();
        }
    }).catch(() => {});

    // Canvas hint labels auto-fade via CSS .has-items selector — no JS needed
}

/**
 * Compute the tight bounding box of non-transparent pixels in an image.
 * Returns {left, top, right, bottom} as ratios (0..1) relative to image dims,
 * or null on error / for opaque images (where bbox = full image).
 */
function computeAlphaBBox(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onerror = () => resolve(null);
        img.onload = () => {
            try {
                const W = img.naturalWidth;
                const H = img.naturalHeight;
                if (!W || !H) { resolve(null); return; }

                const cnv = document.createElement('canvas');
                cnv.width = W;
                cnv.height = H;
                const ctx = cnv.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const data = ctx.getImageData(0, 0, W, H).data;

                let minX = W, minY = H, maxX = -1, maxY = -1;
                let hasAlpha = false;

                for (let y = 0; y < H; y++) {
                    for (let x = 0; x < W; x++) {
                        const a = data[(y * W + x) * 4 + 3];
                        if (a > 10) {
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                        }
                        if (a < 250) hasAlpha = true;
                    }
                }

                // No alpha at all (opaque image) — selection box = full image
                if (!hasAlpha || maxX < 0) { resolve(null); return; }

                // Pad more generously so handles sit outside the product itself
                // (5% of dimensions) — gives drag area inside the product
                const padX = W * 0.05;
                const padY = H * 0.05;
                resolve({
                    left:   Math.max(0, (minX - padX) / W),
                    top:    Math.max(0, (minY - padY) / H),
                    right:  Math.min(1, (maxX + padX) / W),
                    bottom: Math.min(1, (maxY + padY) / H)
                });
            } catch (e) {
                resolve(null);
            }
        };
        img.src = src;
    });
}

function renderCanvas() {
    const container = document.getElementById('canvas-items');
    const stage = document.getElementById('canvas-stage');
    if (!container || !stage) return;

    container.innerHTML = '';
    stage.classList.toggle('has-items', state.canvas.items.length > 0);

    state.canvas.items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'canvas-item';
        if (state.canvas.selectedId === item.id) el.classList.add('selected');
        el.dataset.itemId = item.id;
        el.style.left = `${item.xPct}%`;
        el.style.top = `${item.yPct}%`;
        el.style.width = `${item.wPct}%`;
        el.style.height = `${item.hPct}%`;
        el.style.transform = `rotate(${item.rotation}deg)`;
        el.style.zIndex = item.z;

        const img = document.createElement('img');
        img.className = 'canvas-item-img';
        img.src = item.src;
        img.alt = item.label;
        img.draggable = false;
        el.appendChild(img);

        // Selection overlay — sized to alpha bbox if available, else full item
        const overlay = document.createElement('div');
        overlay.className = 'canvas-item-overlay';
        if (item.bbox) {
            const b = item.bbox;
            overlay.style.left = `${b.left * 100}%`;
            overlay.style.top = `${b.top * 100}%`;
            overlay.style.right = `${(1 - b.right) * 100}%`;
            overlay.style.bottom = `${(1 - b.bottom) * 100}%`;
        } else {
            overlay.style.inset = '0';
        }
        el.appendChild(overlay);

        ['nw', 'ne', 'sw', 'se'].forEach(corner => {
            const h = document.createElement('div');
            h.className = `canvas-item-handle h-${corner}`;
            h.dataset.corner = corner;
            overlay.appendChild(h);
        });

        const rot = document.createElement('div');
        rot.className = 'canvas-item-rotate';
        rot.title = '회전 (Shift 누르면 15도 스냅)';
        overlay.appendChild(rot);

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'canvas-item-delete';
        del.innerHTML = '×';
        del.title = '제거';
        del.addEventListener('click', (e) => {
            e.stopPropagation();
            removeCanvasItem(item.id);
        });
        overlay.appendChild(del);

        attachItemInteractions(el, item);
        container.appendChild(el);
    });
}

function removeCanvasItem(itemId) {
    state.canvas.items = state.canvas.items.filter(it => it.id !== itemId);
    if (state.canvas.selectedId === itemId) state.canvas.selectedId = null;
    renderCanvas();
    updateCanvasStatus();
    updateAutoNamePreview();
    updateDock();
}

function attachItemInteractions(el, item) {
    const stage = document.getElementById('canvas-stage');
    if (!stage) return;

    // Drag
    el.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('canvas-item-handle')) return;
        if (e.target.classList.contains('canvas-item-rotate')) return;
        if (e.target.classList.contains('canvas-item-delete')) return;
        e.preventDefault();
        state.canvas.selectedId = item.id;
        item.z = state.canvas.nextZ++;
        renderCanvas();

        const stageRect = stage.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const startXPct = item.xPct;
        const startYPct = item.yPct;
        function onMove(ev) {
            const dx = ((ev.clientX - startX) / stageRect.width) * 100;
            const dy = ((ev.clientY - startY) / stageRect.height) * 100;
            // Allow items to go well past canvas edges (designers often crop products at edges)
            item.xPct = Math.max(-item.wPct + 5, Math.min(100 - 5, startXPct + dx));
            item.yPct = Math.max(-item.hPct + 5, Math.min(100 - 5, startYPct + dy));
            const liveEl = stage.querySelector(`[data-item-id="${item.id}"]`);
            if (liveEl) {
                liveEl.style.left = `${item.xPct}%`;
                liveEl.style.top = `${item.yPct}%`;
            }
        }
        function onUp() {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        }
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    });

    // Resize
    el.querySelectorAll('.canvas-item-handle').forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            state.canvas.selectedId = item.id;
            const stageRect = stage.getBoundingClientRect();
            const startX = e.clientX;
            const startY = e.clientY;
            const startW = item.wPct;
            const startH = item.hPct;
            const startXPct = item.xPct;
            const startYPct = item.yPct;
            const corner = handle.dataset.corner;
            const aspectRatio = item.wPct / item.hPct;
            function onMove(ev) {
                const dx = ((ev.clientX - startX) / stageRect.width) * 100;
                const dy = ((ev.clientY - startY) / stageRect.height) * 100;
                let newW = startW, newH = startH;
                let newX = startXPct, newY = startYPct;
                const keepAspect = !ev.shiftKey;
                if (corner === 'se') {
                    newW = Math.max(5, startW + dx);
                    newH = keepAspect ? newW / aspectRatio : Math.max(5, startH + dy);
                } else if (corner === 'sw') {
                    newW = Math.max(5, startW - dx);
                    newH = keepAspect ? newW / aspectRatio : Math.max(5, startH + dy);
                    newX = startXPct + (startW - newW);
                } else if (corner === 'ne') {
                    newW = Math.max(5, startW + dx);
                    newH = keepAspect ? newW / aspectRatio : Math.max(5, startH - dy);
                    newY = startYPct + (startH - newH);
                } else if (corner === 'nw') {
                    newW = Math.max(5, startW - dx);
                    newH = keepAspect ? newW / aspectRatio : Math.max(5, startH - dy);
                    newX = startXPct + (startW - newW);
                    newY = startYPct + (startH - newH);
                }
                item.wPct = newW; item.hPct = newH;
                item.xPct = newX; item.yPct = newY;
                const liveEl = stage.querySelector(`[data-item-id="${item.id}"]`);
                if (liveEl) {
                    liveEl.style.width = `${item.wPct}%`;
                    liveEl.style.height = `${item.hPct}%`;
                    liveEl.style.left = `${item.xPct}%`;
                    liveEl.style.top = `${item.yPct}%`;
                }
            }
            function onUp() {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
            }
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        });
    });

    // Rotate
    el.querySelector('.canvas-item-rotate')?.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        state.canvas.selectedId = item.id;
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
        const startRotation = item.rotation;
        function onMove(ev) {
            const currentAngle = Math.atan2(ev.clientY - centerY, ev.clientX - centerX) * 180 / Math.PI;
            let newRot = startRotation + (currentAngle - startAngle);
            if (ev.shiftKey) newRot = Math.round(newRot / 15) * 15;
            item.rotation = newRot;
            const liveEl = stage.querySelector(`[data-item-id="${item.id}"]`);
            if (liveEl) liveEl.style.transform = `rotate(${item.rotation}deg)`;
        }
        function onUp() {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        }
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    });
}

function updateCanvasStatus() {
    const count = document.getElementById('canvas-count');
    const info = document.getElementById('canvas-info');
    if (count) count.textContent = `${state.canvas.items.length}개 배치됨`;
    if (info) {
        let bgName;
        if (state.canvas.background === 'studio') bgName = '스튜디오';
        else if (state.canvas.background === 'solid') bgName = `단일 ${state.canvas.solidColor.toUpperCase()}`;
        else bgName = state.canvas.background;
        info.textContent = `${state.canvas.aspect} · ${bgName}`;
    }
}

// Rasterize canvas → PNG dataURL (sent to backend as composition_guide)
async function rasterizeCanvas() {
    const stage = document.getElementById('canvas-stage');
    if (!stage || state.canvas.items.length === 0) return null;

    // Compute target export size from aspect
    const aspectMap = { '1:1': [1, 1], '4:5': [4, 5], '16:9': [16, 9], '21:9': [21, 9] };
    const [aw, ah] = aspectMap[state.canvas.aspect] || [1, 1];
    const longest = 1280;
    let W, H;
    if (aw >= ah) {
        W = longest;
        H = Math.round(longest * ah / aw);
    } else {
        H = longest;
        W = Math.round(longest * aw / ah);
    }

    const cnv = document.createElement('canvas');
    cnv.width = W;
    cnv.height = H;
    const ctx = cnv.getContext('2d');

    // Background
    if (state.canvas.background === 'studio') {
        const floorH = (state.canvas.floorPct / 100) * H;
        const wallH = H - floorH;
        const wallGrad = ctx.createLinearGradient(0, 0, 0, wallH);
        wallGrad.addColorStop(0, '#ffffff');
        wallGrad.addColorStop(1, '#f6f6f6');
        ctx.fillStyle = wallGrad;
        ctx.fillRect(0, 0, W, wallH);
        const floorGrad = ctx.createLinearGradient(0, wallH, 0, H);
        floorGrad.addColorStop(0, '#c8c8c8');
        floorGrad.addColorStop(1, '#b0b0b0');
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, wallH, W, floorH);
    } else if (state.canvas.background === 'solid') {
        ctx.fillStyle = state.canvas.solidColor;
        ctx.fillRect(0, 0, W, H);
    } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
    }

    const sorted = [...state.canvas.items].sort((a, b) => a.z - b.z);
    const imgs = await Promise.all(sorted.map(item => loadImage(item.src)));

    sorted.forEach((item, idx) => {
        const img = imgs[idx];
        if (!img) return;
        const x = (item.xPct / 100) * W;
        const y = (item.yPct / 100) * H;
        const w = (item.wPct / 100) * W;
        const h = (item.hPct / 100) * H;
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate(item.rotation * Math.PI / 180);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
    });

    return cnv.toDataURL('image/png');
}

function loadImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

// ========== UPLOADS ==========
function initUploads() {
    initSingleUpload('backgroundReference');
    initSingleUpload('productOverride');

    document.querySelectorAll('.upload-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            event.preventDefault();
            const input = document.getElementById(button.dataset.target);
            if (input) input.click();
        });
    });
}

function initSingleUpload(type) {
    const input = document.getElementById(`upload-${type}`);
    const preview = document.getElementById(`preview-${type}`);
    const box = document.querySelector(`[data-upload="${type}"]`);
    const status = document.getElementById(`status-${type}`);
    if (!input || !box) return;

    box.addEventListener('click', (event) => {
        if (event.target.closest('.upload-btn')) return;
        input.click();
    });

    input.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        await handleSingleImage(file, type, preview, box, status);
        input.value = '';
    });

    attachDragAndDrop(box, async (files) => {
        if (files[0]) await handleSingleImage(files[0], type, preview, box, status);
    });
}

async function handleSingleImage(file, type, preview, box, status) {
    try {
        validateImageFile(file);
        const dataUrl = await resizeImageToDataUrl(file);
        state.uploads[type] = dataUrl;
        if (preview) preview.style.backgroundImage = `url(${dataUrl})`;
        box.classList.add('has-image');
        if (status) { status.textContent = 'LOADED'; status.classList.add('filled'); }
        toast(`업로드 완료`);

        // Draft cutout auto-adds to canvas
        if (type === 'productOverride') {
            addCanvasItem({
                id: `upload-${Date.now()}`,
                board: 'product-upload',
                label: file.name.replace(/\.[^.]+$/, '') || 'Custom Draft',
                dataUrl: dataUrl,
                thumbnail: dataUrl
            });
        }
        updateDock();
    } catch (error) {
        toast(error.message, 'error');
        console.error(error);
    }
}

function attachDragAndDrop(box, onDropFiles) {
    box.addEventListener('dragover', (e) => { e.preventDefault(); box.classList.add('drag-over'); });
    box.addEventListener('dragleave', () => box.classList.remove('drag-over'));
    box.addEventListener('drop', async (e) => {
        e.preventDefault();
        box.classList.remove('drag-over');
        await onDropFiles(e.dataTransfer.files);
    });
}

function validateImageFile(file) {
    if (!file.type.startsWith('image/')) throw new Error('이미지 파일만 업로드 가능합니다');
    if (file.size > MAX_FILE_SIZE) throw new Error('파일 크기는 12MB 이하여야 합니다');
}

function resizeImageToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('파일을 읽지 못했습니다'));
        reader.onload = (event) => {
            const img = new Image();
            img.onerror = () => reject(new Error('이미지를 처리할 수 없습니다'));
            img.onload = () => {
                const { width, height } = fitWithinBounds(img.width, img.height, MAX_IMAGE_EDGE, MAX_IMAGE_EDGE);
                const canvas = document.createElement('canvas');
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function fitWithinBounds(w, h, mw, mh) {
    if (w <= mw && h <= mh) return { width: w, height: h };
    const r = Math.min(mw / w, mh / h);
    return { width: Math.round(w * r), height: Math.round(h * r) };
}

// ========== OPTIONS ==========
function initOptions() {
    document.querySelectorAll('input[name="resolution"]').forEach(r =>
        r.addEventListener('change', (e) => { state.options.resolution = e.target.value; }));
    document.querySelectorAll('input[name="variation"]').forEach(r =>
        r.addEventListener('change', (e) => {
            state.options.variations = Number(e.target.value);
            updateAutoNamePreview();
        }));
}

function initDirectionTextarea() {
    const compactInput = document.getElementById('dock-direction-input');
    const fullTextarea = document.getElementById('additional-direction');
    const counter = document.getElementById('direction-count');

    function syncFromCompact() {
        if (!compactInput) return;
        const v = compactInput.value;
        state.options.additionalDirection = v.trim();
        if (fullTextarea && fullTextarea.value !== v) fullTextarea.value = v;
        if (counter) counter.textContent = `${v.length} / 400`;
    }
    function syncFromFull() {
        if (!fullTextarea) return;
        const v = fullTextarea.value;
        state.options.additionalDirection = v.trim();
        if (compactInput && compactInput.value !== v) compactInput.value = v;
        if (counter) counter.textContent = `${v.length} / 400`;
    }

    if (compactInput) compactInput.addEventListener('input', syncFromCompact);
    if (fullTextarea) fullTextarea.addEventListener('input', syncFromFull);

    // Expand/collapse dock
    const expandBtn = document.getElementById('dock-expand-btn');
    const expanded = document.getElementById('dock-expanded');
    const dock = document.getElementById('generate-dock');
    if (expandBtn && expanded && dock) {
        expandBtn.addEventListener('click', () => {
            const isHidden = expanded.hidden;
            expanded.hidden = !isHidden;
            dock.classList.toggle('expanded', isHidden);
            if (isHidden && fullTextarea) {
                setTimeout(() => fullTextarea.focus(), 100);
            }
        });
    }
}

function initColorPicker() {
    const p = document.getElementById('bg-color-picker');
    const d = document.getElementById('bg-color-desc');
    if (p) p.addEventListener('input', (e) => { state.color.hex = e.target.value; });
    if (d) d.addEventListener('input', (e) => { state.color.description = e.target.value.trim(); });
}

// ========== READINESS ==========
function getActiveProduct() {
    const productItems = state.canvas.items.filter(it =>
        it.board === 'product-official' || it.board === 'product-draft' || it.board === 'product-upload'
    );
    if (productItems.length > 0) {
        const top = productItems[productItems.length - 1];
        const tier = top.board === 'product-official' ? 'official'
                   : top.board === 'product-draft' ? 'draft' : 'override';
        return { dataUrl: top.src, tier, label: top.label };
    }
    if (state.uploads.productOverride) {
        return { dataUrl: state.uploads.productOverride, tier: 'override', label: 'custom' };
    }
    return null;
}

function isReady() {
    const mode = MODES[state.mode];
    if (!mode) return { ok: false, missing: 'mode' };
    const n = mode.needs;
    const product = getActiveProduct();
    if (n.product === 'required' && !product) return { ok: false, missing: '제품' };
    if (n.reference === 'required' && !state.uploads.backgroundReference) return { ok: false, missing: '레퍼런스' };
    return { ok: true };
}

function updateDock() {
    const btn = document.getElementById('generate-button');
    const dot = document.getElementById('dock-dot');
    const text = document.getElementById('dock-text');
    if (!btn || !dot || !text) return;
    const check = isReady();
    if (check.ok) {
        btn.disabled = false;
        dot.classList.add('ready');
        const v = state.options.variations;
        const extras = [];
        if (findCanvasItemByBoard('gwp')) extras.push('GWP');
        if (findCanvasItemByBoard('package')) extras.push('패키지');
        const extraText = extras.length ? ` · ${extras.join('+')}` : '';
        text.textContent = `준비 완료 — ${v}장${extraText}`;
    } else {
        btn.disabled = true;
        dot.classList.remove('ready');
        const mode = MODES[state.mode];
        const missing = [];
        if (mode.needs.product === 'required' && !getActiveProduct()) missing.push('제품');
        if (mode.needs.reference === 'required' && !state.uploads.backgroundReference) missing.push('레퍼런스');
        text.textContent = `${missing.join(' + ')} 필요`;
    }
}

// ========== GENERATE ==========
function initGenerate() {
    document.getElementById('generate-button')?.addEventListener('click', generateImages);
}

async function generateImages() {
    const check = isReady();
    if (!check.ok) {
        toast('필요한 자산을 선택해주세요', 'error');
        return;
    }

    const mode = MODES[state.mode];
    showLoading(true);
    setLoadingSubtext(`Mode ${mode.num} · ${mode.label} · ${state.options.variations}장`);

    try {
        const product = getActiveProduct();
        const gwpItem = findCanvasItemByBoard('gwp');
        const pkgItem = findCanvasItemByBoard('package');
        const ctx = {
            hasPackage: !!pkgItem && mode.needs.package !== 'hidden',
            hasGWP: !!gwpItem && mode.needs.gwp !== 'hidden',
            additionalDirection: state.options.additionalDirection,
            colorHex: state.color.hex,
            colorDescription: state.color.description
        };

        const prompt = BRAND_VOICE + mode.buildPrompt(ctx);

        setLoadingSubtext('자산 준비 중...');
        const productDataUrl = product ? await ensureDataUrl(product.dataUrl) : null;
        const gwpDataUrl = ctx.hasGWP ? await ensureDataUrl(gwpItem.src) : null;
        const packageDataUrl = ctx.hasPackage ? await ensureDataUrl(pkgItem.src) : null;

        let compositionGuide = null;
        if (state.canvas.items.length >= 2) {
            setLoadingSubtext('캔버스 구도 캡처 중...');
            compositionGuide = await rasterizeCanvas();
        }

        setLoadingSubtext(`Mode ${mode.num} · ${mode.label} · ${state.options.variations}장 생성 중...`);

        const requestData = {
            mode: state.mode,
            model: 'gemini-3-pro-image-preview',
            prompt,
            count: state.options.variations,
            aspect_ratio: state.canvas.aspect,
            image_size: state.options.resolution,
            images: {
                product_sources: productDataUrl ? [productDataUrl] : [],
                background_reference: mode.needs.reference !== 'hidden' ? state.uploads.backgroundReference : null,
                gwp: gwpDataUrl,
                package: packageDataUrl,
                composition_guide: compositionGuide
            },
            identity: {
                product_name: state.identity.productName || 'product',
                additional_item: state.identity.additionalItem || '',
                product_tier: product?.tier || 'unknown'
            },
            task_summary: `Mode ${mode.num} — ${mode.label}`
        };

        console.log(`🚀 Mode ${mode.num} — ${mode.label}`);
        const result = await callAPI(requestData);

        const items = (result.images || []).map((url, idx) => ({
            url,
            filename: `${buildAutoName({ index: idx + 1 })}.png`,
            folder: buildFolderName()
        }));
        state.results = items;
        displayResults(items);
        toast(`${items.length}장 생성 완료 → ${buildFolderName()}/`);
    } catch (error) {
        console.error('❌ 생성 실패:', error);
        toast(`생성 실패: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

async function callAPI(requestData) {
    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || data?.error || `HTTP ${response.status}`);
    if (!data?.success) throw new Error(data?.message || data?.error || '이미지 생성 실패');
    return data;
}

async function ensureDataUrl(input) {
    if (!input) return null;
    if (input.startsWith('data:')) return input;
    const response = await fetch(input);
    if (!response.ok) throw new Error(`자산 로드 실패 (${response.status})`);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('자산 변환 실패'));
        reader.readAsDataURL(blob);
    });
}

// ========== RESULTS ==========
function displayResults(items) {
    const wrap = document.getElementById('results-wrap');
    const container = document.getElementById('results-container');
    const sub = document.getElementById('results-sub');
    if (!wrap || !container) return;
    wrap.hidden = false;
    container.innerHTML = '';
    if (sub) {
        const folder = buildFolderName();
        sub.innerHTML = `폴더: <code>${folder}/</code> · ${items.length}장 · 자동 네이밍 적용`;
    }

    items.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'result-item';
        el.innerHTML = `
            <img src="${item.url}" alt="${item.filename}" class="result-image" loading="lazy">
            <div class="result-name">${item.filename}</div>
            <div class="result-actions">
                <button type="button" class="result-btn" data-action="download" data-index="${index}">DOWNLOAD</button>
                <button type="button" class="result-btn danger" data-action="delete" data-index="${index}">×</button>
            </div>
        `;
        container.appendChild(el);
    });

    container.querySelectorAll('.result-btn[data-action="download"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const item = state.results[Number(btn.dataset.index)];
            if (item) downloadImage(item.url, item.filename);
        });
    });
    container.querySelectorAll('.result-btn[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            state.results.splice(Number(btn.dataset.index), 1);
            displayResults(state.results);
        });
    });

    wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function downloadImage(url, filename) {
    try {
        const r = await fetch(url);
        const blob = await r.blob();
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objUrl; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
    } catch (e) {
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.target = '_blank';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
}

function initDownloadAll() {
    const btn = document.getElementById('download-all-btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        if (!state.results.length) return;
        const folder = buildFolderName();
        for (let i = 0; i < state.results.length; i++) {
            const item = state.results[i];
            await downloadImage(item.url, `${folder}__${item.filename}`);
            await wait(220);
        }
        toast(`${folder}/ 폴더 다운로드 시작`);
    });
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// ========== UI HELPERS ==========
function showLoading(show) {
    document.getElementById('loading-overlay')?.classList.toggle('active', !!show);
}
function setLoadingSubtext(text) {
    const el = document.getElementById('loading-subtext');
    if (el) el.textContent = text;
}
let toastTimer = null;
function toast(message, type = 'info') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.toggle('error', type === 'error');
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// Debug helpers
window.IIC = {
    getState: () => ({
        mode: state.mode,
        canvas: {
            bg: state.canvas.background,
            aspect: state.canvas.aspect,
            floorPct: state.canvas.floorPct,
            items: state.canvas.items.map(i => ({ id: i.id, board: i.board, label: i.label, pos: `${i.xPct.toFixed(1)},${i.yPct.toFixed(1)} @ ${i.wPct.toFixed(1)}x${i.hPct.toFixed(1)} rot${i.rotation.toFixed(0)}` }))
        },
        identity: state.identity
    }),
    listModes: () => Object.keys(MODES),
    previewPrompt: () => MODES[state.mode].buildPrompt({
        hasPackage: !!findCanvasItemByBoard('package'),
        hasGWP: !!findCanvasItemByBoard('gwp'),
        additionalDirection: state.options.additionalDirection,
        colorHex: state.color.hex,
        colorDescription: state.color.description
    }),
    rasterize: () => rasterizeCanvas().then(url => {
        console.log('Canvas rasterized — opening preview');
        if (url) window.open(url, '_blank');
    })
};
