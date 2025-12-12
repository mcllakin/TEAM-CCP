# 🚀 Vercel 배포 - 단계별 가이드

**5분이면 외부 공유 가능!**

---

## 📋 체크리스트

배포 전 확인:
- [x] index.html ✅
- [x] css/style.css ✅
- [x] js/app.js ✅
- [x] .gitignore ✅
- [x] vercel.json ✅
- [x] README.md ✅

---

## 🔧 1단계: GitHub 리포지토리 생성

### 1-1. GitHub 접속
```
https://github.com

로그인 (계정 없으면 가입)
```

### 1-2. 새 리포지토리 만들기
```
1. 우측 상단 "+" 클릭
2. "New repository" 선택
3. 설정:
   - Repository name: kakao-thumb-ai
   - Description: AI-Powered Product Mood Shot Generator
   - Public 선택 ✅
   - README 체크 해제 (이미 있음)
4. "Create repository" 클릭
```

---

## 💻 2단계: 로컬에서 GitHub 업로드

### 2-1. 현재 프로젝트 폴더 위치 확인
```
프로젝트 파일들이 있는 폴더:
- index.html
- css/
- js/
- images/
- README.md
- .gitignore
- vercel.json
```

### 2-2. Git이 설치되어 있나요?

**확인:**
```bash
git --version
```

**설치 안 되어 있으면:**
```
https://git-scm.com/
다운로드 후 설치
```

### 2-3. 터미널/CMD 열기

**Windows:**
```
프로젝트 폴더에서
Shift + 우클릭 → "여기서 PowerShell 창 열기"
또는
CMD 열고 cd로 프로젝트 폴더 이동
```

**Mac:**
```
프로젝트 폴더에서
우클릭 → "폴더에서 새로운 터미널"
```

### 2-4. Git 명령어 실행

**한 줄씩 입력하세요:**

```bash
# 1. Git 초기화
git init

# 2. 파일 추가
git add index.html
git add css/
git add js/
git add images/
git add README.md
git add .gitignore
git add vercel.json

# 3. 커밋
git commit -m "Initial commit - KAKAO THUMB AI"

# 4. GitHub 연결 (본인의 username으로 변경!)
git remote add origin https://github.com/YOUR_USERNAME/kakao-thumb-ai.git

# 5. 브랜치 이름 설정
git branch -M main

# 6. 업로드
git push -u origin main
```

**GitHub 로그인 요청 시:**
```
- Username: GitHub 아이디
- Password: GitHub 비밀번호
  (또는 Personal Access Token)
```

---

## 🌐 3단계: Vercel 배포

### 3-1. Vercel 가입
```
https://vercel.com

1. "Sign Up" 클릭
2. "Continue with GitHub" 선택
3. GitHub 계정으로 로그인
4. Vercel 권한 승인
```

### 3-2. 프로젝트 Import
```
1. Vercel 대시보드에서
2. "Add New..." 클릭
3. "Project" 선택
4. "Import Git Repository" 클릭
5. GitHub 연결되어 있는지 확인
6. "kakao-thumb-ai" 리포지토리 찾기
7. "Import" 클릭
```

### 3-3. 배포 설정
```
Configure Project 화면에서:

Project Name: kakao-thumb-ai (그대로)
Framework Preset: Other
Root Directory: ./
Build Command: (비워둠)
Output Directory: (비워둠)
Install Command: (비워둠)

→ 모두 기본값으로!
```

### 3-4. 배포 시작
```
"Deploy" 버튼 클릭!

진행 상황:
- Building... ⏳
- Deploying... ⏳
- Success! ✅

약 2-3분 소요
```

---

## 🎉 4단계: 배포 완료!

### 4-1. URL 확인
```
배포 완료되면 화면에 표시:

https://kakao-thumb-ai-xxxx.vercel.app
또는
https://kakao-thumb-ai.vercel.app

이게 공유 가능한 URL입니다!
```

### 4-2. 확인하기
```
1. URL 클릭해서 열기
2. 웹사이트가 정상 작동하는지 확인:
   - 디자인 표시 ✅
   - 이미지 업로드 작동 ✅
   - 슬라이더 작동 ✅
   - 버튼 작동 ✅
```

### 4-3. 커스텀 도메인 (선택사항)
```
Vercel 대시보드:
1. 프로젝트 설정
2. Domains
3. 원하는 도메인 추가 가능
   예: kakao-thumb-ai.com
```

---

## 🔗 5단계: 외부 공유

### 배포 URL 공유하기
```
https://kakao-thumb-ai-xxxx.vercel.app

이 링크를:
✅ 카톡으로 전송
✅ 이메일로 전송
✅ SNS에 공유
✅ 포트폴리오에 추가

모두 가능합니다!
```

### 공유 시 설명
```
"KAKAO THUMB AI - AI 이미지 생성 웹 인터페이스

Berlin Studio 스타일의 미니멀 디자인으로
제작한 AI 제품 무드샷 생성 툴입니다.

현재 UI/UX 프로토타입 단계이며,
AI 백엔드 연동은 개발 중입니다."
```

---

## 🆘 문제 해결

### Git 에러: "not a git repository"
```
해결: git init 다시 실행
```

### GitHub 업로드 실패
```
해결:
1. GitHub에서 리포지토리 생성 확인
2. URL이 정확한지 확인
3. git remote -v 로 확인
```

### Vercel 배포 실패
```
해결:
1. GitHub 리포지토리에 파일들 확인
2. index.html이 루트에 있는지 확인
3. Vercel에서 다시 Import
```

### 배포는 됐는데 디자인 깨짐
```
해결:
1. css/, js/ 폴더가 GitHub에 올라갔는지 확인
2. 파일 경로 확인 (상대 경로로)
3. 브라우저 캐시 삭제 후 새로고침
```

---

## ✅ 완료 체크리스트

- [ ] GitHub 리포지토리 생성
- [ ] Git으로 파일 업로드
- [ ] Vercel 계정 가입
- [ ] 프로젝트 Import
- [ ] 배포 완료
- [ ] URL 확인
- [ ] 웹사이트 정상 작동 확인
- [ ] 외부 공유 가능!

---

## 🎊 축하합니다!

웹사이트가 전 세계에 공개되었습니다!

**배포 URL:**
```
https://kakao-thumb-ai-xxxx.vercel.app
```

**특징:**
- ✅ 무료 호스팅
- ✅ 자동 HTTPS
- ✅ 빠른 로딩
- ✅ 전 세계 CDN
- ✅ 자동 배포 (GitHub push 시)

---

## 🔄 업데이트 방법

**파일 수정 후:**
```bash
git add .
git commit -m "Update design"
git push

→ Vercel이 자동으로 재배포!
→ 약 1-2분 후 반영
```

---

**배포 성공하시면 URL 공유해주세요!** 🚀
제가 확인해드리겠습니다! 😊
