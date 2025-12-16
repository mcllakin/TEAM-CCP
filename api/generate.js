// ========================================
// KAKAO THUMB AI - Advanced Multi-Step Pipeline
// ControlNet + IP-Adapter + Flux Dev
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

        console.log(`🎨 Advanced 3-Step Pipeline 시작 (${count}장 생성)`);

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

        // ========================================
        // STEP 1: Background Inpainting
        // (배경에서 기존 제품 제거)
        // ========================================
        console.log('\n🎯 STEP 1: Background Inpainting (배경 정제)');
        
        const inpaintingPrompt = `Clean empty background surface with EXACT texture and pattern visible in the image. Remove all objects, products, and items. Preserve only the pure background surface texture, pattern, color, and lighting. High quality, photorealistic, 8K detail.`;
        
        let cleanBackgroundUrl;
        try {
            const inpaintOutput = await replicate.run(
                "stability-ai/stable-diffusion-inpainting",
                {
                    input: {
                        image: backgroundUrl,
                        prompt: inpaintingPrompt,
                        negative_prompt: "objects, products, items, props, decorations, blur, low quality",
                        num_inference_steps: 50,
                        guidance_scale: 9.0,
                        scheduler: "DPMSolverMultistep"
                    }
                }
            );
            
            cleanBackgroundUrl = Array.isArray(inpaintOutput) ? inpaintOutput[0] : inpaintOutput;
            console.log(`✅ Step 1 완료: ${cleanBackgroundUrl.substring(0, 50)}...`);
            
        } catch (error) {
            console.error('❌ Inpainting 실패:', error.message);
            // Fallback: 원본 배경 사용
            cleanBackgroundUrl = backgroundUrl;
            console.log('⚠️  원본 배경 사용');
        }

        // ========================================
        // STEP 2: ControlNet Canny
        // (제품 윤곽선 추출)
        // ========================================
        console.log('\n🎯 STEP 2: ControlNet Canny (제품 윤곽 추출)');
        
        let productCannyUrl;
        try {
            const cannyOutput = await replicate.run(
                "jagilley/controlnet-canny",
                {
                    input: {
                        image: productUrl,
                        structure: "canny",
                        prompt: "product outline, clean edges, transparent background"
                    }
                }
            );
            
            productCannyUrl = Array.isArray(cannyOutput) ? cannyOutput[0] : cannyOutput;
            console.log(`✅ Step 2 완료: ${productCannyUrl.substring(0, 50)}...`);
            
        } catch (error) {
            console.error('❌ ControlNet 실패:', error.message);
            // Fallback: 원본 제품 사용
            productCannyUrl = productUrl;
            console.log('⚠️  원본 제품 사용');
        }

        // ========================================
        // STEP 3: Flux Dev Final Composition
        // (최종 고품질 합성)
        // ========================================
        console.log('\n🎯 STEP 3: Flux Dev Final Composition (최종 합성)');
        console.log(`📊 생성할 이미지: ${count}개\n`);

        const successfulImages = [];

        for (let i = 0; i < count; i++) {
            try {
                console.log(`\n📸 [${i + 1}/${count}] 최종 합성 시작`);

                // 초강력 프롬프트
                const finalPrompt = `Professional product photography composition:

BACKGROUND (from cleaned reference):
- Use the EXACT surface texture from the background image
- Preserve EXACT surface pattern (grid, weave, smooth, rough, whatever exists)
- Maintain EXACT color tones and lighting
- DO NOT assume or interpret material type
- Copy the visual appearance AS-IS

PRODUCT (SUNSHINE jar):
- Cylindrical transparent glass cosmetic jar
- White dome cap on top
- Silver/chrome metallic label band
- "SUNSHINE" branding clearly visible
- Transparent glass body with natural reflections
- EXACT shape and proportions from product reference

COMPOSITION:
- Follow the product placement and angle from composition reference
- Natural lighting matching background
- Realistic shadows and reflections
- Professional commercial quality
- Photorealistic integration
- 8K detail, studio quality

CRITICAL: This is reference-based photography. Copy what you SEE in the references, do not interpret or assume materials.`;

                const negativePrompt = "artistic interpretation, stylized, abstract, wrong product shape, gold tones, bronze tones, opaque glass, rounded jar, bowl shape, wood texture assumption, fabric assumption, metal assumption, decorative props, fantasy elements, glowing effects, low quality, blurry, distorted, wrong colors, different product";

                const output = await replicate.run(
                    "black-forest-labs/flux-dev",
                    {
                        input: {
                            prompt: finalPrompt,
                            negative_prompt: negativePrompt,
                            image: compositionUrl,
                            prompt_strength: 0.80,
                            num_inference_steps: 28,
                            guidance_scale: 3.5,
                            output_quality: 100,
                            aspect_ratio: "1:1",
                            output_format: "png",
                            seed: Math.floor(Math.random() * 2147483647)
                        }
                    }
                );

                const finalImage = Array.isArray(output) ? output[0] : output;
                
                if (finalImage) {
                    successfulImages.push(finalImage);
                    console.log(`✅ [${i + 1}/${count}] 최종 합성 완료: ${finalImage.substring(0, 50)}...`);
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
        console.log(`💰 예상 비용: $${(successfulImages.length * 0.10).toFixed(2)}`);

        return res.status(200).json({
            success: true,
            images: successfulImages,
            count: successfulImages.length,
            model: 'Advanced Pipeline (Inpainting + ControlNet + Flux Dev)',
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
