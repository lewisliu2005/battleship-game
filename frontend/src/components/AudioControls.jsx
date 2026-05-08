// src/components/AudioControls.jsx
import { useState, useEffect } from 'react';
import {
  setBGMVolume, setSFXVolume,
  toggleBGMMute, toggleSFXMute,
  getBGMState, getSFXState,
} from '../utils/audioEngine';

export default function AudioControls() {
  const [open, setOpen] = useState(false);
  const [bgm, setBgm] = useState(getBGMState());
  const [sfx, setSfx] = useState(getSFXState());

  const handleBGMVolume = (e) => {
    const v = parseFloat(e.target.value);
    setBGMVolume(v);
    setBgm(getBGMState());
  };

  const handleSFXVolume = (e) => {
    const v = parseFloat(e.target.value);
    setSFXVolume(v);
    setSfx(getSFXState());
  };

  const handleBGMMute = () => {
    toggleBGMMute();
    setBgm(getBGMState());
  };

  const handleSFXMute = () => {
    toggleSFXMute();
    setSfx(getSFXState());
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="audio-panel rounded-xl p-4 w-52 shadow-2xl border border-yellow-500/30"
          style={{ background: 'rgba(26,26,36,0.95)', backdropFilter: 'blur(12px)' }}>
          <div className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-3">🎚 音效設定</div>

          {/* BGM */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-white/70">🎵 背景音樂</span>
              <button
                onClick={handleBGMMute}
                className={`text-xs px-2 py-0.5 rounded font-bold transition-colors ${bgm.muted ? 'bg-red-800/60 text-red-300' : 'bg-yellow-700/40 text-yellow-300'}`}
              >
                {bgm.muted ? '靜音' : '開啟'}
              </button>
            </div>
            <input
              type="range" min="0" max="1" step="0.05"
              value={bgm.volume}
              onChange={handleBGMVolume}
              disabled={bgm.muted}
              className="w-full h-1.5 accent-yellow-400 cursor-pointer disabled:opacity-40"
            />
          </div>

          {/* SFX */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-white/70">💥 音效</span>
              <button
                onClick={handleSFXMute}
                className={`text-xs px-2 py-0.5 rounded font-bold transition-colors ${sfx.muted ? 'bg-red-800/60 text-red-300' : 'bg-yellow-700/40 text-yellow-300'}`}
              >
                {sfx.muted ? '靜音' : '開啟'}
              </button>
            </div>
            <input
              type="range" min="0" max="1" step="0.05"
              value={sfx.volume}
              onChange={handleSFXVolume}
              disabled={sfx.muted}
              className="w-full h-1.5 accent-yellow-400 cursor-pointer disabled:opacity-40"
            />
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="w-11 h-11 rounded-full flex items-center justify-center text-xl shadow-lg transition-all active:scale-90"
        style={{ background: 'linear-gradient(135deg,#F5A623,#B87B00)', boxShadow: '0 0 16px rgba(245,166,35,0.4)' }}
        title="音效設定"
      >
        {open ? '✕' : '🔊'}
      </button>
    </div>
  );
}
