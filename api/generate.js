// ========================================
// KAKAO THUMB AI - Fooocus img2img
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
    console.log("🎨 KAKAO THUMB AI - Fooocus img2img");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    if (!replicateToken) {
      console.error("❌ REPLICATE_API_TOKEN 없음");
      return res.status(500).json({ success: false, error: "REPLICATE_API_TOKEN not configured" });
    }
    if (!imgbbApiKey) {
      console.error("❌ IMGBB_API_KEY 없음");
      return res.status(500).json({ success: false, error: "IMGBB_API_KEY not configured" });
    }

    const { image_urls, query, count = 4 } = req.body || {};

    console.log(`📋 요청:`);
    console.log(`   Count: ${count}`);
    console.log(`   Images: ${image_urls?.length}개`);

    if (!image_urls || !Array.isArray(image_urls) || image_urls.length !== 3) {
      return res.status(400).json({ success: false, error: "3개의 이미지가 필요합니다." });
    }

    const safeCount = Math.max(1, Math.min(Number(count) || 4, 8));
    console.log(`✅ 생성 수: ${safeCount}\n`);

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
        if (!j.success) throw new Error("imgbb error");
        console.log(`  ✅ ${name}: ${j.data.url.substring(0, 50)}...`);
        return j.data.url;
      } catch (error) {
        console.error(`  ❌ ${name}:`, error.message);
        throw error;
      }
    }

    // Upload images
    console.log("📤 이미지 업로드 중...");
    const [backgroundUrl, productUrl, compositionUrl] = await Promise.all([
      uploadToImgbb(image_urls[0], "background"),
      uploadToImgbb(image_urls[1], "product"),
      uploadToImgbb(image_urls[2], "composition"),
    ]);
    console.log("✅ 업로드 완료\n");

    // 이미지 기반 프롬프트 (제품 설명 제거)
    const masterPrompt = `Professional product photography. Combine the product from the reference image with the background scene. Maintain exact product details: original shape, material, color, branding, and label text. Natural photorealistic lighting, realistic shadows and reflections. High quality commercial photography, 8K detail. ${query || ""}`;

    const negativePrompt = `different product, wrong branding, text changes, shape distortion, artistic interpretation, stylized, cartoon, anime, painting, illustration, low quality, blurry, distorted, ugly, deformed, extra elements`;

    const replicate = new Replicate({ auth: replicateToken });

    // Generate one image
    const generateOne = async (index, seed) => {
      const startTime = Date.now();
      console.log(`🎨 [${index + 1}/${safeCount}] 시작 (seed: ${seed})`);

      try {
        const output = await replicate.run(
          "konieshadow/fooocus-api:fda927242b1db6affa1ece4f54c37f19b964666bf23b0d06ae2439067cd344a4",
          {
            input: {
              prompt: masterPrompt,
              negative_prompt: negativePrompt,
              style_selections: "Fooocus V2,Fooocus Enhance,Fooocus Sharp",
              performance_selection: "Quality",
              aspect_ratios_selection: "1024*1024",
              image_number: 1,
              image_seed: seed,
              sharpness: 2.0,
              guidance_scale: 4.0,
              refiner_switch: 0.5,
              
              // 다중 이미지 참조 (핵심!)
              input_image: compositionUrl,
              mixing_image_prompt_and_vary_upscale: true,
              mixing_image_prompt_and_inpaint: false,
              
              // Inpaint/Outpaint 설정
              inpaint_additional_prompt: `Use the exact product from this image, preserve all details`,
              outpaint_selections: "",
              outpaint_distance_left: 0,
              outpaint_distance_right: 0,
              outpaint_distance_top: 0,
              outpaint_distance_bottom: 0,
              
              // Advanced
              adm_scaler_positive: 1.5,
              adm_scaler_negative: 0.8,
              adm_scaler_end: 0.3,
              adaptive_cfg: 7.0,
              sampler_name: "dpmpp_2m_sde_gpu",
              scheduler_name: "karras",
              overwrite_step: -1,
              overwrite_switch: -1,
              overwrite_width: -1,
              overwrite_height: -1,
              overwrite_vary_strength: -1,
              overwrite_upscale_strength: -1,
              disable_preview: false,
              disable_intermediate_results: true,
              disable_seed_increment: false,
              black_out_nsfw: false,
              adm_scaler_end_default: 0.3,
              adaptive_cfg_default: 7.0,
              sampler_name_default: "dpmpp_2m_sde_gpu",
              scheduler_name_default: "karras",
              generate_image_grid: false,
            }
          }
        );

        // Extract URL
        let finalUrl = null;
        if (typeof output === "string") {
          finalUrl = output;
        } else if (Array.isArray(output) && output.length > 0) {
          finalUrl = output[0];
        } else if (output?.url) {
          finalUrl = output.url;
        } else if (output?.output) {
          if (typeof output.output === "string") {
            finalUrl = output.output;
          } else if (Array.isArray(output.output)) {
            finalUrl = output.output[0];
          }
        }

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
    console.log(`💰 비용: $${(images.length * 0.01).toFixed(3)}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log(`📦 반환 이미지:`);
    images.forEach((url, i) => console.log(`  [${i + 1}] ${url.substring(0, 70)}...`));

    return res.status(200).json({
      success: true,
      images: images,
      count: images.length,
      model: "Fooocus (Image-Based)",
      message: `${images.length}개 이미지 생성 완료`,
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
