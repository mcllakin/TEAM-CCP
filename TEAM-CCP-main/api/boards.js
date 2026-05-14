// ============================================================
// IIC AI Generator — Asset Boards API
// GET /api/boards
//
// Returns the server-side curated asset library that powers the
// UI boards on the frontend. The frontend pulls from this on load
// and lets users CLICK to select assets instead of uploading.
//
// ────────────────────────────────────────────────────────────
// CONTRACT — what the frontend expects:
//
// {
//   "boards": {
//     "product-official": [ AssetItem, ... ],
//     "product-draft":    [ AssetItem, ... ],
//     "package":          [ AssetItem, ... ],
//     "gwp":              [ AssetItem, ... ]
//   }
// }
//
// AssetItem shape:
// {
//   "id":        "shell30ml-sunshine",          // unique, kebab-case
//   "label":     "SHELL 30ml — SUNSHINE",       // human-readable for the UI badge
//   "thumbnail": "https://cdn.../thumb.jpg",    // small preview image URL (or data URL)
//   "dataUrl":   "https://cdn.../full.png",     // full-resolution PNG/JPG URL the model will consume
//   "tags":      ["perfume","glass","30ml"],    // optional, for future filtering
//   "createdAt": "2026-05-01T00:00:00Z"         // optional
// }
//
// Boards split by intent:
// - product-official: production cutouts, brand-approved. Use for final renders.
// - product-draft:    AI-generated / WIP cutouts. Use for fast iteration only.
// - package:          box + ribbon compositions (e.g. "Heart box · Blue ribbon").
// - gwp:              gift-with-purchase items (e.g. "BLUE HINOKI 2ml", "Dog keyring").
//
// ────────────────────────────────────────────────────────────
// INTEGRATION OPTIONS for the backend dev:
//
// 1. Static JSON file (fastest start):
//    Replace the SAMPLE_DATA below with a file read from disk or a
//    JSON file fetched from S3/GCS/CDN.
//
// 2. Database (recommended for production):
//    Query your asset table grouped by `board` column.
//    Pseudo-code:
//      const rows = await db.query("SELECT * FROM assets ORDER BY created_at DESC");
//      const boards = groupBy(rows, 'board');
//
// 3. Google Drive / Dropbox (for non-technical asset uploads):
//    List files in 4 folders by ID, map each file's filename → label.
//    Cache the result for ~5 minutes to avoid quota issues.
//
// ────────────────────────────────────────────────────────────
// CURRENT STATE: returns empty boards by default.
// Set IIC_BOARDS_DATA_URL environment variable to point to a JSON
// file URL, or replace the function body with your data source.
// ────────────────────────────────────────────────────────────

const fetchFn = typeof fetch !== 'undefined'
    ? fetch
    : (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const EMPTY_BOARDS = {
    'product-official': [],
    'product-draft': [],
    'package': [],
    'gwp': []
};

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Option A — pull from a JSON URL set in env
        const dataUrl = process.env.IIC_BOARDS_DATA_URL;
        if (dataUrl) {
            const response = await fetchFn(dataUrl);
            if (response.ok) {
                const data = await response.json();
                return res.status(200).json({ boards: { ...EMPTY_BOARDS, ...data } });
            }
        }

        // Option B — return empty boards (frontend handles this gracefully)
        // Replace this with your database query / file read.
        return res.status(200).json({ boards: EMPTY_BOARDS });
    } catch (error) {
        console.error('boards error:', error);
        return res.status(500).json({ error: 'Failed to load boards', message: error.message });
    }
};
