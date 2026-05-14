// ============================================================
// IIC AI Generator — Asset Boards API
// GET /api/boards
//
// Returns the server-side curated asset library that powers
// the UI boards on the frontend.
//
// CURRENT STATE: reads from /api/boards-data.json bundled with
// the deploy. Replace this with a DB query / external fetch
// when you're ready to manage assets dynamically.
// ============================================================

const fs = require('fs');
const path = require('path');

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
        // Build a fully-qualified base for image URLs based on incoming request.
        const proto = (req.headers['x-forwarded-proto'] || 'https').toString();
        const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toString();
        const baseUrl = host ? `${proto}://${host}` : '';

        // Option A — external JSON URL via env (highest priority)
        const dataUrl = process.env.IIC_BOARDS_DATA_URL;
        if (dataUrl) {
            const response = await fetchFn(dataUrl);
            if (response.ok) {
                const data = await response.json();
                return res.status(200).json({
                    boards: { ...EMPTY_BOARDS, ...(data.boards || data) }
                });
            }
        }

        // Option B — read the bundled JSON file
        const filePath = path.join(__dirname, 'boards-data.json');
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(raw);
            const boards = { ...EMPTY_BOARDS, ...(data.boards || {}) };

            // Resolve relative image paths to absolute URLs so the frontend
            // and the Gemini model can both fetch them.
            for (const key of Object.keys(boards)) {
                boards[key] = boards[key].map(item => ({
                    ...item,
                    thumbnail: absoluteUrl(item.thumbnail, baseUrl),
                    dataUrl: absoluteUrl(item.dataUrl, baseUrl)
                }));
            }

            return res.status(200).json({ boards });
        }

        // Option C — empty fallback
        return res.status(200).json({ boards: EMPTY_BOARDS });
    } catch (error) {
        console.error('boards error:', error);
        return res.status(500).json({
            error: 'Failed to load boards',
            message: error.message
        });
    }
};

function absoluteUrl(url, baseUrl) {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    // Relative path → prefix with base
    if (url.startsWith('/')) {
        return baseUrl + url;
    }
    return baseUrl + '/' + url;
}
