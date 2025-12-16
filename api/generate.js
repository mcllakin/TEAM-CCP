// ========================================
// KAKAO THUMB AI - Flux Pro (Parallel)
// Multi-Image Reference + High Quality
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
            console.error('\u274c REPLICATE_API_TOKEN not found');
            return res.status(500).json({
                success: false,
                error: 'Replicate API token not configured'
            });
        }

        if (!imgbbApiKey) {
            console.error('\u274c IMGBB_API_KEY not found');
            return res.status(500).json({
                success: false,
                error: 'imgbb API key not configured'
            });
        }

        const { image_urls, query, image_size = '2k', count = 4 } = req.body;

        if (!image_urls || !Array.isArray(image_urls) || image_urls.length !== 3) {
            return res.status(400).json({
                success: false,
                error: '3\uac1c의 \uc774미지가 \ud544요합니다'
            });
        }

        console.log(`\ud83c\udfa8 Flux Pro \ud30c이프\ub77c인 \uc2dc작 (${count}\uc7a5 \ubcc0럼 \uc0dd성)`);

        // ========================================
        // Data URI를 imgbb에 \uc5c5로드
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

                console.log(`  \u2705 ${name} \uc5c5로드: ${data.data.url.substring(0, 50)}...`);
                return data.data.url;

            } catch (error) {
                console.error(`  \u274c ${name} \uc5c5로드 \uc2e4패:`, error.message);
                throw error;
            }
        }

        // ========================================
        // 3\uac1c \uc774미지 \uc5c5로드
        // ========================================
        console.log('\n\ud83d\udce4 \uc774미지 \uc5c5로드 \uc911...');
        
        const [backgroundUrl, productUrl, compositionUrl] = await Promise.all([
            uploadToImgbb(image_urls[0], 'background'),
            uploadToImgbb(image_urls[1], 'product'),
            uploadToImgbb(image_urls[2], 'composition')
        ]);

        console.log('\u2705 \ubaa8든 \uc774미지 Public URL \ubcc0형 \uc644료!\n');

        // ========================================
        // Replicate \ucd08기화
        // ========================================
        const replicate = new Replicate({ auth: replicateToken });

        // ========================================
        // \ud504론트 \uc0dd성 \ud568수
        // ========================================
        function buildMasterPrompt(query) {
            return `Professional product photography composition using three reference images:

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
- High resolution detail and clarity
- Natural color accuracy and calibration
- Studio-quality composition and lighting
- Zero artificial effects or stylization

${query}

FINAL INSTRUCTION: Create a reference-accurate product photograph by precisely following the three input images. Do not add artistic interpretation, material assumptions, or creative variations. Replicate the visual information directly and accurately for professional commercial use.`;
        }

        const negativePrompt = `material assumptions, wood texture, wooden surface, wooden background, bamboo texture, bamboo surface, woven wood, wood grain, timber, hardwood, plywood, fabric texture, fabric background, textile, cloth, canvas, linen, metal surface, metallic background, brushed metal, stone texture, concrete surface, marble background, artistic interpretation, stylized rendering, abstract composition, illustration style, painting effect, wrong product shape, spherical jar, rounded jar, bowl-shaped container, vase shape, bottle shape, gold jar, golden container, bronze tones, copper finish, rose gold, champagne gold, opaque glass, frosted glass, colored glass, tinted glass, translucent glass, milky glass, cream-colored cap, beige cap, off-white cap, colored cap, transparent cap, decorative elements, props, accessories, flowers, leaves, branches, petals, stones, crystals, fabric draping, ribbons, boxes, fantasy elements, magical effects, glowing effects, light rays, lens flare, bokeh lights, neon accents, sparkles, unrealistic lighting, dramatic shadows, high contrast, oversaturation, cartoon style, anime style, manga style, comic art, watercolor, oil painting, sketch, drawing, illustration, CGI look, 3D render look, low quality, blurry, pixelated, distorted proportions, deformed product, wrong dimensions, incorrect text, missing text, different branding, wrong logo, material guessing`;

        // ========================================
        // \ubcc0럼 \uc0dd성 (Promise.all \uc0ac용)
        // ========================================
        console.log(`\n\ud83d\ude80 ${count}\uc7a5 \ubcc0럼 \uc0dd성 \uc2dc작...\n`);

        // \uac01 \uc774미지 \uc0dd성을 Promise\ub85c \uc0dd성하고 \ubc94위에 \uc800장
        const generationPromises = [];
        for (let i = 0; i < count; i++) {
            const promise = replicate.run(
                "black-forest-labs/flux-pro",
                {
                    input: {
                        prompt: buildMasterPrompt(query),
                        guidance: 3.5,
                        num_outputs: 1,
                        aspect_ratio: "1:1",
                        output_format: "png",
                        output_quality: 100,
                        prompt_upsampling: false,
                        seed: Math.floor(Math.random() * 2147483647)
                    }
                }
            )
            .then(output => {
                const finalImage = Array.isArray(output) ? output[0] : output;
                console.log(`\u2705 [${i + 1}/${count}] \uc0dd성 \uc644료: ${finalImage ? finalImage.substring(0, 50) + '...' : 'null'}`);
                return finalImage;
            })
            .catch(error => {
                console.error(`\u274c [${i + 1}/${count}] \uc2e4\ud328:`, error.message);
                return null; // \uc2e4\ud328\ud55c \uc0dd성은 null\ub85c \ucc98리
            });

            generationPromises.push(promise);
        }

        // \ubaa8든 \uc0dd성 \uc644료 \ub300기
        const results = await Promise.all(generationPromises);

        // \uc2e4\ud328\ud55c \ud56d목(null) \uc81c거
        const successfulImages = results.filter(img => img !== null);

        if (successfulImages.length === 0) {
            console.error('\u274c \ubaa8든 \uc774미지 \uc0dd성 \uc2e4\ud328');
            throw new Error('\uc774미지 \uc0dd성 \uc2e4\ud328');
        }

        console.log(`\n\ud83c\udf89 \ucd1d ${successfulImages.length}/${count}\uac1c \uc644\ub8cc`);
        console.log(`\ud83d\udcb0 \uc608상 \ube44용: $${(successfulImages.length * 0.055).toFixed(2)}`);

        return res.status(200).json({
            success: true,
            images: successfulImages,
            count: successfulImages.length,
            model: 'Flux Pro (High Quality)',
            message: `${successfulImages.length}\uac1c의 \uace0품질 \uc774미지 \uc0dd성 \uc644료`
        });

    } catch (error) {
        console.error('\u274c \uc11c버 \uc5d0러:', error);
        return res.status(500).json({
            success: false,
            error: 'Generation failed',
            message: error.message || '\uc774미지 \uc0dd성 \uc2e4\ud328'
        });
    }
};
