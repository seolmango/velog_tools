# velog tools

벨로그 글 작성할 때 아쉬운 부분을 채워주는 작은 정적 도구 모음입니다. 빌드 과정 없이 GitHub Pages로 바로 배포됩니다.

## 도구

- **이미지 캡션** (`tools/caption/`) — 이미지를 붙여넣고 캡션을 입력하면, 캡션이 들어간 이미지를 클립보드로 복사해줍니다. 벨로그 에디터에 그대로 붙여넣으면 됩니다.
  - 붙여넣기(<kbd>Ctrl</kbd>+<kbd>V</kbd>) · 드래그 앤 드롭 · 파일 선택 지원
  - 정렬 / 배경(흰색 · 어두운색 · 투명) / 글자 크기 조절
  - <kbd>Ctrl</kbd>+<kbd>Enter</kbd>로 바로 복사, 복사가 안 되는 브라우저는 다운로드

## 배포

Settings → Pages → Source를 **Deploy from a branch**, 브랜치 `main` / `/ (root)`로 설정하면 됩니다.

## 로컬 실행

```sh
python3 -m http.server
```

클립보드 이미지 복사는 보안 컨텍스트(HTTPS 또는 localhost)에서만 동작합니다.

## 새 도구 추가

`tools/<이름>/index.html`을 만들고 `assets/style.css`, `assets/theme.js`를 불러온 뒤 루트 `index.html`의 `.tool-list`에 카드를 추가하세요.
