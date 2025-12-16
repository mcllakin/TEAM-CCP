// ========================================
// KAKAO THUMB AI - Flux Dev with imgbb Upload
// Data URI → Public URL → High-Quality Generation
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

        console.log('🎨 Flux Dev 파이프라인 시작 (imgbb 호스팅)');

        // ========================================
        // Data URI를 imgbb에 업로드하여 Public URL 얻기
        // ========================================
        async function uploadToImgbb(dataUri, name = 'image') {
            try {
                // Data URI에서 base64 부분만 추출
                const base64Data = dataUri.replace(/^data:image\/\w+;base64,/, '');
                
                // imgbb API 호출
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

                console.log(`  ✅ ${name} 업로드 완료: ${data.data.url}`);
                return data.data.url; // Public URL 반환

            } catch (error) {
                console.error(`  ❌ ${name} 업로드 실패:`, error.message);
                throw error;
            }
        }

        // ========================================
        // 3개 이미지를 모두 imgbb에 업로드
        // ========================================
        console.log('\n📤 이미지 업로드 중...');
        
        const [backgroundUrl, productUrl, compositionUrl] = await Promise.all([
            uploadToImgbb(image_urls[0], 'background'),
            uploadToImgbb(image_urls[1], 'product'),
            uploadToImgbb(image_urls[2], 'composition')
        ]);

        console.log('\n✅ 모든 이미지 Public URL 변환 완료!');

        // ========================================
        // Replicate 초기화
        // ========================================
        const replicate = new Replicate({ auth: replicateToken });
        const fluxDevModel = "black-forest-labs/flux-dev";

        // ========================================
        // 병렬 생성
        // ========================================
        const generationPromises = [];

        for (let i = 0; i < count; i++) {
            generationPromises.push(
                (async () => {
                    try {
                        console.log(`\n📸 이미지 ${i + 1}/${count} 생성 시작`);

                        const masterPrompt = `Professional product mood shot creation:

REFERENCE IMAGES PROVIDED:
1. Background Reference: Natural lighting environment with warm wood tones
2. Product Reference: SUNSHINE cosmetic jar with silver metallic finish
3. Composition Reference: Product placement and spatial arrangement guide

SYNTHESIS INSTRUCTIONS:

STEP 1 - ANALYZE COMPOSITION REFERENCE:
- Extract exact product position, angle, and scale from the reference image
- Identify spatial relationships and perspective
- Maintain the overall layout structure exactly as shown
- Preserve the depth and dimensional arrangement

STEP 2 - EXTRACT BACKGROUND ATMOSPHERE:
- Capture the warm wood texture and color palette from background reference
- Analyze lighting direction: soft, diffused from above
- Note the ambient color temperature: warm neutral tones
- Identify shadow characteristics: soft, subtle gradients

STEP 3 - INTEGRATE PRODUCT (SUNSHINE jar):
- Place the exact SUNSHINE cosmetic jar as shown in product reference
- Maintain silver metallic finish and cylindrical form
- Preserve all product text: "SUNSHINE" branding
- Keep the white cap and silver body distinction
- Match the exact product shape and proportions

LIGHTING & SHADOWS:
- Match the soft, diffused lighting from Background Reference
- Generate natural shadows consistent with light direction
- Create subtle reflections on the metallic silver surface
- Add warm ambient light bounce from wood background
- Ensure shadow softness matches the reference lighting style

COLOR & ATMOSPHERE:
- Harmonize product silver tones with warm wood background
- Maintain color temperature consistency throughout
- Preserve the luxurious, high-end product photography aesthetic
- Create depth through subtle tonal variations

TECHNICAL QUALITY:
- Ultra-high resolution commercial photography standard
- Sharp product details with natural depth of field
- Seamless integration with no composite artifacts
- Professional studio lighting quality
- Magazine-worthy final output

${query}

Final result: A photorealistic product mood shot of the SUNSHINE cosmetic jar on warm wood background, with perfect lighting integration and commercial photography quality.`;

                        const negativePrompt = "low quality, blurry, distorted, wrong product, different product, wrong text, text errors, unrealistic shadows, harsh lighting, artificial composite, visible seams, pixelated, watermark, amateur photography, color mismatch, poor integration, deformed product, wrong colors, wrong branding";

                        // Flux Dev img2img 실행 (이제 Public URL 사용!)
                        const output = await replicate.run(fluxDevModel, {
                            input: {
                                prompt: masterPrompt,
                                image: compositionUrl, // ← Public URL!
                                prompt_strength: 0.80,
                                num_inference_steps: 28,
                                guidance_scale: 3.5,
                                output_format: "png",
                                output_quality: 100,
                                seed: Math.floor(Math.random() * 1000000)
                            }
                        });

                        const finalImage = Array.isArray(output) ? output[0] : output;
                        
                        console.log(`  ✅ 이미지 ${i + 1}/${count} 생성 완료!`);
                        return finalImage;

                    } catch (error) {
                        console.error(`  ❌ 이미지 ${i + 1}/${count} 실패:`, error.message);
                        console.error('  Error details:', JSON.stringify(error, null, 2));
                        return null;
                    }
                })()
            );
        }

        const generatedImages = await Promise.all(generationPromises);
        const successfulImages = generatedImages.filter(img => img !== null);

        if (successfulImages.length === 0) {
            console.error('❌ 모든 이미지 생성 실패');
            throw new Error('이미지 생성 실패');
        }

        console.log(`\n🎉 총 ${successfulImages.length}/${count}개 완료`);

        return res.status(200).json({
            success: true,
            images: successfulImages,
            count: successfulImages.length,
            model: 'Flux Dev img2img (imgbb hosted)',
            message: `${successfulImages.length}개의 고품질 이미지 생성 완료`
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
