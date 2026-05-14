// ============================================================
// IIC AI Generator — CCP Team
// 6 modes + Server Boards + Auto-foldering
// ============================================================

const MAX_FILE_SIZE = 12 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1600;
const JPEG_QUALITY = 0.9;

// ============================================================
// MODE DEFINITIONS — prompts adapted from CCP AI PROMPT Notion
// ============================================================
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
    boards: {
        activeTab: 'product-official',
        data: {
            'product-official': [],
            'product-draft': [],
            'package': [],
            'gwp': []
        }
    },
    selection: {
        product: null,         // {board, id, label, dataUrl, tier}
        package: null,
        gwp: null
    },
    uploads: {
        backgroundReference: null,
        productOverride: null,
        compositionDraft: null
    },
    color: { hex: '#cce8d6', description: '' },
    options: { resolution: '2k', variations: 1, aspect: '1:1', additionalDirection: '' },
    results: []
};

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 IIC AI Generator — Boards + 6 modes');
    initNavigation();
    initModeSelector();
    initIdentityInputs();
    initBoardTabs();
    initUploads();
    initOptions();
    initDirectionTextarea();
    initColorPicker();
    initGenerate();
    initDownloadAll();
    initOverviewModal();
    await loadBoardData();
    applyMode(state.mode);
    renderBoard(state.boards.activeTab);
    updateSelectionSummary();
    updateDock();
    updateAutoNamePreview();

    // Auto-open overview modal on first visit only
    try {
        if (!localStorage.getItem('iic_overview_seen')) {
            setTimeout(() => {
                openOverviewModal();
                localStorage.setItem('iic_overview_seen', '1');
            }, 600);
        }
    } catch (_) { /* localStorage unavailable — skip */ }
});

// ========== OVERVIEW MODAL ==========
function initOverviewModal() {
    const modal = document.getElementById('overview-modal');
    if (!modal) return;

    document.getElementById('overview-btn')?.addEventListener('click', openOverviewModal);
    document.querySelectorAll('[data-open-overview]').forEach(el => {
        el.addEventListener('click', openOverviewModal);
    });
    document.querySelectorAll('[data-close-overview]').forEach(el => {
        el.addEventListener('click', closeOverviewModal);
    });

    // Esc to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeOverviewModal();
        }
    });
}

function openOverviewModal() {
    const modal = document.getElementById('overview-modal');
    if (!modal) return;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
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
    const compositionDraftBox = document.querySelector('[data-role="composition-draft"]');
    const colorRow = document.getElementById('color-row');

    if (refBox) refBox.classList.toggle('hidden-by-mode', needs.reference === 'hidden');
    if (productOverrideBox) productOverrideBox.classList.toggle('hidden-by-mode', needs.product === 'hidden');
    if (compositionDraftBox) compositionDraftBox.classList.toggle('hidden-by-mode', needs.product === 'hidden');
    if (colorRow) colorRow.hidden = !needs.color;

    // Reference panel label tweaks per mode
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

    // Dock mode tag
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
    const pkg = state.selection.package ? sanitize(state.selection.package.label) : '';
    return pkg ? `${product}_${pkg}` : product;
}

function buildAutoName({ index = 1 } = {}) {
    const product = sanitize(state.identity.productName) || 'product';
    const pkg = state.selection.package ? sanitize(state.selection.package.label) : '';
    const item = sanitize(state.identity.additionalItem);
    const modeNum = MODES[state.mode]?.num || '';
    const hasGWP = !!state.selection.gwp;

    const parts = [product];
    if (pkg) parts.push(pkg);
    if (hasGWP) parts.push('GWP');
    if (item) parts.push(item);
    if (modeNum) parts.push(`M${modeNum}`);
    if (state.options.variations > 1) parts.push(String(index).padStart(2, '0'));
    return parts.join('_');
}

// ========== BOARD DATA ==========
async function loadBoardData() {
    try {
        const response = await fetch('/api/boards');
        if (response.ok) {
            const data = await response.json();
            if (data?.boards) {
                state.boards.data = { ...state.boards.data, ...data.boards };
                console.log('📦 Loaded board data from /api/boards');
                return;
            }
        }
    } catch (e) {
        console.log('⚠️ /api/boards not available — using empty boards');
    }
    // Fall back to empty boards. Backend can populate these later.
    state.boards.data = {
        'product-official': [],
        'product-draft': [],
        'package': [],
        'gwp': []
    };
}

function initBoardTabs() {
    document.querySelectorAll('.board-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            state.boards.activeTab = tab.dataset.board;
            document.querySelectorAll('.board-tab').forEach(t => {
                t.classList.toggle('active', t.dataset.board === tab.dataset.board);
            });
            renderBoard(tab.dataset.board);
        });
    });
}

function renderBoard(boardId) {
    const grid = document.getElementById('board-grid');
    const empty = document.getElementById('board-empty');
    if (!grid || !empty) return;
    grid.innerHTML = '';

    const items = state.boards.data[boardId] || [];
    if (items.length === 0) {
        grid.style.display = 'none';
        empty.hidden = false;
        empty.querySelector('p').textContent = boardId === 'product-official'
            ? '공식 누끼 보드가 비어있습니다. 서버에 자산이 등록되면 표시됩니다.'
            : '이 보드는 아직 비어있습니다.';
        return;
    }
    grid.style.display = '';
    empty.hidden = true;

    items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'board-item';
        el.style.backgroundImage = `url(${item.thumbnail || item.dataUrl})`;

        // Determine selection key based on board type
        const selectionKey = boardId === 'gwp' ? 'gwp'
                           : boardId === 'package' ? 'package'
                           : 'product';

        const isSelected = state.selection[selectionKey]?.id === item.id;
        if (isSelected) el.classList.add('selected');

        // Tier badge for product boards
        if (boardId === 'product-official' || boardId === 'product-draft') {
            const tier = document.createElement('div');
            tier.className = `board-item-tier ${boardId === 'product-official' ? 'official' : 'draft'}`;
            tier.textContent = boardId === 'product-official' ? 'OFFICIAL' : 'DRAFT';
            el.appendChild(tier);
        }

        const label = document.createElement('div');
        label.className = 'board-item-label';
        label.textContent = item.label || item.id;
        el.appendChild(label);

        el.addEventListener('click', () => toggleBoardSelection(boardId, item));
        grid.appendChild(el);
    });
}

function toggleBoardSelection(boardId, item) {
    const selectionKey = boardId === 'gwp' ? 'gwp'
                       : boardId === 'package' ? 'package'
                       : 'product';
    const tier = boardId === 'product-official' ? 'official'
               : boardId === 'product-draft' ? 'draft'
               : null;

    const current = state.selection[selectionKey];
    if (current?.id === item.id) {
        state.selection[selectionKey] = null;
    } else {
        state.selection[selectionKey] = { ...item, board: boardId, tier };
    }
    renderBoard(boardId);
    updateSelectionSummary();
    updateAutoNamePreview();
    updateDock();
}

function updateSelectionSummary() {
    const el = document.getElementById('selected-text');
    if (!el) return;
    const parts = [];
    if (state.selection.product) {
        const tag = state.selection.product.tier === 'official' ? '공식' : '드래프트';
        parts.push(`제품: ${state.selection.product.label} (${tag})`);
    }
    if (state.selection.package) parts.push(`패키지: ${state.selection.package.label}`);
    if (state.selection.gwp) parts.push(`GWP: ${state.selection.gwp.label}`);

    el.textContent = parts.length ? parts.join(' · ') : '선택된 자산 없음 — 보드에서 클릭해 선택하세요';
}

// ========== UPLOADS ==========
function initUploads() {
    initSingleUpload('backgroundReference');
    initSingleUpload('productOverride');
    initSingleUpload('compositionDraft');

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
    document.querySelectorAll('input[name="aspect"]').forEach(r =>
        r.addEventListener('change', (e) => { state.options.aspect = e.target.value; }));
}

function initDirectionTextarea() {
    const t = document.getElementById('additional-direction');
    const c = document.getElementById('direction-count');
    if (!t) return;
    t.addEventListener('input', (e) => {
        state.options.additionalDirection = e.target.value.trim();
        if (c) c.textContent = `${e.target.value.length} / 400`;
    });
}

function initColorPicker() {
    const p = document.getElementById('bg-color-picker');
    const d = document.getElementById('bg-color-desc');
    if (p) p.addEventListener('input', (e) => { state.color.hex = e.target.value; });
    if (d) d.addEventListener('input', (e) => { state.color.description = e.target.value.trim(); });
}

// ========== READINESS ==========
function getActiveProduct() {
    if (state.selection.product) {
        return { dataUrl: state.selection.product.dataUrl, tier: state.selection.product.tier, label: state.selection.product.label };
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
        if (state.selection.gwp) extras.push('GWP');
        if (state.selection.package) extras.push('패키지');
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
        const ctx = {
            hasPackage: !!state.selection.package && mode.needs.package !== 'hidden',
            hasGWP: !!state.selection.gwp && mode.needs.gwp !== 'hidden',
            additionalDirection: state.options.additionalDirection,
            colorHex: state.color.hex,
            colorDescription: state.color.description
        };

        const prompt = mode.buildPrompt(ctx);

        const requestData = {
            mode: state.mode,
            model: 'gemini-3-pro-image-preview',
            prompt,
            count: state.options.variations,
            aspect_ratio: state.options.aspect,
            image_size: state.options.resolution,
            images: {
                product_sources: product ? [product.dataUrl] : [],
                background_reference: mode.needs.reference !== 'hidden' ? state.uploads.backgroundReference : null,
                gwp: ctx.hasGWP ? state.selection.gwp.dataUrl : null,
                package: ctx.hasPackage ? state.selection.package.dataUrl : null,
                composition_guide: state.uploads.compositionDraft || null
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
    getState: () => ({ mode: state.mode, selection: state.selection, identity: state.identity }),
    listModes: () => Object.keys(MODES),
    previewPrompt: () => MODES[state.mode].buildPrompt({
        hasPackage: !!state.selection.package,
        hasGWP: !!state.selection.gwp,
        additionalDirection: state.options.additionalDirection,
        colorHex: state.color.hex,
        colorDescription: state.color.description
    }),
    setMockBoards: () => {
        // For demo purposes: inject mock data into boards if /api/boards is empty.
        // Call IIC.setMockBoards() in the console to see the UI populated.
        state.boards.data = {
            'product-official': [
                { id: 'shell30ml-sunshine', label: 'SHELL 30ml — SUNSHINE', thumbnail: '', dataUrl: '' },
                { id: 'shell30ml-evening', label: 'SHELL 30ml — EVENING GLOW', thumbnail: '', dataUrl: '' }
            ],
            'product-draft': [
                { id: 'shell30ml-summer-draft', label: 'SHELL 30ml — SUMMER (draft)', thumbnail: '', dataUrl: '' }
            ],
            'package': [
                { id: 'heart-blue-ribbon', label: 'Heart box · Blue ribbon', thumbnail: '', dataUrl: '' },
                { id: 'heart-pink-ribbon', label: 'Heart box · Pink ribbon', thumbnail: '', dataUrl: '' }
            ],
            'gwp': [
                { id: 'blue-hinoki-2ml', label: 'BLUE HINOKI 2ml perfume', thumbnail: '', dataUrl: '' },
                { id: 'sunshine-keyring', label: 'SUNSHINE dog keyring', thumbnail: '', dataUrl: '' }
            ]
        };
        renderBoard(state.boards.activeTab);
        toast('Mock boards loaded');
    }
};
