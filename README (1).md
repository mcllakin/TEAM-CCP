# KAKAO THUMB AI

**CCP — Creative Computing Project**  
**AI-Powered Product Mood Shot Generator**

---

## 🎨 프로젝트 소개

Berlin Studio 미니멀리즘 디자인을 적용한 AI 이미지 생성 웹 인터페이스입니다.

3개의 이미지(배경, 제품, 구도)를 입력하면 AI가 자동으로 고품질 제품 무드샷을 생성합니다.

---

## ✨ 특징

- **Berlin Studio Aesthetic**: 초미니멀리즘 디자인
- **Typography-First**: 대형 타이포그래피 중심 레이아웃
- **3-Step Upload**: 직관적인 이미지 업로드 프로세스
- **Real-time Preview**: 즉시 확인 가능한 프리뷰
- **Responsive Design**: 모든 디바이스 지원

---

## 🚧 개발 상태

**✅ 완성:**
- 프론트엔드 UI/UX
- 이미지 업로드 시스템
- 인터랙션 디자인
- 반응형 레이아웃

**🔨 개발 중:**
- 백엔드 API 연동
- AI 이미지 생성 기능

---

## 🛠️ 기술 스택

- HTML5
- CSS3 (Pure CSS, No Framework)
- Vanilla JavaScript
- Berlin Studio Design System

---

## 👨‍💻 제작

**박준호** - 디자이너 및 학생  
CCP (Creative Computing Project)

---

## 📐 Design Philosophy

### **Berlin Studio Aesthetic**

```
Typography-First Design
초대형 타이포그래피 (128px Hero)
수직/수평 라인 시스템
숫자 네비게이션 (00—03)
극단적 미니멀리즘
Swiss International Style
```

### **Visual System**

- **Font**: Helvetica Neue (Light, Regular, Medium)
- **Color**: Pure Black (#000000) + White + Grey
- **Layout**: Grid-based, 1px borders, text-centric
- **Typography Scale**: 11px → 128px
- **Spacing**: 8px, 16px, 32px, 64px, 128px
- **Transition**: 300ms cubic-bezier(0.4, 0, 0.2, 1)

---

## ✨ Features

### **3-Step Image Upload**

**001 — Background Reference**  
배경 레퍼런스 (AI가 기존 제품 자동 제거)

**002 — Product Image**  
투명 배경 제품 PNG

**003 — Composition Reference**  
포토샵 합성 시안 (구도 참조)

### **Generation Options**

**Mood Intensity** — 무드 보정 강도 (0-10)  
배경 분위기 적용 정도 조절

**Product Preservation** — 제품 보존 강도 (0-10)  
제품 디테일 보존 정도 조절

**Output Resolution** — 출력 해상도  
2K (Fast) / 4K (High Quality)

### **AI Processing**

Nano Banana Pro가 자동으로:
- ✅ 배경 기존 제품 제거 (Inpainting)
- ✅ 배경 무드/톤/조명 분석
- ✅ 구도 레퍼런스 학습
- ✅ 제품 형태 보존
- ✅ 자연스러운 조명 매칭
- ✅ 그림자/반사 생성
- ✅ 색온도 보정
- ✅ 경계 블렌딩

### **Generation Modes**

**GENERATE 1×** — 단일 무드컷 생성  
**GENERATE 4×** — 4가지 버전 배치 생성

---

## 🎨 Design Components

### **Navigation**
```
Fixed top bar
Brand name (left)
Section numbers 00—03 (right)
Active state indicator (underline)
```

### **Section Structure**
```
00 — HERO (Automated Product Mood Shot Generator)
01 — IMAGE UPLOAD (3 upload boxes grid)
02 — GENERATION OPTIONS (3 option boxes grid)
03 — GENERATE & RESULTS (buttons + results grid)
```

### **Typography Hierarchy**
```
Hero Title:     128px / Light / -3px letter-spacing
Section Title:   72px / Light / -2px / uppercase
Section Number:  72px / Light / -2px / grey
Body Text:       18px / Light / 0.5px
Upload Label:    24px / Medium
Option Label:    24px / Medium
Button Label:    32px / Medium / -1px
Metadata:        11px / Medium / 2px / uppercase
```

### **Interactive Elements**
```
Navigation numbers — hover underline
Upload boxes — drag & drop, hover background
Sliders — 20px circular thumb
Radio buttons — 20px outline, 10px inner fill
Buttons — hover background shift
Results — hover action overlay
```

---

## 📂 Project Structure

```
project/
├── index.html              (9.5KB) - Semantic HTML5 structure
├── css/
│   └── style.css          (13.4KB) - Berlin studio design system
├── js/
│   └── app.js             (11.3KB) - Upload, options, generation logic
├── images/                         - (Logo removed for text-centric design)
├── README.md                       - Project documentation
├── BACKEND_REQUIREMENTS.md         - Backend API specification
└── BACKEND_DEVELOPER_GUIDE.md     - Backend development guide
```

**Total Size**: ~34KB (excluding backend docs)

---

## 🛠 Tech Stack

### **Frontend**
- HTML5 (Semantic markup)
- CSS3 (Grid, Flexbox, Custom Properties)
- Vanilla JavaScript ES6+

### **Design System**
- Typography: Helvetica Neue family
- Color: Monochrome (Black/White/Grey)
- Layout: Grid-based, 1px borders
- Animation: Smooth cubic-bezier transitions

### **API**
- Model: Nano Banana Pro
- Features: Multi-image fusion, Style consistency
- Processing: 2K (~30s) / 4K (~60s)

---

## 🔌 API Integration

### **✅ Current Status: GenSpark Agent Ready**

**Frontend**: ✅ 100% Complete (Berlin studio UI/UX)  
**GenSpark Agent**: ✅ localStorage 연동 준비 완료  
**Backend (외부 배포용)**: ⚠️ Development Needed

### **GenSpark Agent 연동 (현재 사용 가능)**

GenSpark Platform 내에서 즉시 사용 가능:

1. **`GENSPARK_AGENT_GUIDE.md`** — Agent 연동 가이드 (★ 먼저 읽기)
2. 웹사이트 → localStorage → GenSpark Agent → Nano Banana Pro
3. 실시간 이미지 생성 테스트 가능

### **백엔드 개발 (외부 배포용)**

백엔드 개발자가 필요합니다! 다음 문서를 참조하세요:

1. **`BACKEND_REQUIREMENTS.md`** — API 상세 명세서
2. **`BACKEND_DEVELOPER_GUIDE.md`** — 5분 시작 가이드

**Requirements:**
- Node.js + Express server
- POST `/api/generate-image` endpoint
- Nano Banana Pro API integration
- API key security (environment variables)
- CORS enabled

**Estimated Time**: 1-2 hours  
**Recommended Stack**: Node.js + Express + Vercel (free)

### **After Backend Deployment**

`js/app.js` 파일의 2번째 줄 수정:

```javascript
const API_ENDPOINT = 'https://your-backend-url.vercel.app/api/generate-image';
```

---

## 📱 Responsive Design

### **Desktop (1024px+)**
- 3-column upload grid
- 3-column options grid
- 2-column results grid
- Full navigation

### **Tablet (768-1023px)**
- Single column upload/options
- Adjusted spacing
- Optimized button sizes

### **Mobile (< 768px)**
- Vertical stacking
- Reduced typography scale (56px hero)
- Single column results
- Collapsible navigation

---

## 🎯 User Flow

```
1. Access website
   └─ Scroll or click navigation (00-03)

2. Upload 3 images (01)
   └─ Drag & drop or click SELECT IMAGE
   └─ Preview appears with 30% opacity overlay

3. Adjust options (02)
   └─ Mood Intensity slider (default: 7)
   └─ Product Preservation slider (default: 8)
   └─ Resolution radio (default: 2K)

4. Generate (03)
   └─ Click GENERATE 1× or GENERATE 4×
   └─ Loading overlay with spinner
   └─ 2-60 seconds processing

5. Download results
   └─ Hover for actions (DOWNLOAD / DELETE)
   └─ Results saved as PNG files
```

---

## 📊 Project Status

| Component | Status |
|-----------|--------|
| **Frontend UI/UX** | ✅ 100% Complete |
| HTML Structure | ✅ Berlin Studio Layout |
| CSS Design System | ✅ Typography-First |
| JavaScript Logic | ✅ Full Functionality |
| Responsive Design | ✅ Mobile-Optimized |
| Navigation | ✅ Scroll Spy + Smooth Scroll |
| Image Upload | ✅ Drag & Drop + Preview |
| Options Control | ✅ Sliders + Radio |
| Results Display | ✅ Grid + Actions |
| Loading State | ✅ Overlay + Animation |
| **GenSpark Agent** | ✅ localStorage 연동 준비 완료 |
| **AI Generation (GenSpark)** | ✅ 테스트 가능 |
| **Backend (외부 배포용)** | ⚠️ Development Needed |

---

## 🚀 Next Steps

### **1. GenSpark Agent 테스트 (지금 바로 가능!)**

`GENSPARK_AGENT_GUIDE.md`를 참고하여 즉시 테스트:

- ✅ 웹사이트에서 이미지 업로드
- ✅ "GENERATE" 버튼 클릭
- ✅ localStorage에서 요청 데이터 확인
- ✅ GenSpark Agent가 Nano Banana Pro 호출
- ✅ 결과 이미지 자동 표시

**Guide**: `GENSPARK_AGENT_GUIDE.md` (★ 필독)

### **2. Backend Development (외부 배포용)**

백엔드 개발자를 찾아 API 서버를 구축하세요:

- **Guide**: `BACKEND_DEVELOPER_GUIDE.md`
- **Specs**: `BACKEND_REQUIREMENTS.md`
- **Stack**: Node.js + Express + Vercel
- **Time**: 1-2 hours

### **3. Frontend Deployment (Ready Now)**

**Publish 탭**에서 원클릭 배포:
- Static website hosting
- Preview UI/UX immediately
- Share with team for review

### **4. Integration & Testing**

**GenSpark Agent (현재):**
- localStorage 기반 통신
- 실시간 테스트 가능
- 외부 배포 불가 (Platform 내부 전용)

**Backend Server (외부 배포용):**
- Backend deployment → Get API URL
- Update `js/app.js` endpoint
- Redeploy frontend
- End-to-end testing with real images

---

## 💡 Design Inspiration

**Berlin Design Studios:**
- m — Digital Book Project
- LERKA — Engineering Group
- Maldan — Graphic Design System
- Gravity — Exhibition Website

**Key Influences:**
- Swiss International Typography
- Brutalist Web Design
- Minimal Grid Systems
- Text-Centric Layouts
- Monochrome Color Schemes

---

## 🎓 Use Cases

### **E-commerce**
제품 카탈로그용 다양한 무드샷 대량 생성

### **Marketing**
시즌별 콘셉트 이미지 빠른 제작

### **A/B Testing**
4가지 버전 생성 → 팀 미팅에서 선택

### **Prototyping**
클라이언트 프레젠테이션용 빠른 목업

---

## 📄 License

**Internal Tool — CCP Creative Computing Project**  
For internal use and demonstration purposes.

---

## 📞 Support

프로젝트 관련 문의:
- 프론트엔드: ✅ 완성 (이 문서 참조)
- 백엔드: 📋 `BACKEND_REQUIREMENTS.md` 참조
- 디자인: 🎨 Berlin Studio Style Applied

---

**Last Updated**: 2025-12-12  
**Version**: 2.1 (GenSpark Agent Integration)  
**Designer**: CCP Team  
**Status**: Frontend Complete | GenSpark Agent Ready | Backend Needed (for external deployment)

---


## 📁 All Documentation Files

| File | Description |
|------|-------------|
| `README.md` | 프로젝트 전체 개요 |
| `SIMPLE_USAGE_GUIDE.md` | ★★★ 간단 사용 가이드 (필독!) |
| `GENSPARK_AGENT_GUIDE.md` | GenSpark Agent 연동 가이드 (상세) |
| `TEST_INSTRUCTIONS.md` | 실제 테스트 시나리오 |
| `BACKEND_REQUIREMENTS.md` | 백엔드 API 명세서 |
| `BACKEND_DEVELOPER_GUIDE.md` | 백엔드 개발 가이드 |
| `BACKEND_REQUEST_FOR_NOTION.md` | Notion용 백엔드 요청서 |
| `NOTION_README.md` | Notion용 프로젝트 문서 |
