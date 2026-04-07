---
name: pm-task-audit
description: PM 작업 완료 후 품질 감사. PM-rule 준수, DS 컴포넌트 사용, i18n 하드코딩 검증.
---

# PM Task Audit

## Overview

PM 작업이 완료된 브랜치/PR의 변경 파일을 대상으로 3가지 관점에서 감사한다.

1. **PM-rule 준수** — 수정 범위, 금지 파일, 코드 패턴
2. **DS 컴포넌트 사용** — `@pullim/design-system` 우선 사용 여부
3. **i18n 준수** — 하드코딩된 사용자 노출 텍스트 검출

## When to Use

- PR 올리기 전 셀프 감사
- 커밋 후 작업 검증
- 코드 리뷰 시 체크리스트 대용

---

## 실행 절차

### Step 0. 감사 대상 파일 수집

변경된 파일 목록을 구한다. base 브랜치가 명확하면 diff, 아니면 최근 커밋 기준.

```bash
# PR 체인이면 base 브랜치 대비 diff
git diff --name-only <base-branch>...HEAD

# 또는 최근 N 커밋
git diff --name-only HEAD~N
```

> 감사 대상은 `apps/web/` (또는 `apps/studio/`) 하위 파일만. `packages/`, `apps/backend/` 변경이 있으면 즉시 경고.

---

### Step 1. PM-rule 준수 검사

`contributing/guides/for-pm/ALLOWED_CHANGES.md`와 `pm-guide` skill의 핵심 제약을 기준으로 검사한다.

#### 1-1. 수정 금지 영역 침범

변경 파일 중 아래에 해당하면 **FAIL**:

| 금지 영역 | 패턴 |
|-----------|------|
| API 관련 | `lib/api/`, `packages/api-client/` |
| 비즈니스 로직 | `hooks/`, `stores/` (앱 루트) |
| 설정 파일 | `next.config.ts`, `package.json`, `tsconfig.json` |
| 백엔드 | `apps/backend/` |
| 인증/보안 | `middleware.ts`, auth 관련 |
| 타입 패키지 | `packages/types/`, `packages/config/` |

#### 1-2. 코드 패턴 위반

변경된 `.tsx`, `.ts` 파일 내용에서 검출:

| 위반 | 검색 패턴 | 허용 예외 |
|------|----------|----------|
| API 호출 | `fetch(`, `axios`, `useSWR`, `useQuery` | mock 파일 내부 |
| 전역 상태 | `useUserStore`, `useAuthStore`, `zustand` | 없음 |
| 인증 로직 | `redirect("/login")`, `useSession` | 없음 |
| router.push | `router.push(` | Container에서 `router.replace` (URL params) 허용 |

#### 1-3. Container/Presenter 구조

`components/features/` 하위에 새 feature를 만들었다면:

- [ ] `containers/` 폴더에 Container 컴포넌트 존재
- [ ] `presenters/` 폴더에 Presenter 컴포넌트 존재
- [ ] Container가 상태/핸들러 관리, Presenter가 순수 렌더링
- [ ] `app/` 페이지 파일은 Container만 import

> 단순 UI 수정(기존 컴포넌트 스타일 변경 등)은 이 검사 생략.

---

### Step 2. DS 컴포넌트 사용 검사

`contributing/guides/for-pm/COMPONENT_GUIDE.md`와 `contributing/guides/for-dev/UI_PACKAGE.md` 기준.

#### 2-1. import 소스 우선순위

변경된 파일의 import 문을 검사:

| 우선순위 | import 소스 | 판정 |
|---------|------------|------|
| 1 (최우선) | `@pullim/design-system` | OK |
| 2 | `@pullim/ui` | DS에 동일 컴포넌트 있으면 WARN |
| 3 | `@/components/ui/` | DS에 동일 컴포넌트 있으면 WARN |
| 4 | 새로 작성 | 작업 로그에 이관 후보 표시 권고 |

#### 2-2. DS에 있는데 다른 소스에서 가져온 컴포넌트

아래 컴포넌트가 `@pullim/design-system` 외부에서 import되면 **WARN**:

```
Accordion, AlertDialog, Avatar, Badge, Button, Calendar, Card,
Checkbox, Dialog, DropdownMenu, Form, Heading, Input, Label,
Lead, Muted, Popover, Progress, RadioGroup, Select, Separator,
Sheet, Skeleton, Switch, Tabs, Text, Textarea, Tooltip,
Blockquote, Code, Toaster, toast
```

#### 2-3. 아이콘 import

| 소스 | 판정 |
|------|------|
| `lucide-react` | OK (DS가 lucide 재export하지만 직접 import도 허용) |
| `@pullim/design-system/icons` | OK (KakaoIcon, NaverIcon 등 커스텀 아이콘) |
| MUI, FontAwesome 등 | FAIL — 프로젝트 미설치 |

#### 2-4. 유틸리티

| 항목 | 올바른 소스 |
|------|------------|
| `cn` | `@pullim/design-system` 또는 `@/lib/utils` |
| `toast` | `@pullim/design-system` (sonner 재export) |

---

### Step 3. i18n 준수 검사

`next-intl`의 `useTranslations` / `getTranslations`를 통해 모든 사용자 노출 텍스트를 관리해야 한다.

#### 3-1. 하드코딩 텍스트 검출

변경된 `.tsx` 파일의 JSX 영역에서 한글/영문 리터럴을 검출:

**검사 대상 (WARN):**
- JSX 텍스트 노드: `<p>안녕하세요</p>`, `<span>Hello</span>`
- JSX 속성 내 문자열: `placeholder="이메일"`, `title="설정"`
- 템플릿 리터럴 내 텍스트: `` {`${name}님 환영합니다`} ``

**검사 제외 (OK):**
- `className`, `data-name`, `data-testid` 등 비노출 속성
- `console.log`, 주석
- `aria-label` (접근성 — i18n 권장이나 단계적 적용)
- 숫자, URL, 이메일 형식
- `type`, `variant`, `size` 등 컴포넌트 prop 값
- mock 파일 (`lib/mock/`, `mock.ts`)

#### 3-2. 메시지 파일 동기화

- 변경된 컴포넌트에서 사용하는 `t("key")` 호출의 키가 `messages/ko.json`에 존재하는지 확인
- `messages/ko.json`에 키가 추가됐으면 `messages/en.json`에도 대응 키가 있는지 확인

#### 3-3. toast 메시지

`toast()` 호출 내 문자열도 i18n 대상:

```tsx
// WARN — 하드코딩
toast("저장되었습니다");

// OK — i18n
toast(t("saved"));
```

---

## 감사 결과 보고 형식

```markdown
# PM Task Audit Report

## 감사 대상
- 브랜치: `feat/xxx`
- base: `feat/yyy`
- 변경 파일: N개

## 1. PM-rule 준수

| # | 파일 | 위반 | 심각도 |
|---|------|------|--------|
| 1 | path/to/file.tsx:42 | 설명 | FAIL/WARN |

## 2. DS 컴포넌트 사용

| # | 파일 | 현재 import | DS 대체 가능 | 심각도 |
|---|------|------------|-------------|--------|
| 1 | path/to/file.tsx:3 | @/components/ui/button | Button from @pullim/design-system | WARN |

## 3. i18n 준수

| # | 파일:라인 | 하드코딩 텍스트 | 권장 |
|---|----------|----------------|------|
| 1 | path/to/file.tsx:15 | "저장" | t("save") |

## 요약
- FAIL: N건 (반드시 수정)
- WARN: N건 (권장 수정)
- OK: 위반 없음
```

---

## 심각도 기준

| 레벨 | 의미 | 예시 |
|------|------|------|
| **FAIL** | 반드시 수정. PM-rule 명시적 위반 | 금지 영역 수정, 미설치 패키지 import |
| **WARN** | 권장 수정. 컨벤션 위반 또는 개선 가능 | DS 대체 가능, 하드코딩 텍스트 |
| **INFO** | 참고. 추후 개선 대상 | aria-label i18n, DS 이관 후보 |
