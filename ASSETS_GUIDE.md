# 에셋 추가 가이드

서버 구축 전이라도 GitHub에 PNG만 푸시하면 자동으로 보드에 표시됩니다.

## 방법 1 — 폴더에 PNG 떨어뜨리기 (가장 쉬움)

새 제품 누끼나 패키지가 생기면:

1. `images/boards/` 안의 해당 카테고리 폴더에 PNG 파일을 업로드
   - `images/boards/product/` — 공식 누끼
   - `images/boards/product-draft/` — 임시 누끼 (없으면 폴더 새로 만들면 됨)
   - `images/boards/package/` — 패키지/리본
   - `images/boards/gwp/` — GWP/사은품
   - `images/boards/thumbnails/` — 기존 캠페인 썸네일 (참고용)
2. commit & push → Vercel 자동 재배포 → 보드에 자동 등장

**파일명 규칙:**
- 영문 + 숫자 + 하이픈 권장 (예: `evening-glow-shell-30ml.png`)
- 한글도 가능하지만 영문이 안전함
- 라벨은 파일명에서 자동 추출됨 (`-`, `_` → 공백)

**투명 PNG가 좋습니다:** 캔버스에서 합성할 때 자연스러움. JPG 가능하지만 흰/검 배경이 그대로 들어감.

## 방법 2 — JSON에 정식 등록 (세밀한 컨트롤 원할 때)

라벨이나 태그를 직접 지정하고 싶으면 `api/boards-data.json`에 추가:

```json
{
  "boards": {
    "product-official": [
      {
        "id": "evening-glow-30ml",
        "label": "EVENING GLOW 30ml",
        "thumbnail": "/images/boards/product/evening-glow-30ml.png",
        "dataUrl": "/images/boards/product/evening-glow-30ml.png",
        "transparent": true,
        "tags": ["perfume", "shell", "30ml"]
      }
    ]
  }
}
```

JSON 항목이 있으면 자동 스캔보다 우선 적용됩니다.

## 자동 스캔의 작동 원리

`api/boards.js`가 매 요청마다:
1. 환경변수 `IIC_BOARDS_DATA_URL` 확인 (외부 JSON 있으면 사용)
2. `api/boards-data.json` 읽기 (큐레이션된 메타데이터)
3. `images/boards/*/` 폴더 스캔해서 JSON에 없는 PNG 자동 추가

따라서 JSON 안 건드려도 폴더에 PNG만 넣으면 작동합니다.

## 한도

Vercel serverless 함수 안에서 폴더 스캔이라 첫 cold start는 ~1초 정도. 자산이 많아지면 (200개+) 응답 약간 느려질 수 있어요. 그때부턴 외부 스토리지(Vercel Blob, S3, Cloudinary)로 옮기는 게 좋습니다.

## 새 카테고리 추가

새 카테고리(예: "캔들")가 필요하면:
1. `api/boards.js`의 `CATEGORY_DIRS`에 추가
2. `index.html`의 `.browser-tabs`에 탭 버튼 추가
3. `js/app.js`의 `state.library.data`에 키 추가
