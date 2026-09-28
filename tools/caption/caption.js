(function () {
  'use strict';

  var STORE_KEY = 'velog-tools-caption-options';
  var FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", ' +
    '"Noto Sans KR", "Malgun Gothic", "Segoe UI", sans-serif';

  // 벨로그 라이트/다크 테마 배경에 맞춘 색상
  var THEMES = {
    light: { bg: '#ffffff', text: '#868e96' },
    dark: { bg: '#121212', text: '#acacac' },
    transparent: { bg: null, text: '#868e96' }
  };

  var $ = function (id) { return document.getElementById(id); };
  var dropzone = $('dropzone');
  var fileInput = $('file-input');
  var editor = $('editor');
  var captionInput = $('caption');
  var sizeInput = $('size');
  var sizeValue = $('size-value');
  var preview = $('preview');
  var canvas = $('canvas');
  var meta = $('meta');
  var toastEl = $('toast');
  var ctx = canvas.getContext('2d');

  var image = null;
  var options = loadOptions();

  // ---------- 옵션 ----------

  function loadOptions() {
    var defaults = { align: 'center', bg: 'light', size: 100 };
    try {
      var saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      for (var k in defaults) if (saved[k] !== undefined) defaults[k] = saved[k];
    } catch (e) {}
    return defaults;
  }

  function saveOptions() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(options)); } catch (e) {}
  }

  function syncOptionUI() {
    document.querySelectorAll('.segmented').forEach(function (group) {
      var key = group.dataset.option;
      group.querySelectorAll('button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.value === options[key]));
      });
    });
    sizeInput.value = options.size;
    sizeValue.textContent = options.size + '%';
    preview.classList.toggle('checker', options.bg === 'transparent');
  }

  document.querySelectorAll('.segmented').forEach(function (group) {
    group.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      options[group.dataset.option] = btn.dataset.value;
      saveOptions();
      syncOptionUI();
      render();
    });
  });

  sizeInput.addEventListener('input', function () {
    options.size = Number(sizeInput.value);
    saveOptions();
    syncOptionUI();
    render();
  });

  captionInput.addEventListener('input', render);

  // ---------- 이미지 입력 ----------

  function loadFile(file) {
    if (!file || !/^image\//.test(file.type)) {
      toast('이미지 파일만 사용할 수 있어요');
      return;
    }
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      image = img;
      dropzone.hidden = true;
      editor.hidden = false;
      render();
      captionInput.focus();
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      toast('이미지를 불러오지 못했어요');
    };
    img.src = url;
  }

  function imageFromClipboard(e) {
    var items = (e.clipboardData && e.clipboardData.items) || [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].kind === 'file' && /^image\//.test(items[i].type)) return items[i].getAsFile();
    }
    return null;
  }

  // 텍스트 붙여넣기는 그대로 두고, 이미지일 때만 가로챈다.
  document.addEventListener('paste', function (e) {
    var file = imageFromClipboard(e);
    if (!file) return;
    e.preventDefault();
    if (image) URL.revokeObjectURL(image.src);
    loadFile(file);
  });

  fileInput.addEventListener('change', function () {
    if (fileInput.files[0]) loadFile(fileInput.files[0]);
    fileInput.value = '';
  });

  dropzone.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });

  var dragDepth = 0;
  document.addEventListener('dragenter', function (e) {
    e.preventDefault();
    dragDepth++;
    document.body.classList.add('dragging');
  });
  document.addEventListener('dragleave', function () {
    if (--dragDepth <= 0) { dragDepth = 0; document.body.classList.remove('dragging'); }
  });
  document.addEventListener('dragover', function (e) { e.preventDefault(); });
  document.addEventListener('drop', function (e) {
    e.preventDefault();
    dragDepth = 0;
    document.body.classList.remove('dragging');
    var file = e.dataTransfer && e.dataTransfer.files[0];
    if (file) {
      if (image) URL.revokeObjectURL(image.src);
      loadFile(file);
    }
  });

  $('reset-btn').addEventListener('click', function () {
    if (image) URL.revokeObjectURL(image.src);
    image = null;
    captionInput.value = '';
    editor.hidden = true;
    dropzone.hidden = false;
    dropzone.focus();
  });

  // ---------- 렌더링 ----------

  // 한국어는 공백 없이 길게 이어지는 경우가 많아, 공백 우선으로 자르고
  // 한 단어가 너무 길면 글자 단위로 자른다.
  function wrapLine(text, maxWidth) {
    var lines = [];
    var line = '';
    var lastSpace = -1;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var candidate = line + ch;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        if (ch === ' ') {
          lines.push(line);
          line = '';
          lastSpace = -1;
          continue;
        }
        if (lastSpace > 0) {
          lines.push(line.slice(0, lastSpace));
          line = line.slice(lastSpace + 1) + ch;
        } else {
          lines.push(line);
          line = ch;
        }
        lastSpace = line.lastIndexOf(' ');
        continue;
      }
      line = candidate;
      if (ch === ' ') lastSpace = line.length - 1;
    }
    lines.push(line);
    return lines.map(function (l) { return l.trim(); });
  }

  function render() {
    if (!image) return;
    var w = image.naturalWidth;
    var h = image.naturalHeight;
    var caption = captionInput.value.replace(/\s+$/, '');
    var theme = THEMES[options.bg];

    // 벨로그 본문 폭(약 768px)에 맞춰 보였을 때 적당한 크기가 되도록 이미지 폭에 비례
    var fontSize = Math.round(Math.max(14, w * 0.02) * options.size / 100);
    var lineHeight = Math.round(fontSize * 1.5);
    var padX = Math.round(fontSize * 1.2);
    var padTop = Math.round(fontSize * 0.9);
    var padBottom = Math.round(fontSize * 1.0);
    var font = fontSize + 'px ' + FONT_FAMILY;

    ctx.font = font;
    var lines = [];
    if (caption) {
      caption.split('\n').forEach(function (p) {
        lines = lines.concat(wrapLine(p, w - padX * 2));
      });
    }

    var captionHeight = lines.length ? padTop + lines.length * lineHeight + padBottom : 0;
    canvas.width = w;
    canvas.height = h + captionHeight;

    if (theme.bg) {
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(image, 0, 0);

    if (lines.length) {
      ctx.font = font;
      ctx.fillStyle = theme.text;
      ctx.textBaseline = 'middle';
      ctx.textAlign = options.align;
      var x = options.align === 'left' ? padX : options.align === 'right' ? w - padX : w / 2;
      lines.forEach(function (line, i) {
        ctx.fillText(line, x, h + padTop + i * lineHeight + lineHeight / 2);
      });
    }

    meta.textContent = canvas.width + ' × ' + canvas.height + 'px';
  }

  // ---------- 출력 ----------

  function toBlob() {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (b) { b ? resolve(b) : reject(new Error('toBlob failed')); }, 'image/png');
    });
  }

  function copy() {
    if (!image) return;
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
      toast('이 브라우저는 이미지 복사를 지원하지 않아요. 다운로드를 이용해주세요');
      return;
    }
    // Safari는 사용자 제스처 안에서 ClipboardItem을 동기적으로 만들어야 하므로 Promise를 그대로 넘긴다.
    navigator.clipboard.write([new ClipboardItem({ 'image/png': toBlob() })])
      .then(function () { toast('복사했어요! 벨로그에 붙여넣으세요'); })
      .catch(function () { toast('복사에 실패했어요. 다운로드를 이용해주세요'); });
  }

  function download() {
    if (!image) return;
    toBlob().then(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'caption-' + Date.now() + '.png';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
  }

  $('copy-btn').addEventListener('click', copy);
  $('download-btn').addEventListener('click', download);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      copy();
    }
  });

  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  // macOS에서는 단축키 표기를 Cmd로
  if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) {
    document.querySelectorAll('kbd').forEach(function (k) {
      if (k.textContent === 'Ctrl') k.textContent = '⌘';
    });
  }

  syncOptionUI();
})();
