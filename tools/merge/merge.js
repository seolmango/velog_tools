(function () {
  'use strict';

  var MAX_COLS = 5;
  var MAX_WIDTH = 4096;

  var $ = function (id) { return document.getElementById(id); };
  var dropzone = $('dropzone');
  var editor = $('editor');
  var list = $('list');
  var colsGroup = $('cols');
  var gapInput = $('gap');
  var sizeInput = $('size');
  var canvas = $('canvas');
  var ctx = canvas.getContext('2d');

  var items = []; // { img, caption }
  var cols = null; // null이면 자동
  var options = VT.load('merge', { gap: 2, size: 100 });

  var ICONS = {
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
    remove: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>'
  };

  function colCount() {
    return Math.min(cols || Math.min(items.length, 4), items.length) || 1;
  }

  // ---------- 목록 UI ----------

  function renderList() {
    list.innerHTML = '';
    items.forEach(function (item, i) {
      var li = document.createElement('li');
      li.className = 'merge-item';
      li.innerHTML =
        '<div class="thumb"></div>' +
        '<input type="text" placeholder="캡션 (선택)">' +
        '<div class="row"><span class="num">' + (i + 1) + '</span>' +
        '<button class="icon-btn" data-act="left" title="왼쪽으로" aria-label="왼쪽으로">' + ICONS.left + '</button>' +
        '<button class="icon-btn" data-act="right" title="오른쪽으로" aria-label="오른쪽으로">' + ICONS.right + '</button>' +
        '<button class="icon-btn" data-act="remove" title="삭제" aria-label="삭제">' + ICONS.remove + '</button></div>';
      var thumb = document.createElement('img');
      thumb.src = item.img.src;
      thumb.alt = '';
      li.querySelector('.thumb').appendChild(thumb);
      var input = li.querySelector('input');
      input.value = item.caption;
      input.addEventListener('input', function () { item.caption = input.value; render(); });
      li.querySelector('[data-act="left"]').disabled = i === 0;
      li.querySelector('[data-act="right"]').disabled = i === items.length - 1;
      li.addEventListener('click', function (e) {
        var btn = e.target.closest('button');
        if (!btn) return;
        var act = btn.dataset.act;
        if (act === 'remove') {
          VT.releaseImage(items[i].img);
          items.splice(i, 1);
        } else {
          var j = act === 'left' ? i - 1 : i + 1;
          items.splice(j, 0, items.splice(i, 1)[0]);
        }
        refresh();
      });
      list.appendChild(li);
    });
  }

  function renderCols() {
    var max = Math.min(items.length, MAX_COLS);
    var current = colCount();
    colsGroup.innerHTML = '';
    for (var n = 1; n <= max; n++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = n + '개';
      b.setAttribute('aria-pressed', String(n === current));
      b.dataset.value = n;
      colsGroup.appendChild(b);
    }
  }

  colsGroup.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    cols = Number(btn.dataset.value);
    renderCols();
    render();
  });

  function refresh() {
    var has = items.length > 0;
    editor.hidden = !has;
    dropzone.classList.toggle('compact', has);
    $('dropzone-title').innerHTML = has
      ? '<kbd>Ctrl</kbd> + <kbd>V</kbd> 또는 클릭해서 이미지 더 추가'
      : '<kbd>Ctrl</kbd> + <kbd>V</kbd> 로 이미지 하나씩 추가';
    $('dropzone-sub').hidden = has;
    renderList();
    renderCols();
    render();
  }

  // ---------- 옵션 ----------

  function syncSliders() {
    gapInput.value = options.gap;
    sizeInput.value = options.size;
    $('gap-value').textContent = options.gap + '%';
    $('size-value').textContent = options.size + '%';
  }
  function update() { VT.save('merge', options); syncSliders(); render(); }
  gapInput.addEventListener('input', function () { options.gap = Number(gapInput.value); update(); });
  sizeInput.addEventListener('input', function () { options.size = Number(sizeInput.value); update(); });

  VT.onImages({
    input: $('file-input'),
    dropzone: dropzone,
    onFiles: function (files) {
      Promise.all(files.map(function (f) { return VT.loadImage(f).catch(function () { return null; }); }))
        .then(function (imgs) {
          imgs.forEach(function (img) { if (img) items.push({ img: img, caption: '' }); });
          if (imgs.indexOf(null) !== -1) VT.toast('못 불러온 이미지가 있음');
          refresh();
        });
    }
  });

  $('reset-btn').addEventListener('click', function () {
    items.forEach(function (it) { VT.releaseImage(it.img); });
    items = [];
    cols = null;
    refresh();
  });

  // ---------- 렌더링 ----------

  // 각 줄은 이미지 높이를 맞춘 뒤 전체 폭을 꽉 채움. 마지막 줄이 덜 찼으면 위 줄 높이에 맞추고 가운데 정렬.
  function render() {
    if (!items.length) return;
    var n = colCount();
    var rows = [];
    for (var i = 0; i < items.length; i += n) rows.push(items.slice(i, i + n));

    var aspect = function (it) { return it.img.naturalWidth / it.img.naturalHeight; };
    var g = options.gap / 100;

    // 업스케일을 피하려고, 가장 넓은 줄을 원본 해상도(줄에서 가장 낮은 이미지 높이 기준)로 놓았을 때 폭을 사용
    var natural = 0;
    rows.forEach(function (row) {
      var minH = Math.min.apply(null, row.map(function (it) { return it.img.naturalHeight; }));
      var sum = row.reduce(function (s, it) { return s + aspect(it) * minH; }, 0);
      natural = Math.max(natural, sum * (1 + g * (row.length - 1)));
    });
    var W = Math.round(Math.min(Math.max(natural, VT.POST_WIDTH), MAX_WIDTH));
    var gap = Math.round(W * g);

    var fontSize = Math.round(W * 0.021 * options.size / 100);
    var lineHeight = Math.round(fontSize * 1.5);
    var capPad = Math.round(fontSize * 0.6);
    var font = fontSize + 'px ' + VT.FONT_FAMILY;
    ctx.font = font;

    var prevH = Infinity;
    var layout = rows.map(function (row) {
      var sumAspect = row.reduce(function (s, it) { return s + aspect(it); }, 0);
      var avail = W - gap * (row.length - 1);
      var h = Math.min(avail / sumAspect, row.length < n ? prevH : Infinity);
      prevH = h;
      var rowW = sumAspect * h + gap * (row.length - 1);
      var x = (W - rowW) / 2;
      var cells = row.map(function (it) {
        var w = aspect(it) * h;
        var lines = it.caption.trim() ? VT.wrapText(ctx, it.caption.trim(), w - fontSize * 0.5) : [];
        var cell = { it: it, x: x, w: w, lines: lines };
        x += w + gap;
        return cell;
      });
      var maxLines = Math.max.apply(null, cells.map(function (c) { return c.lines.length; }));
      return { h: h, cells: cells, capH: maxLines ? capPad + maxLines * lineHeight : 0 };
    });

    var H = layout.reduce(function (s, r) { return s + r.h + r.capH; }, 0) + gap * (layout.length - 1);
    canvas.width = W;
    canvas.height = Math.round(H);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingQuality = 'high';

    var y = 0;
    layout.forEach(function (r) {
      r.cells.forEach(function (c) {
        ctx.drawImage(c.it.img, Math.round(c.x), Math.round(y), Math.round(c.w), Math.round(r.h));
        if (c.lines.length) {
          ctx.font = font;
          ctx.fillStyle = VT.CAPTION_COLOR;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          c.lines.forEach(function (line, li) {
            ctx.fillText(line, c.x + c.w / 2, y + r.h + capPad + li * lineHeight + lineHeight / 2);
          });
        }
      });
      y += r.h + r.capH + gap;
    });

    $('meta').textContent = canvas.width + ' × ' + canvas.height + 'px · 투명 배경 PNG';
  }

  function copy() { if (items.length) VT.copyCanvas(canvas); }
  $('copy-btn').addEventListener('click', copy);
  $('download-btn').addEventListener('click', function () { if (items.length) VT.downloadCanvas(canvas, 'merge'); });
  VT.onSubmitKey(copy);

  VT.initPreview($('preview'));
  syncSliders();
})();
