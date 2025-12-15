// ========================================
// KAKAO THUMB AI - Advanced Multi-Step Pipeline
// Optimized for Product Mood Shot Generation
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

        console.log('🎨 고급 파이프라인 시작:', {
            count,
            resolution: image_size,
            prompt_length: query?.length || 0
        });

        const replicate = new Replicate({ auth: replicateToken });

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
                        // STEP 1: 고급 Inpainting (제품 완전 제거)
                        // ========================================
                        console.log(`  [Step 1/3] 배경 정리 중...`);
                        
                        const cleanPrompt = `A clean, empty scene with natural lighting and shadows. Remove all products, objects, and items from the scene. Maintain the background atmosphere, lighting, color temperature, and mood. Professional photography, high quality, photorealistic.`;

                        const inpaintOutput = await replicate.run(
                            "stability-ai/stable-diffusion-inpainting",
                            {
                                input: {
                                    image: backgroundUrl,
                                    prompt: cleanPrompt,
                                    negative_prompt: "products, items, objects, text, watermark, logo, artifacts, blurry, low quality",
                                    num_inference_steps: 50,
                                    guidance_scale: 9.0,
                                    scheduler: "DPMSolverMultistep"
                                }
                            }
                        );

                        const cleanBackground = Array.isArray(inpaintOutput) ? inpaintOutput[0] : inpaintOutput;
                        console.log(`  ✅ Step 1 완료`);

                        // ========================================
                        // STEP 2: Flux Pro로 최종 합성
                        // ========================================
                        console.log(`  [Step 2/3] 제품 합성 중 (Flux Pro)...`);

                        const compositionPrompt = `${query}

Professional product photography mood shot:

COMPOSITION REQUIREMENTS:
- Place the product naturally in the scene following the composition reference
- Seamlessly integrate the product into the clean background
- Match the background's lighting direction, intensity, and color temperature
- Generate natural shadows that match the background lighting
- Add realistic reflections on the product surface that match the environment
- Perfect color harmony between product and background
- Professional studio quality with no composite artifacts

LIGHTING & SHADOWS:
- Shadows must match the background lighting angle and softness
- Natural light falloff and ambient occlusion
- Realistic specular highlights on product surfaces
- Color temperature consistency throughout the image

QUALITY STANDARDS:
- Ultra-high resolution and detail
- Photorealistic rendering
- Commercial photography grade
- No visible composite lines or artifacts
- Natural depth of field

Style: Professional commercial product photography, studio lighting, 8K detail, magazine quality`;

                        const fluxOutput = await replicate.run(
                            "black-forest-labs/flux-1.1-pro",
                            {
                                input: {
                                    prompt: compositionPrompt,
                                    aspect_ratio: "1:1",
                                    output_format: "png",
                                    output_quality: 100,
                                    safety_tolerance: 2,
                                    prompt_upsampling: true,
                                    seed: Math.floor(Math.random() * 1000000)
                                }
                            }
                        );

                        const finalImage = Array.isArray(fluxOutput) ? fluxOutput[0] : fluxOutput;
                        console.log(`  ✅ Step 2 완료`);

                        console.log(`✅ 이미지 ${i + 1}/${count} 생성 완료!\n`);
                        return finalImage;

                    } catch (error) {
                        console.error(`❌ 이미지 ${i + 1}/${count} 실패:`, error.message);
                        console.error('Error details:', JSON.stringify(error, null, 2));
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

        console.log(`🎉 총 ${successfulImages.length}/${count}개 완료`);

        return res.status(200).json({
            success: true,
            images: successfulImages,
            count: successfulImages.length,
            model: 'Advanced Pipeline (Inpainting + Flux 1.1 Pro)',
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
