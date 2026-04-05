# BAPS - 기술 아키텍처

모바일에 최적화된 Web App(PWA) 형태를 지향합니다.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14+ (App Router), Tailwind CSS, Shadcn/UI |
| State Management | Zustand (BMR 설정 및 전역 상태), React Query (서버 데이터 페칭) |
| Backend/Storage | Supabase (Auth, PostgreSQL, Storage) |
| AI Engine | Gemini 1.5 Flash (식단 분석 + 팩폭 요약 + 상담 챗봇) |
| Deployment | Vercel |

## 핵심 설계 결정사항

### Auth: 소셜 로그인 Only
- **메인**: 카카오 로그인 (한국 유저 원터치)
- **서브**: 구글 로그인
- 이메일/비밀번호, 매직링크 제외 (모바일 UX 우선)

### BMR: 온보딩 자동 계산 + 수동 수정
- 회원가입 직후 온보딩에서 키/몸무게/나이/성별 입력
- **Mifflin-St Jeor 공식**: `BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age + s`
  - s = +5 (남성), -161 (여성)
- 자동 계산값 표시 + "직접 입력" 옵션 하단에 제공

### API: Server-side Route Handler
- `src/app/api/`에서 Gemini 호출 (API 키 보호)
- 서버에서 이미지 압축 + 결과 JSON DB 저장 처리

### 물 기록: 별도 테이블 (water_logs)
- 컵 단위(250ml) 단순 카운터
- meals 테이블과 분리 (칼로리 쿼리 오염 방지)

### PWA: 기본형 (Manifest + Theme Color)
- 홈 화면 추가 + 풀스크린 지원
- Service Worker 오프라인 캐싱은 후순위

## Database Schema (Supabase)

### profiles
| 컬럼 | 비고 |
|------|------|
| id, user_name, height, weight, age, gender, bmr, target_cal | 유저 기본 정보 + 신체 데이터 |

### meals
| 컬럼 | 비고 |
|------|------|
| id, user_id, image_url, food_name, cal, carbs, protein, fat, created_at | 개별 식단 기록 데이터 |

### water_logs
| 컬럼 | 비고 |
|------|------|
| id, user_id, cups, date | 일별 물 섭취 기록 (1컵 = 250ml) |

### daily_logs
| 컬럼 | 비고 |
|------|------|
| id, user_id, date, total_cal, is_success, ai_fact_summary | 하루 단위 요약 및 AI 팩폭 메시지 |

### chats
| 컬럼 | 비고 |
|------|------|
| id, user_id, message, is_ai, created_at | AI 상담 내역 (Context 유지용) |

## App UI/UX 구조 (Mobile First)

### 1. 메인 화면 (Calendar & Dashboard)
- **상단**: 가로형 주간 캘린더 (날짜 선택 시 해당일 데이터 로드)
- **중앙 (Status Card)**: 삼성 헬스 스타일 게이지 차트
  - `[ 현재 섭취량 / 기초대사량 ]` 표시
  - 초과 시 게이지 빨간색 + "다이어트 위험" 경고
- **중간**: 오늘 먹은 식단 타임라인 (이미지 썸네일 + 칼로리)

### 2. 인터랙션 요소
- **하단 중앙 원버튼 (Quick Action)**: 클릭 시 메뉴 펼침
  - 📷 사진 찍기 (Gemini Vision 연동)
  - ✏️ 직접 입력
  - 💧 물 마시기 (컵 카운터)
- **우측 하단 FAB (AI 챗봇)**: 오버레이 채팅창

### 3. 온보딩 플로우
- 소셜 로그인 → 신체 정보 입력 → BMR 자동 계산 → 목표 칼로리 확인 → 메인

### 4. 하루 마감 시스템 (Fact-bombing Summary)
- 밤 11시 또는 '오늘 종료' 버튼 시 생성
- Gemini가 날카로운 팩트 폭격 요약 생성

## 작업 로드맵

1. **Step 1**: 환경 세팅 및 DB 설계
2. **Step 2**: 메인 대시보드 UI 구현
3. **Step 3**: AI 식단 분석 로직 (핵심)
4. **Step 4**: 플로팅 AI 챗봇 구현
5. **Step 5**: 데일리 팩폭 요약 및 PWA 설정
