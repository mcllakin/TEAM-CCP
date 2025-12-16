// ========================================
// KAKAO THUMB AI - Flux Pro (디버깅 강화)
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

    if (!replicateToken) {
      return res.status(500).json({ success: false, error: "REPLICATE_API_TOKEN not configured" });
    }
    if (!imgbbApiKey) {
      return res.status(500).json({ success: false, error: "IMGBB_API_KEY not configured" });
    }

    const { image_urls, query, image_size = "2k", count = 4 } = req.body || {};

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📋 요청 받음: count=${count}, image_urls=${image_urls?.length}개`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    if (!image_urls || !Array.isArray(image_urls) || image_urls.length !== 3) {
      return res.status(400).json({ success: false, error: "3개의 이미지가 필요합니다." });
    }

    const safeCount = Math.max(1, Math.min(Number(count) || 4, 8));
    console.log(`✅ 안전한 count 설정: ${safeCount}\n`);

    // Upload helper
    async function uploadToImgbb(dataUri, name = "image") {
      const base64Data = String(dataUri).replace(/^data:image\/\w+;base64,/, "");
      const formData = new URLSearchParams();
      formData.append("key", imgbbApiKey);
      formData.append("image", base64Data);
      formData.append("name", name);

      const r = await fetch("https://api.imgbb.com/1/upload", { method: "POST", body: formData });
      if (!r.ok) throw new Error(`imgbb upload failed: HTTP ${r.status}`);
      const j = await r.json();
      if (!j.success) throw new Error("imgbb API returned error");
      console.log(`  ✅ ${name}: ${j.data.url.substring(0, 50)}...`);
      return j.data.url;
    }

    // Extract URLs helper
    function extractUrls(output) {
      const urls = [];
      if (!output) return urls;
      if (typeof output === "string") {
        urls.push(output);
        return urls;
      }
      if (Array.isArray(output)) {
        for (const item of output) urls.push(...extractUrls(item));
        return urls;
      }
      if (typeof output === "object") {
        if (typeof output.url === "string") urls.push(output.url);
        if (typeof output.image === "string") urls.push(output.image);
        if (typeof output.output === "string") urls.push(output.output);
        if (Array.isArray(output.output)) urls.push(...extractUrls(output.output));
        if (Array.isArray(output.images)) urls.push(...extractUrls(output.images));
        if (output.data) urls.push(...extractUrls(output.data));
      }
      return urls;
    }

    // Upload 3 images
    console.log("📤 이미지 업로드 시작...");
    const [backgroundUrl, productUrl, compositionUrl] = await Promise.all([
      uploadToImgbb(image_urls[0], "background"),
      uploadToImgbb(image_urls[1], "product"),
      uploadToImgbb(image_urls[2], "composition"),
    ]);
    console.log("✅ 모든 이미지 업로드 완료\n");

    // Master Prompt
    const masterPrompt = `Professional product photography composition using three reference images:

BACKGROUND REFERENCE:
Analyze the background surface texture, color palette, lighting quality, and surface finish. Replicate these visual characteristics precisely without material assumptions.

PRODUCT REFERENCE:
SUNSHINE luxury cosmetic jar specifications:
- Cylindrical cosmetic jar with transparent crystal-clear glass body
- Pure white dome cap on top
- Silver/chrome metallic label band
- "SUNSHINE" branding clearly visible
- Maintain exact proportions and details

COMPOSITION REFERENCE:
Follow the product placement, camera angle, viewing perspective, and spatial arrangement.

INTEGRATION:
- Natural lighting matching background atmosphere
- Realistic product shadows and glass reflections
- Seamless photorealistic blending
- Professional commercial quality

${query || ""}`;

    const negativePrompt = `material assumptions, wood texture, wooden background, fabric, metal surface, artistic interpretation, stylized rendering, wrong product shape, gold tones, bronze tones, opaque glass, decorative props, fantasy elements, glowing effects, low quality, blurry, distorted`;

    // Replicate
    const replicate = new Replicate({ auth: replicateToken });

    const runOnce = async (index, seed) => {
      const startTime = Date.now();
      console.log(`🎨 [${index + 1}/${safeCount}] 생성 시작 (seed: ${seed})`);
      
      try {
        const output = await replicate.run("black-forest-labs/flux-pro", {
          input: {
            prompt: masterPrompt,
            negative_prompt: negativePrompt,
            image: compositionUrl,
            prompt_strength: 0.75,
            guidance: 3.5,
            num_outputs: 1,
            aspect_ratio: "1:1",
            output_format: "png",
            output_quality: 100,
            prompt_upsampling: false,
            seed,
          },
        });

        const urls = extractUrls(output).filter(Boolean);
        const finalUrl = urls[0] || null;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        
        if (finalUrl) {
          console.log(`✅ [${index + 1}/${safeCount}] 완료 (${elapsed}s): ${finalUrl.substring(0, 50)}...`);
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
    const seeds = Array.from({ length: safeCount }, () =>
      Math.floor(Math.random() * 2147483647)
    );

    const settled = await Promise.allSettled(
      seeds.map((s, i) => runOnce(i, s))
    );

    let images = settled
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value)
      .filter(Boolean);

    console.log(`\n📊 1차 생성 결과: ${images.length}/${safeCount}개 성공\n`);

    // Retry if needed
    if (images.length < safeCount) {
      const need = safeCount - images.length;
      console.log(`⚠️  부족분 재시도: ${need}개\n`);
      
      const retrySeeds = Array.from({ length: need }, () =>
        Math.floor(Math.random() * 2147483647)
      );
      
      const retrySettled = await Promise.allSettled(
        retrySeeds.map((s, i) => runOnce(images.length + i, s))
      );
      
      const retryImages = retrySettled
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value)
        .filter(Boolean);

      images = images.concat(retryImages);
      console.log(`\n📊 재시도 결과: +${retryImages.length}개 추가 (총 ${images.length}개)\n`);
    }

    if (images.length === 0) {
      console.error(`\n❌ 모든 이미지 생성 실패!\n`);
      return res.status(500).json({
        success: false,
        error: "모든 이미지 생성 실패",
      });
    }

    images = images.slice(0, safeCount);

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🎉 최종 결과: ${images.length}/${safeCount}개 완료`);
    console.log(`💰 예상 비용: $${(images.length * 0.055).toFixed(2)}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // ⚠️ 디버깅: 최종 배열 출력
    console.log(`📦 반환할 images 배열 (길이: ${images.length}):`);
    images.forEach((url, i) => {
      console.log(`  [${i}] ${url.substring(0, 60)}...`);
    });
    console.log();

    return res.status(200).json({
      success: true,
      images: images,  // ⚠️ 명시적으로 배열 반환
      count: images.length,
      model: "Flux Pro (High Quality)",
      message: `${images.length}개의 고품질 이미지 생성 완료`,
    });
  } catch (error) {
    console.error("\n❌ 서버 최상위 에러:", error);
    return res.status(500).json({
      success: false,
      error: "Generation failed",
      message: error.message || "Unknown error",
    });
  }
};
