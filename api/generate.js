// ========================================
// KAKAO THUMB AI - Replicate API Integration
// Vercel Serverless Function
// ========================================

const Replicate = require('replicate');

module.exports = async (req, res) => {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // OPTIONS 요청 처리 (CORS preflight)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // POST 요청만 허용
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed',
            message: 'Only POST requests are supported'
        });
    }

    try {
        // API 토큰 확인
        const replicateToken = process.env.REPLICATE_API_TOKEN;
        if (!replicateToken) {
            console.error('❌ REPLICATE_API_TOKEN not found in environment variables');
            return res.status(500).json({
                success: false,
                error: 'Server configuration error',
                message: 'API token not configured'
            });
        }

        // 요청 데이터 파싱
        const { image_urls, query, image_size = '2k', count = 4 } = req.body;

        // 입력 검증
        if (!image_urls || !Array.isArray(image_urls) || image_urls.length !== 3) {
            return res.status(400).json({
                success: false,
                error: 'Invalid input',
                message: '3개의 이미지가 필요합니다 (background, product, composition)'
            });
        }

        console.log('🎨 이미지 생성 시작:', {
            count,
            resolution: image_size,
            prompt_length: query?.length || 0,
            image_formats: image_urls.map((url, i) => `Image ${i+1}: ${url.substring(0, 30)}...`)
        });

        // Replicate 클라이언트 초기화
        const replicate = new Replicate({
            auth: replicateToken,
        });

        // Flux Pro 모델 사용 - img2img 모드 (최고 품질)
        const model = "black-forest-labs/flux-pro";

        // 결과 배열
        const results = [];

        // 각 이미지 생성 (순차 또는 병렬)
        const generationPromises = [];

        for (let i = 0; i < count; i++) {
            // 프롬프트 개선 (제품 합성에 최적화)
            const enhancedPrompt = `${query}

Professional product photography, seamless composition, natural lighting integration, perfect shadows and reflections, photorealistic blend, high detail 8K, studio quality, commercial grade`;

            // Flux Pro는 Data URI 직접 지원
            const input = {
                prompt: enhancedPrompt,
                image: image_urls[2], // Composition 이미지를 베이스로 사용
                strength: 0.75, // 원본 이미지 보존 강도 (높을수록 원본 유지)
                guidance_scale: 3.5, // Flux Pro 최적값
                num_inference_steps: 30, // 고품질을 위해 증가
                aspect_ratio: "1:1", // 정사각형 출력
                safety_tolerance: 2, // 안전 필터 수준
                seed: Math.floor(Math.random() * 1000000) // 매번 다른 결과
            };

            // 병렬 실행을 위해 Promise 저장
            generationPromises.push(
                replicate.run(model, { input })
                    .then(output => {
                        console.log(`✅ 이미지 ${i + 1}/${count} 생성 완료`);
                        return Array.isArray(output) ? output[0] : output;
                    })
                    .catch(error => {
                        console.error(`❌ 이미지 ${i + 1}/${count} 생성 실패:`, error.message || error);
                        console.error('Error details:', JSON.stringify(error, null, 2));
                        return null;
                    })
            );
        }

        // 모든 생성 작업 완료 대기
        const generatedImages = await Promise.all(generationPromises);

        // 성공한 이미지만 필터링
        const successfulImages = generatedImages.filter(img => img !== null);

        if (successfulImages.length === 0) {
            console.error('❌ 모든 이미지 생성 실패. 마지막 에러 확인 필요');
            throw new Error('모든 이미지 생성 실패. Replicate API 에러를 확인하세요.');
        }

        console.log(`🎉 총 ${successfulImages.length}/${count}개 이미지 생성 완료`);

        // 성공 응답
        return res.status(200).json({
            success: true,
            images: successfulImages,
            count: successfulImages.length,
            model: 'Flux Pro',
            message: `${successfulImages.length}개의 이미지가 생성되었습니다`
        });

    } catch (error) {
        console.error('❌ 서버 에러:', error);

        // 에러 응답
        return res.status(500).json({
            success: false,
            error: 'Generation failed',
            message: error.message || '이미지 생성 중 오류가 발생했습니다',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
