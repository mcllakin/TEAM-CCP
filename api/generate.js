// ========================================
// KAKAO THUMB AI — Application Logic
// ========================================

// State Management
const state = {
    images: {
        background: null,
        product: null,
        composition: null
    },
    options: {
        moodIntensity: 7,
        productPreservation: 8,
        resolution: '2k'
    }
};

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 KAKAO THUMB AI - Initializing...');
    initializeNavigation();
    initializeUploads();
    initializeSliders();
    initializeRadios();
    initializeGenerateButtons();
    console.log('✅ Initialization complete');
});

// ========== NAVIGATION ==========
function initializeNavigation() {
    const navNumbers = document.querySelectorAll('.nav-number');
    
    navNumbers.forEach(nav => {
        nav.addEventListener('click', () => {
            const sectionId = nav.dataset.section;
            const section = document.querySelector(`[data-section="${sectionId}"]`);
            
            if (section) {
                // Update active state
                navNumbers.forEach(n => n.classList.remove('active'));
                nav.classList.add('active');
                
                // Smooth scroll
                section.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Scroll spy
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.dataset.section;
                navNumbers.forEach(n => {
                    n.classList.toggle('active', n.dataset.section === sectionId);
                });
            }
        });
    }, { threshold: 0.5 });
    
    document.querySelectorAll('[data-section]').forEach(section => {
        observer.observe(section);
    });
}

// ========== IMAGE UPLOAD ==========
function initializeUploads() {
    const uploads = ['background', 'product', 'composition'];
    
    uploads.forEach(type => {
        const input = document.getElementById(`upload-${type}`);
        const preview = document.getElementById(`preview-${type}`);
        const box = document.querySelector(`[data-upload="${type}"]`);
        
        if (!input || !preview || !box) return;
        
        // Click on entire box to trigger file input
        box.addEventListener('click', (e) => {
            console.log('📦 Upload box clicked:', type);
            // Prevent triggering when clicking buttons
            if (!e.target.closest('.upload-btn')) {
                console.log('🖱️ Triggering file input...');
                input.click();
            }
        });
        
        input.addEventListener('change', (e) => {
            console.log('📁 File input changed:', type);
            const file = e.target.files[0];
            if (!file) {
                console.log('⚠️ No file selected');
                return;
            }
            
            console.log('📄 File:', file.name, file.type, file.size);
            
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('이미지 파일만 업로드 가능합니다.');
                return;
            }
            
            // Validate file size (50MB)
            if (file.size > 50 * 1024 * 1024) {
                alert('파일 크기는 50MB 이하여야 합니다.');
                return;
            }
            
            console.log('⏳ Reading file...');
            
            // Read and display image
            const reader = new FileReader();
            reader.onload = (event) => {
                state.images[type] = event.target.result;
                preview.style.backgroundImage = `url(${event.target.result})`;
                box.classList.add('has-image');
                
                console.log(`✅ ${type} 이미지 업로드 완료`);
            };
            reader.onerror = (error) => {
                console.error('❌ File read error:', error);
                alert('파일 읽기 실패: ' + error);
            };
            reader.readAsDataURL(file);
        });
        
        // Add drag & drop
        box.addEventListener('dragover', (e) => {
            e.preventDefault();
            box.style.background = 'rgba(255, 255, 255, 0.05)';
        });
        
        box.addEventListener('dragleave', () => {
            box.style.background = '';
        });
        
        box.addEventListener('drop', (e) => {
            e.preventDefault();
            box.style.background = '';
            
            const file = e.dataTransfer.files[0];
            if (file) {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                input.files = dataTransfer.files;
                input.dispatchEvent(new Event('change'));
            }
        });
    });
}

// ========== SLIDERS ==========
function initializeSliders() {
    // Mood Intensity Slider
    const moodSlider = document.getElementById('mood-intensity');
    const moodValue = document.getElementById('mood-value');
    
    if (moodSlider && moodValue) {
        moodSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            state.options.moodIntensity = value;
            moodValue.textContent = value.toString().padStart(2, '0');
        });
    }
    
    // Product Preservation Slider
    const productSlider = document.getElementById('product-preservation');
    const productValue = document.getElementById('product-value');
    
    if (productSlider && productValue) {
        productSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            state.options.productPreservation = value;
            productValue.textContent = value.toString().padStart(2, '0');
        });
    }
}

// ========== RADIO BUTTONS ==========
function initializeRadios() {
    const radios = document.querySelectorAll('input[name="resolution"]');
    
    radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.options.resolution = e.target.value;
            console.log(`✅ 해상도 변경: ${e.target.value.toUpperCase()}`);
        });
    });
}

// ========== GENERATE BUTTONS ==========
function initializeGenerateButtons() {
    const singleBtn = document.getElementById('generate-single');
    const batchBtn = document.getElementById('generate-batch');
    
    if (singleBtn) {
        singleBtn.addEventListener('click', () => generateImages(1));
    }
    
    if (batchBtn) {
        batchBtn.addEventListener('click', () => generateImages(4));
    }
}

// ========== GENERATE IMAGES ==========
async function generateImages(count) {
    // Validate inputs
    if (!state.images.background || !state.images.product || !state.images.composition) {
        alert('3개의 이미지를 모두 업로드해주세요.');
        return;
    }
    
    console.log('🚀 이미지 생성 시작:', {
        count,
        resolution: state.options.resolution,
        moodIntensity: state.options.moodIntensity,
        productPreservation: state.options.productPreservation
    });
    
    // Show loading
    showLoading(true);
    
    try {
        // Prepare request data
        const requestData = {
            model: 'nano-banana-pro',
            image_urls: [
                state.images.background,
                state.images.product,
                state.images.composition
            ],
            query: buildPrompt(),
            image_size: state.options.resolution,
            aspect_ratio: 'auto',
            task_summary: '제품 무드컷 자동 합성',
            count: count
        };
        
        // Call REAL Nano Banana Pro API via GenSpark Agent
        const results = await callNanoBananaPro(requestData);
        
        // Display results
        displayResults(results);
        
        console.log('✅ 이미지 생성 완료:', results.length);
        
    } catch (error) {
        console.error('❌ 이미지 생성 실패:', error);
        alert(`이미지 생성 중 오류가 발생했습니다: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

// ========== BUILD PROMPT ==========
function buildPrompt() {
    const moodLevel = state.options.moodIntensity;
    const productLevel = state.options.productPreservation;
    
    return `Create a professional product mood shot by harmonizing background, product, and composition reference images.

REQUIREMENTS:
- Mood Intensity: ${moodLevel}/10 — Apply background atmosphere and lighting ${moodLevel > 7 ? 'strongly' : moodLevel > 4 ? 'moderately' : 'subtly'}
- Product Preservation: ${productLevel}/10 — Preserve product details ${productLevel > 7 ? 'strictly' : productLevel > 4 ? 'moderately' : 'loosely'}
- Seamlessly blend the product into the background
- Match lighting, shadows, reflections naturally
- Adjust color temperature to harmonize with the scene
- Remove any existing products from the background
- Follow the composition reference for product placement
- Maintain photorealistic quality with no composite artifacts

STYLE: Professional studio photography, high detail, natural lighting, perfect integration`;
}

// ========== FLUX 1.1 PRO ULTRA API ==========
async function callNanoBananaPro(requestData) {
    console.log('========================================');
    console.log('🎨 KAKAO THUMB AI - Flux 1.1 Pro Ultra 이미지 생성');
    console.log('========================================');
    console.log('📋 요청 데이터:');
    console.log('- Model: Flux 1.1 Pro Ultra (Best Quality)');
    console.log('- Count:', requestData.count);
    console.log('- Resolution:', requestData.image_size);
    console.log('- Prompt:', requestData.query);
    console.log('========================================');
    
    try {
        // API 엔드포인트 호출
        console.log('🚀 Replicate API 호출 중...');
        
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image_urls: requestData.image_urls,
                query: requestData.query,
                image_size: requestData.image_size,
                count: requestData.count
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '이미지 생성 실패');
        }

        console.log('✅ 이미지 생성 완료:', data.count, '개');
        console.log('========================================');
        
        return data.images;

    } catch (error) {
        console.error('❌ API 호출 실패:', error);
        throw error;
    }
}

// ========== DISPLAY RESULTS ==========
function displayResults(images) {
    const container = document.getElementById('results-container');
    if (!container) return;
    
    // Clear previous results
    container.innerHTML = '';
    
    // Add new results
    images.forEach((imageUrl, index) => {
        const item = document.createElement('div');
        item.className = 'result-item';
        
        item.innerHTML = `
            <img src="${imageUrl}" alt="Result ${index + 1}" class="result-image">
            <div class="result-actions">
                <button class="result-btn" onclick="downloadImage('${imageUrl}', ${index + 1})">
                    DOWNLOAD
                </button>
                <button class="result-btn" onclick="deleteResult(this)">
                    DELETE
                </button>
            </div>
        `;
        
        container.appendChild(item);
    });
    
    // Scroll to results
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ========== DOWNLOAD IMAGE ==========
function downloadImage(imageUrl, index) {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `kakao-thumb-ai-result-${index}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`📥 이미지 다운로드: result-${index}`);
}

// ========== DELETE RESULT ==========
function deleteResult(button) {
    const item = button.closest('.result-item');
    if (item) {
        item.style.opacity = '0';
        setTimeout(() => item.remove(), 300);
    }
}

// ========== LOADING OVERLAY ==========
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

// ========== API ENDPOINT NOTES ==========
/*
현재 구현:
- GenSpark Agent를 통한 실시간 API 호출
- 엔드포인트: /api/generate-image (상대 경로)
- 이미지는 Base64로 전송됨
- Nano Banana Pro 모델 사용

외부 배포 시:
- 별도 백엔드 서버 필요 (Node.js + Express)
- BACKEND_DEVELOPER_GUIDE.md 참고
- API_ENDPOINT를 배포된 URL로 변경 필요
  예: 'https://your-backend-url.vercel.app/api/generate-image'
*/

// ========== UTILITY FUNCTIONS ==========
function log(message, data = null) {
    console.log(`[KAKAO THUMB AI] ${message}`, data || '');
}

// Expose functions to window for inline handlers
window.downloadImage = downloadImage;
window.deleteResult = deleteResult;
