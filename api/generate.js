// ========================================
// KAKAO THUMB AI - Fooocus (ComfyUI 기반)
// 진짜 3-이미지 참조 지원
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

    if (!replicateToken || !imgbbApiKey) {
      return res.status(500).json({ success: false, error: "API keys not configured" });
    }

    const { image_urls, query, count = 4 } = req.body || {};

    if (!image_urls || !Array.isArray(image_urls) || image_urls.length !== 3) {
      return res.status(400).json({ success: false, error: "3개의 이미지 필요" });
    }

    const safeCount = Math.max(1, Math.min(Number(count) || 4, 8));
    console.log(`\n🎨 Fooocus 파이프라인 시작 (${safeCount}장 생성)\n`);

    // Upload helper
    async function uploadToImgbb(dataUri, name = "image") {
      const base64Data = String(dataUri).replace(/^data:image\/\w+;base64,/, "");
      const formData = new URLSearchParams();
      formData.append("key", imgbbApiKey);
      formData.append("image", base64Data);
      formData.append("name", name);

      const r = await fetch("https://api.imgbb.com/1/upload", { method: "POST", body: formData });
      if (!r.ok) throw new Error(`imgbb failed: ${r.status}`);
      const j = await r.json();
      if (!j.success) throw new Error("imgbb error");
      console.log(`  ✅ ${name}: ${j.data.url.substring(0, 50)}...`);
      return j.data.url;
    }

    // Upload 3 images
    console.log("📤 이미지 업로드...");
    const [backgroundUrl, productUrl, compositionUrl] = await Promise.all([
      uploadToImgbb(image_urls[0], "background"),
      uploadToImgbb(image_urls[1], "product"),
      uploadToImgbb(image_urls[2], "composition"),
    ]);
    console.log("✅ 업로드 완료\n");

    const replicate = new Replicate({ auth: replicateToken });

    // Fooocus는 image_prompts를 지원 (최대 4개 이미지)
    const runOnce = async (index, seed) => {
      console.log(`🎨 [${index + 1}/${safeCount}] 생성 시작 (seed: ${seed})`);
      
      try {
        const output = await replicate.run(
          "konieshadow/fooocus-api",
          {
            input: {
              prompt: `Professional product photography: SUNSHINE cosmetic jar on background surface. 
${query || ""}
High quality, photorealistic, commercial grade, studio lighting, natural shadows.`,
              
              negative_prompt: "low quality, blurry, distorted, ugly, deformed, wrong colors, cartoon, anime, artistic, painting",
              
              // ✅ Fooocus는 image_prompts로 3개 이미지 모두 참조 가능!
              image_prompts: [
                {
                  cn_img: compositionUrl,  // 구도 참조
                  cn_stop: 0.6,
                  cn_weight: 0.8,
                  cn_type: "ImagePrompt"
                },
                {
                  cn_img: productUrl,  // 제품 참조
                  cn_stop: 0.8,
                  cn_weight: 0.9,
                  cn_type: "FaceSwap"  // 제품 일관성
                },
                {
                  cn_img: backgroundUrl,  // 배경 참조
                  cn_stop: 0.5,
                  cn_weight: 0.7,
                  cn_type: "ImagePrompt"
                }
              ],
              
              style_selections: ["Fooocus V2", "Fooocus Enhance", "Fooocus Sharp"],
              performance_selection: "Quality",
              aspect_ratios_selection: "1024*1024",
              image_number: 1,
              image_seed: seed,
              sharpness: 2,
              guidance_scale: 4,
              refiner_switch: 0.8,
              
              output_format: "png",
            }
          }
        );

        let finalUrl = null;
        if (Array.isArray(output) && output.length > 0) {
          finalUrl = output[0];
        } else if (typeof output === "string") {
          finalUrl = output;
        } else if (output?.output) {
          finalUrl = Array.isArray(output.output) ? output.output[0] : output.output;
        }

        if (finalUrl) {
          console.log(`✅ [${index + 1}/${safeCount}] 완료: ${finalUrl.substring(0, 50)}...`);
        } else {
          console.log(`❌ [${index + 1}/${safeCount}] 실패: URL 없음`);
        }
        
        return finalUrl;
      } catch (error) {
        console.error(`❌ [${index + 1}/${safeCount}] 에러:`, error.message);
        return null;
      }
    };

    // Parallel generation
    console.log(`🚀 ${safeCount}개 병렬 생성...\n`);
    const seeds = Array.from({ length: safeCount }, () =>
      Math.floor(Math.random() * 2147483647)
    );

    const results = await Promise.all(
      seeds.map((s, i) => runOnce(i, s))
    );

    let images = results.filter(Boolean);

    console.log(`\n📊 1차 결과: ${images.length}/${safeCount}개\n`);

    // Retry
    if (images.length < safeCount) {
      const need = safeCount - images.length;
      console.log(`⚠️ 재시도: ${need}개\n`);
      
      const retrySeeds = Array.from({ length: need }, () =>
        Math.floor(Math.random() * 2147483647)
      );
      
      const retryResults = await Promise.all(
        retrySeeds.map((s, i) => runOnce(images.length + i, s))
      );
      
      const retryImages = retryResults.filter(Boolean);
      images = images.concat(retryImages);
      
      console.log(`📊 재시도 후: ${images.length}개\n`);
    }

    if (images.length === 0) {
      return res.status(500).json({
        success: false,
        error: "모든 생성 실패",
      });
    }

    images = images.slice(0, safeCount);

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🎉 최종: ${images.length}/${safeCount}개 완료`);
    console.log(`💰 비용: $${(images.length * 0.01).toFixed(2)}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    console.log(`📦 반환 배열 (길이: ${images.length}):`);
    images.forEach((url, i) => {
      console.log(`  [${i}] ${url.substring(0, 70)}...`);
    });

    return res.status(200).json({
      success: true,
      images: images,
      count: images.length,
      model: "Fooocus (ComfyUI-based)",
      message: `${images.length}개 생성 완료`,
    });
  } catch (error) {
    console.error("\n❌ 서버 에러:", error);
    return res.status(500).json({
      success: false,
      error: "Generation failed",
      message: error.message,
    });
  }
};
