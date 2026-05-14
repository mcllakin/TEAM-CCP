// ============================================================
// KAKAO THUMB AI — 6 Modes for Nano Banana Pro
// All prompts adapted from the CCP AI PROMPT Notion document.
// ============================================================

const MAX_PRODUCTS = 6;
const MAX_FILE_SIZE = 12 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1600;
const JPEG_QUALITY = 0.9;

// ============================================================
// MODE DEFINITIONS
// Each mode declares:
//   - id           : internal id
//   - label        : Korean display name (used in dock)
//   - num          : the "01..06" label
//   - needs        : which image inputs are required/optional
//   - buildPrompt(ctx) : returns the full master prompt string
// ============================================================

const MODES = {
    // ─────────────── 01. 배경 바꾸기 ───────────────
    'bg-replace': {
        id: 'bg-replace',
        label: '배경 바꾸기',
        num: '01',
        needs: {
            product: 'required',      // Image 1
            reference: 'required',     // Image 2
            gwp: 'optional',
            color: false
        },
        ui: {
            productDesc: '제품 + 카메라 세팅이 잡힌 원본 이미지. 구도가 그대로 잠깁니다. 다각도 1~6장.',
            referenceTag: 'BACKGROUND',
            referenceLabel: 'Background Reference',
            referenceSublabel: '재구성할 배경 무드',
            referenceDesc: '배경 재구성에 쓸 레퍼런스. 색만 복사하지 않고 텍스처/공간감을 새 배경으로 다시 만듭니다.'
        },
        buildPrompt: (ctx) => `Use Image 1 as the absolute reference.

Lock Composition & Products:
Preserve the exact product position, scale, stacking order, spacing, and camera angle from Image 1.
Do NOT move, rotate, resize, crop, or redesign the products.
Product geometry, edges, proportions, orientation, and alignment must remain identical to Image 1.

Lighting & Shadows:
Match the original lighting direction, softness, and intensity from Image 1.
Preserve realistic contact shadows under the products.
Shadow shape, falloff, density, and grounding must remain consistent with Image 1.
No floating products, no altered shadow logic.

Background Reconstruction (Image 2):
Analyze Image 2 for material, texture, surface quality, depth, and spatial feeling.
Do NOT copy only the color.
Use the texture, material character, and environmental mood of Image 2 to reconstruct a new background space that fits the camera angle and perspective of Image 1.
Remove all objects, people, props, furniture, text, and specific elements from Image 2.
Rebuild a clean, empty background environment inspired by Image 2, with correct perspective, surface continuity, and spatial depth as if the background physically exists behind the products.

Perspective Matching:
Adapt the background's planes, floor, wall, or surface orientation to perfectly align with the camera height, horizon, and angle of Image 1.
Background must feel naturally photographed from the same viewpoint.

Integration:
Harmonize background exposure, color temperature, texture scale, and light interaction with the products.
Maintain natural light bounce and realistic depth separation.
Background should support the products without drawing attention.

Realism:
Photorealistic result only.
Natural reflections, realistic material response, correct scale.
No stylization, no illustration look, no CGI artifacts.

Strict Rules:
Only the background may be reinterpreted and reconstructed.
Products, composition, camera, lighting, and shadows must remain exactly as in Image 1.

Background Detail Enhancement:
Increase background texture resolution and material clarity subtly and realistically.
Enhance fine surface details such as grain, fabric weave, concrete pores, paper fibers, or natural imperfections, while keeping the background understated and non-distracting.

Upscaling Rules:
Refine texture sharpness without over-definition.
No exaggerated micro-details.
No artificial sharpness or HDR effect.

Material Behavior:
Maintain physically accurate material response.
Subtle variation in roughness and surface irregularity.
Natural scale of texture relative to the products.
${materialBlock(ctx.material)}

Finish:
Crisp but soft realism.
Editorial-grade background quality.
Background must feel realistically photographed, not digitally enhanced.
${gwpBlock(ctx.hasGWP)}
${ctx.additionalDirection ? `\nUser Direction (priority style cue):\n${ctx.additionalDirection}\n` : ''}
NEGATIVE PROMPT: change composition, change angle, product redesign, different lighting direction, fake shadows, floating objects, cartoon, illustration, CGI look, AI artifacts, color-only background copy, flat backdrop, over-smoothing, background objects over-smoothing, added props, over-textured background, excessive sharpness, HDR look, hyper-detailed surfaces, procedural noise, artificial grain buildup, background stealing attention${ctx.hasGWP ? ', GWP larger than or equal to main product, GWP competing with main product' : ''}.`
    },

    // ─────────────── 02. 배경 색감만 ───────────────
    'bg-color': {
        id: 'bg-color',
        label: '배경 색감만',
        num: '02',
        needs: {
            product: 'required',
            reference: 'hidden',
            gwp: 'hidden',
            color: true
        },
        ui: {
            productDesc: '배경 색만 바꿀 원본 이미지. 1장만 사용됩니다.'
        },
        buildPrompt: (ctx) => `Use Image 1 as the absolute reference.

Target: change the background color to ${ctx.colorDescription || ctx.colorHex || 'the specified target color'} (${ctx.colorHex}).

Lock All Objects:
Preserve the exact products, objects, props, positions, scale, spacing, and camera angle from Image 1.
Do NOT move, rotate, resize, crop, add, or remove anything.
All geometry, orientation, and composition must remain identical to Image 1.

Lighting & Shadows:
Preserve the original lighting setup from Image 1.
Do NOT change light direction, softness, intensity, or contrast.
Preserve all contact shadows, cast shadows, and grounding exactly as in Image 1.

Background Color Adjustment:
Change ONLY the background color to ${ctx.colorHex}${ctx.colorDescription ? ` (${ctx.colorDescription})` : ''}.
Do NOT change background texture, material, grain, or surface detail.
Maintain the original background structure, depth, and texture.

Apply a clean, even color shift that feels naturally photographed.
Color change must respect the existing lighting and shadow logic.
No gradients unless originally present.

Integration:
Ensure color temperature and exposure remain consistent with Image 1.
Products and objects must not be recolored or affected by the new background color.
${materialBlock(ctx.material)}

Realism:
Photorealistic result only.
No stylization, no illustration look, no CGI artifacts.

Strict Rules:
This is a background color adjustment task only.
Everything except the background color must remain exactly as in Image 1.
${ctx.additionalDirection ? `\nUser Direction:\n${ctx.additionalDirection}\n` : ''}
NEGATIVE PROMPT: change composition, change angle, change lighting, change shadows, texture change, material change, recolor products or objects, stylized background, gradient background, cartoon, illustration, CGI look.`
    },

    // ─────────────── 03. 향수 — 각도 변경 ───────────────
    'perfume-angle': {
        id: 'perfume-angle',
        label: '향수 — 각도 변경',
        num: '03',
        needs: {
            product: 'required',
            reference: 'hidden',
            gwp: 'hidden',
            color: false
        },
        ui: {
            productDesc: '⚠️ 향수 1개만 업로드. 유리 질감 + 카메라 앵글 베리에이션이 적용됩니다.'
        },
        buildPrompt: (ctx) => `Use the uploaded image as the exact product reference.

Preserve the perfume bottle exactly as it is:
same shape, proportions, logo placement, label text, cap design and color accuracy.
Do not redesign or alter the product.

Change the camera angle to a slightly low angle looking upward from the surface level, making the product appear more premium and dominant.

Transform the image into a high-end professional studio product mood shot.

Enhance the textures of both the product and the background while keeping the same environment.

Background must remain the same wall and surface but upgraded with refined, premium textures and subtle material detail.

Lighting should become high-end commercial studio lighting:
soft directional key light, subtle rim light outlining the bottle silhouette, elegant reflections on the glass, controlled highlights, cinematic soft shadows.

The perfume glass should look luxurious and expensive with refined transparency, realistic refraction, premium reflections and high-end glass material rendering.

Ultra photorealistic commercial product photography, luxury fragrance advertising style, extremely detailed materials, crisp edges, strong subject separation.

8k realism, high-end studio photography.

exact product preservation
no product redesign
maintain original label and typography
premium glass reflections

Keep the original background color palette from the uploaded image.

Do not darken the environment.

The wall and surface should maintain their original light beige and neutral tones from the reference image.

Increase the overall brightness of the background while preserving the natural color and texture.

The background should appear softly lit and brighter, similar to a premium studio environment with diffused lighting.

Avoid dramatic shadows on the wall and keep the background clean, bright, and elegant.

Ensure the product remains the main focal point while the environment feels light and refined.
${materialBlock(ctx.material, true)}
${ctx.additionalDirection ? `\nUser Direction (camera/angle/mood preference):\n${ctx.additionalDirection}\n` : ''}
NEGATIVE PROMPT: product redesign, label distortion, different bottle shape, recolor product, darken background, dramatic harsh shadows, color-cast wall, plastic-looking glass, over-glossy CGI glass, cartoon, illustration, HDR look, hyper-sharpness.`
    },

    // ─────────────── 04. 향수 — 글래스 강화 ───────────────
    'perfume-glass': {
        id: 'perfume-glass',
        label: '향수 — 글래스 강화',
        num: '04',
        needs: {
            product: 'required',
            reference: 'hidden',
            gwp: 'hidden',
            color: false
        },
        ui: {
            productDesc: '⚠️ 향수 1개만 업로드. 각도/구도 유지 + 유리 재질만 프리미엄으로 강화.'
        },
        buildPrompt: (ctx) => `This is a subtle refinement task, not a redesign.

Use the original image as base.

Task:
Enhance the glass material to a premium, photorealistic level while preserving everything else exactly.

[GLOBAL PRESERVATION — CRITICAL]
- keep original background, color tone, and overall mood exactly the same
- preserve composition, proportions, and layout
- do not change lighting balance

[BACKGROUND — LOCKED]
- maintain the exact background from the original image
- preserve color, brightness, and tone with no shift
- no gradient change, no recoloring

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
- preserve original shape and thickness

[LIGHT INTERACTION]
- refine how light interacts with the glass surface
- subtle realistic reflections only
- no exaggerated highlights or artificial glow

[REALISM]
- remove any flat or dull appearance
- maintain natural imperfections subtly
- high-end luxury fragrance photography look

[STRICT RULES]
- no redesign
- no lighting change
- no background change
- no global restyling

[GOAL]
A premium, photorealistic luxury glass material while keeping the original image intact.
${ctx.additionalDirection ? `\n[USER DIRECTION]\n${ctx.additionalDirection}\n` : ''}
Avoid: changed design, distorted text, fake label, plastic-looking glass, over-glossy reflection, CGI look, unrealistic highlights, color shift, background change, lighting change, overprocessed.`
    },

    // ─────────────── 05. 레퍼런스 구도로 ───────────────
    'ref-composition': {
        id: 'ref-composition',
        label: '레퍼런스 구도로',
        num: '05',
        needs: {
            product: 'required',
            reference: 'required',
            gwp: 'optional',
            color: false
        },
        ui: {
            productDesc: '제품 본체 사진. 디자인·로고·라벨이 그대로 보존됩니다. 다각도 1~6장.',
            referenceTag: 'COMPOSITION REF',
            referenceLabel: 'Composition Reference',
            referenceSublabel: '구도 / 무드 레퍼런스',
            referenceDesc: '원하는 구도·프레이밍·카메라 무드의 레퍼런스. 이 레퍼런스의 시각언어로 제품을 다시 찍어드립니다.'
        },
        buildPrompt: (ctx) => `Image 1 = locked product reference.
Image 2 = composition, mood, scene, and camera-reference image.

Use Image 1 as the absolute product reference.
Use Image 2 as the absolute composition and mood-cut reference.

PRODUCT LOCK (Image 1):
Preserve the exact product identity from Image 1.
Keep the product design, silhouette, proportions, geometry, edges, label, branding, typography, colors, material category, surface character, and construction exactly the same as Image 1.
Do NOT redesign the product.
Do NOT restyle the product.
Do NOT change the product color.
Do NOT simplify, replace, or reinterpret any product detail.
The final product must remain unmistakably the exact same product from Image 1.

REFERENCE COMPOSITION (Image 2):
Rebuild the final image using the shot logic of Image 2.
Match the composition, framing, crop logic, camera distance, lens feeling, perspective, scene structure, product placement style, environmental mood, and photographic intention of Image 2.
If Image 2 contains a product pose, interaction, or object relationship, recreate that same visual logic using the product from Image 1.
If Image 2 places the product inside, against, wrapped by, supported by, or interacting with another element, adapt Image 1's product into that same relationship in a physically believable way.

SCENE RECONSTRUCTION:
Use Image 2 as the blueprint for the final mood-cut scene.
Reconstruct the background, supporting elements, material atmosphere, light behavior, tonal balance, and scene depth based on Image 2.
Do not copy the exact product or brand from Image 2.
Replace the product/subject role in Image 2 with the exact product from Image 1.
Preserve the premium photographic mood of Image 2 while making the final scene feel naturally built around the product from Image 1.

INTEGRATION:
The product from Image 1 must be seamlessly integrated into the scene structure of Image 2.
Match the scale, grounding, contact, perspective, depth separation, reflections, shadow logic, and light interaction so the product looks naturally photographed in that environment.
The product should feel physically present in the scene, not composited or pasted in.
Maintain realistic contact shadows and natural support from surrounding elements.
No floating product, no broken perspective, no fake intersection.

LIGHTING:
Follow the lighting mood, softness, direction, contrast behavior, highlight quality, and editorial feel of Image 2.
At the same time, preserve physically believable material response for the product from Image 1.
The final lighting must feel natural, premium, and photographic, never synthetic.
${materialBlock(ctx.material)}

REALISM AND QUALITY:
Photorealistic result only.
Premium editorial beauty/product mood-cut.
Natural high-end photography.
Luxury commercial realism.
Accurate materials, realistic optical behavior, believable scale, crisp but soft detail, elegant tonal separation, and natural depth.
The result should look like a real premium campaign photograph, not AI-generated.

STRICT RULES:
Image 1 controls the product identity.
Image 2 controls the shot composition, mood, and scene logic.
Do not let Image 2 redesign the product.
Do not let Image 1 override the mood-cut composition of Image 2.
The final image must be: exact product from Image 1, photographed in the visual language of Image 2.
${gwpBlock(ctx.hasGWP)}
${ctx.additionalDirection ? `\nUser Direction (priority style cue):\n${ctx.additionalDirection}\n` : ''}
NEGATIVE PROMPT: product redesign, label distortion, recolor product, generic substitute product, floating product, broken perspective, fake contact, collage look, copy of branded elements from Image 2, cartoon, illustration, CGI artifacts, AI-generated look, hyper-sharpness, HDR effect${ctx.hasGWP ? ', GWP larger than or equal to main product, GWP competing with main product' : ''}.`
    },

    // ─────────────── 06. 크리에이티브 무드컷 ───────────────
    'ref-creative': {
        id: 'ref-creative',
        label: '크리에이티브 무드컷',
        num: '06',
        needs: {
            product: 'required',
            reference: 'required',
            gwp: 'optional',
            color: false
        },
        ui: {
            productDesc: '제품 본체 사진. 디자인·라벨·색감이 그대로 보존됩니다. 다각도 1~6장.',
            referenceTag: 'CREATIVE REF',
            referenceLabel: 'Creative Reference',
            referenceSublabel: '구도 · 색감 · 무드',
            referenceDesc: '원하는 무드·색감·연출 레퍼런스. 이 레퍼런스의 비주얼 언어로 자유롭게 재해석됩니다.'
        },
        buildPrompt: (ctx) => `Image 1 = absolute product identity reference.
Image 2 = composition, lighting, mood-cut, and scene-reference image.

Use Image 1 as the absolute locked product reference.
Use Image 2 as the absolute creative mood-cut reference.

PRODUCT IDENTITY LOCK (Image 1):
Preserve the exact product from Image 1:
same design,
same silhouette,
same proportions,
same geometry,
same edges,
same label,
same branding,
same typography,
same material category,
same finish family,
same surface character,
and most importantly the same original product colors.

Do NOT redesign the product.
Do NOT recolor the product.
Do NOT restyle the product.
Do NOT simplify or replace product details.
Do NOT change the brand identity.
The final product must remain unmistakably the exact same product from Image 1.

CREATIVE MOOD-CUT REINTERPRETATION (Image 2):
Use Image 2 not just as a background reference, but as the full visual language for the final shot.
Follow the composition logic, framing style, crop feeling, camera distance, perspective, scene mood, editorial intention, spatial depth, supporting environment, and photographic atmosphere of Image 2.

Rebuild a new scene inspired by Image 2 for the product from Image 1.
Allow a more creative premium mood-cut interpretation:
use the environmental styling, material mood, spatial feeling, prop logic, and visual rhythm of Image 2
to stage the product from Image 1 in a refined, premium, editorial way.

If Image 2 contains objects, surfaces, props, supports, gestures, or product interactions,
translate those into a scene that works naturally with the exact product from Image 1.
Do not copy irrelevant branded elements literally.
Do not force exact object duplication if it feels unnatural.
Instead, recreate the visual logic and mood of Image 2 in a believable, high-end photographic way.

COMPOSITION & CAMERA:
Use the compositional language of Image 2 for the final mood-cut.
Match the framing, crop logic, camera height, distance, lens feeling, negative space behavior, and viewpoint style of Image 2.
The final image should feel photographed in the same visual approach as Image 2, but featuring the exact product from Image 1.

PRODUCT INTEGRATION:
Integrate the product from Image 1 naturally into the reconstructed scene from Image 2.
Match scale, grounding, support, perspective, reflections, contact shadows, depth separation, and physical interaction with the environment.
The product must feel truly present in the scene, not pasted in or composited.
No floating product. No broken perspective. No fake contact. No forced collage effect.

LIGHTING (Match Image 2):
Lighting must follow Image 2.
Use the lighting direction, softness, shadow character, contrast level, highlight behavior, color temperature, and mood from Image 2.
Relight the product from Image 1 naturally so it feels photographed under the same lighting conditions as the reference image.
Shadows must feel physically correct and grounded in the scene.
Reflections and material response must remain realistic and premium.

BACKGROUND & ENVIRONMENT:
Reconstruct the full background and environmental mood from Image 2 in a natural, photoreal way.
Do not use a flat copied backdrop.
Build real spatial depth, real surface continuity, believable material transitions, and a naturally photographed environment.
Background and props should support the product and mood, but the product must remain the hero.
${materialBlock(ctx.material)}

REALISM:
Photorealistic result only.
Premium editorial product photography.
Natural high-end mood-cut realism.
Luxury campaign quality.
Correct material response, realistic reflections, believable texture scale, elegant detail, and physically plausible light behavior.
The final result should look like a real premium campaign photograph, not an AI-generated image.

STRICT RULES:
Image 1 controls the exact product identity.
Image 2 controls the mood-cut language: composition, lighting, scene, and atmosphere.
Do not let Image 2 redesign the product.
Do not change the original product color from Image 1.
Do not produce a generic substitute product.
The final image must be:
the exact product from Image 1,
in the visual world and photographic language of Image 2,
rendered as a creative, premium, natural, photorealistic mood-cut.
${gwpBlock(ctx.hasGWP)}
${ctx.additionalDirection ? `\nUser Direction (priority style cue):\n${ctx.additionalDirection}\n` : ''}
NEGATIVE PROMPT: product redesign, label distortion, recolor product, generic substitute product, floating product, broken perspective, fake contact, collage look, copy of branded elements from Image 2, cartoon, illustration, CGI artifacts, AI-generated look, hyper-sharpness, HDR effect${ctx.hasGWP ? ', GWP larger than or equal to main product, GWP competing with main product' : ''}.`
    }
};

// ============================================================
// Reusable prompt blocks
// ============================================================
function materialBlock(material, perfumeMode = false) {
    if (!material || material === 'auto') {
        return perfumeMode ? '' : `
Material Awareness:
Identify the actual material from the product source image(s) and preserve its physical surface behavior accurately (specular response, roughness, translucency, refraction where applicable). Enhance realism without changing the material category.`;
    }
    const rules = {
        glass: `
Material — GLASS (perfume/cosmetic):
Preserve translucency, refraction, internal liquid color, accurate light bending, soft edge highlights, and realistic specular reflections. Keep label and print exactly readable. Show subtle environmental reflection in the glass surface without making it look CGI.`,
        leather: `
Material — LEATHER:
Preserve grain pattern, natural pore texture, subtle sheen, soft creases. Maintain physical leather behavior — not plastic-looking. Stitching and edges must remain crisp.`,
        steel: `
Material — STEEL / METAL:
Preserve directional brush pattern or polished finish, accurate anisotropic specular highlights, sharp reflections, no flat painted look.`,
        'plastic-matte': `
Material — MATTE PLASTIC:
Preserve smooth low-gloss surface, even diffuse light, no harsh highlights. Color must remain accurate.`,
        'plastic-gloss': `
Material — GLOSSY PLASTIC:
Preserve clean specular highlights, smooth reflective surface, accurate environment reflection without over-shine.`,
        ceramic: `
Material — CERAMIC:
Preserve smooth glaze, subtle subsurface scattering, soft highlights along curved surfaces.`,
        paper: `
Material — PAPER / CARTON:
Preserve fiber texture, fold edges, accurate print color, slight matte diffusion.`,
        fabric: `
Material — FABRIC:
Preserve weave pattern, micro-shadows in textile, softness, natural drape.`
    };
    return rules[material] || '';
}

function gwpBlock(hasGWP) {
    if (!hasGWP) return '';
    return `
GWP (Gift-With-Purchase) Object:
A GWP object image is provided as an additional reference.
The GWP is a SUPPORTING element, NOT the hero.
Place the GWP smaller than the main product, positioned to the side or behind, with clearly reduced visual weight.
The MAIN product must remain the unmistakable focal point — bigger, sharper, more centered, better lit.
GWP scale should be roughly 30-50% of the main product's visual size.
Do NOT let the GWP compete with the main product for attention.
Preserve the GWP's own material and shape faithfully, but at a subdued contrast level.`;
}

// ============================================================
// STATE
// ============================================================
const state = {
    mode: 'ref-composition',  // default mode
    identity: {
        productName: '',
        campaignName: '',
        material: 'auto'
    },
    images: {
        productSources: [],
        backgroundReference: null,
        gwpImage: null
    },
    color: {
        hex: '#cce8d6',
        description: ''
    },
    options: {
        resolution: '2k',
        variations: 1,
        aspect: '1:1',
        additionalDirection: ''
    },
    results: []
};

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 KAKAO THUMB AI — 6 modes / Nano Banana Pro');
    initNavigation();
    initModeSelector();
    initIdentityInputs();
    initUploads();
    initOptions();
    initDirectionTextarea();
    initColorPicker();
    initGenerate();
    initDownloadAll();
    applyMode(state.mode);
    updateDock();
    updateAutoNamePreview();
});

// ========== NAV ==========
function initNavigation() {
    const navNumbers = document.querySelectorAll('.nav-number');
    navNumbers.forEach(nav => {
        nav.addEventListener('click', () => {
            const sectionId = nav.dataset.section;
            const section = document.querySelector(`section[data-section="${sectionId}"]`);
            if (!section) return;
            const top = section.getBoundingClientRect().top + window.pageYOffset - 80;
            window.scrollTo({ top, behavior: 'smooth' });
        });
    });

    const observer = new IntersectionObserver((entries) => {
        let best = null;
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            if (!best || entry.intersectionRatio > best.intersectionRatio) best = entry;
        });
        if (!best) return;
        const sectionId = best.target.dataset.section;
        navNumbers.forEach(n => n.classList.toggle('active', n.dataset.section === sectionId));
    }, { threshold: [0.2, 0.4, 0.6] });

    document.querySelectorAll('section[data-section]').forEach(s => observer.observe(s));
}

// ========== MODE SELECTOR ==========
function initModeSelector() {
    document.querySelectorAll('.mode-card').forEach(card => {
        card.addEventListener('click', () => {
            const mode = card.dataset.mode;
            applyMode(mode);
        });
    });
}

function applyMode(modeId) {
    if (!MODES[modeId]) return;
    state.mode = modeId;
    const mode = MODES[modeId];

    // Highlight active card
    document.querySelectorAll('.mode-card').forEach(c => {
        c.classList.toggle('active', c.dataset.mode === modeId);
    });

    // Show/hide upload boxes based on needs
    const needs = mode.needs;

    const productBox = document.querySelector('[data-role="product"]');
    const referenceBox = document.querySelector('[data-role="reference"]');
    const gwpBox = document.querySelector('[data-role="gwp"]');
    const colorRow = document.getElementById('color-row');

    if (productBox) productBox.classList.toggle('hidden-by-mode', needs.product === 'hidden');
    if (referenceBox) referenceBox.classList.toggle('hidden-by-mode', needs.reference === 'hidden');
    if (gwpBox) gwpBox.classList.toggle('hidden-by-mode', needs.gwp === 'hidden');
    if (colorRow) colorRow.hidden = !needs.color;

    // Update reference panel labels if mode-specific UI provided
    const ui = mode.ui || {};
    const refTag = document.getElementById('reference-tag');
    const refLabel = document.getElementById('reference-label');
    const refSublabel = document.getElementById('reference-sublabel');
    const refDesc = document.getElementById('reference-desc');
    const productDesc = document.getElementById('product-desc');

    if (refTag && ui.referenceTag) refTag.textContent = ui.referenceTag;
    if (refLabel) {
        refLabel.innerHTML = `${ui.referenceLabel || 'Mood Reference'} <span class="upload-sublabel" id="reference-sublabel">${ui.referenceSublabel || '배경 / 무드'}</span>`;
    }
    if (refDesc && ui.referenceDesc) refDesc.textContent = ui.referenceDesc;
    if (productDesc && ui.productDesc) productDesc.textContent = ui.productDesc;

    // Update dock mode tag
    const dockTag = document.getElementById('dock-mode-tag');
    if (dockTag) dockTag.textContent = `${mode.num} · ${mode.label}`;

    updateDock();
    updateAutoNamePreview();
}

// ========== IDENTITY ==========
function initIdentityInputs() {
    const productInput = document.getElementById('product-name');
    const campaignInput = document.getElementById('campaign-name');
    const materialInput = document.getElementById('product-material');

    productInput?.addEventListener('input', (e) => {
        state.identity.productName = e.target.value.trim();
        updateAutoNamePreview();
    });
    campaignInput?.addEventListener('input', (e) => {
        state.identity.campaignName = e.target.value.trim();
        updateAutoNamePreview();
    });
    materialInput?.addEventListener('change', (e) => {
        state.identity.material = e.target.value;
    });
}

function updateAutoNamePreview() {
    const el = document.getElementById('auto-name-preview');
    if (!el) return;
    el.textContent = buildAutoName({ isGWP: hasGWP(), index: 1 }) || 'product_campaign';
}

function sanitizeForFilename(str) {
    return String(str || '')
        .replace(/[^a-zA-Z0-9가-힣]+/g, '')
        .substring(0, 40);
}

function buildAutoName({ isGWP = false, index = 1 } = {}) {
    const product = sanitizeForFilename(state.identity.productName) || 'product';
    const campaign = sanitizeForFilename(state.identity.campaignName);
    const modeTag = (MODES[state.mode]?.num) ? `M${MODES[state.mode].num}` : '';
    const parts = [product];
    if (campaign) parts.push(campaign);
    if (isGWP) parts.push('GWP');
    if (modeTag) parts.push(modeTag);
    if (state.options.variations > 1) parts.push(String(index).padStart(2, '0'));
    return parts.join('_');
}

function buildFolderName() {
    const product = sanitizeForFilename(state.identity.productName) || 'product';
    const campaign = sanitizeForFilename(state.identity.campaignName);
    return campaign ? `${product}_${campaign}` : product;
}

// ========== UPLOADS ==========
function initUploads() {
    initSingleUpload('backgroundReference');
    initSingleUpload('gwpImage');
    initProductUpload();

    document.querySelectorAll('.upload-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            event.preventDefault();
            const targetId = button.dataset.target;
            const input = document.getElementById(targetId);
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
        if (event.target.closest('.product-remove')) return;
        input.click();
    });

    input.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        await handleSingleImage(file, type, preview, box, status);
        input.value = '';
    });

    attachDragAndDrop(box, async (files) => {
        const file = files[0];
        if (!file) return;
        await handleSingleImage(file, type, preview, box, status);
    });
}

async function handleSingleImage(file, type, preview, box, status) {
    try {
        validateImageFile(file);
        const imageData = await resizeImageToDataUrl(file);
        state.images[type] = imageData;
        if (preview) preview.style.backgroundImage = `url(${imageData})`;
        box.classList.add('has-image');
        if (status) {
            status.textContent = 'LOADED';
            status.classList.add('filled');
        }
        toast(`${labelOf(type)} 업로드 완료`);
        updateDock();
    } catch (error) {
        toast(error.message, 'error');
        console.error(error);
    }
}

function labelOf(type) {
    return ({
        backgroundReference: 'Reference',
        gwpImage: 'GWP',
        productSources: 'Product'
    })[type] || type;
}

function initProductUpload() {
    const input = document.getElementById('upload-productSources');
    const box = document.querySelector('[data-upload="productSources"]');
    if (!input || !box) return;

    box.addEventListener('click', (event) => {
        if (event.target.closest('.upload-btn')) return;
        if (event.target.closest('.product-remove')) return;
        if (event.target.closest('.product-chip')) return;
        input.click();
    });

    input.addEventListener('change', async (event) => {
        const files = Array.from(event.target.files || []);
        await addProductFiles(files);
        input.value = '';
    });

    attachDragAndDrop(box, async (files) => {
        await addProductFiles(Array.from(files));
    });
}

async function addProductFiles(files) {
    if (!files.length) return;
    const availableSlots = MAX_PRODUCTS - state.images.productSources.length;
    if (availableSlots <= 0) {
        toast(`제품 이미지는 최대 ${MAX_PRODUCTS}개까지 가능합니다`, 'error');
        return;
    }
    const selected = files.slice(0, availableSlots);
    for (const file of selected) {
        try {
            validateImageFile(file);
            const imageData = await resizeImageToDataUrl(file);
            state.images.productSources.push({ name: file.name, dataUrl: imageData });
        } catch (error) {
            toast(error.message, 'error');
        }
    }
    renderProductSources();
    toast(`제품 사진 ${selected.length}장 추가됨`);
    updateDock();
}

function renderProductSources() {
    const list = document.getElementById('product-list');
    const box = document.querySelector('[data-upload="productSources"]');
    const counter = document.getElementById('product-count');
    if (!list || !box) return;

    list.innerHTML = '';
    state.images.productSources.forEach((product, index) => {
        const item = document.createElement('div');
        item.className = 'product-chip';
        item.innerHTML = `
            <span class="product-chip-thumb" style="background-image:url(${product.dataUrl})"></span>
            <span>${String(index + 1).padStart(2, '0')}</span>
            <button type="button" class="product-remove" aria-label="Remove" data-index="${index}">×</button>
        `;
        list.appendChild(item);
    });

    list.querySelectorAll('.product-remove').forEach(button => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            const index = Number(button.dataset.index);
            state.images.productSources.splice(index, 1);
            renderProductSources();
            updateDock();
        });
    });

    if (counter) counter.textContent = `${state.images.productSources.length} / ${MAX_PRODUCTS}`;
    box.classList.toggle('has-image', state.images.productSources.length > 0);
}

function attachDragAndDrop(box, onDropFiles) {
    box.addEventListener('dragover', (event) => {
        event.preventDefault();
        box.classList.add('drag-over');
    });
    box.addEventListener('dragleave', () => box.classList.remove('drag-over'));
    box.addEventListener('drop', async (event) => {
        event.preventDefault();
        box.classList.remove('drag-over');
        await onDropFiles(event.dataTransfer.files);
    });
}

function validateImageFile(file) {
    if (!file.type.startsWith('image/')) {
        throw new Error('이미지 파일만 업로드 가능합니다');
    }
    if (file.size > MAX_FILE_SIZE) {
        throw new Error('파일 크기는 12MB 이하여야 합니다');
    }
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
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function fitWithinBounds(w, h, mw, mh) {
    if (w <= mw && h <= mh) return { width: w, height: h };
    const ratio = Math.min(mw / w, mh / h);
    return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

// ========== OPTIONS ==========
function initOptions() {
    document.querySelectorAll('input[name="resolution"]').forEach(r => {
        r.addEventListener('change', (e) => { state.options.resolution = e.target.value; });
    });
    document.querySelectorAll('input[name="variation"]').forEach(r => {
        r.addEventListener('change', (e) => {
            state.options.variations = Number(e.target.value);
            updateAutoNamePreview();
        });
    });
    document.querySelectorAll('input[name="aspect"]').forEach(r => {
        r.addEventListener('change', (e) => { state.options.aspect = e.target.value; });
    });
}

function initDirectionTextarea() {
    const textarea = document.getElementById('additional-direction');
    const counter = document.getElementById('direction-count');
    if (!textarea) return;
    textarea.addEventListener('input', (event) => {
        state.options.additionalDirection = event.target.value.trim();
        if (counter) counter.textContent = `${event.target.value.length} / 400`;
    });
}

function initColorPicker() {
    const picker = document.getElementById('bg-color-picker');
    const desc = document.getElementById('bg-color-desc');
    if (picker) {
        picker.addEventListener('input', (e) => { state.color.hex = e.target.value; });
    }
    if (desc) {
        desc.addEventListener('input', (e) => { state.color.description = e.target.value.trim(); });
    }
}

// ========== DOCK STATE ==========
function hasGWP() {
    const mode = MODES[state.mode];
    if (mode?.needs?.gwp === 'hidden') return false;
    return !!state.images.gwpImage;
}

function isReady() {
    const mode = MODES[state.mode];
    if (!mode) return false;
    const n = mode.needs;
    if (n.product === 'required' && state.images.productSources.length < 1) return { ok: false, missing: '제품 사진' };
    if (n.reference === 'required' && !state.images.backgroundReference) return { ok: false, missing: 'Reference 이미지' };
    return { ok: true };
}

function updateDock() {
    const btn = document.getElementById('generate-button');
    const dot = document.getElementById('dock-dot');
    const text = document.getElementById('dock-text');
    if (!btn || !dot || !text) return;

    const mode = MODES[state.mode];
    const check = isReady();

    if (check.ok) {
        btn.disabled = false;
        dot.classList.add('ready');
        const gwpHint = hasGWP() ? ' · GWP' : '';
        text.textContent = `준비 완료 — ${state.options.variations}장${gwpHint}`;
    } else {
        btn.disabled = true;
        dot.classList.remove('ready');
        const missingList = [];
        if (mode.needs.product === 'required' && state.images.productSources.length < 1) missingList.push('제품');
        if (mode.needs.reference === 'required' && !state.images.backgroundReference) missingList.push('레퍼런스');
        text.textContent = `${missingList.join(' + ')} 업로드 필요`;
    }
}

// ========== GENERATE ==========
function initGenerate() {
    const button = document.getElementById('generate-button');
    if (!button) return;
    button.addEventListener('click', generateImages);
}

async function generateImages() {
    const check = isReady();
    if (!check.ok) {
        toast('필요한 이미지를 업로드해주세요', 'error');
        return;
    }

    const mode = MODES[state.mode];
    if (!mode) {
        toast('모드를 선택해주세요', 'error');
        return;
    }

    showLoading(true);
    setLoadingSubtext(`Mode ${mode.num} · ${mode.label} · ${state.options.variations}장`);

    try {
        const ctx = {
            material: state.identity.material,
            hasGWP: hasGWP(),
            additionalDirection: state.options.additionalDirection,
            colorHex: state.color.hex,
            colorDescription: state.color.description
        };

        const prompt = mode.buildPrompt(ctx);

        const requestData = {
            mode: state.mode,
            model: 'gemini-3-pro-image-preview',
            prompt: prompt,
            count: state.options.variations,
            aspect_ratio: state.options.aspect,
            image_size: state.options.resolution,
            images: {
                product_sources: mode.needs.product !== 'hidden'
                    ? state.images.productSources.map(p => p.dataUrl)
                    : [],
                background_reference: mode.needs.reference !== 'hidden'
                    ? state.images.backgroundReference
                    : null,
                gwp: mode.needs.gwp !== 'hidden' ? state.images.gwpImage : null,
                composition_guide: null
            },
            identity: {
                product_name: state.identity.productName || 'product',
                campaign_name: state.identity.campaignName || '',
                material: state.identity.material
            },
            task_summary: `Mode ${mode.num} — ${mode.label}`
        };

        console.log(`🚀 Mode ${mode.num} — ${mode.label}`);
        const result = await callImageGenerationAPI(requestData);
        const items = (result.images || []).map((url, idx) => ({
            url,
            filename: `${buildAutoName({ isGWP: hasGWP(), index: idx + 1 })}.png`
        }));
        state.results = items;
        displayResults(items);
        toast(`${items.length}장 생성 완료`);
    } catch (error) {
        console.error('❌ 생성 실패:', error);
        toast(`생성 실패: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

async function callImageGenerationAPI(requestData) {
    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(data?.message || data?.error || `HTTP ${response.status}`);
    }
    if (!data?.success) {
        throw new Error(data?.message || data?.error || '이미지 생성 실패');
    }
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
            const i = Number(btn.dataset.index);
            const item = state.results[i];
            if (item) downloadImage(item.url, item.filename);
        });
    });

    container.querySelectorAll('.result-btn[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const i = Number(btn.dataset.index);
            state.results.splice(i, 1);
            displayResults(state.results);
        });
    });

    wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function downloadImage(imageUrl, filename) {
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
            const filename = `${folder}__${item.filename}`;
            await downloadImage(item.url, filename);
            await wait(220);
        }
        toast('전체 다운로드 시작');
    });
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// ========== UI HELPERS ==========
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    overlay.classList.toggle('active', Boolean(show));
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

window.KakaoThumbAI = {
    getMode: () => state.mode,
    listModes: () => Object.keys(MODES),
    getPromptPreview: () => MODES[state.mode].buildPrompt({
        material: state.identity.material,
        hasGWP: hasGWP(),
        additionalDirection: state.options.additionalDirection,
        colorHex: state.color.hex,
        colorDescription: state.color.description
    }),
    clear: () => window.location.reload()
};
