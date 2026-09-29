// 도구들이 같이 쓰는 유틸. window.VT 로 노출.
(function () {
  'use strict';

  var VT = {};

  VT.FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", ' +
    '"Noto Sans KR", "Malgun Gothic", "Segoe UI", sans-serif';

  // 벨로그 본문 폭(px). 이보다 좁은 이미지는 벨로그에서 왼쪽에 붙어서 보임.
  VT.POST_WIDTH = 768;

  // 벨로그 라이트(#FFFFFF)와 다크(#121212) 양쪽에서 대비가 비슷하게 나오는 중간 회색
  VT.CAPTION_COLOR = '#80868e';

  VT.VELOG_BG = { light: '#ffffff', dark: '#121212' };

  // ---------- 토스트 ----------

  var toastEl, toastTimer;
  VT.toast = function (msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  };

  // ---------- 저장 ----------

  VT.load = function (key, defaults) {
    var out = {};
    for (var k in defaults) out[k] = defaults[k];
    try {
      var saved = JSON.parse(localStorage.getItem('velog-tools-' + key) || '{}');
      for (var s in defaults) if (saved[s] !== undefined) out[s] = saved[s];
    } catch (e) {}
    return out;
  };

  VT.save = function (key, value) {
    try { localStorage.setItem('velog-tools-' + key, JSON.stringify(value)); } catch (e) {}
  };

  // ---------- 이미지 입력 ----------

  function imageFiles(list) {
    return Array.prototype.filter.call(list || [], function (f) { return /^image\//.test(f.type); });
  }

  // 붙여넣기 · 드래그 앤 드롭 · 파일 선택을 한 번에 연결. 텍스트 붙여넣기는 건드리지 않음.
  VT.onImages = function (opts) {
    var handle = opts.onFiles;

    document.addEventListener('paste', function (e) {
      var items = (e.clipboardData && e.clipboardData.items) || [];
      var files = [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].kind === 'file' && /^image\//.test(items[i].type)) files.push(items[i].getAsFile());
      }
      if (!files.length) return;
      e.preventDefault();
      handle(files);
    });

    if (opts.input) {
      opts.input.addEventListener('change', function () {
        var files = imageFiles(opts.input.files);
        if (files.length) handle(files);
        opts.input.value = '';
      });
    }

    if (opts.dropzone && opts.input) {
      opts.dropzone.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opts.input.click(); }
      });
    }

    var depth = 0;
    document.addEventListener('dragenter', function (e) {
      e.preventDefault();
      depth++;
      document.body.classList.add('dragging');
    });
    document.addEventListener('dragleave', function () {
      if (--depth <= 0) { depth = 0; document.body.classList.remove('dragging'); }
    });
    document.addEventListener('dragover', function (e) { e.preventDefault(); });
    document.addEventListener('drop', function (e) {
      e.preventDefault();
      depth = 0;
      document.body.classList.remove('dragging');
      var files = imageFiles(e.dataTransfer && e.dataTransfer.files);
      if (files.length) handle(files);
      else if (e.dataTransfer && e.dataTransfer.files.length) VT.toast('이미지 파일만 가능함');
    });
  };

  VT.loadImage = function (file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('load failed')); };
      img.src = url;
    });
  };

  VT.releaseImage = function (img) {
    if (img && img.src.indexOf('blob:') === 0) URL.revokeObjectURL(img.src);
  };

  // ---------- 캔버스 ----------

  // 한국어는 공백 없이 길게 이어지는 경우가 많아서, 공백 우선으로 자르고
  // 한 단어가 너무 길면 글자 단위로 자름.
  VT.wrapText = function (ctx, text, maxWidth) {
    var out = [];
    String(text).split('\n').forEach(function (para) {
      var line = '';
      var lastSpace = -1;
      for (var i = 0; i < para.length; i++) {
        var ch = para[i];
        if (line && ctx.measureText(line + ch).width > maxWidth) {
          if (ch === ' ') { out.push(line); line = ''; lastSpace = -1; continue; }
          if (lastSpace > 0) {
            out.push(line.slice(0, lastSpace));
            line = line.slice(lastSpace + 1) + ch;
          } else {
            out.push(line);
            line = ch;
          }
          lastSpace = line.lastIndexOf(' ');
          continue;
        }
        line += ch;
        if (ch === ' ') lastSpace = line.length - 1;
      }
      out.push(line);
    });
    return out.map(function (l) { return l.trim(); });
  };

  function toBlob(canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (b) { b ? resolve(b) : reject(new Error('toBlob failed')); }, 'image/png');
    });
  }

  VT.copyCanvas = function (canvas) {
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
      VT.toast('이 브라우저는 이미지 복사 미지원임. 다운로드 사용 바람');
      return;
    }
    // Safari는 사용자 제스처 안에서 ClipboardItem을 동기적으로 만들어야 해서 Promise를 그대로 넘김.
    navigator.clipboard.write([new ClipboardItem({ 'image/png': toBlob(canvas) })])
      .then(function () { VT.toast('복사됨. 벨로그에 붙여넣으면 됨'); })
      .catch(function () { VT.toast('복사 실패. 다운로드 사용 바람'); });
  };

  VT.downloadCanvas = function (canvas, name) {
    toBlob(canvas).then(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (name || 'velog') + '-' + Date.now() + '.png';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
  };

  VT.copyText = function (text) {
    var done = function () { VT.toast('복사됨'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { VT.toast('복사 실패'); }
      ta.remove();
    }
  };

  // 미리보기 배경을 벨로그 라이트/다크로 전환. 처음엔 사이트 테마를 따라감.
  VT.initPreview = function (el) {
    var state = { mode: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light' };
    var apply = function () { el.classList.toggle('dark', state.mode === 'dark'); };
    VT.bindSegmented(el, state, apply);
    apply();
  };

  // ---------- UI ----------

  // <div class="segmented" data-option="key"> 버튼 그룹을 options 객체와 연결
  VT.bindSegmented = function (root, options, onChange) {
    // 미리보기 전환 버튼은 따로 묶이므로, 바깥 root에서는 제외
    var inPreview = root.classList && root.classList.contains('velog-preview');
    var groups = Array.prototype.filter.call(root.querySelectorAll('.segmented[data-option]'), function (g) {
      return inPreview || !g.closest('.velog-preview');
    });
    function sync() {
      groups.forEach(function (g) {
        g.querySelectorAll('button').forEach(function (b) {
          b.setAttribute('aria-pressed', String(b.dataset.value === String(options[g.dataset.option])));
        });
      });
    }
    groups.forEach(function (g) {
      g.addEventListener('click', function (e) {
        var btn = e.target.closest('button');
        if (!btn) return;
        options[g.dataset.option] = btn.dataset.value;
        sync();
        onChange();
      });
    });
    sync();
  };

  // Ctrl/Cmd + Enter
  VT.onSubmitKey = function (fn) {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); fn(); }
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) {
      document.querySelectorAll('kbd').forEach(function (k) {
        if (k.textContent === 'Ctrl') k.textContent = '⌘';
      });
    }
  });

  window.VT = VT;
})();
