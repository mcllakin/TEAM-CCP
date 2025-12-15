 1	// ========================================
     2	// KAKAO THUMB AI — Application Logic
     3	// ========================================
     4	
     5	// State Management
     6	const state = {
     7	    images: {
     8	        background: null,
     9	        product: null,
    10	        composition: null
    11	    },
    12	    options: {
    13	        moodIntensity: 7,
    14	        productPreservation: 8,
    15	        resolution: '2k'
    16	    }
    17	};
    18	
    19	// ========== INITIALIZATION ==========
    20	document.addEventListener('DOMContentLoaded', () => {
    21	    console.log('🚀 KAKAO THUMB AI - Initializing...');
    22	    initializeNavigation();
    23	    initializeUploads();
    24	    initializeSliders();
    25	    initializeRadios();
    26	    initializeGenerateButtons();
    27	    console.log('✅ Initialization complete');
    28	});
    29	
    30	// ========== NAVIGATION ==========
    31	function initializeNavigation() {
    32	    const navNumbers = document.querySelectorAll('.nav-number');
    33	    
    34	    navNumbers.forEach(nav => {
    35	        nav.addEventListener('click', () => {
    36	            const sectionId = nav.dataset.section;
    37	            const section = document.querySelector(`[data-section="${sectionId}"]`);
    38	            
    39	            if (section) {
    40	                // Update active state
    41	                navNumbers.forEach(n => n.classList.remove('active'));
    42	                nav.classList.add('active');
    43	                
    44	                // Smooth scroll
    45	                section.scrollIntoView({ behavior: 'smooth' });
    46	            }
    47	        });
    48	    });
    49	    
    50	    // Scroll spy
    51	    const observer = new IntersectionObserver((entries) => {
    52	        entries.forEach(entry => {
    53	            if (entry.isIntersecting) {
    54	                const sectionId = entry.target.dataset.section;
    55	                navNumbers.forEach(n => {
    56	                    n.classList.toggle('active', n.dataset.section === sectionId);
    57	                });
    58	            }
    59	        });
    60	    }, { threshold: 0.5 });
    61	    
    62	    document.querySelectorAll('[data-section]').forEach(section => {
    63	        observer.observe(section);
    64	    });
    65	}
    66	
    67	// ========== IMAGE UPLOAD ==========
    68	function initializeUploads() {
    69	    const uploads = ['background', 'product', 'composition'];
    70	    
    71	    uploads.forEach(type => {
    72	        const input = document.getElementById(`upload-${type}`);
    73	        const preview = document.getElementById(`preview-${type}`);
    74	        const box = document.querySelector(`[data-upload="${type}"]`);
    75	        
    76	        if (!input || !preview || !box) return;
    77	        
    78	        // Click on entire box to trigger file input
    79	        box.addEventListener('click', (e) => {
    80	            console.log('📦 Upload box clicked:', type);
    81	            // Prevent triggering when clicking buttons
    82	            if (!e.target.closest('.upload-btn')) {
    83	                console.log('🖱️ Triggering file input...');
    84	                input.click();
    85	            }
    86	        });
    87	        
    88	        input.addEventListener('change', (e) => {
    89	            console.log('📁 File input changed:', type);
    90	            const file = e.target.files[0];
    91	            if (!file) {
    92	                console.log('⚠️ No file selected');
    93	                return;
    94	            }
    95	            
    96	            console.log('📄 File:', file.name, file.type, file.size);
    97	            
    98	            // Validate file type
    99	            if (!file.type.startsWith('image/')) {
   100	                alert('이미지 파일만 업로드 가능합니다.');
   101	                return;
   102	            }
   103	            
   104	            // Validate file size (50MB)
   105	            if (file.size > 50 * 1024 * 1024) {
   106	                alert('파일 크기는 50MB 이하여야 합니다.');
   107	                return;
   108	            }
   109	            
   110	            console.log('⏳ Reading file...');
   111	            
   112	            // Read and display image
   113	            const reader = new FileReader();
   114	            reader.onload = (event) => {
   115	                state.images[type] = event.target.result;
   116	                preview.style.backgroundImage = `url(${event.target.result})`;
   117	                box.classList.add('has-image');
   118	                
   119	                console.log(`✅ ${type} 이미지 업로드 완료`);
   120	            };
   121	            reader.onerror = (error) => {
   122	                console.error('❌ File read error:', error);
   123	                alert('파일 읽기 실패: ' + error);
   124	            };
   125	            reader.readAsDataURL(file);
   126	        });
   127	        
   128	        // Add drag & drop
   129	        box.addEventListener('dragover', (e) => {
   130	            e.preventDefault();
   131	            box.style.background = 'rgba(255, 255, 255, 0.05)';
   132	        });
   133	        
   134	        box.addEventListener('dragleave', () => {
   135	            box.style.background = '';
   136	        });
   137	        
   138	        box.addEventListener('drop', (e) => {
   139	            e.preventDefault();
   140	            box.style.background = '';
   141	            
   142	            const file = e.dataTransfer.files[0];
   143	            if (file) {
   144	                const dataTransfer = new DataTransfer();
   145	                dataTransfer.items.add(file);
   146	                input.files = dataTransfer.files;
   147	                input.dispatchEvent(new Event('change'));
   148	            }
   149	        });
   150	    });
   151	}
   152	
   153	// ========== SLIDERS ==========
   154	function initializeSliders() {
   155	    // Mood Intensity Slider
   156	    const moodSlider = document.getElementById('mood-intensity');
   157	    const moodValue = document.getElementById('mood-value');
   158	    
   159	    if (moodSlider && moodValue) {
   160	        moodSlider.addEventListener('input', (e) => {
   161	            const value = parseInt(e.target.value);
   162	            state.options.moodIntensity = value;
   163	            moodValue.textContent = value.toString().padStart(2, '0');
   164	        });
   165	    }
   166	    
   167	    // Product Preservation Slider
   168	    const productSlider = document.getElementById('product-preservation');
   169	    const productValue = document.getElementById('product-value');
   170	    
   171	    if (productSlider && productValue) {
   172	        productSlider.addEventListener('input', (e) => {
   173	            const value = parseInt(e.target.value);
   174	            state.options.productPreservation = value;
   175	            productValue.textContent = value.toString().padStart(2, '0');
   176	        });
   177	    }
   178	}
   179	
   180	// ========== RADIO BUTTONS ==========
   181	function initializeRadios() {
   182	    const radios = document.querySelectorAll('input[name="resolution"]');
   183	    
   184	    radios.forEach(radio => {
   185	        radio.addEventListener('change', (e) => {
   186	            state.options.resolution = e.target.value;
   187	            console.log(`✅ 해상도 변경: ${e.target.value.toUpperCase()}`);
   188	        });
   189	    });
   190	}
   191	
   192	// ========== GENERATE BUTTONS ==========
   193	function initializeGenerateButtons() {
   194	    const singleBtn = document.getElementById('generate-single');
   195	    const batchBtn = document.getElementById('generate-batch');
   196	    
   197	    if (singleBtn) {
   198	        singleBtn.addEventListener('click', () => generateImages(1));
   199	    }
   200	    
   201	    if (batchBtn) {
   202	        batchBtn.addEventListener('click', () => generateImages(4));
   203	    }
   204	}
   205	
   206	// ========== GENERATE IMAGES ==========
   207	async function generateImages(count) {
   208	    // Validate inputs
   209	    if (!state.images.background || !state.images.product || !state.images.composition) {
   210	        alert('3개의 이미지를 모두 업로드해주세요.');
   211	        return;
   212	    }
   213	    
   214	    console.log('🚀 이미지 생성 시작:', {
   215	        count,
   216	        resolution: state.options.resolution,
   217	        moodIntensity: state.options.moodIntensity,
   218	        productPreservation: state.options.productPreservation
   219	    });
   220	    
   221	    // Show loading
   222	    showLoading(true);
   223	    
   224	    try {
   225	        // Prepare request data
   226	        const requestData = {
   227	            model: 'nano-banana-pro',
   228	            image_urls: [
   229	                state.images.background,
   230	                state.images.product,
   231	                state.images.composition
   232	            ],
   233	            query: buildPrompt(),
   234	            image_size: state.options.resolution,
   235	            aspect_ratio: 'auto',
   236	            task_summary: '제품 무드컷 자동 합성',
   237	            count: count
   238	        };
   239	        
   240	        // Call REAL Nano Banana Pro API via GenSpark Agent
   241	        const results = await callNanoBananaPro(requestData);
   242	        
   243	        // Display results
   244	        displayResults(results);
   245	        
   246	        console.log('✅ 이미지 생성 완료:', results.length);
   247	        
   248	    } catch (error) {
   249	        console.error('❌ 이미지 생성 실패:', error);
   250	        alert(`이미지 생성 중 오류가 발생했습니다: ${error.message}`);
   251	    } finally {
   252	        showLoading(false);
   253	    }
   254	}
   255	
   256	// ========== BUILD PROMPT ==========
   257	function buildPrompt() {
   258	    const moodLevel = state.options.moodIntensity;
   259	    const productLevel = state.options.productPreservation;
   260	    
   261	    return `Create a professional product mood shot by harmonizing background, product, and composition reference images.
   262	
   263	REQUIREMENTS:
   264	- Mood Intensity: ${moodLevel}/10 — Apply background atmosphere and lighting ${moodLevel > 7 ? 'strongly' : moodLevel > 4 ? 'moderately' : 'subtly'}
   265	- Product Preservation: ${productLevel}/10 — Preserve product details ${productLevel > 7 ? 'strictly' : productLevel > 4 ? 'moderately' : 'loosely'}
   266	- Seamlessly blend the product into the background
   267	- Match lighting, shadows, reflections naturally
   268	- Adjust color temperature to harmonize with the scene
   269	- Remove any existing products from the background
   270	- Follow the composition reference for product placement
   271	- Maintain photorealistic quality with no composite artifacts
   272	
   273	STYLE: Professional studio photography, high detail, natural lighting, perfect integration`;
   274	}
   275	
   276	// ========== REPLICATE SDXL API ==========
   277	async function callNanoBananaPro(requestData) {
   278	    console.log('========================================');
   279	    console.log('🎨 KAKAO THUMB AI - Replicate SDXL 이미지 생성');
   280	    console.log('========================================');
   281	    console.log('📋 요청 데이터:');
   282	    console.log('- Model: Replicate SDXL');
   283	    console.log('- Count:', requestData.count);
   284	    console.log('- Resolution:', requestData.image_size);
   285	    console.log('- Prompt:', requestData.query);
   286	    console.log('========================================');
   287	    
   288	    try {
   289	        // API 엔드포인트 호출
   290	        console.log('🚀 Replicate API 호출 중...');
   291	        
   292	        const response = await fetch('/api/generate', {
   293	            method: 'POST',
   294	            headers: {
   295	                'Content-Type': 'application/json',
   296	            },
   297	            body: JSON.stringify({
   298	                image_urls: requestData.image_urls,
   299	                query: requestData.query,
   300	                image_size: requestData.image_size,
   301	                count: requestData.count
   302	            })
   303	        });
   304	
   305	        if (!response.ok) {
   306	            const errorData = await response.json();
   307	            throw new Error(errorData.message || `HTTP ${response.status}`);
   308	        }
   309	
   310	        const data = await response.json();
   311	        
   312	        if (!data.success) {
   313	            throw new Error(data.message || '이미지 생성 실패');
   314	        }
   315	
   316	        console.log('✅ 이미지 생성 완료:', data.count, '개');
   317	        console.log('========================================');
   318	        
   319	        return data.images;
   320	
   321	    } catch (error) {
   322	        console.error('❌ API 호출 실패:', error);
   323	        throw error;
   324	    }
   325	}
   326	
   327	// ========== DISPLAY RESULTS ==========
   328	function displayResults(images) {
   329	    const container = document.getElementById('results-container');
   330	    if (!container) return;
   331	    
   332	    // Clear previous results
   333	    container.innerHTML = '';
   334	    
   335	    // Add new results
   336	    images.forEach((imageUrl, index) => {
   337	        const item = document.createElement('div');
   338	        item.className = 'result-item';
   339	        
   340	        item.innerHTML = `
   341	            <img src="${imageUrl}" alt="Result ${index + 1}" class="result-image">
   342	            <div class="result-actions">
   343	                <button class="result-btn" onclick="downloadImage('${imageUrl}', ${index + 1})">
   344	                    DOWNLOAD
   345	                </button>
   346	                <button class="result-btn" onclick="deleteResult(this)">
   347	                    DELETE
   348	                </button>
   349	            </div>
   350	        `;
   351	        
   352	        container.appendChild(item);
   353	    });
   354	    
   355	    // Scroll to results
   356	    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
   357	}
   358	
   359	// ========== DOWNLOAD IMAGE ==========
   360	function downloadImage(imageUrl, index) {
   361	    const link = document.createElement('a');
   362	    link.href = imageUrl;
   363	    link.download = `kakao-thumb-ai-result-${index}.png`;
   364	    document.body.appendChild(link);
   365	    link.click();
   366	    document.body.removeChild(link);
   367	    
   368	    console.log(`📥 이미지 다운로드: result-${index}`);
   369	}
   370	
   371	// ========== DELETE RESULT ==========
   372	function deleteResult(button) {
   373	    const item = button.closest('.result-item');
   374	    if (item) {
   375	        item.style.opacity = '0';
   376	        setTimeout(() => item.remove(), 300);
   377	    }
   378	}
   379	
   380	// ========== LOADING OVERLAY ==========
   381	function showLoading(show) {
   382	    const overlay = document.getElementById('loading-overlay');
   383	    if (!overlay) return;
   384	    
   385	    if (show) {
   386	        overlay.classList.add('active');
   387	    } else {
   388	        overlay.classList.remove('active');
   389	    }
   390	}
   391	
   392	// ========== API ENDPOINT NOTES ==========
   393	/*
   394	현재 구현:
   395	- GenSpark Agent를 통한 실시간 API 호출
   396	- 엔드포인트: /api/generate-image (상대 경로)
   397	- 이미지는 Base64로 전송됨
   398	- Nano Banana Pro 모델 사용
   399	
   400	외부 배포 시:
   401	- 별도 백엔드 서버 필요 (Node.js + Express)
   402	- BACKEND_DEVELOPER_GUIDE.md 참고
   403	- API_ENDPOINT를 배포된 URL로 변경 필요
   404	  예: 'https://your-backend-url.vercel.app/api/generate-image'
   405	*/
   406	
   407	// ========== UTILITY FUNCTIONS ==========
   408	function log(message, data = null) {
   409	    console.log(`[KAKAO THUMB AI] ${message}`, data || '');
   410	}
   411	
   412	// Expose functions to window for inline handlers
   413	window.downloadImage = downloadImage;
   414	window.deleteResult = deleteResult;
   415	
