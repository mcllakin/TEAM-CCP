// ========================================
// KAKAO THUMB AI - Flux Dev Multi-Reference
// Optimized for Texture Accuracy
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

        console.log(`🎨 Flux Dev 파이프라인 시작 (${count}장 생성)`);

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
        // Flux Dev 순차 생성
        // ========================================
        const successfulImages = [];

        for (let i = 0; i < count; i++) {
            try {
                console.log(`\n📸 [${i + 1}/${count}] 생성 시작`);

                // 배경 질감 분석 및 설명 생성
                const backgroundDescription = `The background surface has a specific texture and pattern visible in the reference image. Analyze and replicate this EXACT surface appearance without assuming it is wood, fabric, metal, or any specific material. Copy the visual texture AS-IS: the surface pattern (grid lines, weave pattern, smooth surface, rough texture, or whatever is present), the exact color tones, the lighting characteristics, and the surface reflectivity. Do not interpret - directly replicate what you see.`;

                // 제품 정밀 설명
                const productDescription = `SUNSHINE cosmetic jar product with these EXACT specifications:
- Shape: Cylindrical jar (not rounded, not bowl-shaped)
- Body: Transparent crystal-clear glass (see-through, not opaque, not colored)
- Cap: Pure white dome top (not cream, not beige, not off-white)
- Label: Silver/chrome metallic band around the middle (not gold, not bronze, not copper)
- Branding: "SUNSHINE" text clearly visible and legible
- Size proportions: Match the exact height-to-width ratio from the product reference
- Glass clarity: Transparent with natural light reflections showing background through the glass`;

                // 통합 마스터 프롬프트
                const masterPrompt = `Create a professional product photography composition by precisely following these three reference images:

REFERENCE IMAGE 1 - BACKGROUND TEXTURE:
${backgroundDescription}

REFERENCE IMAGE 2 - PRODUCT SPECIFICATIONS:
${productDescription}

REFERENCE IMAGE 3 - COMPOSITION & PLACEMENT:
Position the product at the exact location shown in the composition reference. Match the camera angle, viewing perspective, product-to-camera distance, and product orientation exactly as shown. The product should be placed naturally on the background surface.

LIGHTING & INTEGRATION:
- Natural lighting matching the background reference's light direction and intensity
- Realistic shadows cast by the product matching the background's lighting angle
- Shadow softness and ambient occlusion appropriate to the background's lighting quality
- Glass reflections showing the background surface texture through transparency
- Color temperature consistent across the entire image
- Seamless integration with no visible composite artifacts

QUALITY STANDARDS:
- Photorealistic commercial product photography
- Professional e-commerce quality suitable for luxury cosmetics
- 8K detail and clarity
- Natural color accuracy
- Studio-quality lighting and composition

CRITICAL INSTRUCTION: This is reference-based photography. You must replicate what you SEE in the reference images without making assumptions about materials, adding artistic interpretation, or creating stylized variations. Copy the visual appearance directly and accurately.

${query}`;

                const negativePrompt = `wood texture, wooden surface, bamboo, fabric texture, metal surface, stone, concrete, marble, artistic interpretation, stylized, abstract, different product, wrong product shape, gold jar, bronze jar, copper jar, rose gold, opaque glass, colored glass, frosted glass, rounded jar, bowl shape, vase shape, cream cap, beige cap, colored cap, decorative objects, props, flowers, leaves, branches, fantasy elements, glowing effects, neon lights, bokeh lights, lens flare, unrealistic lighting, cartoon, anime, illustration, painting, sketch, watercolor, low quality, blurry, pixelated, distorted, deformed, wrong proportions, wrong text, no text, different branding, material assumptions`;

                const output = await replicate.run(
                    "black-forest-labs/flux-dev",
                    {
                        input: {
                            prompt: masterPrompt,
                            negative_prompt: negativePrompt,
                            image: compositionUrl,
                            prompt_strength: 0.75,
                            num_inference_steps: 30,
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

        return res.status(200).json({
            success: true,
            images: successfulImages,
            count: successfulImages.length,
            model: 'Flux Dev (Texture-Accurate)',
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
