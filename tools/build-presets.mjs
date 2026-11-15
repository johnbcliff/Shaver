// Shaver: Presets/candidates.json -> Presets/<name>.shaverpreset
//
// candidates.json uses the same schema as the plugin's .ideas/factory-presets.json (values in real
// units, choices by index, bools true/false, only non-default values listed), so a picked preset can
// be pasted straight into the factory bank. This script validates every value against the parameter
// table below (copied from ShaverParameters.cpp, v0.1.0) and writes complete preset files: every
// owned parameter, defaults filled in, the same layout the plugin's SAVE writes.
//
//   node tools/build-presets.mjs            validate and write Presets/*.shaverpreset
//   node tools/build-presets.mjs --install  also copy them into Documents\...\Shaver\Presets
//                                           (never overwrites a file that is already there)

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'Presets', 'candidates.json');
const OUT_DIR = path.join(ROOT, 'Presets');
const USER_DIR = path.join(os.homedir(), 'Documents', 'Dick The Butcher Effects', 'Shaver', 'Presets');
const PLUGIN_VERSION = '0.1.0';

// [id, kind, min, max, default]. kind: f float, i int, c choice (max = last index), b bool.
// Order matches the plugin's parameter order (what a saved preset lists).
const T = [];
const f = (id, mn, mx, df) => T.push([id, 'f', mn, mx, df]);
const i = (id, mn, mx, df) => T.push([id, 'i', mn, mx, df]);
const c = (id, n, df) => T.push([id, 'c', 0, n - 1, df]);
const b = (id, df) => T.push([id, 'b', 0, 1, df ? 1 : 0]);

c('quality', 4, 2); f('output', -36, 6, -6); c('voice_mode', 3, 0); i('voice_limit', 1, 16, 8);
i('pitch', -24, 24, 0); f('fine', -100, 100, 0); f('glide', 0, 2000, 0); b('glide_auto', false);
i('pb_range', 0, 24, 2); f('phase', 0, 360, 0); f('phase_random', 0, 100, 0);
i('unison', 1, 4, 1); f('unison_detune', 0, 50, 10);
for (const n of [1, 2]) {
  b(`osc${n}_on`, n === 1); c(`osc${n}_type`, 7, n === 1 ? 0 : 1); f(`osc${n}_shape`, 0, 100, 50);
  f(`osc${n}_level`, 0, 100, 80); i(`osc${n}_ratio`, 1, 24, 1); f(`osc${n}_colour`, -100, 100, 0);
}
i('osc2_semi', -24, 24, 0); f('osc2_fine', -100, 100, 0);
c('xfade_source', 6, 0); f('xfade_depth', 0, 100, 50); f('xfade_smooth', 0, 1000, 20);
for (const n of [1, 2]) {
  b(`filt${n}_on`, n === 1); c(`filt${n}_type`, 8, n === 1 ? 0 : 4);
  f(`filt${n}_cutoff`, 20, 20000, n === 1 ? 2000 : 1000); f(`filt${n}_boost`, 0, 24, 0);
  f(`filt${n}_width`, 0, 100, 50); f(`filt${n}_slope`, 6, 96, 24); f(`filt${n}_keytrack`, 0, 100, 0);
}
c('filt_routing', 2, 0);
for (const [p, atk, sus, vel] of [['amp_', 2, 80, 50], ['env2_', 5, 30, 0], ['env3_', 5, 30, 0]]) {
  f(p + 'attack', 0, 10000, atk); f(p + 'decay', 1, 10000, 300); f(p + 'sustain', 0, 100, sus);
  f(p + 'release', 1, 20000, 200); f(p + 'vel', 0, 100, vel);
}
f('env2_to_cutoff', -100, 100, 40);
for (const n of [1, 2]) {
  c(`lfo${n}_shape`, 7, n === 1 ? 0 : 5); f(`lfo${n}_rate`, 0.01, 50, 1); b(`lfo${n}_sync`, false);
  c(`lfo${n}_division`, 16, 6); f(`lfo${n}_phase`, 0, 360, 0); c(`lfo${n}_retrig`, 2, 1);
}
f('sc_gain', -24, 24, 0); f('sc_attack', 0.1, 200, 5); f('sc_release', 5, 2000, 150);
f('sc_to_amp', -100, 100, 0); f('sc_to_cutoff', -100, 100, 0); c('sc_trigger', 4, 0);
f('sc_threshold', -60, 0, -24); f('sc_hold', 10, 500, 60); c('sc_source', 3, 0); c('smp_beats', 7, 0);
f('smp_start', 0, 100, 0); f('smp_monitor', -60, 0, -60);
b('beat_on', false); f('beat_amount', 0, 100, 30); f('beat_partial', 0, 100, 50);
b('spread_on', false); f('spread_amount', 0, 100, 50); f('spread_ramp', 0, 100, 0);
f('spread_rate', 0, 10, 0.5); f('spread_cycles', 1, 32, 4);
b('clipper_on', false); f('clipper_drive', 0, 100, 30); f('clipper_tilt', -100, 100, 0);
b('sclip_on', true); f('sclip_clip', 0, 100, 50); f('sclip_pitch_cut', 0, 100, 30); f('sclip_slope', 0, 100, 50);
b('safebass_on', true); f('safebass_amount', 0, 100, 50); f('safebass_level', -24, 6, 0); f('safebass_slope', 0, 100, 50);
b('lmt_on', true); f('lmt_drive', 0, 24, 0); f('lmt_dirt', 0, 100, 0);
for (let k = 1; k <= 8; ++k) { c(`mod${k}_src`, 12, 0); c(`mod${k}_dst`, 22, 0); f(`mod${k}_amount`, -100, 100, 0); }

// ShaverPresets.cpp neverTouchedIds(): a preset never sets these, and a saved file omits them.
const NEVER_TOUCHED = new Set(['quality', 'voice_limit', 'pb_range', 'sc_gain', 'sc_attack', 'sc_release',
  'sc_to_amp', 'sc_to_cutoff', 'sc_trigger', 'sc_threshold', 'sc_hold', 'sc_source', 'smp_beats',
  'smp_start', 'smp_monitor']);
const TABLE = new Map(T.map(r => [r[0], r]));
const SYNCED_RATE_DST = { 1: 20, 2: 21 };   // LFO n Rate destination index

const xmlEscape = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fileKey = name => name.replace(/[\\/:*?"<>|]/g, '_');

function validate(p) {
  const errs = [];
  if (!/^[\x20-\x7e]{1,32}$/.test(p.name)) errs.push('name must be 1-32 printable ASCII characters');
  // The plugin's Save As / Rename note field takes 80 characters (index.html #pe-note maxlength).
  if (!/^[\x20-\x7e]{0,80}$/.test(p.note || '')) errs.push('note must be at most 80 printable ASCII characters');
  for (const [id, v] of Object.entries(p.params)) {
    const row = TABLE.get(id);
    if (!row) { errs.push(`unknown id ${id}`); continue; }
    if (NEVER_TOUCHED.has(id)) { errs.push(`${id} is never touched by presets`); continue; }
    const [, kind, mn, mx] = row;
    const num = typeof v === 'boolean' ? (v ? 1 : 0) : v;
    if (kind === 'b' && typeof v !== 'boolean') errs.push(`${id} must be true/false`);
    if (kind !== 'b' && typeof v !== 'number') errs.push(`${id} must be a number`);
    if ((kind === 'i' || kind === 'c') && !Number.isInteger(num)) errs.push(`${id} must be a whole number`);
    if (num < mn || num > mx) errs.push(`${id}=${v} is outside ${mn}..${mx}`);
  }
  // A mod slot needs both ends, and a synced LFO ignores rate modulation (Engine.h lfoHz).
  const val = id => (id in p.params ? (typeof p.params[id] === 'boolean' ? +p.params[id] : p.params[id]) : TABLE.get(id)[4]);
  for (let k = 1; k <= 8; ++k) {
    const s = val(`mod${k}_src`), d = val(`mod${k}_dst`), a = val(`mod${k}_amount`);
    if ((s === 0) !== (d === 0) || ((s !== 0) && a === 0)) errs.push(`mod${k} is half set up (src ${s}, dst ${d}, amount ${a})`);
    for (const n of [1, 2]) if (d === SYNCED_RATE_DST[n] && val(`lfo${n}_sync`)) errs.push(`mod${k} modulates LFO ${n} rate, but LFO ${n} is synced`);
  }
  return errs;
}

function toXml(p) {
  const fmt = v => (Number.isInteger(v) ? String(v) : String(+v.toPrecision(9)));
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '',
    `<ShaverPreset format="1" name="${xmlEscape(p.name)}" note="${xmlEscape(p.note || '')}" plugin_version="${PLUGIN_VERSION}">`];
  for (const [id, , , , df] of T) {
    if (NEVER_TOUCHED.has(id)) continue;
    const v = id in p.params ? p.params[id] : df;
    lines.push(`  <PARAM id="${id}" value="${fmt(typeof v === 'boolean' ? +v : v)}"/>`);
  }
  lines.push('</ShaverPreset>', '');
  return lines.join('\n');
}

const data = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const names = new Set();
let bad = 0;
for (const p of data.presets) {
  const errs = validate(p);
  if (names.has(p.name.toLowerCase())) errs.push('duplicate name');
  names.add(p.name.toLowerCase());
  if (errs.length) { bad++; console.error(`${p.name}:\n  ${errs.join('\n  ')}`); }
}
if (bad) { console.error(`\n${bad} preset(s) failed; nothing written.`); process.exit(1); }

const install = process.argv.includes('--install');
let installed = 0, skipped = [];
for (const p of data.presets) {
  const xml = toXml(p);
  const file = fileKey(p.name) + '.shaverpreset';
  fs.writeFileSync(path.join(OUT_DIR, file), xml);
  if (install) {
    fs.mkdirSync(USER_DIR, { recursive: true });
    const dest = path.join(USER_DIR, file);
    if (fs.existsSync(dest)) skipped.push(file); else { fs.writeFileSync(dest, xml); installed++; }
  }
}
console.log(`wrote ${data.presets.length} presets to ${path.relative(ROOT, OUT_DIR)}`);
if (install) console.log(`installed ${installed} into ${USER_DIR}` + (skipped.length ? `; skipped (already there): ${skipped.join(', ')}` : ''));
