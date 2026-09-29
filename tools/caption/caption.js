(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var dropzone = $('dropzone');
  var editor = $('editor');
  var captionInput = $('caption');
  var widthInput = $('width');
  var sizeInput = $('size');
  var canvas = $('canvas');
  var ctx = canvas.getContext('2d');

  var image = null;
  var options = VT.load('caption', { align: 'center', width: 100, size: 100 });

  function syncSliders() {
    widthInput.value = options.width;
    sizeInput.value = options.size;
    $('width-value').textContent = options.width + '%';
    $('size-value').textContent = options.size + '%';
  }

  function update() {
    VT.save('caption', options);
    syncSliders();
    render();
  }

  VT.bindSegmented(editor, options, update);
  widthInput.addEventListener('input', function () { options.width = Number(widthInput.value); update(); });
  sizeInput.addEventListener('input', function () { options.size = Number(sizeInput.value); update(); });
  captionInput.addEventListener('input', render);

  VT.onImages({
    input: $('file-input'),
    dropzone: dropzone,
    onFiles: function (files) {
      VT.loadImage(files[0]).then(function (img) {
        VT.releaseImage(image);
        image = img;
        dropzone.hidden = true;
        editor.hidden = false;
        render();
        captionInput.focus();
      }, function () { VT.toast('이미지를 못 불러옴'); });
    }
  });

  $('reset-btn').addEventListener('click', function () {
    VT.releaseImage(image);
    image = null;
    captionInput.value = '';
    editor.hidden = true;
    dropzone.hidden = false;
    dropzone.focus();
  });

  // 벨로그는 이미지를 max-width:100% 블록으로 왼쪽에 붙여서 보여줌.
  // 그래서 캔버스를 최소 본문 폭 이상으로 만들고, 이미지는 원본 크기 그대로 가운데에 둠.
  // 좌우 여백과 캡션 배경은 투명이라 라이트/다크 어느 쪽에서도 자연스러움.
  function render() {
    if (!image) return;
    var w = image.naturalWidth;
    var h = image.naturalHeight;
    var p = options.width / 100;
    var W = Math.max(Math.ceil(w / p), VT.POST_WIDTH);
    var drawW = Math.min(w, Math.round(W * p));
    var drawH = Math.round(h * drawW / w);
    var imgX = Math.round((W - drawW) / 2);

    var fontSize = Math.round(W * 0.021 * options.size / 100);
    var lineHeight = Math.round(fontSize * 1.55);
    var padTop = Math.round(fontSize * 0.8);
    var font = fontSize + 'px ' + VT.FONT_FAMILY;

    // 캡션은 이미지 폭 기준으로 줄바꿈 (너무 좁으면 본문 폭의 60%까지는 허용)
    var textW = Math.max(drawW, W * 0.6) - fontSize * 2;
    ctx.font = font;
    var caption = captionInput.value.replace(/\s+$/, '');
    var lines = caption ? VT.wrapText(ctx, caption, textW) : [];

    canvas.width = W;
    canvas.height = drawH + (lines.length ? padTop + lines.length * lineHeight : 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, imgX, 0, drawW, drawH);

    if (lines.length) {
      ctx.font = font;
      ctx.fillStyle = VT.CAPTION_COLOR;
      ctx.textBaseline = 'middle';
      ctx.textAlign = options.align;
      var boxW = textW + fontSize * 2;
      var boxX = (W - boxW) / 2;
      var x = options.align === 'left' ? boxX + fontSize
        : options.align === 'right' ? boxX + boxW - fontSize
        : W / 2;
      lines.forEach(function (line, i) {
        ctx.fillText(line, x, drawH + padTop + i * lineHeight + lineHeight / 2);
      });
    }

    $('meta').textContent = canvas.width + ' × ' + canvas.height + 'px · 투명 배경 PNG';
  }

  $('copy-btn').addEventListener('click', function () { if (image) VT.copyCanvas(canvas); });
  $('download-btn').addEventListener('click', function () { if (image) VT.downloadCanvas(canvas, 'caption'); });
  VT.onSubmitKey(function () { if (image) VT.copyCanvas(canvas); });

  VT.initPreview($('preview'));
  syncSliders();
})();
