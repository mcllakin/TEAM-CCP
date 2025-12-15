// ========================================
// KAKAO THUMB AI - Flux Dev img2img Pipeline
// High-Quality 3-Image Fusion
// ========================================

const Replicate = require('replicate');

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
        if (!replicateToken) {
            console.error('❌ REPLICATE_API_TOKEN not found');
            return res.status(500).json({
                success: false,
                error: 'API token not configured'
            });
        }

        const { image_urls, query, image_size = '2k', count = 4 } = req.body;

        if (!image_urls || !Array.isArray(image_urls) || image_urls.length !== 3) {
            return res.status(400).json({
                success: false,
                error: '3개의 이미지가 필요합니다'
            });
        }

        const [backgroundUrl, productUrl, compositionUrl] = image_urls;

        console.log('🎨 Flux Dev img2img 파이프라인 시작:', {
            count,
            resolution: image_size,
            prompt_length: query?.length || 0
        });

        const replicate = new Replicate({ auth: replicateToken });

        // Flux Dev 모델 (img2img 지원!)
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

                        // ========================================
                        // 초강력 프롬프트 구성
                        // ========================================
                        
                        const masterPrompt = `Professional product mood shot creation:

REFERENCE IMAGES PROVIDED:
1. Background Reference: Natural lighting environment with warm wood tones
2. Product Reference: SUNSHINE cosmetic jar with silver metallic finish
3. Composition Reference: Product placement and spatial arrangement guide

SYNTHESIS INSTRUCTIONS:

STEP 1 - ANALYZE COMPOSITION REFERENCE (Image #3):
- Extract exact product position, angle, and scale
- Identify spatial relationships and perspective
- Maintain the overall layout structure
- Preserve the depth and dimensional arrangement

STEP 2 - EXTRACT BACKGROUND ATMOSPHERE (Image #1):
- Capture the warm wood texture and color palette
- Analyze lighting direction: soft, diffused from above
- Note the ambient color temperature: warm neutral tones
- Identify shadow characteristics: soft, subtle gradients

STEP 3 - INTEGRATE PRODUCT (Image #2 - SUNSHINE jar):
- Place the exact SUNSHINE cosmetic jar from the reference
- Maintain silver metallic finish and cylindrical form
- Preserve all product text and branding details
- Keep the white cap and silver body distinction

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

                        const negativePrompt = "low quality, blurry, distorted, wrong product, different product, text errors, unrealistic shadows, harsh lighting, artificial composite, visible seams, pixelated, watermark, amateur photography, color mismatch, poor integration, deformed product, wrong colors";

                        // Flux Dev img2img 실행
                        const output = await replicate.run(fluxDevModel, {
                            input: {
                                prompt: masterPrompt,
                                image: compositionUrl, // Composition을 베이스로 사용
                                prompt_strength: 0.80, // 프롬프트 강도
                                num_inference_steps: 28, // Flux Dev 최적값
                                guidance_scale: 3.5, // Flux 최적값
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

        // 모든 생성 완료 대기
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
            model: 'Flux Dev img2img (High-Quality Pipeline)',
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
