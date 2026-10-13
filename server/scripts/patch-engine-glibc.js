'use strict';
/**
 * Relabel GLIBC version dependencies in the embedded MongoDB engine binaries.
 *
 * The @0q/embedded-mongodb engine is built against glibc 2.38. On older
 * systems (e.g. Debian 12 / glibc 2.36) the seven symbols it needs from 2.38
 * (the C23 strto/scanf variants + fmod's newer symbol version) are provided by
 * the companion glibc238shim.so — this script retargets each verneed entry
 * asking for GLIBC_2.38 to a version the local system library really exports
 * (libm.so.6 -> GLIBC_2.35, libc.so.6 -> GLIBC_2.36), updating both the name
 * pointer and the hash so the loader accepts the entry.
 *
 * Idempotent — run it as often as you like.
 * Port of patch_glibc_version.py; requires ELF64 little-endian files only.
 */
const fs = require('node:fs');

const SRC = 'GLIBC_2.38';
const DST = 'GLIBC_2.36';
const LIBM_DST = 'GLIBC_2.35';

function elfHash(name) {
  let h = 0;
  for (const c of Buffer.from(name, 'ascii')) {
    h = (h << 4) + c;
    const g = h & 0xf0000000;
    if (g) h ^= g >>> 24;
    h &= ~g;
    h >>>= 0;
  }
  return h >>> 0;
}

function patchEngineBinary(file) {
  if (!fs.existsSync(file)) return 0;
  const data = fs.readFileSync(file);

  if (data.readUInt32BE(0) !== 0x7f454c46) return 0; // not ELF
  if (data[4] !== 2 || data[5] !== 1) return 0; // only ELF64 LE

  const eShoff = Number(data.readBigUInt64LE(0x28));
  const eShentsize = data.readUInt16LE(0x3a);
  const eShnum = data.readUInt16LE(0x3c);
  const eShstrndx = data.readUInt16LE(0x3e);

  const shdr = (i) => {
    const off = eShoff + i * eShentsize;
    return {
      name: data.readUInt32LE(off),
      type: data.readUInt32LE(off + 4),
      offset: Number(data.readBigUInt64LE(off + 24)),
      size: Number(data.readBigUInt64LE(off + 32)),
    };
  };

  const shstr = shdr(eShstrndx);
  let verneed = null;
  let dynstr = null;
  for (let i = 0; i < eShnum; i++) {
    const s = shdr(i);
    const end = data.indexOf(0, shstr.offset + s.name);
    const name = data.subarray(shstr.offset + s.name, end).toString('ascii');
    if (s.type === 0x6ffffffe) verneed = s; // SHT_GNU_verneed
    if (name === '.dynstr') dynstr = s;
  }
  if (!verneed || !dynstr) return 0;

  const readStr = (abs) => {
    const end = data.indexOf(0, abs);
    return data.subarray(abs, end).toString('ascii');
  };
  const findStr = (target) => {
    const needle = Buffer.from(target + '\0', 'ascii');
    const region = data.subarray(dynstr.offset, dynstr.offset + dynstr.size);
    const idx = region.indexOf(needle);
    return idx === -1 ? null : idx;
  };

  // Pass 1: collect matching aux entries.
  const matches = [];
  let vnOff = verneed.offset;
  const vnEnd = verneed.offset + verneed.size;
  while (vnOff < vnEnd) {
    const vnVersion = data.readUInt16LE(vnOff);
    const vnCnt = data.readUInt16LE(vnOff + 2);
    const vnFile = data.readUInt32LE(vnOff + 4);
    const vnAux = data.readUInt32LE(vnOff + 8);
    const vnNext = data.readUInt32LE(vnOff + 12);
    if (vnVersion !== 1) break;
    const fileName = readStr(dynstr.offset + vnFile);
    const target = fileName.includes('libm') ? LIBM_DST : DST;
    let auxOff = vnOff + vnAux;
    for (let i = 0; i < vnCnt; i++) {
      const vnaName = data.readUInt32LE(auxOff + 8);
      const vnaNext = data.readUInt32LE(auxOff + 12);
      if (readStr(dynstr.offset + vnaName) === SRC) {
        matches.push({ auxOff, fileName, target });
      }
      if (vnaNext === 0) break;
      auxOff += vnaNext;
    }
    if (vnNext === 0) break;
    vnOff += vnNext;
  }

  if (!matches.length) return 0; // already patched

  // Resolve targets to .dynstr offsets (fall back to in-place rewrite).
  const targets = [...new Set(matches.map((m) => m.target))].sort();
  const offsets = {};
  for (const t of targets) {
    let off = findStr(t);
    if (off === null) {
      if (targets.length > 1) {
        throw new Error(`${file}: ${t} absent from .dynstr but multiple targets needed`);
      }
      if (t.length > SRC.length) throw new Error(`${file}: cannot fit ${t} over ${SRC}`);
      const srcAbs = dynstr.offset + data.readUInt32LE(matches[0].auxOff + 8);
      data.write(t, srcAbs, 'ascii');
      data.fill(0, srcAbs + t.length, srcAbs + SRC.length);
      off = findStr(t);
      if (off === null) throw new Error(`${file}: in-place write failed for ${t}`);
    }
    offsets[t] = off;
  }

  for (const m of matches) {
    data.writeUInt32LE(elfHash(m.target), m.auxOff + 0); // vna_hash
    data.writeUInt32LE(offsets[m.target], m.auxOff + 8); // vna_name
  }

  fs.writeFileSync(file, data);
  return matches.length;
}

module.exports = { patchEngineBinary, SRC, DST, LIBM_DST };

if (require.main === module) {
  for (const f of process.argv.slice(2)) {
    const n = patchEngineBinary(f);
    console.log(n ? `[patch] ${f}: relabeled ${n} verneed entr${n === 1 ? 'y' : 'ies'}` : `[patch] ${f}: nothing to do`);
  }
}
