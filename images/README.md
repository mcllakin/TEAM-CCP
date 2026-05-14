# KAKAO THUMB AI — CCP

6-mode composition-locked product moodshot generator powered by **Nano Banana Pro** (`gemini-3-pro-image-preview`).
모든 모드 프롬프트는 CCP AI PROMPT 노션 문서에서 가져와 코드에 그대로 박혀 있고, 동적 변수 (제품/캠페인/재질/GWP/추가지시/타겟 색상)만 코드가 채워서 모델에게 보냅니다.

---

## TL;DR for the developer

작동시키기 위해 필요한 건 **단 한 가지**:

> **`GEMINI_API_KEY` 환경변수 설정.**

그 외 코드는 손댈 게 없습니다. 키만 들어가면 6모드 모두 즉시 작동합니다.

---

## 6 Modes

| #  | Mode ID            | 한국어              | 필요 입력                           | 핵심 로직                        |
|----|--------------------|---------------------|-------------------------------------|----------------------------------|
| 01 | `bg-replace`       | 배경 바꾸기          | 제품 (1~6장) + 배경 레퍼런스         | 제품·구도·조명 그대로, 배경만 재구성 |
| 02 | `bg-color`         | 배경 색감만          | 제품 (1장) + Color Picker          | 배경 색만 변경, 텍스처·조명 보존    |
| 03 | `perfume-angle`    | 향수 — 각도 변경     | 향수 1장                            | 유리 질감 강화 + 카메라 앵글 변경  |
| 04 | `perfume-glass`    | 향수 — 글래스 강화   | 향수 1장                            | 각도 유지, 유리 머티리얼만 프리미엄|
| 05 | `ref-composition`  | 레퍼런스 구도로      | 제품 (1~6장) + 구도 레퍼런스        | 제품 ID 락 + 레퍼런스의 구도로 합성|
| 06 | `ref-creative`     | 크리에이티브 무드컷  | 제품 (1~6장) + 무드 레퍼런스        | 제품 ID 락 + 자유로운 무드 재해석  |

UI는 모드 선택에 따라 필요한 업로드 박스만 보여줍니다 (불필요한 박스는 자동으로 숨김).

각 모드의 마스터 프롬프트는 `js/app.js`의 `MODES` 객체 안에 `buildPrompt(ctx)` 함수로 정의돼 있어요. 수정하려면 거기만 보면 됩니다.

---

## File map

```
TEAM-CCP-main/
├── index.html              ← UI (모드 셀렉터, 동적 업로드 박스, 컬러 피커, 플로팅 dock)
├── css/style.css           ← Revolut-inspired dark theme
├── js/app.js               ← MODES 정의 + 상태 관리 + 업로드 + 자동 네이밍
├── api/generate.js         ← Gemini API 호출 (Nano Banana Pro)
├── images/logo.png         ← 브랜드 로고
├── package.json            ← 외부 npm 의존성 없음 (Node 18+ 글로벌 fetch 사용)
└── vercel.json             ← Vercel function 설정 (120s, 1024MB)
```

---

## Request contract (frontend → /api/generate)

```jsonc
POST /api/generate
{
  "mode": "bg-replace" | "bg-color" | "perfume-angle" | "perfume-glass" | "ref-composition" | "ref-creative",
  "model": "gemini-3-pro-image-preview",
  "prompt": "<해당 모드의 완전히 조립된 프롬프트>",
  "count": 1,                       // 1..4
  "aspect_ratio": "1:1",            // "1:1" | "4:5" | "16:9" | "9:16"
  "image_size": "2k",
  "images": {
    "product_sources": ["data:image/jpeg;base64,..."],  // 모드별로 1..6장 or 빈 배열
    "background_reference": "data:image/jpeg;base64," | null,
    "gwp": "data:image/jpeg;base64," | null,
    "composition_guide": null       // 호환성 유지 (현재 미사용)
  },
  "identity": {
    "product_name": "shell30ml",
    "campaign_name": "PinkRibbon",
    "material": "glass"             // glass / leather / steel / plastic-matte / plastic-gloss / ceramic / paper / fabric / auto
  },
  "task_summary": "Mode 05 — 레퍼런스 구도로"
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

---

## Auto-naming

```
<productName>_<campaign>[_GWP]_M<##>[_<index>].png
```

예시:
- `shell30ml_PinkRibbon_M05.png` — Mode 05, 1장
- `shell30ml_PinkRibbon_GWP_M05_01.png` — Mode 05, GWP 포함, 여러 장 중 1번
- `shell30ml_M04.png` — Mode 04, 캠페인 없음

**DOWNLOAD ALL** 버튼은 폴더 prefix를 붙여서 일괄 다운로드: `shell30ml_PinkRibbon__shell30ml_PinkRibbon_M05_01.png`

(브라우저는 실제 폴더 생성 불가. 진짜 폴더가 필요하면 JSZip이나 서버사이드 ZIP/Drive 업로드로 교체.)

---

## Environment variables

| Variable          | Required | Default                                            |
|-------------------|----------|----------------------------------------------------|
| `GEMINI_API_KEY`  | **Yes**  | —                                                  |
| `GEMINI_MODEL`    | No       | `gemini-3-pro-image-preview`                       |
| `GEMINI_API_BASE` | No       | `https://generativelanguage.googleapis.com/v1beta` |

키 받는 곳: https://aistudio.google.com/apikey

Vercel: Settings → Environment Variables → Production·Preview·Development 모두 체크.

---

## 모드별 프롬프트 수정하기

`js/app.js` 상단의 `MODES` 객체에서 해당 모드의 `buildPrompt(ctx)` 함수를 수정하면 됩니다.

`ctx`로 들어오는 동적 변수:
- `ctx.material` — 'glass' / 'leather' / ... / 'auto'
- `ctx.hasGWP` — boolean
- `ctx.additionalDirection` — 사용자가 텍스트영역에 적은 추가 지시 (한국어 OK)
- `ctx.colorHex`, `ctx.colorDescription` — 모드 02에서만 의미 있음

공통 블록인 `materialBlock(material)`과 `gwpBlock(hasGWP)`는 같은 파일 상단에서 정의돼 있어요 — 모든 모드에서 재사용됩니다.

---

## 로컬 개발

```bash
npm install -g vercel
vercel dev
# → http://localhost:3000
```

`.env.local` 파일을 만들고 `GEMINI_API_KEY=...`를 적으면 로컬에서도 API 호출 가능.

---

## 배포

```bash
vercel --prod
```

Vercel에 GEMINI_API_KEY가 설정돼 있는지 확인 후 배포.

---

## 모델 교체

저렴한 Nano Banana(non-Pro)로 바꾸려면:

```
GEMINI_MODEL=gemini-2.5-flash-image
```

다른 이미지 모델(Replicate, fal.ai 등)로 전환하려면 `api/generate.js`만 수정하세요. 요청/응답 계약을 유지하면 프론트는 그대로 작동합니다.
