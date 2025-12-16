// ========================================
// KAKAO THUMB AI - Flux Pro (이미지 직접 참조)
// ========================================

const Replicate = require("replicate");
const fetch = require("node-fetch");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    const imgbbApiKey = process.env.IMGBB_API_KEY;

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎨 KAKAO THUMB AI - Image-Referenced Generation");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    if (!replicateToken) {
      console.error("❌ REPLICATE_API_TOKEN 없음");
      return res.status(500).json({ success: false, error: "REPLICATE_API_TOKEN not configured" });
    }
    if (!imgbbApiKey) {
      console.error("❌ IMGBB_API_KEY 없음");
      return res.status(500).json({ success: false, error: "IMGBB_API_KEY not configured" });
    }

    const { image_urls, query, image_size = "2k", count = 4 } = req.body || {};

    console.log(`📋 요청 정보:`);
    console.log(`   - Count: ${count}`);
    console.log(`   - Images: ${image_urls?.length}개`);
    console.log(`   - Resolution: ${image_size}`);

    if (!image_urls || !Array.isArray(image_urls) || image_urls.length !== 3) {
      return res.status(400).json({ success: false, error: "3개의 이미지가 필요합니다." });
    }

    const safeCount = Math.max(1, Math.min(Number(count) || 4, 8));
    console.log(`✅ 생성할 이미지 수: ${safeCount}\n`);

    // Upload to imgbb
    async function uploadToImgbb(dataUri, name = "image") {
      try {
        const base64Data = String(dataUri).replace(/^data:image\/\w+;base64,/, "");
        const formData = new URLSearchParams();
        formData.append("key", imgbbApiKey);
        formData.append("image", base64Data);
        formData.append("name", name);

        const r = await fetch("https://api.imgbb.com/1/upload", { method: "POST", body: formData });
        if (!r.ok) throw new Error(`imgbb HTTP ${r.status}`);
        const j = await r.json();
        if (!j.success) throw new Error("imgbb API error");
        console.log(`  ✅ ${name}: ${j.data.url.substring(0, 60)}...`);
        return j.data.url;
      } catch (error) {
        console.error(`  ❌ ${name} 업로드 실패:`, error.message);
        throw error;
      }
    }

    // Extract URLs
    function extractUrls(output) {
      const urls = [];
      if (!output) return urls;
      if (typeof output === "string") return [output];
      if (Array.isArray(output)) {
        for (const item of output) urls.push(...extractUrls(item));
        return urls;
      }
      if (typeof output === "object") {
        if (output.url) urls.push(output.url);
        if (output.image) urls.push(output.image);
        if (output.output) urls.push(...extractUrls(output.output));
        if (output.images) urls.push(...extractUrls(output.images));
        if (output.data) urls.push(...extractUrls(output.data));
      }
      return urls.filter(Boolean);
    }

    // Upload images
    console.log("📤 이미지 업로드 중...");
    const [backgroundUrl, productUrl, compositionUrl] = await Promise.all([
      uploadToImgbb(image_urls[0], "background"),
      uploadToImgbb(image_urls[1], "product"),
      uploadToImgbb(image_urls[2], "composition"),
    ]);
    console.log("✅ 업로드 완료\n");
    console.log(`🔗 업로드된 URL:`);
    console.log(`   Background: ${backgroundUrl}`);
    console.log(`   Product: ${productUrl}`);
    console.log(`   Composition: ${compositionUrl}\n`);

    // Master Prompt - 이미지 URL 직접 명시
    const masterPrompt = `Create a professional product mood shot by combining these three reference images:

[BACKGROUND IMAGE URL]: ${backgroundUrl}
INSTRUCTIONS: Use this EXACT background surface. Copy the surface texture, color palette, lighting atmosphere, and material appearance AS-IS from this image. Do NOT generate new backgrounds or interpret materials.

[PRODUCT IMAGE URL]: ${productUrl}
INSTRUCTIONS: Use this EXACT product. This is a SUNSHINE luxury cosmetic jar with transparent glass body, white cap, and silver metallic band. Maintain the EXACT proportions, shape, transparency, and all product details from this image.

[COMPOSITION IMAGE URL]: ${compositionUrl}
INSTRUCTIONS: Follow this EXACT composition layout. Copy the product placement, camera angle, viewing perspective, and spatial arrangement from this reference.

CRITICAL REQUIREMENTS:
1. BACKGROUND: Must be identical to the background image provided - same texture, same colors, same lighting
2. PRODUCT: Must be identical to the product image provided - same shape, same materials, same branding
3. COMPOSITION: Must follow the layout shown in composition image
4. INTEGRATION: Place the product naturally on the background with realistic shadows and reflections
5. LIGHTING: Match the lighting from the background image
6. QUALITY: Professional commercial photography, photorealistic, 8K detail

DO NOT:
- Generate different backgrounds than shown in background image
- Create artistic interpretations or stylized versions
- Change product shape, color, or proportions
- Add decorative elements not present in references

${query || ""}`;

    const negativePrompt = `different background, different product, wrong composition, artistic interpretation, stylized rendering, cartoon, painting, illustration, wrong materials, wrong colors, wrong proportions, low quality, blurry, distorted, ugly, deformed`;

    // Initialize Replicate
    const replicate = new Replicate({ auth: replicateToken });

    // Single generation function
    const generateOne = async (index, seed) => {
      const startTime = Date.now();
      console.log(`🎨 [${index + 1}/${safeCount}] 생성 시작 (seed: ${seed})`);

      try {
        const output = await replicate.run("black-forest-labs/flux-pro", {
          input: {
            prompt: masterPrompt,
            negative_prompt: negativePrompt,
            image: compositionUrl,
            prompt_strength: 0.8,  // 이미지 참조 강도 증가
            guidance: 4.0,  // 가이던스 증가
            num_outputs: 1,
            aspect_ratio: "1:1",
            output_format: "png",
            output_quality: 100,
            prompt_upsampling: false,
            seed,
          },
        });

        const urls = extractUrls(output);
        const finalUrl = urls[0] || null;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        if (finalUrl) {
          console.log(`✅ [${index + 1}/${safeCount}] 완료 (${elapsed}s)`);
          console.log(`   URL: ${finalUrl.substring(0, 70)}...`);
        } else {
          console.log(`❌ [${index + 1}/${safeCount}] 실패 (${elapsed}s): URL 없음`);
        }

        return finalUrl;
      } catch (error) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.error(`❌ [${index + 1}/${safeCount}] 에러 (${elapsed}s):`, error.message);
        return null;
      }
    };

    // Parallel generation
    console.log(`🚀 ${safeCount}개 병렬 생성 시작...\n`);
    const seeds = Array.from({ length: safeCount }, () => Math.floor(Math.random() * 2147483647));

    const settled = await Promise.allSettled(seeds.map((s, i) => generateOne(i, s)));

    let images = settled
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value)
      .filter(Boolean);

    console.log(`\n📊 1차 결과: ${images.length}/${safeCount}개 성공`);

    // Retry if needed
    if (images.length < safeCount) {
      const need = safeCount - images.length;
      console.log(`⚠️  재시도: ${need}개\n`);

      const retrySeeds = Array.from({ length: need }, () => Math.floor(Math.random() * 2147483647));
      const retrySettled = await Promise.allSettled(retrySeeds.map((s, i) => generateOne(images.length + i, s)));

      const retryImages = retrySettled
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value)
        .filter(Boolean);

      images = images.concat(retryImages);
      console.log(`📊 재시도 결과: +${retryImages.length}개 (총 ${images.length}개)\n`);
    }

    if (images.length === 0) {
      console.error("❌ 모든 생성 실패\n");
      return res.status(500).json({
        success: false,
        error: "모든 이미지 생성 실패",
      });
    }

    images = images.slice(0, safeCount);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🎉 최종: ${images.length}/${safeCount}개 완료`);
    console.log(`💰 비용: $${(images.length * 0.055).toFixed(3)}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log(`📦 반환 이미지:`);
    images.forEach((url, i) => console.log(`  [${i + 1}] ${url.substring(0, 70)}...`));

    return res.status(200).json({
      success: true,
      images: images,
      count: images.length,
      model: "Flux Pro (Image-Referenced)",
      message: `${images.length}개 이미지 생성 완료 (이미지 참조 모드)`,
    });
  } catch (error) {
    console.error("\n❌ 최상위 에러:", error);
    return res.status(500).json({
      success: false,
      error: "Generation failed",
      message: error.message || "Unknown error",
    });
  }
};
