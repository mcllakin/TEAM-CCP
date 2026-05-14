# Vercel 배포 가이드 (한국어)

이 가이드는 GitHub에 코드를 올린 뒤 Vercel에 연결해서 사이트를 배포하는 전체 흐름을 설명합니다.
개발자가 아니어도 따라할 수 있도록 작성되어 있습니다.

---

## 1단계 — Gemini API 키 발급

1. https://aistudio.google.com/apikey 접속
2. Google 계정으로 로그인
3. **Create API key** 버튼 클릭
4. 키를 복사해서 안전한 곳에 저장 (다시는 보여주지 않습니다)

> Nano Banana Pro (`gemini-3-pro-image-preview`)는 이미지 생성당 비용이 발생합니다. 가격은 Google AI Studio의 가격 페이지에서 확인하세요.

---

## 2단계 — GitHub에 코드 올리기

이 폴더 전체를 GitHub 저장소에 푸시합니다.

```bash
cd TEAM-CCP-main
git init
git add .
git commit -m "Initial commit: KAKAO THUMB AI v2"
git branch -M main
git remote add origin https://github.com/<your-username>/TEAM-CCP.git
git push -u origin main
```

이미 저장소가 있다면 그냥 모든 파일을 덮어쓰고 푸시하면 됩니다.

---

## 3단계 — Vercel에 연결

1. https://vercel.com 접속, GitHub로 로그인
2. **Add New → Project** 클릭
3. 방금 푸시한 GitHub 저장소 선택 → **Import**
4. **Framework Preset**: Other (또는 자동 감지된 값 그대로)
5. **Root Directory**: 그대로 두기
6. **아직 Deploy를 누르지 말고** 환경변수부터 설정 ↓

---

## 4단계 — 환경변수 설정 (가장 중요!)

Vercel 프로젝트 import 화면에서:

1. **Environment Variables** 섹션을 펼침
2. 다음 변수를 추가:

| Name              | Value                                              |
|-------------------|----------------------------------------------------|
| `GEMINI_API_KEY`  | 1단계에서 받은 키 붙여넣기                          |

3. **Production**, **Preview**, **Development** 모두 체크

이미 배포된 프로젝트라면:
- 프로젝트 → **Settings** → **Environment Variables** 에서 추가
- 추가 후 **Deployments** 탭에서 최신 배포에 **Redeploy** 실행

---

## 5단계 — Deploy 클릭

배포가 완료되면 Vercel이 자동으로 URL (예: `https://team-ccp.vercel.app`)을 알려줍니다.
열어서 다음 흐름을 테스트:

1. 상단의 인디케이터 (`00 01 02`)가 스크롤에 따라 활성화되는지
2. **SELECT PRODUCT PHOTOS** 버튼이 파일 선택창을 여는지
3. 제품 사진 + 무드 레퍼런스를 업로드하면 하단 dock의 점이 초록색이 되고 GENERATE 버튼이 활성화되는지
4. GENERATE 클릭 → 로딩 → 결과 이미지가 표시되는지

---

## 문제 해결

### "GEMINI_API_KEY not configured" 에러
- Vercel Settings → Environment Variables에서 키가 정말 추가되어 있는지 확인
- 추가했어도 **Redeploy**를 안 하면 적용되지 않습니다

### "Gemini API error: 403" / "PERMISSION_DENIED"
- 키가 잘못되었거나, 해당 Google Cloud 프로젝트에서 Gemini API가 활성화되지 않았습니다
- AI Studio에서 키를 다시 발급받아 보세요

### "Gemini API error: 429" (rate limit)
- 무료 티어의 분당 요청 한도를 초과했습니다. 잠시 후 다시 시도하거나 결제를 활성화하세요

### 이미지가 안 나오고 "No image in Gemini response"
- 프롬프트가 안전성 정책에 걸렸을 가능성. Additional Direction 텍스트를 단순하게 바꿔보세요
- Console에 모델이 거부 메시지를 같이 반환합니다 (vercel logs로 확인)

### Vercel 함수 timeout (504)
- `vercel.json`에 이미 `maxDuration: 120`이 설정되어 있습니다
- 무료 플랜에서는 60초가 최대입니다. 더 길게 쓰려면 Pro 플랜으로 업그레이드하세요

### 이미지 업로드는 되는데 generate에서 413 (payload too large)
- 클라이언트에서 이미 1600px / JPEG 0.9로 다운사이즈하고 있어 일반적으로 발생하지 않습니다
- 그래도 발생한다면 `js/app.js` 상단의 `MAX_IMAGE_EDGE = 1600`을 `1200` 으로 줄여보세요
