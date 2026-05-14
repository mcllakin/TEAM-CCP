# IIC AI Generator — CCP Team

CCP팀 내부 무드컷 생성 도구. **Nano Banana Pro** (`gemini-3-pro-image-preview`) 위에 6가지 모드 + 서버 자산 보드 시스템을 얹은 구조입니다.

---

## 시스템 구조

```
┌─ 서버 보드 ──────────────────────────────────────────────┐
│  product-official  · 공식 제품 누끼                       │
│  product-draft     · AI 드래프트 누끼                     │
│  package           · 박스 + 리본 패키지 구성              │
│  gwp               · 사은품 (BLUE HINOKI 2ml, 키링 등)    │
└──────────────────────────────────────────────────────────┘
                            │
       ┌────────────────────┼────────────────────┐
       ▼                    ▼                    ▼
┌─ 사용자 입력 ─┐  ┌─ 모드 선택 ─┐  ┌─ 옵션 ───┐
│ Mood          │  │ 01 배경 교체  │  │ 2K / 4K  │
│ Reference (req)│  │ 02 배경 컬러  │  │ 1~4 장   │
│ Composition    │  │ 03 앵글 변경  │  │ 비율     │
│ Draft (opt)    │  │ 04 재질 강화  │  └──────────┘
│ Product       │  │ 05 구도 합성  │
│ Override (opt) │  │ 06 크리에이티브│
└────────────────┘  └────────────────┘
                            │
                            ▼
              ┌─ /api/generate ─────────────┐
              │  Nano Banana Pro 호출        │
              │  텍스처/구도/GWP 비율 잠금    │
              └──────────────────────────────┘
                            │
                            ▼
              ┌─ 자동 폴더링 ────────────────┐
              │  shell30ml_PinkRibbon/        │
              │    └ shell30ml_PinkRibbon_M05_01.png│
              │    └ shell30ml_PinkRibbon_GWP_M05_02.png│
              └──────────────────────────────┘
```

---

## TL;DR — 빠르게 작동시키기

**필수: 환경변수 한 개만 등록.**

```
GEMINI_API_KEY = <Google AI Studio key>
```

키 발급: https://aistudio.google.com/apikey
Vercel: Settings → Environment Variables → Production·Preview·Development 모두 체크 → Redeploy.

이거 하나면 사이트는 작동합니다. 보드는 처음엔 비어있는 상태로 표시되고, 사용자가 직접 업로드 박스로 진행할 수 있어요.

---

## 6 Modes

| #  | Mode ID            | 한국어        | 필요 입력                          | 핵심 로직                          |
|----|--------------------|---------------|------------------------------------|-------------------------------------|
| 01 | `bg-replace`       | 배경 교체     | 제품 + 배경 레퍼런스                | 제품·구도·조명 락 + 배경만 재구성   |
| 02 | `bg-color`         | 배경 컬러     | 제품 + Color Picker                | 배경 색만 변경                      |
| 03 | `perfume-angle`    | 앵글 변경     | 향수 1장                           | 유리 질감 + 카메라 베리에이션       |
| 04 | `perfume-glass`    | 재질 강화     | 향수 1장                           | 각도 유지, 유리만 프리미엄          |
| 05 | `ref-composition`  | 구도 합성     | 제품 + 구도 레퍼런스                | 제품 ID 락 + 레퍼런스의 구도로 합성 |
| 06 | `ref-creative`     | 크리에이티브  | 제품 + 무드 레퍼런스                | 제품 ID 락 + 자유로운 무드 재해석   |

각 모드의 마스터 프롬프트는 `js/app.js`의 `MODES` 객체에 박혀 있습니다. 수정은 거기 한 곳만.

---

## API Endpoints

### `POST /api/generate` — 이미지 생성

```jsonc
{
  "mode": "ref-composition",
  "model": "gemini-3-pro-image-preview",
  "prompt": "<built by frontend from MODES[mode].buildPrompt(ctx)>",
  "count": 1,                          // 1..4
  "aspect_ratio": "1:1",               // "1:1" | "4:5" | "16:9" | "9:16"
  "image_size": "2k",
  "images": {
    "product_sources": ["data:image/jpeg;base64,..."],  // 1장 (서버 보드 or 사용자 override)
    "background_reference": "data:image/jpeg;base64," | null,
    "gwp": "data:image/jpeg;base64," | null,
    "package": "data:image/jpeg;base64," | null,
    "composition_guide": "data:image/jpeg;base64," | null
  },
  "identity": {
    "product_name": "shell30ml",
    "additional_item": "BLUE HINOKI 2ml",
    "product_tier": "official"        // "official" | "draft" | "override"
  }
}
```

응답:
```jsonc
{
  "success": true,
  "images": ["data:image/png;base64,..."],
  "count": 1,
  "model": "gemini-3-pro-image-preview",
  "message": "1개 이미지 생성 완료"
}
```

### `GET /api/boards` — 서버 자산 라이브러리

프론트가 페이지 로드 시 호출. 백엔드 개발자가 실제 자산 라이브러리로 연결해야 보드가 채워집니다.

```jsonc
{
  "boards": {
    "product-official": [
      {
        "id": "shell30ml-sunshine",
        "label": "SHELL 30ml — SUNSHINE",
        "thumbnail": "https://cdn.example.com/thumb/shell30ml-sunshine.jpg",
        "dataUrl":   "https://cdn.example.com/full/shell30ml-sunshine.png",
        "tags": ["perfume", "30ml"],
        "createdAt": "2026-05-01T00:00:00Z"
      }
    ],
    "product-draft": [...],
    "package":       [...],
    "gwp":           [...]
  }
}
```

**현재 상태:** 기본은 빈 보드 반환. 백엔드 개발자가 `api/boards.js`를 수정해 다음 중 하나로 연결:

1. **JSON 파일** — 환경변수 `IIC_BOARDS_DATA_URL`에 JSON 파일 URL 지정
2. **DB 쿼리** — `api/boards.js` 안에서 직접 쿼리 실행
3. **Google Drive / Dropbox** — 폴더 4개 listing → label 매핑

상세 가이드는 `api/boards.js` 상단 주석 참조.

---

## 자동 네이밍 / 폴더링

**폴더명** = `<productName>_<packageName>` (예: `shell30ml_HeartBlueRibbon/`)

**파일명** = `<productName>_<packageName>[_GWP]_<additionalItem>_M<##>[_<index>].png`

예시:
- `shell30ml_HeartBlueRibbon/shell30ml_HeartBlueRibbon_M05.png` — Mode 05, 1장
- `shell30ml_HeartBlueRibbon/shell30ml_HeartBlueRibbon_GWP_BLUEHINOKI2ml_M05_01.png` — Mode 05, GWP + 추가품목 포함, 여러 장 중 1번

**DOWNLOAD FOLDER** 버튼은 폴더 prefix 붙여서 일괄 다운로드합니다.

> 참고: 브라우저는 실제 OS 폴더를 만들 수 없어서, 파일명 앞에 `폴더명__` prefix를 붙이는 방식입니다. 실제 폴더가 필요하면 JSZip 또는 서버사이드 ZIP 생성으로 교체.

---

## 환경 변수

| 변수                    | 필수 | 기본값                                              | 용도 |
|------------------------|------|----------------------------------------------------|------|
| `GEMINI_API_KEY`       | **Yes** | —                                              | Google AI Studio 키 |
| `GEMINI_MODEL`         | No   | `gemini-3-pro-image-preview`                       | 모델 오버라이드 (저렴한 `gemini-2.5-flash-image` 사용 가능) |
| `GEMINI_API_BASE`      | No   | `https://generativelanguage.googleapis.com/v1beta` | 프록시 사용 시 |
| `IIC_BOARDS_DATA_URL`  | No   | —                                                  | 보드 데이터 JSON 파일 URL |

---

## 파일 맵

```
TEAM-CCP-main/
├── index.html              ← UI: 모드 셀렉터, 보드, 업로드, dock
├── css/style.css           ← Revolut-inspired dark theme
├── js/app.js               ← 6 모드 + 보드 시스템 + 자동 네이밍
├── api/generate.js         ← Nano Banana Pro 호출
├── api/boards.js           ← 서버 자산 라이브러리 (구현 필요)
├── images/logo.png         ← IIC 로고
├── package.json
└── vercel.json             ← Vercel function 설정 (120s, 1024MB)
```

---

## 디버깅

브라우저 콘솔에서:

```js
IIC.getState()         // 현재 모드, 선택된 자산, 식별자
IIC.listModes()        // 사용 가능한 모든 모드
IIC.previewPrompt()    // 현재 상태에서 생성될 프롬프트 미리보기
IIC.setMockBoards()    // 보드가 비어있을 때 데모용 mock 데이터 주입
```

---

## 로컬 개발

```bash
npm install -g vercel
vercel dev
```

`.env.local`에 `GEMINI_API_KEY` 설정 → http://localhost:3000

---

## 배포

```bash
vercel --prod
```

배포 전 Vercel Settings에서 `GEMINI_API_KEY` 등록 확인 필수.
