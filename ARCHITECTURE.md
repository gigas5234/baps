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

## Database Schema (Supabase)

### profiles
| 컬럼 | 비고 |
|------|------|
| id, user_name, bmr(기초대사량), target_cal(목표) | 유저 기본 정보 및 설정값 |

### meals
| 컬럼 | 비고 |
|------|------|
| id, user_id, image_url, food_name, cal, carbs, protein, fat, created_at | 개별 식단 기록 데이터 |

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
  - 💧 물 마시기
- **우측 하단 FAB (AI 챗봇)**: 오버레이 채팅창

### 3. 하루 마감 시스템 (Fact-bombing Summary)
- 밤 11시 또는 '오늘 종료' 버튼 시 생성
- Gemini가 날카로운 팩트 폭격 요약 생성

## 작업 로드맵

1. **Step 1**: 환경 세팅 및 DB 설계
2. **Step 2**: 메인 대시보드 UI 구현
3. **Step 3**: AI 식단 분석 로직 (핵심)
4. **Step 4**: 플로팅 AI 챗봇 구현
5. **Step 5**: 데일리 팩폭 요약 및 PWA 설정
