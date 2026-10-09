// 個人ページの中身を、ひびきの公開鍵で暗号にして private/<name>.json に置く（2026-10-09）
// 使い方: node tools/seal.mjs <平文のJSON> <name>
// 平文はリポジトリに置かない（/mnt/project-files/economy/private/ に置く）。読めるのはログインした端末だけ。
import { readFileSync, writeFileSync } from "node:fs";
const { subtle } = globalThis.crypto;
const [src, name] = process.argv.slice(2);
if (!src || !/^[a-z0-9-]+$/.test(name || "")) { console.error("usage: node tools/seal.mjs <plain.json> <name>"); process.exit(1); }
const root = new URL("..", import.meta.url);
const pub = JSON.parse(readFileSync(new URL("private/owner.pub.json", root), "utf8"));
const plain = JSON.stringify(JSON.parse(readFileSync(src, "utf8")));
const owner = await subtle.importKey("jwk", { kty: "EC", crv: "P-256", x: pub.x, y: pub.y }, { name: "ECDH", namedCurve: "P-256" }, false, []);
const eph = await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
const key = await subtle.deriveKey({ name: "ECDH", public: owner }, eph.privateKey, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const iv = crypto.getRandomValues(new Uint8Array(12));
const ct = await subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
const epk = await subtle.exportKey("jwk", eph.publicKey);
const b64 = (b) => Buffer.from(b).toString("base64");
writeFileSync(new URL(`private/${name}.json`, root), JSON.stringify({ v: 1, epk: { kty: "EC", crv: "P-256", x: epk.x, y: epk.y }, iv: b64(iv), ct: b64(ct) }) + "\n");
console.log(`sealed private/${name}.json`);
