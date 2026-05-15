// ============================================================
// IIC AI Generator — Asset Boards API
// GET /api/boards
//
// 자산 라이브러리를 프론트엔드에 제공합니다.
//
// 우선순위:
//   1. IIC_BOARDS_DATA_URL 환경변수 (외부 JSON)
//   2. boards-data.json 파일 (큐레이션된 메타데이터)
//   3. images/boards/{category}/ 폴더 자동 스캔 (PNG 자동 등록)
//
// 사용자가 만든 PNG를 단순히 images/boards/product/ 같은 폴더에
// 떨어뜨리면 자동으로 카테고리에 표시됩니다.
// ============================================================

const fs = require('fs');
const path = require('path');

const fetchFn = typeof fetch !== 'undefined'
    ? fetch
    : (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const CATEGORY_DIRS = {
    'product-official': 'product',
    'product-draft': 'product-draft',
    'package': 'package',
    'gwp': 'gwp',
    'reference-thumbnails': 'thumbnails'
};

const EMPTY_BOARDS = Object.keys(CATEGORY_DIRS).reduce((acc, k) => {
    acc[k] = [];
    return acc;
}, {});

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
        const proto = (req.headers['x-forwarded-proto'] || 'https').toString();
        const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toString();
        const baseUrl = host ? `${proto}://${host}` : '';

        // Option A — external JSON URL via env
        const dataUrl = process.env.IIC_BOARDS_DATA_URL;
        if (dataUrl) {
            const response = await fetchFn(dataUrl);
            if (response.ok) {
                const data = await response.json();
                const boards = { ...EMPTY_BOARDS, ...(data.boards || data) };
                // Merge auto-scan
                mergeAutoScan(boards);
                return res.status(200).json({
                    boards: resolveBoardUrls(boards, baseUrl)
                });
            }
        }

        // Option B — bundled JSON + auto-scan merge
        const filePath = path.join(__dirname, 'boards-data.json');
        let boards = { ...EMPTY_BOARDS };

        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(raw);
            boards = { ...EMPTY_BOARDS, ...(data.boards || {}) };
        }

        // Merge auto-scanned PNGs (JSON 항목 우선 — 이미 있으면 스킵)
        mergeAutoScan(boards);

        return res.status(200).json({
            boards: resolveBoardUrls(boards, baseUrl)
        });
    } catch (error) {
        console.error('boards error:', error);
        return res.status(500).json({
            error: 'Failed to load boards',
            message: error.message
        });
    }
};

/**
 * 각 카테고리 폴더를 스캔해서, JSON에 등록되지 않은 PNG/JPG를 자동 추가.
 * 파일명에서 라벨/슬러그를 추출.
 *
 * 작동 방식:
 *   - images/boards/product/    → product-official
 *   - images/boards/package/    → package
 *   - images/boards/gwp/        → gwp
 *   - images/boards/thumbnails/ → reference-thumbnails
 *   - images/boards/product-draft/ → product-draft (선택적)
 *
 * 새 PNG를 폴더에 떨어뜨리고 commit 하면 자동으로 보드에 표시됩니다.
 */
function mergeAutoScan(boards) {
    // Walk up from /api to project root, then images/boards
    const boardsRoot = path.join(__dirname, '..', 'images', 'boards');
    if (!fs.existsSync(boardsRoot)) return;

    for (const [boardKey, dirName] of Object.entries(CATEGORY_DIRS)) {
        const dirPath = path.join(boardsRoot, dirName);
        if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) continue;

        const existingIds = new Set((boards[boardKey] || []).map(it => it.id));

        const files = fs.readdirSync(dirPath).filter(f => {
            if (f.startsWith('.') || f.startsWith('_')) return false;
            const ext = path.extname(f).toLowerCase();
            return ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
        });

        for (const f of files) {
            const id = slugify(path.basename(f, path.extname(f)));
            if (existingIds.has(id)) continue;  // 이미 JSON에 있음 → 스킵

            const urlPath = `/images/boards/${dirName}/${encodeURIComponent(f)}`;
            const ext = path.extname(f).toLowerCase();
            boards[boardKey].push({
                id,
                label: prettifyLabel(path.basename(f, path.extname(f))),
                thumbnail: urlPath,
                dataUrl: urlPath,
                transparent: ext === '.png',
                autoDiscovered: true
            });
        }
    }
}

function resolveBoardUrls(boards, baseUrl) {
    const out = {};
    for (const [k, items] of Object.entries(boards)) {
        out[k] = (items || []).map(item => ({
            ...item,
            thumbnail: absoluteUrl(item.thumbnail, baseUrl),
            dataUrl: absoluteUrl(item.dataUrl, baseUrl)
        }));
    }
    return out;
}

function slugify(s) {
    return String(s || '')
        .toLowerCase()
        .replace(/[^a-z0-9가-힣-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function prettifyLabel(s) {
    return String(s || '')
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 60);
}

function absoluteUrl(url, baseUrl) {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    if (url.startsWith('/')) {
        return baseUrl + url;
    }
    return baseUrl + '/' + url;
}
