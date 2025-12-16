// api/generate.js
// ========================================
// KAKAO THUMB AI - Flux Pro (4Ã—ç±  안정 반환)
// - 병량 생성 + 결과 평택화 + 강제 배열 반환
// ========================================

const Replicate = require("replicate");
const fetch = require("node-fetch");

module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept"
  );

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

    if (!image_urls || !Array.isArray(image_urls) || image_urls.length !== 3) {
      return res.status(400).json({ success: false, error: "3개의 이미지(image_urls[3])가 필요합니다." });
    }

    const safeCount = Math.max(1, Math.min(Number(count) || 4, 8)); // 1~8로 제한

    // ---------- helpers ----------
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
      return j.data.url;
    }

    // Replicate output에서 URL들을 최대한 안전하게 뽑아내는 함수
    function extractUrls(output) {
      const urls = [];

      if (!output) return urls;

      // 1) 문자열이면 URL로 간주
      if (typeof output === "string") {
        urls.push(output);
        return urls;
      }

      // 2) 배열이면 재귀적으로 평탄화
      if (Array.isArray(output)) {
        for (const item of output) urls.push(...extractUrls(item));
        return urls;
      }

      // 3) 객체면 흔한 키들을 탐색
      if (typeof output === "object") {
        // Replicate에서 종종 output 혹은 url 형태로 오는 케이스 대비
        if (typeof output.url === "string") urls.push(output.url);
        if (typeof output.image === "string") urls.push(output.image);
        if (typeof output.output === "string") urls.push(output.output);
        if (Array.isArray(output.output)) urls.push(...extractUrls(output.output));
        if (Array.isArray(output.images)) urls.push(...extractUrls(output.images));
        if (output.data) urls.push(...extractUrls(output.data));
      }

      return urls;
    }

    // ---------- 1) Upload 3 images to public URLs ----------
    const [backgroundUrl, productUrl, compositionUrl] = await Promise.all([
      uploadToImgbb(image_urls[0], "background"),
      uploadToImgbb(image_urls[1], "product"),
      uploadToImgbb(image_urls[2], "composition"),
    ]);

    // ---------- 2) Replicate ----------
    const replicate = new Replicate({ auth: replicateToken });

    // 프롬프트는 최소 유지 (너가 이미 갖고 있는 masterPrompt/negativePrompt를 여기에 붙여넣어도 됨)
    // 지금은 "4장" 문제 해결이 목표라서 짧게 유지.
    const masterPrompt = `Create a professional product mood shot by harmonizing background, product, and composition reference images.
- Use the 3 references for background look, product identity, and placement.
- Photorealistic, commercial quality.
${query || ""}`.trim();

    const runOnce = async (seed) => {
      const output = await replicate.run("black-forest-labs/flux-pro", {
        input: {
          prompt: masterPrompt,
          // ⚠️ flux-pro는 기본적으로 "이미지 참조"를 직접 받지 못할 수 있어.
          // 지금은 4장 반환 문제만 고치는 패치임.
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
      // 혹시 여러 개 나오면 첫 번째만 채택 (num_outputs:1이라 보통 1개)
      return urls[0] || null;
    };

    // ---------- 3) Generate in parallel ----------
    const seeds = Array.from({ length: safeCount }, () =>
      Math.floor(Math.random() * 2147483647)
    );

    const settled = await Promise.allSettled(seeds.map((s) => runOnce(s)));

    // ---------- 4) Collect success URLs ----------
    let images = settled
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value)
      .filter(Boolean);

    // ---------- 5) "가능한 한" 4장 채우기 (재시도 1회) ----------
    // Replicate/네트워크 오류로 일부 null이면 한 번 더 부족분만 재시도
    if (images.length < safeCount) {
      const need = safeCount - images.length;
      const retrySeeds = Array.from({ length: need }, () =>
        Math.floor(Math.random() * 2147483647)
      );
      const retrySettled = await Promise.allSettled(retrySeeds.map((s) => runOnce(s)));
      const retryImages = retrySettled
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value)
        .filter(Boolean);

      images = images.concat(retryImages);
    }

    // 최종적으로도 0장이면 실패 처리
    if (images.length === 0) {
      return res.status(500).json({
        success: false,
        error: "Generation failed",
        message: "모든 이미지 생성이 실패했습니다. Vercel/Replicate 로그를 확인해주세요.",
      });
    }

    // 최종: safeCount만큼만 자르기
    images = images.slice(0, safeCount);

    return res.status(200).json({
      success: true,
      images,                // ✅ 항상 배열
      count: images.length,  // ✅ 실제 반환 개수
      model: "black-forest-labs/flux-pro",
      debug: {
        requested: safeCount,
        uploaded_refs: { backgroundUrl, productUrl, compositionUrl }, // 디버그용 (원하면 제거)
      },
    });
  } catch (error) {
    console.error("❌ server error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error",
      message: error.message || "Unknown error",
    });
  }
};
