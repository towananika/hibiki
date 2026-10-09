// とわなにか — 端末どうしで記録をそろえる（2026-10-09）
// 各ページの <head> で読む。合言葉は保存せず、SHA-256 にした id だけを端末に置く。
// hibiki- で始まる localStorage が変わったら、鍵ごとの時刻をつけてサーバーへ送る。
// ページを開いたとき・戻ってきたときに読み、サーバーのほうが新しければ入れて画面を読み直す。
(function () {
  var URL_ = "https://hibiki-sync.jaykim-can.workers.dev";
  var PREFIX = "hibiki-", IDK = "hb-sync-id", TK = "hb-sync-t";
  var ls; try { ls = window.localStorage; ls.getItem(IDK); } catch (e) { return; }
  var rawSet = ls.setItem.bind(ls);
  function getT() { try { return JSON.parse(ls.getItem(TK)) || {}; } catch (e) { return {}; } }
  function setT(t) { try { rawSet(TK, JSON.stringify(t)); } catch (e) {} }
  function id() { return ls.getItem(IDK); }
  function mine() { var a = []; for (var i = 0; i < ls.length; i++) { var k = ls.key(i); if (k && k.indexOf(PREFIX) === 0) a.push(k); } return a; }

  // ページの save() はそのまま。書いた時刻だけ横で覚えて、少しまとめて送る
  var timer = null;
  try {
    Storage.prototype.setItem = (function (orig) {
      return function (k, v) {
        orig.call(this, k, v);
        if (this === ls && String(k).indexOf(PREFIX) === 0) { var t = getT(); t[k] = Date.now(); setT(t); later(); }
      };
    })(Storage.prototype.setItem);
  } catch (e) {}
  function later() { if (!id()) return; clearTimeout(timer); timer = setTimeout(push, 800); }

  function push() {
    if (!id()) return Promise.resolve(null);
    var t = getT(), keys = {};
    mine().forEach(function (k) { keys[k] = { v: ls.getItem(k), t: t[k] || 0 }; });
    return fetch(URL_ + "/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: id(), keys: keys }) })
      .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }
  // サーバーの新しいほうを入れる。変わったら true
  function take(remote) {
    var t = getT(), changed = false;
    Object.keys(remote || {}).forEach(function (k) {
      if (k.indexOf(PREFIX) !== 0) return;
      var e = remote[k];
      if (!t[k] || e.t > t[k]) { if (ls.getItem(k) !== e.v) { rawSet(k, e.v); changed = true; } t[k] = e.t; }
    });
    setT(t); return changed;
  }
  function pull() {
    if (!id()) return Promise.resolve(null);
    return fetch(URL_ + "/pull?id=" + id()).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }
  function sync(reload) {
    return pull().then(function (d) {
      if (!d) return { ok: false };
      var changed = take(d.keys);
      return push().then(function () {
        if (changed && reload) location.reload();
        return { ok: true, changed: changed };
      });
    });
  }
  function hash(s) {
    var b = new TextEncoder().encode("hibiki-sync:" + s);
    return crypto.subtle.digest("SHA-256", b).then(function (h) {
      return Array.prototype.map.call(new Uint8Array(h), function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
    });
  }

  window.HibikiSync = {
    on: function () { return !!id(); },
    // 合言葉でつなぐ。クラウドに記録があればそれを入れ、なければこの端末の記録を上げる
    connect: function (phrase) {
      return hash(phrase).then(function (h) {
        return fetch(URL_ + "/pull?id=" + h).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (d) {
          if (!d) return { ok: false };
          rawSet(IDK, h);
          var has = d.keys && Object.keys(d.keys).length;
          if (has) { setT({}); take(d.keys); return push().then(function () { return { ok: true, from: "cloud" }; }); }
          var t = {}, now = Date.now(); mine().forEach(function (k) { t[k] = now; }); setT(t);
          return push().then(function () { return { ok: true, from: "here" }; });
        });
      });
    },
    disconnect: function () { try { ls.removeItem(IDK); } catch (e) {} },
    sync: sync,
    ping: function () { return fetch(URL_ + "/").then(function (r) { return r.ok; }).catch(function () { return false; }); }
  };

  if (id()) {
    sync(true);
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") sync(true); });
  }
})();
