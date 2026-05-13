// ========================================
// KAKAO THUMB AI — Composition-Locked Application Logic
// ========================================

const MAX_PRODUCTS = 3;
const MAX_FILE_SIZE = 12 * 1024 * 1024; // 12MB before resize
const MAX_IMAGE_EDGE = 1600;
const JPEG_QUALITY = 0.88;

const state = {
    images: {
        compositionGuide: null,
        backgroundReference: null,
        productSources: []
    },
    options: {
        resolution: '2k',
        variations: 1,
        additionalDirection: ''
    }
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 KAKAO THUMB AI - Composition Locked Mode');
    initializeNavigation();
    initializeUploads();
    initializeRadios();
    initializeDirectionTextarea();
    initializeGenerateButton();
});

// ========== NAVIGATION ==========
function initializeNavigation() {
    const navNumbers = document.querySelectorAll('.nav-number');

    navNumbers.forEach(nav => {
        nav.addEventListener('click', () => {
            const sectionId = nav.dataset.section;
            const section = document.querySelector(`[data-section="${sectionId}"]`);
            if (!section) return;

            navNumbers.forEach(n => n.classList.remove('active'));
            nav.classList.add('active');
            section.scrollIntoView({ behavior: 'smooth' });
        });
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const sectionId = entry.target.dataset.section;
            navNumbers.forEach(n => {
                n.classList.toggle('active', n.dataset.section === sectionId);
            });
        });
    }, { threshold: 0.45 });

    document.querySelectorAll('[data-section]').forEach(section => observer.observe(section));
}

// ========== IMAGE UPLOAD ==========
function initializeUploads() {
    initializeSingleUpload('compositionGuide');
    initializeSingleUpload('backgroundReference');
    initializeProductUpload();

    document.querySelectorAll('.upload-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            const targetId = button.dataset.target;
            const input = document.getElementById(targetId);
            if (input) input.click();
        });
    });
}

function initializeSingleUpload(type) {
    const input = document.getElementById(`upload-${type}`);
    const preview = document.getElementById(`preview-${type}`);
    const box = document.querySelector(`[data-upload="${type}"]`);
    if (!input || !preview || !box) return;

    box.addEventListener('click', (event) => {
        if (!event.target.closest('.upload-btn')) input.click();
    });

    input.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        await handleSingleImage(file, type, preview, box);
    });

    attachDragAndDrop(box, async (files) => {
        const file = files[0];
        if (!file) return;
        await handleSingleImage(file, type, preview, box);
    });
}

async function handleSingleImage(file, type, preview, box) {
    try {
        validateImageFile(file);
        const imageData = await resizeImageToDataUrl(file);
        state.images[type] = imageData;
        preview.style.backgroundImage = `url(${imageData})`;
        box.classList.add('has-image');
        console.log(`✅ ${type} uploaded`);
    } catch (error) {
        alert(error.message);
        console.error(error);
    }
}

function initializeProductUpload() {
    const input = document.getElementById('upload-productSources');
    const box = document.querySelector('[data-upload="productSources"]');
    if (!input || !box) return;

    box.addEventListener('click', (event) => {
        if (!event.target.closest('.upload-btn') && !event.target.closest('.product-remove')) input.click();
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
        alert(`제품 이미지는 최대 ${MAX_PRODUCTS}개까지 업로드할 수 있습니다.`);
        return;
    }

    const selectedFiles = files.slice(0, availableSlots);

    try {
        for (const file of selectedFiles) {
            validateImageFile(file);
            const imageData = await resizeImageToDataUrl(file);
            state.images.productSources.push({
                name: file.name,
                dataUrl: imageData
            });
        }
        renderProductSources();
    } catch (error) {
        alert(error.message);
        console.error(error);
    }
}

function renderProductSources() {
    const list = document.getElementById('product-list');
    const preview = document.getElementById('preview-productSources');
    const box = document.querySelector('[data-upload="productSources"]');
    if (!list || !preview || !box) return;

    list.innerHTML = '';
    state.images.productSources.forEach((product, index) => {
        const item = document.createElement('div');
        item.className = 'product-chip';
        item.innerHTML = `
            <span>Product ${String(index + 1).padStart(2, '0')}</span>
            <button type="button" class="product-remove" aria-label="Remove product" data-index="${index}">×</button>
        `;
        list.appendChild(item);
    });

    list.querySelectorAll('.product-remove').forEach(button => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            const index = Number(button.dataset.index);
            state.images.productSources.splice(index, 1);
            renderProductSources();
        });
    });

    if (state.images.productSources.length) {
        preview.style.backgroundImage = `url(${state.images.productSources[0].dataUrl})`;
        box.classList.add('has-image');
    } else {
        preview.style.backgroundImage = '';
        box.classList.remove('has-image');
    }
}

function attachDragAndDrop(box, onDropFiles) {
    box.addEventListener('dragover', (event) => {
        event.preventDefault();
        box.classList.add('drag-over');
    });

    box.addEventListener('dragleave', () => {
        box.classList.remove('drag-over');
    });

    box.addEventListener('drop', async (event) => {
        event.preventDefault();
        box.classList.remove('drag-over');
        await onDropFiles(event.dataTransfer.files);
    });
}

function validateImageFile(file) {
    if (!file.type.startsWith('image/')) {
        throw new Error('이미지 파일만 업로드 가능합니다.');
    }
    if (file.size > MAX_FILE_SIZE) {
        throw new Error('파일 크기는 12MB 이하여야 합니다. 큰 이미지는 먼저 압축해주세요.');
    }
}

function resizeImageToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
        reader.onload = (event) => {
            const img = new Image();
            img.onerror = () => reject(new Error('이미지를 처리할 수 없습니다.'));
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

function fitWithinBounds(width, height, maxWidth, maxHeight) {
    let nextWidth = width;
    let nextHeight = height;

    if (nextWidth > maxWidth || nextHeight > maxHeight) {
        const ratio = Math.min(maxWidth / nextWidth, maxHeight / nextHeight);
        nextWidth = Math.round(nextWidth * ratio);
        nextHeight = Math.round(nextHeight * ratio);
    }

    return { width: nextWidth, height: nextHeight };
}

// ========== OPTIONS ==========
function initializeRadios() {
    document.querySelectorAll('input[name="resolution"]').forEach(radio => {
        radio.addEventListener('change', (event) => {
            state.options.resolution = event.target.value;
        });
    });

    document.querySelectorAll('input[name="variation"]').forEach(radio => {
        radio.addEventListener('change', (event) => {
            state.options.variations = Number(event.target.value);
        });
    });
}

function initializeDirectionTextarea() {
    const textarea = document.getElementById('additional-direction');
    const counter = document.getElementById('direction-count');
    if (!textarea) return;

    textarea.addEventListener('input', (event) => {
        state.options.additionalDirection = event.target.value.trim();
        if (counter) counter.textContent = `${event.target.value.length} / 1200`;
    });
}

function initializeGenerateButton() {
    const button = document.getElementById('generate-button');
    if (!button) return;
    button.addEventListener('click', generateImages);
}

// ========== GENERATE ==========
async function generateImages() {
    if (!state.images.compositionGuide) {
        alert('Composition Guide 이미지를 업로드해주세요.');
        return;
    }
    if (!state.images.backgroundReference) {
        alert('Background Reference 이미지를 업로드해주세요.');
        return;
    }
    if (state.images.productSources.length < 1) {
        alert('Product Source 이미지를 최소 1개 업로드해주세요.');
        return;
    }

    showLoading(true);

    try {
        const requestData = {
            model: 'gemini-3-pro-image-preview',
            image_urls: [
                state.images.compositionGuide,
                state.images.backgroundReference,
                ...state.images.productSources.map(product => product.dataUrl)
            ],
            query: buildPrompt(),
            image_size: state.options.resolution,
            aspect_ratio: 'auto',
            task_summary: 'Composition-locked product moodshot generation',
            count: state.options.variations,
            input_order: {
                image_1: 'Composition Guide — absolute composition and product placement reference',
                image_2: 'Background Reference — material, texture, mood, lighting, spatial reference',
                image_3_plus: 'Product Source Images — product detail and identity preservation references'
            }
        };

        console.log('🚀 Generate request', requestData);
        const results = await callImageGenerationAPI(requestData);
        displayResults(results);
    } catch (error) {
        console.error('❌ 이미지 생성 실패:', error);
        alert(`이미지 생성 중 오류가 발생했습니다: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

function buildPrompt() {
    const additionalDirection = state.options.additionalDirection;

    return `Use Image 1 as the absolute composition reference.

Image Order:
- Image 1: Composition Guide. This is a rough layout made with cut-out product images. It defines the final product composition.
- Image 2: Background Reference. This defines material, texture, surface quality, depth, lighting mood, and spatial feeling.
- Image 3 and any additional images: Product Source Images. Use these to preserve product details, logos, geometry, edges, material, proportions, and surface quality.

Lock Composition & Products:
Preserve the exact product position, scale, stacking order, spacing, and camera angle from Image 1.
Do NOT move, rotate, resize, crop, or redesign the products.
Product geometry, edges, proportions, orientation, and alignment must remain identical to Image 1.
Only use product source images to improve detail fidelity, not to alter the composition.

Lighting & Shadows:
Match the original lighting direction, softness, and intensity from Image 1.
Preserve realistic contact shadows under the products.
Shadow shape, falloff, density, and grounding must remain consistent with Image 1.
No floating products. No altered shadow logic.

Background Reconstruction using Image 2:
Analyze Image 2 for material, texture, surface quality, depth, and spatial feeling.
Do NOT copy only the color.
Use the texture, material character, and environmental mood of Image 2 to reconstruct a new background space that fits the camera angle and perspective of Image 1.
Remove all objects, people, props, furniture, text, and specific elements from Image 2.
Rebuild a clean, empty background environment inspired by Image 2, with correct perspective, surface continuity, and spatial depth as if the background physically exists behind the products.

Perspective Matching:
Adapt the background planes, floor, wall, or surface orientation to perfectly align with the camera height, horizon, and angle of Image 1.
The background must feel naturally photographed from the same viewpoint.

Integration:
Harmonize background exposure, color temperature, texture scale, and light interaction with the products.
Maintain natural light bounce and realistic depth separation.
The background should support the products without drawing attention.

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

Finish:
Crisp but soft realism.
Editorial-grade background quality.
Background must feel realistically photographed, not digitally enhanced.

Additional User Direction:
${additionalDirection || 'No additional direction. Follow the master prompt strictly.'}

Negative Prompt:
change composition, change angle, move products, rotate products, resize products, crop products, product redesign, different lighting direction, fake shadows, floating objects, added props, people, furniture, text, cartoon, illustration, CGI look, AI artifacts, color-only background copy, flat backdrop, over-smoothing, background objects over-smoothing, background objects over-textured background, excessive sharpness, HDR look, hyper-detailed surfaces, procedural noise, artificial grain buildup, background stealing attention`;
}

async function callImageGenerationAPI(requestData) {
    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(data?.message || `HTTP ${response.status}`);
    }
    if (!data?.success) {
        throw new Error(data?.message || '이미지 생성 실패');
    }

    return data.images;
}

// ========== RESULTS ==========
function displayResults(images) {
    const container = document.getElementById('results-container');
    if (!container) return;

    container.innerHTML = '';

    images.forEach((imageUrl, index) => {
        const item = document.createElement('div');
        item.className = 'result-item';
        item.innerHTML = `
            <img src="${imageUrl}" alt="Generated result ${index + 1}" class="result-image">
            <div class="result-actions">
                <button class="result-btn" type="button" onclick="downloadImage('${imageUrl}', ${index + 1})">DOWNLOAD</button>
                <button class="result-btn" type="button" onclick="deleteResult(this)">DELETE</button>
            </div>
        `;
        container.appendChild(item);
    });

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function downloadImage(imageUrl, index) {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `kakao-thumb-ai-result-${index}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function deleteResult(button) {
    const item = button.closest('.result-item');
    if (!item) return;
    item.style.opacity = '0';
    setTimeout(() => item.remove(), 250);
}

function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    overlay.classList.toggle('active', Boolean(show));
}

window.downloadImage = downloadImage;
window.deleteResult = deleteResult;
window.KakaoThumbAI = {
    getState: () => structuredClone(state),
    buildPrompt,
    clear: () => window.location.reload()
};
