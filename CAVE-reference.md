# CAVE — 와인 셀러 관리 앱 레퍼런스

CAVE는 개인 와인 셀러 관리 PWA다. 이 문서는 작업 시 배경 맥락으로 참고한다.

## 기본 정보
- 앱 이름: CAVE
- 로컬 경로: `C:\Claude\wine-cellar-mgmt`
- GitHub: https://github.com/youjinwoong/wine-cellar-mgmt
- 배포 URL: https://youjinwoong.github.io/wine-cellar-mgmt/
- 공개 갤러리: https://youjinwoong.github.io/wine-cellar-mgmt/?gallery=1
- Supabase Project ID: `nmjawxbbwlerugfyypft`
- Supabase URL: https://nmjawxbbwlerugfyypft.supabase.co
- 로그인 계정: you.jinwoong@gmail.com

## 기술 스택
- React + Vite
- Supabase (PostgreSQL + Auth + Edge Functions)
- GitHub Pages / GitHub Actions (CI/CD)
- Anthropic API (anthropic-proxy Edge Function 경유)

## 셀러 구성
- VINDIS #1 (`vindis1`): 10칸, 칸당 최대 20병
- VINDIS #2 (`vindis2`): 10칸, 칸당 최대 20병
- EUROCAVE (`eurocave`): 15칸, 칸당 최대 12병

## DB 테이블
- **wines**: id, name, vintage, qty, price, purchase_date, cellar_id, slot, image_url, notes,
  producer, region, country, grape, description, vivino_price(USD), wine_searcher_price(KRW),
  vivino_rating, drinking_from, drinking_to, wine_type, share_token, bottle_size(정수, ml, 기본 750)
- **drink_log**: id, wine_id, wine_name, wine_vintage, cellar_name, slot, date, companions,
  occasion, rating, review, image_url
- **purchase_history**: id, wine_id, purchase_date, price, qty, notes

## 파일 구조
```
src/
├── App.jsx                ← 라우팅, 세션, CRUD, moveWine(분할/병합), renameWines, 모달 제어
├── index.css
├── main.jsx
├── config/cellars.js      ← 테마 T, 헬퍼, BOTTLE_SIZES/bottleLabel/bottleBadge,
│                            getDrinkingStatus, compressImage(EXIF 보정), callAI
├── lib/supabase.js        ← Auth, callProxy, CRUD, wineToDb/dbToWine, get_public_wines
└── components/
    ├── Header.jsx
    ├── Dashboard.jsx
    ├── CellarView.jsx
    ├── Views.jsx          ← ListView(이름묶기/통일, 용량 배지), SearchView,
    │                        DrinkLogView(삭제), StatisticsView(수익률%)
    ├── SharedGallery.jsx  ← 공개 읽기 전용 갤러리 (?gallery=1)
    ├── ui.jsx
    └── modals/
        ├── AddWineModal.jsx
        └── Modals.jsx     ← DetailModal(이동/용량/배지), DrinkModal, SettingsModal, BulkImportModal
```

## 핵심 규칙 요약
- **AI 호출**: 전부 callProxy 경유, 모델 claude-sonnet-4-6, max_tokens 2000+(이미지 3000),
  web_search 도구 + pause_turn 재호출(최대 4회), JSON은 마지막 완성 객체 파싱.
- **가격 표시**: wine_searcher_price = 한국 시장가(₩), vivino_price = 글로벌($).
  두 통화를 섞어 평균 내지 않는다. 시장가는 750ml 1병 기준.
- **병 용량**: bottle_size ml 정수, 기본 750. bottleBadge는 750/미설정이면 null,
  매그넘(1500) 등만 배지 표시.
- **통계 수익률**: (시장가합계 − 구매가합계) ÷ 구매가합계 × 100. 구매가·시장가 모두 있는 와인만.
  양수 초록(#4a8a5e), 음수 빨강(#c0392b).
- **인증/RLS**: 세 테이블 authenticated 전용. anon은 테이블 직접 접근 불가. 공개 갤러리는
  get_public_wines() RPC로만 조회.
- **EXIF 회전**: createImageBitmap(file, { imageOrientation: 'from-image' })로 한 번만 보정.
  수동 transform 추가 금지(이중 회전).

## 주요 기능 이력 (구현 완료)
- 위치 이동(분할 + 자동 병합), 마심 기록(버그 수정), 음주 기록 삭제(2단계 확인)
- 통계 수익률(%), 병 용량(bottle_size) + 배지
- 사진 일괄 입력: 가격 검색 수동 트리거, 라벨 영역별 크롭 썸네일, 검토 화면 사진 교체, EXIF 보정
- 비슷한 이름 묶기/이름 통일(nameFingerprint, 방안 B — Brut/Rosé 등 구분 단어는 남김)
- 공개 갤러리(?gallery=1, ?gallery=1&price=0)
- 음용 적기(커밋 b8a750a): 전용 "음용 적기" 탭(⏰, Header) + DrinkingWindowView.
  status 순서 빨리 마셔야→지금 절정→마시기 좋음→곧 절정→숙성 중, 동일 와인 "이름+N병" 묶음.
  getDrinkingStatus: decline 라벨 '빨리 마셔야'로 통일, 빈티지·drinkingFrom/to 모두 없으면
  구매일 폴백(구매 2년 미만 '마시기 좋음', 2년 이상·구매일 없음 '빨리 마셔야').
  🔮 음용시기 추정 버튼(callAI/callProxy 경유 → drinkingFrom/to 저장).
  대시보드에 '빨리 마셔야'·'지금 절정' 요약 카드(클릭 시 음용 적기 탭 이동).
- 병 용량 배지를 셀러 뷰·대시보드에도 적용 + 단일 등록(AddWineModal)에 병 용량 선택(커밋 712d9f8).
- 이름 묶기 "수준 3"(커밋 e2efd0f): 비슷한 이름 묶기 안에서 이름·빈티지·셀러·칸이 모두 같은
  진짜 중복 레코드를 한 줄로 묶어 🔗 병합(병 수 합산). App.jsx mergeWines + ListView onMerge.

## Supabase 서버 측 구성 (코드 저장소 밖)
- Edge Function: `anthropic-proxy` (verify_jwt=true)
- Secret: `ANTHROPIC_API_KEY`
- RPC: `get_public_wines()`(공개 갤러리, bottle_size 포함), `get_shared_wine(p_token)`
- RLS: 세 테이블 "authenticated full access"
- 마이그레이션: RETURNS TABLE 변경 시 drop function 후 create function,
  이어서 revoke all from public + grant execute to anon, authenticated
  (security definer + set search_path = public)

## 아직 미적용 (다음 작업 후보)
- 취향 프로필 (음주 기록 기반 선호 품종·지역·평점 분석)
- AI 추천("오늘 뭐 마실까")
- 위시리스트
- 컬렉션 가치 평가
