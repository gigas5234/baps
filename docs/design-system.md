# BAPS 디자인 시스템 — _The Watcher Edition_

가장 깔끔하면서도 **「AI가 실시간으로 분석 중」** 이라는 인상을 주는 톤입니다. 구현과의 싱크는 CSS 변수(`src/app/globals.css`의 `:root`, `@theme inline`)를 기준으로 합니다.

## 색상 팔레트 (HEX)

| 구분 | HEX | 역할 및 느낌 |
|------|-----|----------------|
| **Background** | `#F8FAFC` | 아주 연한 그레이가 섞인 화이트. 장시간 봐도 눈이 편안함. |
| **Surface (Card)** | `#FFFFFF` | 배경과 미세하게 대비되는 순백색. 정보 레이어 구분. |
| **Primary (AI)** | `#6366F1` | Indigo Violet. AI·분석에 대한 신뢰감을 주는 메인 컬러. |
| **Point (Scanner)** | `#2DD4BF` | Teal/Mint. 스캐닝·정상 범위 등 **포인트** 색. |
| **Alert (Fact)** | `#F43F5E` | Cyber Red. 팩폭·칼로리 초과 등 경고 시 시선 고정. |
| **Text (Main)** | `#0F172A` | 깊은 네이비 톤의 본문/타이틀. |

**코드 매핑:** `--background`, `--card`, `--primary`, `--scanner`, `--destructive` / `--alert`, `--foreground` 등. gauge 존은 `--gauge-safe` / `--gauge-caution` / `--gauge-danger`로 별도 정의.

## Typography

| 용도 | 서체 |
|------|------|
| **UI 본문·한글** | Pretendard (`--font-sans`, CDN 변수 폰트) |
| **숫자·데이터** | JetBrains Mono (`--font-data`, `next/font` → `--font-jetbrains-mono`) |

Tailwind: 본문은 기본 `font-sans`, 칼로리·kcal·퍼센트 등 데이터 강조는 **`font-data`** 유틸 클래스 사용.

## Tone & manner (카피 가이드)

1. **냉철함 (Cold):** «밥 먹었니?» 대신 «식단 감지됨. 분석을 시작합니다.» 같은 톤.
2. **정교함 (Precise):** 수치는 `font-data` + tabular nums, 필요 시 미세한 모션.
3. **위트 있는 독설 (Sharp Wit):** 성공 시 짧게 무심한 칭찬, 실패 시 데이터 기반의 날카로운 조언.

## UI 디테일 (구현 가이드)

### ① Glassmorphism

배경 영상/이미지 위 카드는 둥둥 떠 보이기만 하지 말고, **반투명 + 블러 + 얇은 테두리**로 정보층을 분리합니다.

- 유틸 클래스: **`baps-glass`** (`globals.css`의 `@utility`)

### ② Data-grid layout

탄·단·지 등 리포트형 블록은 실험실 리포트 느낌의 그리드·얇은 구분선 사용.

- 구분선 톤: **`border-grid-line`** (`--grid-line` ≈ slate-100 계열), `border-slate-100` 수준으로 눈에 띄지 않게.

### ③ AI 채팅 FAB

우측 하단: 지나친 원형보다 **스쿼클(`rounded-2xl`)**, **`primary` 기반 소프트 글로우**(그림자/링)로 «살아 있는 AI» 느낌.

---

## 서드파티 예외

Google·카카오 로그인 버튼, OAuth 아이콘 등은 **브랜드 가이드 색**을 그대로 사용할 수 있습니다. 앱 고유 팔레트와 혼동 시 본 문서의 Primary/Scanner와 구분해 사용합니다.

## 변경 시 체크리스트

- [ ] `globals.css` `:root` / `.dark` / `@theme inline`에 색·폰트 토큰 반영
- [ ] 컴포넌트에서 raw HEX / `cyan-*` / `violet-*` 등 임의 팔레트 대신 토큰·시맨틱 클래스 사용
- [ ] 새 화면은 `font-data`로 숫자 영역 통일 여부 확인
