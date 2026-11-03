/* Minimal Keccak-256 (Ethereum flavour) using BigInt lanes. Used only for ENS namehash and EIP-55 checksums. */
(function (root) {
  'use strict';
  const M = (1n << 64n) - 1n;
  const rotl = (x, n) => (n ? ((x << BigInt(n)) | (x >> BigInt(64 - n))) & M : x);
  const ROTC = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 2, 14, 27, 41, 56, 8, 25, 43, 62, 18, 39, 61, 20, 44];
  const PILN = [10, 7, 11, 17, 18, 3, 5, 16, 8, 21, 24, 4, 15, 23, 19, 13, 12, 2, 20, 14, 22, 9, 6, 1];
  const RC = [];
  (function () {
    let r = 1;
    for (let i = 0; i < 24; i++) {
      let c = 0n;
      for (let j = 0; j < 7; j++) {
        r = ((r << 1) ^ ((r >> 7) * 0x71)) % 256;
        if (r & 2) c ^= 1n << BigInt((1 << j) - 1);
      }
      RC.push(c);
    }
  })();

  function permute(st) {
    const bc = new Array(5);
    for (let round = 0; round < 24; round++) {
      for (let i = 0; i < 5; i++) bc[i] = st[i] ^ st[i + 5] ^ st[i + 10] ^ st[i + 15] ^ st[i + 20];
      for (let i = 0; i < 5; i++) {
        const t = bc[(i + 4) % 5] ^ rotl(bc[(i + 1) % 5], 1);
        for (let j = 0; j < 25; j += 5) st[j + i] ^= t;
      }
      let t = st[1];
      for (let i = 0; i < 24; i++) {
        const j = PILN[i];
        const b0 = st[j];
        st[j] = rotl(t, ROTC[i]);
        t = b0;
      }
      for (let j = 0; j < 25; j += 5) {
        for (let i = 0; i < 5; i++) bc[i] = st[j + i];
        for (let i = 0; i < 5; i++) st[j + i] ^= (M ^ bc[(i + 1) % 5]) & bc[(i + 2) % 5];
      }
      st[0] ^= RC[round];
    }
  }

  function keccak256(bytes) {
    const rate = 136;
    const padLen = rate - (bytes.length % rate);
    const buf = new Uint8Array(bytes.length + padLen);
    buf.set(bytes);
    buf[bytes.length] ^= 0x01;
    buf[buf.length - 1] ^= 0x80;
    const st = new Array(25).fill(0n);
    for (let off = 0; off < buf.length; off += rate) {
      for (let i = 0; i < rate / 8; i++) {
        let lane = 0n;
        for (let b = 7; b >= 0; b--) lane = (lane << 8n) | BigInt(buf[off + i * 8 + b]);
        st[i] ^= lane;
      }
      permute(st);
    }
    const out = new Uint8Array(32);
    for (let i = 0; i < 4; i++) for (let b = 0; b < 8; b++) out[i * 8 + b] = Number((st[i] >> BigInt(8 * b)) & 0xffn);
    return out;
  }
  root.keccak256 = keccak256;
})(typeof window !== 'undefined' ? window : globalThis);
