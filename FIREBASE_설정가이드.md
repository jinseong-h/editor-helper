# Firebase 클라우드 동기화 설정 가이드

이 가이드를 따라 무료 Firebase 프로젝트를 만들고 Google 로그인을 통한 클라우드 동기화를 활성화하세요.

## 📋 설정 순서 (약 5분 소요)

### 1단계: Firebase 콘솔 접속
1. [Firebase 콘솔](https://console.firebase.google.com/)에 접속
2. Google 계정으로 로그인

### 2단계: 새 프로젝트 생성
1. **"프로젝트 추가"** 클릭
2. 프로젝트 이름 입력: `editor-task-manager` (원하는 이름 가능)
3. Google 애널리틱스: **비활성화** (필요 없음)
4. **"프로젝트 만들기"** 클릭

### 3단계: Realtime Database 생성
1. 왼쪽 메뉴에서 **"빌드" → "Realtime Database"** 클릭
2. **"데이터베이스 만들기"** 클릭
3. 위치 선택: **"asia-southeast1 (싱가포르)"** 권장
4. 보안 규칙: **"테스트 모드에서 시작"** 선택
5. **"사용 설정"** 클릭

### 4단계: 웹 앱 등록
1. 프로젝트 개요 페이지에서 **"</>"** (웹) 아이콘 클릭
2. 앱 닉네임: `editor-app`
3. **"앱 등록"** 클릭
4. 표시되는 **firebaseConfig** 내용을 복사

### 5단계: 앱에 설정 적용
1. `app.js` 파일을 열기
2. 하단 부근에서 `FIREBASE_CONFIG` 찾기
3. 복사한 설정으로 교체:

```javascript
const FIREBASE_CONFIG = {
    apiKey: "여기에_복사한_API키",
    authDomain: "여기에_복사한_값",
    databaseURL: "여기에_복사한_값",  // 중요!
    projectId: "여기에_복사한_값",
    storageBucket: "여기에_복사한_값",
    messagingSenderId: "여기에_복사한_값",
    appId: "여기에_복사한_값"
};
```

> ⚠️ **중요**: `databaseURL`이 비어있으면 Realtime Database 페이지에서 URL 복사

### 6단계: Google 로그인 인증 활성화 (필수)
1. 왼쪽 메뉴에서 **"빌드" → "Authentication"** 클릭
2. **"시작하기"** 클릭
3. **"Sign-in method(로그인 방법)"** 탭 클릭
4. **"새 제공업체 추가"** 클릭 → **"Google"** 선택
5. 우측 상단의 **"사용 설정"** 스위치 켜기
6. 프로젝트 지원 이메일을 본인의 구글 이메일로 선택 → **저장**

### 7단계: 승인된 도메인 추가 (필수)
앱을 배포할 주소(Netlify 등)를 Firebase에 알려주어야 구글 로그인이 정상 작동합니다.
1. 왼쪽 메뉴에서 **"빌드" → "Authentication"** 클릭
2. 상단의 **"Settings(설정)"** 탭 클릭
3. 왼쪽 서브메뉴에서 **"승인된 도메인(Authorized domains)"** 클릭
4. **"도메인 추가"** 버튼 클릭
5. 배포된 주소를 입력합니다 (예: `editorhelper.netlify.app` - *https://는 빼고 입력*)
6. **"추가"** 클릭

### 8단계: 보안 규칙 설정 (필수)
Realtime Database → 규칙 탭에서 다음으로 변경:
```json
{
  "rules": {
    "users": {
        "$uid": {
          ".read": "auth != null && auth.uid == $uid",
          ".write": "auth != null && auth.uid == $uid"
        }
    },
    ".read": false,
    ".write": false
  }
}
```
> ⚠️ **중요**: 이 규칙은 로그인한 본인(Google 계정)만 자신의 데이터를 읽고 쓸 수 있도록 강력하게 보호하는 역할입니다.

## ✅ 완료!

이제 앱에서 **설정 → 클라우드 동기화 설정**을 클릭하여 사용하세요!

## 📱 사용 방법

1. **로그인**: 'Google 계정으로 로그인' 버튼 클릭하여 구글 계정 인증
2. 데이터베이스 연결: 로그인 시 자동으로 본인 계정 전용 데이터베이스로 안전하게 동기화!

## ❓ 문제 해결

- **로그인/연결 실패**: FIREBASE_CONFIG가 올바른지 확인
- **databaseURL 오류**: Realtime Database 페이지에서 URL 복사
- **승인되지 않은 도메인 오류**: 위 7단계를 확인하여 접속 중인 주소가 승인된 도메인에 추가되어 있는지 확인
- **단일 계정 접근 권한 오류**: 위 6단계, 8단계가 정확히 설정되었는지 확인
