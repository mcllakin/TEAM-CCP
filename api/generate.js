// ========================================
// KAKAO THUMB AI - Ideogram V2 Turbo
// Best Quality for Product Mood Shots
// ========================================

const Replicate = require('replicate');
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }

    try {
        const replicateToken = process.env.REPLICATE_API_TOKEN;
        const imgbbApiKey = process.env.IMGBB_API_KEY;

        if (!replicateToken) {
            console.error('❌ REPLICATE_API_TOKEN not found');
            return res.status(500).json({
                success: false,
                error: 'Replicate API token not configured'
            });
        }

        if (!imgbbApiKey) {
            console.error('❌ IMGBB_API_KEY not found');
            return res.status(500).json({
                success: false,
                error: 'imgbb API key not configured'
            });
        }

        const { image_urls, query, image_size = '2k', count = 4 } = req.body;

        if (!image_urls || !Array.isArray(image_urls) || image_urls.length !== 3) {
            return res.status(400).json({
                success: false,
                error: '3개의 이미지가 필요합니다'
            });
        }

        console.log(`🎨 Ideogram V2 Turbo 파이프라인 시작 (${count}장 생성)`);

        // ========================================
        // Data URI를 imgbb에 업로드
        // ========================================
        async function uploadToImgbb(dataUri, name = 'image') {
            try {
                const base64Data = dataUri.replace(/^data:image\/\w+;base64,/, '');
                
                const formData = new URLSearchParams();
                formData.append('key', imgbbApiKey);
                formData.append('image', base64Data);
                formData.append('name', name);

                const response = await fetch('https://api.imgbb.com/1/upload', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`imgbb upload failed: ${response.status}`);
                }

                const data = await response.json();
                
                if (!data.success) {
                    throw new Error('imgbb API returned error');
                }

                console.log(`  ✅ ${name} 업로드: ${data.data.url.substring(0, 50)}...`);
                return data.data.url;

            } catch (error) {
                console.error(`  ❌ ${name} 업로드 실패:`, error.message);
                throw error;
            }
        }

        // ========================================
        // 3개 이미지 업로드
        // ========================================
        console.log('\n📤 이미지 업로드 중...');
        
        const [backgroundUrl, productUrl, compositionUrl] = await Promise.all([
            uploadToImgbb(image_urls[0], 'background'),
            uploadToImgbb(image_urls[1], 'product'),
            uploadToImgbb(image_urls[2], 'composition')
        ]);

        console.log('✅ 모든 이미지 Public URL 변환 완료!\n');

        // ========================================
        // Replicate 초기화
        // ========================================
        const replicate = new Replicate({ auth: replicateToken });
        
        // Ideogram V2 Turbo 모델
        const ideogramModel = "ideogram-ai/ideogram-v2-turbo";

        // ========================================
        // 순차 생성 (count만큼) - 안정성 우선
        // ========================================
        const successfulImages = [];

        for (let i = 0; i < count; i++) {
            try {
                console.log(`\n📸 [${i + 1}/${count}] 생성 시작`);

                // 상세 프롬프트
                const masterPrompt = `Professional product photography mood shot:

Create a high-quality commercial product photograph by combining three reference images:

BACKGROUND REFERENCE (Image 1):
- Extract the warm wood texture and natural grain pattern
- Capture the soft, diffused lighting from above
- Maintain the ambient color temperature and warm tones
- Preserve the luxurious, natural material aesthetic

PRODUCT REFERENCE (Image 2):
- Exact product: SUNSHINE cosmetic jar
- Maintain transparent glass body with natural reflections
- Preserve white cap on top
- Keep the silver/chrome metallic label band
- Match all product proportions and dimensions exactly
- Preserve "SUNSHINE" branding text accurately

COMPOSITION REFERENCE (Image 3):
- Follow the exact product placement and position
- Match the camera angle and perspective
- Maintain the spatial arrangement
- Preserve depth and dimensional relationships

INTEGRATION REQUIREMENTS:
- Seamlessly blend the SUNSHINE jar into the wood background
- Generate natural shadows matching the lighting direction
- Add subtle reflections on the glass surface from the environment
- Ensure perfect color harmony between product and background
- Create realistic ambient occlusion at the product base
- Match shadow softness and light falloff naturally

QUALITY STANDARDS:
- Professional commercial photography grade
- Ultra-high resolution with sharp details
- Natural depth of field with gentle background blur
- Magazine-quality output suitable for e-commerce
- No composite artifacts or visible seams
- Photorealistic rendering throughout

${query}

Output: A photorealistic product mood shot of the SUNSHINE cosmetic jar on warm wood background with perfect lighting and shadow integration.`;

                // Ideogram V2 Turbo 실행
                const output = await replicate.run(ideogramModel, {
                    input: {
                        prompt: masterPrompt,
                        image_file: compositionUrl,
                        style_type: "Realistic",
                        magic_prompt_option: "Auto",
                        aspect_ratio: "1:1",
                        output_format: "png",
                        seed: Math.floor(Math.random() * 2147483647)
                    }
                });

                // 디버깅 로그
                console.log(`  📊 Output type: ${Array.isArray(output) ? 'Array' : typeof output}`);
                console.log(`  📊 Output length: ${Array.isArray(output) ? output.length : 'N/A'}`);
                console.log(`  📊 Output value: ${JSON.stringify(output).substring(0, 100)}...`);

                const finalImage = Array.isArray(output) ? output[0] : output;
                
                if (finalImage) {
                    successfulImages.push(finalImage);
                    console.log(`✅ [${i + 1}/${count}] 생성 완료: ${finalImage.substring(0, 50)}...`);
                } else {
                    console.error(`❌ [${i + 1}/${count}] 결과 없음`);
                }

            } catch (error) {
                console.error(`❌ [${i + 1}/${count}] 실패:`, error.message);
            }
        }

        if (successfulImages.length === 0) {
            console.error('❌ 모든 이미지 생성 실패');
            throw new Error('이미지 생성 실패');
        }

        console.log(`\n🎉 총 ${successfulImages.length}/${count}개 완료`);
        console.log(`📊 최종 배열:`, successfulImages);

        return res.status(200).json({
            success: true,
            images: successfulImages,
            count: successfulImages.length,
            model: 'Ideogram V2 Turbo (Best Quality)',
            message: `${successfulImages.length}개의 최고 품질 이미지 생성 완료`
        });

    } catch (error) {
        console.error('❌ 서버 에러:', error);
        return res.status(500).json({
            success: false,
            error: 'Generation failed',
            message: error.message || '이미지 생성 실패'
        });
    }
};
