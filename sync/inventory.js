(function () {
  var button = document.getElementById('check'), status = document.getElementById('status'), list = document.getElementById('results');
  button.addEventListener('click', function () {
    list.replaceChildren();
    try {
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key !== 'hibiki-keywrap' && (key.indexOf('hibiki-') === 0 || key === 'mio-local-notes-v1')) keys.push(key);
      }
      keys.sort();
      keys.forEach(function (key) { var li = document.createElement('li'), code = document.createElement('code'); code.textContent = key; li.append(code); list.append(li); });
      status.textContent = keys.length ? keys.length + '種類の記録が見つかりました。' : 'このブラウザーには対象の記録が見つかりませんでした。';
    } catch (_) { status.textContent = 'このブラウザーの記録を確認できませんでした。'; }
  });
}());
