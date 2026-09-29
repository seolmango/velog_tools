# velog tools

벨로그 글 쓸 때 아쉬운 부분 채워주는 정적 도구 모음임. 빌드 없이 GitHub Pages로 바로 배포됨.
전부 브라우저 안에서만 돌아가고 이미지는 어디에도 안 올라감.

## 도구

| 도구 | 경로 | 설명 |
| --- | --- | --- |
| 이미지 캡션 | `tools/caption/` | 이미지 아래에 캡션 넣고 가운데 정렬 · 크기 조절해서 클립보드로 복사함 |
| 이미지 나란히 | `tools/merge/` | 여러 이미지를 나란히(또는 격자로) 붙여 한 장으로 만듦. 이미지별 캡션 가능 |
| 썸네일 만들기 | `tools/thumbnail/` | 벨로그 카드 비율(1.91:1)에 맞춘 1200×628 썸네일 만듦 |
| 표 변환 | `tools/table/` | 엑셀 · 구글 시트 · CSV를 마크다운 표로 바꿈 |

## 왜 이미지로 굽는지

벨로그는 글을 렌더링할 때 HTML을 걸러냄 ([velog-client `MarkdownRender.tsx`](https://github.com/velopert/velog-client/blob/master/src/components/common/MarkdownRender.tsx) 참고).

- `<img>`는 `src`, `alt`, `width`, `height`만 남고, `<p align>`이나 `style`(span 제외)은 지워짐
- 이미지는 `display: block`에 좌우 여백이 없어서 본문보다 좁으면 왼쪽에 붙음

그래서 HTML로 캡션 · 가운데 정렬 · 나란히 배치를 하면 미리보기와 실제 글이 다르게 보임.
이 도구들은 결과를 투명 배경 PNG로 만들고 캔버스 폭을 본문 폭(768px) 이상으로 맞춰서, 라이트/다크 모드 상관없이 가운데 정렬된 것처럼 보이게 함.
캡션 색은 라이트(`#FFFFFF`)와 다크(`#121212`) 배경 양쪽에서 대비가 비슷한 중간 회색 `#80868e`임.

## 배포

Settings → Pages → Source를 **Deploy from a branch**, 브랜치 `main` / `/ (root)`로 설정하면 됨.

## 로컬 실행

```sh
python3 -m http.server
```

클립보드 이미지 복사는 보안 컨텍스트(HTTPS 또는 localhost)에서만 동작함.

## 새 도구 추가

`tools/<이름>/index.html`을 만들고 `assets/style.css`, `assets/theme.js`, `assets/common.js`를 불러온 뒤 루트 `index.html`의 `.tool-list`에 카드 추가하면 됨.
