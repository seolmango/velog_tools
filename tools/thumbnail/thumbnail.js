(function () {
  'use strict';

  var W = 1200;
  var H = 628;
  var PRESETS = ['#12b886', '#212529', '#1c2b4a', '#5f3dc4', '#e8590c', '#f1f3f5', '#fff3bf'];

  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('canvas');
  var ctx = canvas.getContext('2d');
  var titleInput = $('title');
  var subtitleInput = $('subtitle');
  var colorInput = $('color');
  var sizeInput = $('size');
  var swatches = $('swatches');

  var bgImage = null;
  var options = VT.load('thumbnail', { bg: PRESETS[0], align: 'left', size: 100 });

  // ---------- 배경 ----------

  PRESETS.forEach(function (c) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.style.background = c;
    b.dataset.color = c;
    b.setAttribute('aria-label', c);
    swatches.insertBefore(b, colorInput);
  });

  function syncBg() {
    swatches.querySelectorAll('.swatch').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.color === options.bg));
    });
    colorInput.value = options.bg;
  }

  swatches.addEventListener('click', function (e) {
    var b = e.target.closest('.swatch');
    if (!b) return;
    options.bg = b.dataset.color;
    update();
  });
  colorInput.addEventListener('input', function () { options.bg = colorInput.value; update(); });

  VT.onImages({
    input: $('file-input'),
    dropzone: $('bg-pick'),
    onFiles: function (files) {
      VT.loadImage(files[0]).then(function (img) {
        VT.releaseImage(bgImage);
        bgImage = img;
        $('bg-clear').hidden = false;
        $('bg-label').textContent = '다른 이미지';
        render();
      }, function () { VT.toast('이미지를 못 불러옴'); });
    }
  });

  $('bg-clear').addEventListener('click', function () {
    VT.releaseImage(bgImage);
    bgImage = null;
    $('bg-clear').hidden = true;
    $('bg-label').textContent = '이미지 선택 · 붙여넣기';
    render();
  });

  // ---------- 옵션 ----------

  function update() {
    VT.save('thumbnail', options);
    syncBg();
    sizeInput.value = options.size;
    $('size-value').textContent = options.size + '%';
    render();
  }

  VT.bindSegmented(document, options, update);
  sizeInput.addEventListener('input', function () { options.size = Number(sizeInput.value); update(); });
  titleInput.addEventListener('input', render);
  subtitleInput.addEventListener('input', render);

  // ---------- 렌더링 ----------

  function luminance(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return 0;
    var n = parseInt(m[1], 16);
    return [n >> 16, (n >> 8) & 255, n & 255]
      .map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
      .reduce(function (s, v, i) { return s + v * [0.2126, 0.7152, 0.0722][i]; }, 0);
  }

  function drawCover(img) {
    var s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    var w = img.naturalWidth * s;
    var h = img.naturalHeight * s;
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    var dark;
    if (bgImage) {
      drawCover(bgImage);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, 0, W, H);
      dark = true;
    } else {
      ctx.fillStyle = options.bg;
      ctx.fillRect(0, 0, W, H);
      dark = luminance(options.bg) < 0.45;
    }

    var title = titleInput.value.trim() || '글 제목';
    var subtitle = subtitleInput.value.trim();
    var padX = 96;
    var maxW = W - padX * 2;

    // 3줄 안에 들어갈 때까지 제목 크기를 줄임
    var titleSize = Math.round(72 * options.size / 100);
    var lines;
    for (;;) {
      ctx.font = '700 ' + titleSize + 'px ' + VT.FONT_FAMILY;
      lines = VT.wrapText(ctx, title, maxW);
      if (lines.length <= 3 || titleSize <= 36) break;
      titleSize -= 4;
    }
    lines = lines.slice(0, 4);
    var titleLH = Math.round(titleSize * 1.3);
    var subSize = Math.round(titleSize * 0.44);
    var gap = subtitle ? Math.round(titleSize * 0.5) : 0;
    var blockH = lines.length * titleLH + (subtitle ? gap + subSize * 1.4 : 0);
    var y = (H - blockH) / 2;

    var x = options.align === 'center' ? W / 2 : padX;
    ctx.textAlign = options.align === 'center' ? 'center' : 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = dark ? '#ffffff' : '#212529';
    ctx.font = '700 ' + titleSize + 'px ' + VT.FONT_FAMILY;
    lines.forEach(function (line, i) {
      ctx.fillText(line, x, y + i * titleLH + titleLH / 2);
    });

    if (subtitle) {
      ctx.font = '500 ' + subSize + 'px ' + VT.FONT_FAMILY;
      ctx.fillStyle = dark ? 'rgba(255, 255, 255, 0.72)' : 'rgba(33, 37, 41, 0.62)';
      ctx.fillText(subtitle, x, y + lines.length * titleLH + gap + subSize * 0.7, maxW);
    }
  }

  $('download-btn').addEventListener('click', function () { VT.downloadCanvas(canvas, 'thumbnail'); });
  $('copy-btn').addEventListener('click', function () { VT.copyCanvas(canvas); });

  update();
})();
