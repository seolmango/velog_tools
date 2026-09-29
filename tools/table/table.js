(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var input = $('input');
  var output = $('output');
  var preview = $('preview');
  var result = $('result');

  var options = VT.load('table', { header: 'yes', align: 'none' });

  // 엑셀 · 구글 시트는 탭, 그 외에는 쉼표로 구분. 따옴표로 감싼 셀(줄바꿈 · 구분자 포함) 처리.
  function parse(text) {
    text = text.replace(/\r\n?/g, '\n').replace(/\n+$/, '');
    if (!text) return [];
    var delim = text.indexOf('\t') !== -1 ? '\t' : ',';
    var rows = [];
    var row = [];
    var cell = '';
    var quoted = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (quoted) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') quoted = false;
        else cell += ch;
      } else if (ch === '"' && cell === '') {
        quoted = true;
      } else if (ch === delim) {
        row.push(cell); cell = '';
      } else if (ch === '\n') {
        row.push(cell); rows.push(row); row = []; cell = '';
      } else {
        cell += ch;
      }
    }
    row.push(cell);
    rows.push(row);
    var cols = Math.max.apply(null, rows.map(function (r) { return r.length; }));
    return rows.map(function (r) {
      var out = r.map(function (c) { return c.trim(); });
      while (out.length < cols) out.push('');
      return out;
    });
  }

  function escapeCell(s) {
    return s.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  }

  // 한글 등 전각 문자는 고정폭 글꼴에서 두 칸을 차지함
  function displayWidth(s) {
    var w = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      w += (c >= 0x1100 && c <= 0x115f) || (c >= 0x2e80 && c <= 0xa4cf) ||
        (c >= 0xac00 && c <= 0xd7a3) || (c >= 0xf900 && c <= 0xfaff) ||
        (c >= 0xfe30 && c <= 0xfe4f) || (c >= 0xff00 && c <= 0xff60) ? 2 : 1;
    }
    return w;
  }

  function pad(s, width) {
    return s + new Array(Math.max(0, width - displayWidth(s)) + 1).join(' ');
  }

  function toMarkdown(rows) {
    var cells = rows.map(function (r) { return r.map(escapeCell); });
    var header;
    var body;
    if (options.header === 'yes') {
      header = cells[0];
      body = cells.slice(1);
    } else {
      header = cells[0].map(function () { return ''; });
      body = cells;
    }
    var widths = header.map(function (_, c) {
      return Math.max(3, displayWidth(header[c]), Math.max.apply(null, body.map(function (r) { return displayWidth(r[c]); }).concat(0)));
    });
    var line = function (r) {
      return '| ' + r.map(function (s, c) { return pad(s, widths[c]); }).join(' | ') + ' |';
    };
    var sep = '| ' + widths.map(function (w) {
      var dash = new Array(w + 1).join('-');
      if (options.align === 'left') return ':' + dash.slice(1);
      if (options.align === 'right') return dash.slice(1) + ':';
      if (options.align === 'center') return ':' + dash.slice(2) + ':';
      return dash;
    }).join(' | ') + ' |';
    return [line(header), sep].concat(body.map(line)).join('\n');
  }

  function renderPreview(rows) {
    var table = document.createElement('table');
    var align = options.align === 'none' ? '' : options.align;
    rows.forEach(function (r, i) {
      var tr = document.createElement('tr');
      r.forEach(function (c) {
        var cell = document.createElement(i === 0 && options.header === 'yes' ? 'th' : 'td');
        cell.textContent = c;
        if (align) cell.style.textAlign = align;
        tr.appendChild(cell);
      });
      table.appendChild(tr);
    });
    preview.innerHTML = '';
    preview.appendChild(table);
  }

  function render() {
    var rows = parse(input.value);
    result.hidden = !rows.length;
    if (!rows.length) return;
    output.value = toMarkdown(rows);
    output.rows = Math.min(16, rows.length + 2);
    renderPreview(rows);
  }

  VT.bindSegmented(document, options, function () { VT.save('table', options); render(); });
  input.addEventListener('input', render);

  function copy() { if (output.value && !result.hidden) VT.copyText(output.value); }
  $('copy-btn').addEventListener('click', copy);
  VT.onSubmitKey(copy);
})();
