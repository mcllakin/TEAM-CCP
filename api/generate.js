// ========================================
// KAKAO THUMB AI - Ideogram V2 Remix
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

        console.log(`🎨 Ideogram V2 파이프라인 시작 (${count}장 생성)`);

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
        
        // Ideogram V2 Turbo 모델 (정확한 경로)
        const ideogramModel = "ideogram-ai/ideogram-v2-turbo";

        // ========================================
        // 순차 생성 (count만큼) - 안정성 우선
        // ========================================
        const successfulImages = [];

        for (let i = 0; i < count; i++) {
            try {
                console.log(`\n📸 [${i + 1}/${count}] 생성 시작`);

                // 초강력 프롬프트 (배경/제품/구도 최대 보존)
                const masterPrompt = `CRITICAL REFERENCE-BASED PRODUCT PHOTOGRAPHY COMPOSITION:

YOU MUST PRESERVE 90% OF THE REFERENCE IMAGES. DO NOT CREATE NEW ELEMENTS.

═══════════════════════════════════════════════════════════
IMAGE 1 - BACKGROUND REFERENCE (PRESERVE 95%):
═══════════════════════════════════════════════════════════
MANDATORY REQUIREMENTS:
✓ ANALYZE Image 1 and EXTRACT its EXACT surface texture AS-IS
✓ REPLICATE WHATEVER surface pattern exists in Image 1 (grid, smooth, rough, etc.)
✓ PRESERVE the EXACT color tones visible in Image 1 background
✓ MAINTAIN WHATEVER surface material appears in Image 1 (do not assume)
✓ KEEP the EXACT lighting angle, intensity, and shadows from Image 1
✓ DO NOT interpret what material it is - just COPY what you SEE
✓ DO NOT substitute or assume materials (wood, fabric, metal, etc.)
✓ DO NOT add patterns not present in Image 1
✓ DO NOT change the surface appearance based on assumptions
✓ USE Image 1's visual texture DIRECTLY - no material assumptions

═══════════════════════════════════════════════════════════
IMAGE 2 - PRODUCT REFERENCE (PRESERVE 95%):
═══════════════════════════════════════════════════════════
CRITICAL PRODUCT SPECIFICATIONS:
✓ PRODUCT NAME: "SUNSHINE" - MUST appear on jar
✓ EXACT SHAPE: Cylindrical cosmetic jar with rounded edges
✓ EXACT MATERIALS: 
  - Body: TRANSPARENT GLASS (see-through, crystal clear)
  - Cap: WHITE plastic dome top
  - Label band: SILVER/CHROME metallic ring
✓ EXACT COLORS:
  - Glass body: TRANSPARENT with slight reflections
  - Cap: PURE WHITE (not cream, not off-white)
  - Label: SILVER metallic (not gold, not bronze)
✓ EXACT PROPORTIONS: Use the EXACT height-to-width ratio from Image 2
✓ EXACT TEXT: "SUNSHINE" branding MUST be visible and legible
✓ DO NOT change product shape to rounded or bowl-like
✓ DO NOT change glass to opaque or colored material
✓ DO NOT change silver to gold/bronze/copper tones

═══════════════════════════════════════════════════════════
IMAGE 3 - COMPOSITION REFERENCE (PRESERVE 85%):
═══════════════════════════════════════════════════════════
POSITIONING REQUIREMENTS:
✓ EXACT PLACEMENT: Position product at the SAME location as Image 3
✓ EXACT ANGLE: Use the SAME camera angle and viewing perspective
✓ EXACT DISTANCE: Match the product-to-camera distance from Image 3
✓ EXACT ORIENTATION: Product facing direction MUST match Image 3
✓ DO NOT move product to different position
✓ DO NOT change camera angle or perspective

═══════════════════════════════════════════════════════════
LIGHTING & SHADOW INTEGRATION:
═══════════════════════════════════════════════════════════
✓ Shadows MUST match the natural lighting direction from Image 1
✓ Shadow softness MUST replicate Image 1's ambient light quality
✓ Glass reflections MUST show WHATEVER texture is visible in Image 1 background
✓ Ambient occlusion at product base MUST be natural and subtle
✓ Color temperature MUST remain consistent with Image 1

═══════════════════════════════════════════════════════════
ABSOLUTE PROHIBITIONS (DO NOT DO):
═══════════════════════════════════════════════════════════
✗ DO NOT change product shape from cylindrical to rounded/bowl
✗ DO NOT change transparent glass to opaque/colored materials
✗ DO NOT change silver label to gold/bronze/copper/rose gold
✗ DO NOT change white cap to cream/beige/colored cap
✗ DO NOT assume background is wood/fabric/metal - use Image 1 AS-IS
✗ DO NOT interpret material type - just replicate visual texture from Image 1
✗ DO NOT add decorative objects not present in references
✗ DO NOT change "SUNSHINE" text to other words
✗ DO NOT create artistic/stylized interpretations
✗ DO NOT add glowing effects or unnatural lighting

${query}

FINAL OUTPUT REQUIREMENTS:
- Photorealistic commercial product photography
- SUNSHINE jar with EXACT specifications from Image 2
- Positioned EXACTLY as shown in Image 3
- Background EXACTLY COPIED from Image 1 (no interpretation, direct replication)
- Natural lighting integration with realistic shadows
- Professional e-commerce quality suitable for luxury cosmetics
- Zero artistic interpretation - STRICT reference adherence

YOU ARE CREATING A REFERENCE-ACCURATE PRODUCT PHOTOGRAPH, NOT AN ARTISTIC INTERPRETATION.
DO NOT GUESS MATERIALS - USE EXACTLY WHAT YOU SEE IN THE REFERENCE IMAGES.`;

                // Ideogram V2 Turbo 실행 (강력한 설정)
                const output = await replicate.run(ideogramModel, {
                    input: {
                        prompt: masterPrompt,
                        negative_prompt: "artistic interpretation, stylized, abstract, different product, wrong colors, gold jar, bronze jar, copper jar, rose gold, opaque glass, colored glass, rounded jar, bowl shape, vase shape, cream cap, beige cap, colored cap, stone background, concrete background, marble background, fabric background, decorative objects, props, flowers, leaves, fantasy elements, glowing effects, neon lights, bokeh lights, unrealistic, cartoon, anime, painting, sketch, watercolor, low quality, blurry, distorted, deformed product, wrong text, no SUNSHINE text, different branding, wrong product shape",
                        image_file: compositionUrl,
                        style_type: "Realistic",
                        magic_prompt_option: "Off", // 프롬프트 자동 수정 끄기!
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
            model: 'Ideogram V2 Remix (Best Quality)',
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
