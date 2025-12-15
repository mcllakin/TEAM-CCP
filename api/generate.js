// ========================================
// KAKAO THUMB AI - Multi-Step Replicate Pipeline
// Step 1: Background Inpainting (제품 제거)
// Step 2: Product ControlNet (윤곽 추출)
// Step 3: Final Composition (자연스러운 합성)
// ========================================

const Replicate = require('replicate');

module.exports = async (req, res) => {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // OPTIONS 요청 처리
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // POST 요청만 허용
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }

    try {
        // API 토큰 확인
        const replicateToken = process.env.REPLICATE_API_TOKEN;
        if (!replicateToken) {
            console.error('❌ REPLICATE_API_TOKEN not found');
            return res.status(500).json({
                success: false,
                error: 'API token not configured'
            });
        }

        // 요청 데이터 파싱
        const { image_urls, query, image_size = '2k', count = 4 } = req.body;

        // 입력 검증
        if (!image_urls || !Array.isArray(image_urls) || image_urls.length !== 3) {
            return res.status(400).json({
                success: false,
                error: '3개의 이미지가 필요합니다 (background, product, composition)'
            });
        }

        const [backgroundUrl, productUrl, compositionUrl] = image_urls;

        console.log('🎨 3단계 파이프라인 시작:', {
            count,
            resolution: image_size,
            prompt_length: query?.length || 0
        });

        // Replicate 클라이언트 초기화
        const replicate = new Replicate({ auth: replicateToken });

        // 결과 배열
        const results = [];

        // ========================================
        // 각 이미지 생성 (병렬 처리)
        // ========================================
        const generationPromises = [];

        for (let i = 0; i < count; i++) {
            generationPromises.push(
                (async () => {
                    try {
                        console.log(`\n📸 이미지 ${i + 1}/${count} 생성 시작`);

                        // ========================================
                        // STEP 1: Background Inpainting (제품 제거)
                        // ========================================
                        console.log(`  [Step 1/3] Background 제품 제거 중...`);
                        
                        const inpaintingModel = "stability-ai/stable-diffusion-inpainting";
                        const cleanBackgroundOutput = await replicate.run(inpaintingModel, {
                            input: {
                                image: backgroundUrl,
                                prompt: "empty background, remove all products, clean scene, natural lighting, photorealistic",
                                negative_prompt: "products, objects, items, text, watermark",
                                num_inference_steps: 25,
                                guidance_scale: 7.5
                            }
                        });

                        const cleanBackground = Array.isArray(cleanBackgroundOutput) 
                            ? cleanBackgroundOutput[0] 
                            : cleanBackgroundOutput;

                        console.log(`  ✅ Step 1 완료: ${cleanBackground.substring(0, 50)}...`);

                        // ========================================
                        // STEP 2: Product ControlNet (윤곽 추출)
                        // ========================================
                        console.log(`  [Step 2/3] Product 윤곽 추출 중...`);
                        
                        const controlnetModel = "jagilley/controlnet-canny";
                        const productEdgeOutput = await replicate.run(controlnetModel, {
                            input: {
                                image: productUrl,
                                prompt: "product edge detection, clear outline, high contrast",
                                structure: "canny"
                            }
                        });

                        const productEdge = Array.isArray(productEdgeOutput) 
                            ? productEdgeOutput[0] 
                            : productEdgeOutput;

                        console.log(`  ✅ Step 2 완료: ${productEdge.substring(0, 50)}...`);

                        // ========================================
                        // STEP 3: Final Composition (Flux Pro 합성)
                        // ========================================
                        console.log(`  [Step 3/3] 최종 합성 중 (Flux Pro)...`);

                        const finalPrompt = `${query}

Create a photorealistic product mood shot by:
1. Using the clean background as the base scene
2. Seamlessly integrating the product at the composition reference position
3. Matching natural lighting, shadows, and reflections perfectly
4. Adjusting color temperature to harmonize with the background atmosphere
5. Maintaining ultra-high quality with no composite artifacts

Style: Professional commercial photography, studio quality, 8K detail, natural integration`;

                        const fluxModel = "black-forest-labs/flux-pro";
                        const finalOutput = await replicate.run(fluxModel, {
                            input: {
                                prompt: finalPrompt,
                                image: compositionUrl, // 구도 참조
                                strength: 0.65, // 구도는 참고만
                                guidance_scale: 3.5,
                                num_inference_steps: 35,
                                aspect_ratio: "1:1",
                                safety_tolerance: 2,
                                seed: Math.floor(Math.random() * 1000000)
                            }
                        });

                        const finalImage = Array.isArray(finalOutput) ? finalOutput[0] : finalOutput;

                        console.log(`  ✅ Step 3 완료: ${finalImage.substring(0, 50)}...`);
                        console.log(`✅ 이미지 ${i + 1}/${count} 생성 완료!\n`);

                        return finalImage;

                    } catch (error) {
                        console.error(`❌ 이미지 ${i + 1}/${count} 생성 실패:`, error.message);
                        console.error('Error details:', JSON.stringify(error, null, 2));
                        return null;
                    }
                })()
            );
        }

        // 모든 생성 작업 완료 대기
        const generatedImages = await Promise.all(generationPromises);

        // 성공한 이미지만 필터링
        const successfulImages = generatedImages.filter(img => img !== null);

        if (successfulImages.length === 0) {
            console.error('❌ 모든 이미지 생성 실패');
            throw new Error('모든 이미지 생성 실패. Replicate API 에러를 확인하세요.');
        }

        console.log(`🎉 총 ${successfulImages.length}/${count}개 이미지 생성 완료`);

        // 성공 응답
        return res.status(200).json({
            success: true,
            images: successfulImages,
            count: successfulImages.length,
            model: '3-Step Pipeline (Inpainting + ControlNet + Flux Pro)',
            message: `${successfulImages.length}개의 고품질 합성 이미지가 생성되었습니다`
        });

    } catch (error) {
        console.error('❌ 서버 에러:', error);

        return res.status(500).json({
            success: false,
            error: 'Generation failed',
            message: error.message || '이미지 생성 중 오류가 발생했습니다',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
