// とわなにか — 端末どうしで記録をそろえる（2026-10-09）
// 各ページの <head> で読む。合言葉は保存せず、SHA-256 にした id だけを端末に置く。
// hibiki- で始まる localStorage が変わったら、鍵ごとの時刻をつけてサーバーへ送る。
// ページを開いたとき・戻ってきたときに読み、サーバーのほうが新しければ入れて画面を読み直す。
(function () {
  var URL_ = "https://hibiki-sync.jaykim-can.workers.dev";
  var PREFIX = "hibiki-", IDK = "hb-sync-id", TK = "hb-sync-t", EXK = "hb-sync-exp", PK = "hb-key", PUBK = "hb-key-pub", WRAP = "hibiki-keywrap";
  var BASE = (document.currentScript && document.currentScript.src || location.href).replace(/[^/]*$/, "");
  var DAYS = 7, DAY = 864e5;   // ログインは7日。開くたびに7日へ延びる（2026-10-09 ひびき）
  var ls; try { ls = window.localStorage; ls.getItem(IDK); } catch (e) { return; }
  var rawSet = ls.setItem.bind(ls);
  // 期限切れならログアウト。期限内なら今日から7日に延ばす
  if (ls.getItem(IDK)) {
    var exp = +ls.getItem(EXK) || 0;
    if (exp && exp < Date.now()) { ls.removeItem(IDK); ls.removeItem(EXK); ls.removeItem(PK); ls.removeItem(PUBK); }
    else rawSet(EXK, String(Date.now() + DAYS * DAY));
  }
  // ── ログインしていない人には中身を見せない（2026-10-09 ひびき：まずは全部非表示、出していいものは後で少しずつ）
  // ページで window.HB_PUBLIC = true にすると、そのページは誰でも見られる
  if (!ls.getItem(IDK) && !window.HB_PUBLIC) {
    var st = document.createElement("style");
    st.textContent = "body>*{display:none!important}body>#hb-gate{display:grid!important}" +
      "#hb-gate{min-height:100vh;place-items:center;padding:24px 16px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif;color:#8a8271}" +
      "#hb-gate b{display:block;font-size:22px;color:#2b2924;margin-bottom:6px}#hb-gate a{display:inline-block;margin-top:18px;padding:12px 28px;border-radius:14px;background:#74886d;color:#fff;text-decoration:none;font-weight:600}" +
      "@media (prefers-color-scheme: dark){#hb-gate b{color:#ede8dd}}";
    document.head.appendChild(st);
    document.addEventListener("DOMContentLoaded", function () {
      var g = document.createElement("div"); g.id = "hb-gate";
      g.innerHTML = '<div><b>とわなにか</b>ひびきの個人ページです<br><a href="' + BASE + 'sync/">ログイン</a></div>';
      document.body.appendChild(g);
    });
  }

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

  // ── 個人ページの鍵（2026-10-09）
  // ログインした端末だけが持つ秘密鍵で、private/*.json（公開鍵で暗号にしたもの）を読む。
  // 秘密鍵は合言葉から作った鍵で包んで記録といっしょに同期し、どの端末でも同じ鍵になる。
  var S = crypto.subtle, enc = new TextEncoder(), dec = new TextDecoder();
  function b64(buf) { var s = "", a = new Uint8Array(buf); for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); }
  function unb64(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function wrapKey(phrase) {
    return S.importKey("raw", enc.encode(phrase), "PBKDF2", false, ["deriveKey"]).then(function (k) {
      return S.deriveKey({ name: "PBKDF2", salt: enc.encode("hibiki-key-v1"), iterations: 200000, hash: "SHA-256" }, k, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    });
  }
  function setupKey(phrase, h) {
    return wrapKey(phrase).then(function (wk) {
      var w = ls.getItem(WRAP);
      if (w) {
        var o = JSON.parse(w);
        return S.decrypt({ name: "AES-GCM", iv: unb64(o.iv) }, wk, unb64(o.ct)).then(function (pt) {
          var jwk = JSON.parse(dec.decode(pt)); rawSet(PK, JSON.stringify(jwk));
          return publish(h, jwk);
        });
      }
      return S.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]).then(function (kp) {
        return S.exportKey("jwk", kp.privateKey);
      }).then(function (jwk) {
        var iv = crypto.getRandomValues(new Uint8Array(12));
        return S.encrypt({ name: "AES-GCM", iv: iv }, wk, enc.encode(JSON.stringify(jwk))).then(function (ct) {
          ls.setItem(WRAP, JSON.stringify({ iv: b64(iv), ct: b64(ct) }));   // 包んだ鍵は同期される
          rawSet(PK, JSON.stringify(jwk));
          return publish(h, jwk);
        });
      });
    }).catch(function () { return null; });
  }
  function publish(h, jwk) {
    return fetch(URL_ + "/owner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: h, pub: { x: jwk.x, y: jwk.y } }) })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { var ok = !!(d && d.pub); if (ok) rawSet(PUBK, "1"); return ok; })
      .catch(function () { return false; });
  }
  function openBox(name) {
    var jwk; try { jwk = JSON.parse(ls.getItem(PK)); } catch (e) {}
    if (!id() || !jwk) return Promise.resolve(null);
    return fetch(BASE + "private/" + name + ".json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (box) {
      if (!box) return null;
      return Promise.all([
        S.importKey("jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveKey"]),
        S.importKey("jwk", box.epk, { name: "ECDH", namedCurve: "P-256" }, false, [])
      ]).then(function (k) {
        return S.deriveKey({ name: "ECDH", public: k[1] }, k[0], { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
      }).then(function (ak) {
        return S.decrypt({ name: "AES-GCM", iv: unb64(box.iv) }, ak, unb64(box.ct));
      }).then(function (pt) { return JSON.parse(dec.decode(pt)); });
    }).catch(function () { return null; });
  }

  window.HibikiSync = {
    on: function () { return !!id(); },
    // 合言葉でログイン。クラウドに記録があればそれを入れ、なければこの端末の記録を上げる
    connect: function (phrase) {
      return hash(phrase).then(function (h) {
        return fetch(URL_ + "/pull?id=" + h).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (d) {
          if (!d) return { ok: false };
          rawSet(IDK, h); rawSet(EXK, String(Date.now() + DAYS * DAY));
          var has = d.keys && Object.keys(d.keys).length;
          var from = has ? "cloud" : "here";
          if (has) { setT({}); take(d.keys); }
          else { var t = {}, now = Date.now(); mine().forEach(function (k) { t[k] = now; }); setT(t); }
          return setupKey(phrase, h).then(push).then(function () { return { ok: true, from: from }; });
        });
      });
    },
    disconnect: function () { try { ls.removeItem(IDK); ls.removeItem(EXK); ls.removeItem(PK); ls.removeItem(PUBK); } catch (e) {} },
    open: openBox,
    hasKey: function () { return !!ls.getItem(PK); },
    until: function () { return +ls.getItem(EXK) || 0; },
    sync: sync,
    ping: function () { return fetch(URL_ + "/").then(function (r) { return r.ok; }).catch(function () { return false; }); }
  };

  if (id()) {
    // 公開鍵がまだサーバーに届いていなければ、開いたときに届け直す
    try { var kj = JSON.parse(ls.getItem(PK)); if (kj && !ls.getItem(PUBK)) publish(id(), kj); } catch (e) {}
    sync(true);
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") sync(true); });
  }
})();
