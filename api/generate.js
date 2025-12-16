// ========================================
// KAKAO THUMB AI - Flux 1.1 Pro Ultra
// Multi-Image Reference + Ultra Quality
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

        console.log(`🎨 Flux 1.1 Pro Ultra 파이프라인 시작 (${count}장 생성)`);

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
        // Flux 1.1 Pro Ultra 순차 생성
        // ========================================
        const successfulImages = [];

        for (let i = 0; i < count; i++) {
            try {
                console.log(`\n📸 [${i + 1}/${count}] 생성 시작`);

                // 초정밀 프롬프트 (배경 질감 가정 제거)
                const masterPrompt = `Professional product photography composition using three reference images:

BACKGROUND TEXTURE ANALYSIS (Image 1 - Critical):
Examine the background surface in Image 1 and replicate its EXACT visual appearance without making ANY material assumptions:
- Surface pattern: Copy whatever pattern exists (grid lines, crosshatch, weave, smooth, textured, or any other visible pattern) exactly as seen
- Color palette: Replicate the precise color tones, shades, and gradients visible in the background
- Lighting quality: Match the ambient lighting, highlights, and shadow characteristics
- Surface finish: Observe and replicate the surface reflectivity or matte appearance as shown
- Texture details: Copy fine texture details visible in the reference
DO NOT assume this is wood, bamboo, fabric, metal, stone, or any specific material. Simply analyze the visual characteristics and replicate them precisely.

PRODUCT SPECIFICATIONS (Image 2 - Critical):
SUNSHINE luxury cosmetic jar with exact details:
- Container shape: Cylindrical cosmetic jar with gently rounded edges (NOT bowl-shaped, NOT spherical, NOT vase-like)
- Glass body: Completely transparent crystal-clear glass allowing full see-through visibility
- Glass quality: High clarity with natural light refraction and subtle reflections
- Cap design: Pure white dome-shaped top cap (NOT cream-colored, NOT beige, NOT off-white)
- Metallic band: Silver or chrome metallic ring around the middle section (NOT gold, NOT bronze, NOT copper, NOT rose gold)
- Branding: "SUNSHINE" text clearly visible and legible on the jar
- Proportions: Maintain the exact height-to-width ratio shown in the product reference
- Transparency note: The glass must show the background surface through the jar body

COMPOSITION GUIDANCE (Image 3 - Important):
- Product placement: Position the SUNSHINE jar at the same location shown in the composition reference
- Camera angle: Match the viewing perspective and camera height from the reference
- Product distance: Maintain similar product-to-camera distance as shown
- Product orientation: Match the jar's facing direction and rotation angle
- Overall layout: Follow the spatial arrangement from the composition reference

LIGHTING & INTEGRATION (Critical for Realism):
- Light direction: Natural lighting matching the background reference's light source direction
- Light intensity: Ambient light level consistent with the background atmosphere
- Shadow casting: Realistic product shadow matching the background's lighting angle and softness
- Shadow characteristics: Shadow density and edge softness appropriate to the lighting quality
- Glass reflections: Transparent glass body showing the background surface texture through the glass
- Glass highlights: Natural specular highlights on glass and cap surfaces
- Ambient occlusion: Subtle darkening where the product base meets the background surface
- Color harmony: Unified color temperature across the entire composition
- Seamless integration: No visible composite edges, perfect blending of product and background

QUALITY STANDARDS:
- Photorealistic rendering with natural appearance
- Professional commercial product photography quality
- Luxury cosmetics e-commerce standard
- 8K resolution detail and clarity
- Natural color accuracy and calibration
- Studio-quality composition and lighting
- Zero artificial effects or stylization

${query}

FINAL INSTRUCTION: Create a reference-accurate product photograph by precisely following the three input images. Do not add artistic interpretation, material assumptions, or creative variations. Replicate the visual information directly and accurately for professional commercial use.`;

                const negativePrompt = `material assumptions, wood texture, wooden surface, wooden background, bamboo texture, bamboo surface, woven wood, wood grain, timber, hardwood, plywood, fabric texture, fabric background, textile, cloth, canvas, linen, metal surface, metallic background, brushed metal, stone texture, concrete surface, marble background, artistic interpretation, stylized rendering, abstract composition, illustration style, painting effect, wrong product shape, spherical jar, rounded jar, bowl-shaped container, vase shape, bottle shape, gold jar, golden container, bronze tones, copper finish, rose gold, champagne gold, opaque glass, frosted glass, colored glass, tinted glass, translucent glass, milky glass, cream-colored cap, beige cap, off-white cap, colored cap, transparent cap, decorative elements, props, accessories, flowers, leaves, branches, petals, stones, crystals, fabric draping, ribbons, boxes, fantasy elements, magical effects, glowing effects, light rays, lens flare, bokeh lights, neon accents, sparkles, unrealistic lighting, dramatic shadows, high contrast, oversaturation, cartoon style, anime style, manga style, comic art, watercolor, oil painting, sketch, drawing, illustration, CGI look, 3D render look, low quality, blurry, pixelated, distorted proportions, deformed product, wrong dimensions, incorrect text, missing text, different branding, wrong logo, material guessing`;

                const output = await replicate.run(
                    "black-forest-labs/flux-1.1-pro-ultra",
                    {
                        input: {
                            prompt: masterPrompt,
                            negative_prompt: negativePrompt,
                            image: compositionUrl,
                            prompt_strength: 0.75,
                            output_quality: 100,
                            aspect_ratio: "1:1",
                            output_format: "png",
                            safety_tolerance: 2,
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
        console.log(`💰 예상 비용: $${(successfulImages.length * 0.04).toFixed(2)}`);

        return res.status(200).json({
            success: true,
            images: successfulImages,
            count: successfulImages.length,
            model: 'Flux 1.1 Pro Ultra (Best Quality)',
            message: `${successfulImages.length}개의 초고품질 이미지 생성 완료`
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
