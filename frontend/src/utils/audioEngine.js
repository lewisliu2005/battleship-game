// src/utils/audioEngine.js
// 純 Web Audio API 合成音效引擎，無需外部音檔

let ctx = null;
let bgmNodes = {};
let bgmGain = null;
let sfxGain = null;
let bgmVolume = 0.4;
let sfxVolume = 0.6;
let bgmMuted = false;
let sfxMuted = false;
let bgmStarted = false;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

// ─── 工具 ─────────────────────────────────────────────
function note(freq, startTime, duration, gainNode, type = 'triangle', attack = 0.01, decay = 0.1) {
  const c = getCtx();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.connect(g);
  g.connect(gainNode);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  g.gain.setValueAtTime(0, startTime);
  g.gain.linearRampToValueAtTime(1, startTime + attack);
  g.gain.exponentialRampToValueAtTime(0.001, startTime + attack + decay + duration);
  osc.start(startTime);
  osc.stop(startTime + attack + decay + duration + 0.05);
}

function noise(startTime, duration, gainNode, filterFreq = 800, filterQ = 1) {
  const c = getCtx();
  const bufferSize = c.sampleRate * duration;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const src = c.createBufferSource();
  src.buffer = buffer;

  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  filter.Q.value = filterQ;

  const g = c.createGain();
  src.connect(filter);
  filter.connect(g);
  g.connect(gainNode);
  g.gain.setValueAtTime(0.8, startTime);
  g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  src.start(startTime);
  src.stop(startTime + duration);
  return src;
}

// ─── BGM：海浪 + 海鷗 + 風聲 + 班鳩琴 ────────────────
export function startBGM() {
  if (bgmStarted) return;
  bgmStarted = true;
  const c = getCtx();
  bgmGain = c.createGain();
  bgmGain.gain.value = bgmMuted ? 0 : bgmVolume;
  bgmGain.connect(c.destination);

  // 海鷗聲（定期 FM 合成）
  let gullTimer = null;
  const playGull = () => {
    const g = c.createGain();
    g.gain.value = 0.04;
    g.connect(bgmGain);
    const carrier = c.createOscillator();
    const mod = c.createOscillator();
    const modGain = c.createGain();
    carrier.type = 'sine';
    mod.type = 'sine';
    carrier.frequency.setValueAtTime(1400, c.currentTime);
    carrier.frequency.linearRampToValueAtTime(1900, c.currentTime + 0.3);
    carrier.frequency.linearRampToValueAtTime(1200, c.currentTime + 0.6);
    mod.frequency.value = 220;
    modGain.gain.value = 300;
    mod.connect(modGain);
    modGain.connect(carrier.frequency);
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(0.07, c.currentTime + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.8);
    carrier.connect(g);
    carrier.start(c.currentTime);
    carrier.stop(c.currentTime + 0.9);
    mod.start(c.currentTime);
    mod.stop(c.currentTime + 0.9);
    const delay = 6000 + Math.random() * 10000;
    gullTimer = setTimeout(playGull, delay);
  };
  setTimeout(playGull, 3000);
  bgmNodes.stopGull = () => clearTimeout(gullTimer);

  // 班鳩琴旋律（Karplus-Strong 近似）
  const banjoScale = [293.66, 329.63, 369.99, 415.30, 440.00, 493.88, 554.37, 587.33];
  const banjoPattern = [0, 2, 4, 2, 4, 7, 4, 2, 0, 4, 2, 0];
  let patternIdx = 0;
  let banjoTimer = null;
  const playBanjoNote = () => {
    const freq = banjoScale[banjoPattern[patternIdx % banjoPattern.length]];
    patternIdx++;
    const g = c.createGain();
    g.gain.value = 0.08;
    g.connect(bgmGain);
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq * 3;
    g.gain.setValueAtTime(0.12, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
    osc.connect(filter);
    filter.connect(g);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.6);
    const interval = (patternIdx % 3 === 0) ? 700 : 350;
    banjoTimer = setTimeout(playBanjoNote, interval);
  };
  setTimeout(playBanjoNote, 1500);
  bgmNodes.stopBanjo = () => clearTimeout(banjoTimer);
}

export function stopBGM() {
  if (bgmNodes.stopGull) bgmNodes.stopGull();
  if (bgmNodes.stopBanjo) bgmNodes.stopBanjo();
  bgmNodes = {};
  bgmStarted = false;
}

// ─── 音量控制 ─────────────────────────────────────────
export function setBGMVolume(v) {
  bgmVolume = v;
  if (bgmGain) bgmGain.gain.value = bgmMuted ? 0 : v;
}

export function setSFXVolume(v) {
  sfxVolume = v;
  if (sfxGain) sfxGain.gain.value = sfxMuted ? 0 : v;
}

export function toggleBGMMute() {
  bgmMuted = !bgmMuted;
  if (bgmGain) bgmGain.gain.value = bgmMuted ? 0 : bgmVolume;
  return bgmMuted;
}

export function toggleSFXMute() {
  sfxMuted = !sfxMuted;
  return sfxMuted;
}

export function getBGMState() { return { volume: bgmVolume, muted: bgmMuted }; }
export function getSFXState() { return { volume: sfxVolume, muted: sfxMuted }; }

// ─── SFX 工廠 ─────────────────────────────────────────
function makeSFXGain() {
  const c = getCtx();
  if (c.state === 'suspended') c.resume();
  const g = c.createGain();
  g.gain.value = sfxMuted ? 0 : sfxVolume;
  g.connect(c.destination);
  return g;
}

// 按鈕點擊
export function sfxClick() {
  const c = getCtx();
  const g = makeSFXGain();
  note(880, c.currentTime, 0.02, g, 'square', 0.005, 0.08);
}

// 船艦放置（骨頭碰撞聲）
export function sfxPlace() {
  const c = getCtx();
  const g = makeSFXGain();
  const count = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const t = c.currentTime + i * 0.06;
    noise(t, 0.04, g, 600 + Math.random() * 400, 2);
    note(180 + Math.random() * 60, t, 0.03, g, 'square', 0.002, 0.05);
  }
}

// 撤回船艦
export function sfxUnplace() {
  const c = getCtx();
  const g = makeSFXGain();
  note(440, c.currentTime, 0.05, g, 'triangle', 0.005, 0.15);
  note(330, c.currentTime + 0.06, 0.05, g, 'triangle', 0.005, 0.15);
}

// 命中
export function sfxHit() {
  const c = getCtx();
  const g = makeSFXGain();
  // 爆炸低頻
  const osc = c.createOscillator();
  const og = c.createGain();
  osc.connect(og); og.connect(g);
  osc.frequency.setValueAtTime(200, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, c.currentTime + 0.4);
  og.gain.setValueAtTime(0.8, c.currentTime);
  og.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
  osc.start(c.currentTime); osc.stop(c.currentTime + 0.5);
  noise(c.currentTime, 0.3, g, 2000, 0.5);
}

// 未中（水濺）
export function sfxMiss() {
  const c = getCtx();
  const g = makeSFXGain();
  noise(c.currentTime, 0.25, g, 400, 1);
  note(600, c.currentTime, 0.1, g, 'sine', 0.01, 0.2);
}

// 擊沉
export function sfxSunk() {
  const c = getCtx();
  const g = makeSFXGain();
  noise(c.currentTime, 0.6, g, 1500, 0.8);
  const osc = c.createOscillator();
  const og = c.createGain();
  osc.connect(og); og.connect(g);
  osc.frequency.setValueAtTime(300, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, c.currentTime + 0.8);
  og.gain.setValueAtTime(1, c.currentTime);
  og.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.9);
  osc.start(c.currentTime); osc.stop(c.currentTime + 0.9);
}

// 勝利（五聲音階琶音上行）
export function sfxVictory() {
  const c = getCtx();
  const g = makeSFXGain();
  const freqs = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
  freqs.forEach((f, i) => {
    note(f, c.currentTime + i * 0.12, 0.3, g, 'triangle', 0.01, 0.4);
  });
}

// 戰敗（小調下行）
export function sfxDefeat() {
  const c = getCtx();
  const g = makeSFXGain();
  const freqs = [523.25, 466.16, 415.30, 369.99, 329.63, 293.66, 261.63];
  freqs.forEach((f, i) => {
    note(f, c.currentTime + i * 0.15, 0.35, g, 'sawtooth', 0.02, 0.45);
  });
}

// AI 攻擊警報
export function sfxAIAttack() {
  const c = getCtx();
  const g = makeSFXGain();
  note(1200, c.currentTime, 0.04, g, 'square', 0.005, 0.06);
  note(900, c.currentTime + 0.07, 0.04, g, 'square', 0.005, 0.06);
}

// 你的回合提示
export function sfxYourTurn() {
  const c = getCtx();
  const g = makeSFXGain();
  note(660, c.currentTime, 0.05, g, 'sine', 0.01, 0.12);
  note(880, c.currentTime + 0.1, 0.05, g, 'sine', 0.01, 0.15);
}
