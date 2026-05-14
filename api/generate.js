// ============================================================
// KAKAO THUMB AI — Backend API
// Nano Banana Pro (Gemini 3 Pro Image Preview) image generation
// ============================================================
//
// ─────────────────────────────────────────────────────────────
// REQUIRED ENVIRONMENT VARIABLES (set these in Vercel → Settings → Env Vars):
//
//   GEMINI_API_KEY      — Your Google AI Studio / Gemini API key
//                         Get one at: https://aistudio.google.com/apikey
//                         Required for Nano Banana Pro image generation.
//
// OPTIONAL:
//   GEMINI_MODEL        — Override the model name.
//                         Default: "gemini-3-pro-image-preview"
//                         (Nano Banana Pro). The legacy/standard model is
//                         "gemini-2.5-flash-image" (Nano Banana).
//
//   GEMINI_API_BASE     — Override the base URL.
//                         Default: "https://generativelanguage.googleapis.com/v1beta"
//
// ─────────────────────────────────────────────────────────────
// REQUEST CONTRACT (from /js/app.js):
//
// POST /api/generate
// {
//   "model": "gemini-3-pro-image-preview",
//   "prompt": "<full assembled master prompt>",
//   "count": 1..4,
//   "aspect_ratio": "1:1" | "4:5" | "16:9" | "9:16",
//   "image_size": "2k" | "4k",
//   "images": {
//     "product_sources": [dataUrl, ...],     // 1..6 product photos
//     "background_reference": dataUrl,        // mood/background reference
//     "gwp": dataUrl | null,                  // optional gift-with-purchase
//     "composition_guide": dataUrl | null     // optional composition lock
//   },
//   "identity": {
//     "product_name": "shell30ml",
//     "campaign_name": "PinkRibbon",
//     "material": "glass"|"leather"|...
//   }
// }
//
// RESPONSE:
// { "success": true, "images": ["data:image/png;base64,..." | "https://..."], "count": N }
// ─────────────────────────────────────────────────────────────

const DEFAULT_MODEL = 'gemini-3-pro-image-preview';
const DEFAULT_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MAX_PARALLEL = 4;

// Node 18+ has global fetch. Fallback to node-fetch if missing.
const fetchFn = typeof fetch !== 'undefined'
    ? fetch
    : (...args) => import('node-fetch').then(({ default: f }) => f(...args));

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
        const apiBase = process.env.GEMINI_API_BASE || DEFAULT_API_BASE;

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎨 KAKAO THUMB AI — Nano Banana Pro');
        console.log(`   Model: ${model}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        if (!apiKey) {
            console.error('❌ GEMINI_API_KEY not set');
            return res.status(500).json({
                success: false,
                error: 'GEMINI_API_KEY not configured',
                message: 'Set GEMINI_API_KEY in your environment (Vercel → Settings → Environment Variables). Get a key at https://aistudio.google.com/apikey'
            });
        }

        const body = req.body || {};
        const {
            prompt,
            count = 1,
            aspect_ratio = '1:1',
            images = {},
            identity = {}
        } = body;

        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({ success: false, error: 'prompt is required' });
        }

        const productSources = Array.isArray(images.product_sources) ? images.product_sources : [];
        const backgroundReference = images.background_reference || null;
        const gwp = images.gwp || null;
        const compositionGuide = images.composition_guide || null;

        if (productSources.length < 1) {
            return res.status(400).json({ success: false, error: '제품 사진은 최소 1장 필요합니다.' });
        }
        if (!backgroundReference) {
            return res.status(400).json({ success: false, error: 'Mood Reference 이미지가 필요합니다.' });
        }

        const safeCount = Math.max(1, Math.min(Number(count) || 1, 4));

        console.log(`📋 Request:`);
        console.log(`   product_sources: ${productSources.length}`);
        console.log(`   background_reference: ${backgroundReference ? 'yes' : 'no'}`);
        console.log(`   gwp: ${gwp ? 'yes' : 'no'}`);
        console.log(`   composition_guide: ${compositionGuide ? 'yes' : 'no'}`);
        console.log(`   count: ${safeCount}, aspect: ${aspect_ratio}`);
        console.log(`   product: ${identity.product_name || '(none)'}, campaign: ${identity.campaign_name || '(none)'}\n`);

        // Build parts: order matters for the model.
        // Composition guide first (if any), then mood reference, then product sources, then GWP.
        const parts = [];

        if (compositionGuide) {
            parts.push({ text: 'Image — Composition Guide (absolute layout lock):' });
            parts.push(toInlinePart(compositionGuide));
        }

        parts.push({ text: 'Image — Mood Reference (background material/lighting/atmosphere only, do not copy literal objects):' });
        parts.push(toInlinePart(backgroundReference));

        productSources.forEach((dataUrl, idx) => {
            parts.push({ text: `Image — Product Source ${idx + 1} (identity source of truth — preserve shape, label, logo, color, proportions, material exactly):` });
            parts.push(toInlinePart(dataUrl));
        });

        if (gwp) {
            parts.push({ text: 'Image — GWP / Gift-With-Purchase Object (SUPPORTING element only, smaller than the main product, reduced visual weight, must NOT compete for attention):' });
            parts.push(toInlinePart(gwp));
        }

        // Final prompt text
        parts.push({ text: `\n${prompt}\n\nAspect ratio: ${aspect_ratio}` });

        // Generate `safeCount` variations in parallel (each request returns one image)
        const generateOne = (index) => callGeminiImage({ apiKey, apiBase, model, parts, index });

        const tasks = Array.from({ length: safeCount }, (_, i) => generateOne(i));
        const settled = await runWithLimit(tasks, MAX_PARALLEL);

        const images_out = [];
        const errors = [];

        settled.forEach((result, idx) => {
            if (result.status === 'fulfilled' && result.value) {
                images_out.push(result.value);
            } else {
                console.error(`❌ image ${idx + 1} failed:`, result.reason?.message || result.reason);
                errors.push(result.reason?.message || 'unknown error');
            }
        });

        if (images_out.length === 0) {
            return res.status(500).json({
                success: false,
                error: 'All generations failed',
                message: errors[0] || 'No images returned',
                details: errors
            });
        }

        console.log(`\n✅ ${images_out.length}/${safeCount} images generated`);

        return res.status(200).json({
            success: true,
            images: images_out,
            count: images_out.length,
            model,
            message: `${images_out.length}개 이미지 생성 완료`
        });
    } catch (error) {
        console.error('❌ Top-level error:', error);
        return res.status(500).json({
            success: false,
            error: 'Generation failed',
            message: error.message || 'Unknown error'
        });
    }
};

// ────────────── Gemini call ──────────────
async function callGeminiImage({ apiKey, apiBase, model, parts, index }) {
    const url = `${apiBase}/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
    const startTime = Date.now();

    const requestBody = {
        contents: [{ role: 'user', parts }],
        generationConfig: {
            responseModalities: ['IMAGE'],
            // Optional tuning. Most fields are ignored by image models — kept for safety.
            temperature: 0.85,
            candidateCount: 1
        }
    };

    console.log(`  🚀 [${index + 1}] calling ${model}...`);

    const response = await fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (!response.ok) {
        const errBody = await response.text();
        let parsed = {};
        try { parsed = JSON.parse(errBody); } catch (_) {}
        const message = parsed?.error?.message || `HTTP ${response.status}`;
        console.error(`  ❌ [${index + 1}] failed in ${elapsed}s: ${message}`);
        throw new Error(`Gemini API error: ${message}`);
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];
    if (!candidate) {
        throw new Error('No candidate returned by Gemini');
    }

    const inlineParts = candidate?.content?.parts || [];
    const imagePart = inlineParts.find(p => p.inlineData?.data || p.inline_data?.data);

    if (!imagePart) {
        // Surface model's refusal text if any
        const textPart = inlineParts.find(p => p.text);
        const reason = textPart?.text ? ` Model said: "${textPart.text.substring(0, 200)}"` : '';
        throw new Error(`No image in Gemini response.${reason}`);
    }

    const inlineData = imagePart.inlineData || imagePart.inline_data;
    const mimeType = inlineData.mimeType || inlineData.mime_type || 'image/png';
    const base64 = inlineData.data;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    console.log(`  ✅ [${index + 1}] done in ${elapsed}s (${Math.round(base64.length / 1024)} KB)`);
    return dataUrl;
}

// Convert "data:image/jpeg;base64,xxx" → Gemini inline part
function toInlinePart(dataUrl) {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
    if (!match) {
        throw new Error('Invalid data URL provided for one of the input images.');
    }
    return {
        inlineData: {
            mimeType: match[1],
            data: match[2]
        }
    };
}

// Limit concurrency for parallel image generation
async function runWithLimit(tasks, limit) {
    const results = new Array(tasks.length);
    let i = 0;

    async function worker() {
        while (i < tasks.length) {
            const idx = i++;
            try {
                results[idx] = { status: 'fulfilled', value: await tasks[idx] };
            } catch (e) {
                results[idx] = { status: 'rejected', reason: e };
            }
        }
    }

    const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
    await Promise.all(workers);
    return results;
}
