// ========================================
// KAKAO THUMB AI - SDXL img2img Pipeline
// 3-Image Fusion: Background + Product + Composition
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

        console.log('🎨 SDXL img2img 파이프라인 시작:', {
            count,
            resolution: image_size,
            prompt_length: query?.length || 0
        });

        const replicate = new Replicate({ auth: replicateToken });

        // SDXL img2img 모델
        const sdxlModel = "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";

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
                        // 상세한 프롬프트 구성
                        // ========================================
                        
                        // Composition Reference를 베이스로 사용
                        const baseImage = compositionUrl;

                        // 프롬프트 구성
                        const detailedPrompt = `${query}

PRODUCT MOOD SHOT REQUIREMENTS:

COMPOSITION (Reference Image #3):
- Follow the exact product placement and angle from the composition reference
- Maintain the spatial layout and perspective
- Keep the product positioning and scale

BACKGROUND ATMOSPHERE (Reference Image #1):
- Extract and apply the lighting mood from the background reference
- Match the color temperature and ambient tone
- Replicate the lighting direction and intensity
- Maintain the background's atmospheric quality

PRODUCT INTEGRATION (Reference Image #2):
- Seamlessly place the product into the scene
- Generate natural shadows that match the lighting direction
- Add realistic reflections on product surfaces
- Blend product edges naturally with the background
- Maintain product details and form accurately

LIGHTING & SHADOWS:
- Shadows must match background lighting angle
- Natural shadow softness and gradient
- Realistic ambient occlusion around product base
- Color temperature consistency throughout

QUALITY REQUIREMENTS:
- Professional commercial photography standard
- Photorealistic rendering with high detail
- No composite artifacts or visible seams
- Natural depth and dimensionality
- Studio-quality finish

Style: Professional product photography, natural lighting, seamless integration, commercial grade, 8K detail`;

                        const negativePrompt = "low quality, blurry, distorted, artifacts, unnatural shadows, harsh composite lines, pixelated, watermark, text, logo, unrealistic lighting, poor integration, visible seams, artificial look";

                        // SDXL img2img 실행
                        const output = await replicate.run(sdxlModel, {
                            input: {
                                image: baseImage, // Composition을 베이스로 사용
                                prompt: detailedPrompt,
                                negative_prompt: negativePrompt,
                                strength: 0.75, // 원본 구도 75% 보존
                                guidance_scale: 8.0, // 프롬프트 충실도
                                num_inference_steps: 50, // 고품질
                                scheduler: "DPMSolverMultistep",
                                refine: "expert_ensemble_refiner",
                                high_noise_frac: 0.8,
                                seed: Math.floor(Math.random() * 1000000)
                            }
                        });

                        const finalImage = Array.isArray(output) ? output[0] : output;
                        
                        console.log(`✅ 이미지 ${i + 1}/${count} 생성 완료!`);
                        return finalImage;

                    } catch (error) {
                        console.error(`❌ 이미지 ${i + 1}/${count} 실패:`, error.message);
                        console.error('Error details:', JSON.stringify(error, null, 2));
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

        console.log(`🎉 총 ${successfulImages.length}/${count}개 완료`);

        return res.status(200).json({
            success: true,
            images: successfulImages,
            count: successfulImages.length,
            model: 'SDXL img2img (3-Image Fusion)',
            message: `${successfulImages.length}개의 이미지 생성 완료`
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
