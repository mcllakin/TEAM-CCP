// ========================================
// KAKAO THUMB AI - Image-Based Generation
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
    console.log("🎨 KAKAO THUMB AI - Image-Based");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    if (!replicateToken || !imgbbApiKey) {
      return res.status(500).json({ success: false, error: "API keys not configured" });
    }

    const { image_urls, query, count = 4 } = req.body || {};

    if (!image_urls || !Array.isArray(image_urls) || image_urls.length !== 3) {
      return res.status(400).json({ success: false, error: "3개의 이미지가 필요합니다." });
    }

    const safeCount = Math.max(1, Math.min(Number(count) || 4, 8));

    // Upload to imgbb
    async function uploadToImgbb(dataUri, name = "image") {
      const base64Data = String(dataUri).replace(/^data:image\/\w+;base64,/, "");
      const formData = new URLSearchParams();
      formData.append("key", imgbbApiKey);
      formData.append("image", base64Data);
      formData.append("name", name);

      const r = await fetch("https://api.imgbb.com/1/upload", { method: "POST", body: formData });
      if (!r.ok) throw new Error(`imgbb HTTP ${r.status}`);
      const j = await r.json();
      if (!j.success) throw new Error("imgbb error");
      console.log(`  ✅ ${name}`);
      return j.data.url;
    }

    console.log("📤 업로드 중...");
    const [backgroundUrl, productUrl, compositionUrl] = await Promise.all([
      uploadToImgbb(image_urls[0], "background"),
      uploadToImgbb(image_urls[1], "product"),
      uploadToImgbb(image_urls[2], "composition"),
    ]);
    console.log("✅ 완료\n");

    // 이미지 중심 프롬프트 (제품 설명 제거)
    const masterPrompt = `Photorealistic product photography. Recreate the exact product from the reference image with all original details: shape, material, color, branding, label text. Place it on the background surface shown in the reference. Match the composition, lighting, and atmosphere from the reference images. Professional commercial photography quality, 8K detail, natural lighting, realistic shadows and reflections. ${query || ""}`;

    const negativePrompt = `different product, different branding, wrong text, wrong shape, SUNSHINE text (unless in original), artistic interpretation, stylized, cartoon, painting, illustration, low quality, blurry, distorted`;

    const replicate = new Replicate({ auth: replicateToken });

    // Generate one
    const generateOne = async (index, seed) => {
      console.log(`🎨 [${index + 1}/${safeCount}] 시작 (seed: ${seed})`);

      try {
        const output = await replicate.run("black-forest-labs/flux-pro", {
          input: {
            prompt: masterPrompt,
            negative_prompt: negativePrompt,
            image: compositionUrl,
            prompt_strength: 0.85, // 이미지 참조 강도 증가
            guidance: 2.5, // 프롬프트 영향 감소
            num_outputs: 1,
            aspect_ratio: "1:1",
            output_format: "png",
            output_quality: 100,
            prompt_upsampling: false,
            seed,
          },
        });

        const urls = [];
        if (typeof output === "string") urls.push(output);
        else if (Array.isArray(output)) urls.push(...output);
        else if (output?.url) urls.push(output.url);

        const finalUrl = urls[0] || null;

        if (finalUrl) {
          console.log(`✅ [${index + 1}/${safeCount}] 완료`);
        } else {
          console.log(`❌ [${index + 1}/${safeCount}] 실패`);
        }

        return finalUrl;
      } catch (error) {
        console.error(`❌ [${index + 1}/${safeCount}] 에러:`, error.message);
        return null;
      }
    };

    // Parallel
    console.log(`🚀 ${safeCount}개 병렬 생성...\n`);
    const seeds = Array.from({ length: safeCount }, () => Math.floor(Math.random() * 2147483647));

    const settled = await Promise.allSettled(seeds.map((s, i) => generateOne(i, s)));

    let images = settled
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value)
      .filter(Boolean);

    console.log(`\n📊 1차: ${images.length}/${safeCount}개`);

    // Retry
    if (images.length < safeCount) {
      const need = safeCount - images.length;
      console.log(`⚠️ 재시도: ${need}개\n`);

      const retrySeeds = Array.from({ length: need }, () => Math.floor(Math.random() * 2147483647));
      const retrySettled = await Promise.allSettled(retrySeeds.map((s, i) => generateOne(images.length + i, s)));

      const retryImages = retrySettled
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value)
        .filter(Boolean);

      images = images.concat(retryImages);
      console.log(`📊 최종: ${images.length}개\n`);
    }

    if (images.length === 0) {
      return res.status(500).json({
        success: false,
        error: "모든 생성 실패",
      });
    }

    images = images.slice(0, safeCount);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🎉 완료: ${images.length}/${safeCount}개`);
    console.log(`💰 비용: $${(images.length * 0.055).toFixed(3)}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    return res.status(200).json({
      success: true,
      images: images,
      count: images.length,
      model: "Flux Pro (Image-Based)",
      message: `${images.length}개 생성 완료`,
    });
  } catch (error) {
    console.error("\n❌ 에러:", error);
    return res.status(500).json({
      success: false,
      error: "Generation failed",
      message: error.message,
    });
  }
};
