// src/components/LobbyScreen.jsx
import { useState } from 'react';
import socket from '../socket';
import { sfxClick } from '../utils/audioEngine';

const MODE_CARDS = [
  {
    id: 'quick',
    icon: '⚡',
    title: '快速配對',
    desc: '自動與線上玩家配對，即刻開戰',
    color: 'from-sky-500/20 to-blue-600/20 border-sky-500/30',
    btnClass: 'btn-primary',
    btnText: '快速配對',
  },
  {
    id: 'room',
    icon: '🔑',
    title: '房號配對',
    desc: '建立或加入房間，與朋友私下對戰',
    color: 'from-violet-500/20 to-purple-600/20 border-violet-500/30',
    btnClass: 'btn-ghost',
    btnText: '進入房間',
  },
  {
    id: 'ai',
    icon: '🤖',
    title: '電腦對弈',
    desc: '挑戰 AI 對手，三種難度選擇',
    color: 'from-emerald-500/20 to-teal-600/20 border-emerald-500/30',
    btnClass: 'btn-ghost',
    btnText: '選擇難度',
  },
];

const AI_DIFFICULTIES = [
  {
    id: 'easy',
    icon: '🟢',
    label: '簡單',
    desc: 'AI 隨機開砲，新手友善',
    color: 'border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20',
  },
  {
    id: 'hard',
    icon: '🟡',
    label: '困難',
    desc: '命中後追擊相鄰格，有戰術意識',
    color: 'border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20',
  },
  {
    id: 'boss',
    icon: '🔴',
    label: 'Boss',
    desc: '機率密度計算，精準打擊，極難',
    color: 'border-red-500/50 bg-red-500/10 hover:bg-red-500/20',
  },
];

export default function LobbyScreen({ onModeSelect, waitingForOpponent, onCancelQueue }) {
  const [activePanel, setActivePanel] = useState(null); // 'room' | 'ai' | null
  const [roomAction, setRoomAction] = useState(null); // 'create' | 'join'
  const [roomCode, setRoomCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [turnTime, setTurnTime] = useState(20);

  const handleCardClick = (id) => {
    sfxClick();
    if (id === 'quick') {
      onModeSelect({ mode: 'quick' });
    } else {
      setActivePanel(id === activePanel ? null : id);
    }
  };

  const handleCreateRoom = () => {
    sfxClick();
    if (roomAction !== 'create') {
      setRoomAction('create');
    } else {
      onModeSelect({ mode: 'create_room', turnTime });
    }
  };

  const handleJoinRoom = () => {
    if (!roomCode.trim()) return;
    sfxClick();
    setJoinError('');
    onModeSelect({ mode: 'join_room', roomCode: roomCode.trim().toUpperCase() });
  };

  const handleAIDifficulty = (difficulty) => {
    sfxClick();
    onModeSelect({ mode: 'ai', difficulty });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12 animate-float">
        <div className="text-6xl mb-3" style={{ filter: 'drop-shadow(0 0 20px rgba(245,166,35,0.6))' }}>⚙</div>
        <h1 className="text-5xl font-black tracking-widest mb-2" style={{ color: '#F5A623', textShadow: '0 0 30px rgba(245,166,35,0.4)', fontFamily: "'Rajdhani', sans-serif" }}>
          海戰棋
        </h1>
        <p className="text-white/30 text-xs tracking-widest uppercase" style={{ fontFamily: "'Share Tech Mono', monospace" }}>BATTLESHIP // ONLINE</p>
      </div>

      {/* Mode Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl mb-6">
        {MODE_CARDS.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            className={`glass-card bg-gradient-to-br ${card.color} border p-6 text-left transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95`}
          >
            <div className="text-4xl mb-3">{card.icon}</div>
            <h2 className="text-lg font-bold mb-1">{card.title}</h2>
            <p className="text-white/50 text-sm mb-4">{card.desc}</p>
            <span className={`${card.btnClass} text-xs px-3 py-1.5`}>
              {card.btnText} →
            </span>
          </button>
        ))}
      </div>

      {/* Panels */}
      {activePanel === 'room' && (
        <div className="glass-card p-6 w-full max-w-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <h3 className="font-bold text-lg mb-4">🔑 房號配對</h3>
          <div className="flex gap-3 mb-4">
            <button
              onClick={handleCreateRoom}
              className="btn-primary flex-1 text-sm"
            >
              ＋ 建立房間
            </button>
            <button
              onClick={() => setRoomAction('join')}
              className="btn-ghost flex-1 text-sm"
            >
              ▶ 加入房間
            </button>
          </div>
          
          {roomAction === 'create' && (
            <div className="space-y-3 animate-in fade-in zoom-in duration-200">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/50 uppercase tracking-widest">每回合時間限制</label>
                <div className="flex gap-2">
                  {[20, 30, 45, 60].map(t => (
                    <button
                      key={t}
                      onClick={() => setTurnTime(t)}
                      className={`flex-1 py-2 rounded text-sm transition-colors ${turnTime === t ? 'bg-sky-500 text-white font-bold' : 'bg-steel-800 text-white/60 hover:bg-steel-700'}`}
                    >
                      {t}s
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleCreateRoom} className="btn-primary w-full shadow-lg shadow-sky-500/20">
                ✅ 確認建立
              </button>
            </div>
          )}

          {roomAction === 'join' && (
            <div className="space-y-2">
              <input
                id="room-code-input"
                type="text"
                maxLength={4}
                placeholder="輸入 4 位房號"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                className="input-field w-full uppercase tracking-widest text-center text-xl font-bold"
              />
              {joinError && <p className="text-red-400 text-xs text-center">{joinError}</p>}
              <button onClick={handleJoinRoom} className="btn-primary w-full">
                加入
              </button>
            </div>
          )}
        </div>
      )}

      {activePanel === 'ai' && (
        <div className="glass-card p-6 w-full max-w-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <h3 className="font-bold text-lg mb-4">🤖 選擇 AI 難度</h3>
          <div className="space-y-3">
            {AI_DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                onClick={() => handleAIDifficulty(d.id)}
                className={`w-full text-left border rounded-xl p-4 transition-all duration-150 active:scale-95 ${d.color}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{d.icon}</span>
                  <div>
                    <div className="font-bold">{d.label}</div>
                    <div className="text-white/50 text-xs">{d.desc}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Waiting overlay */}
      {waitingForOpponent && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="glass-card p-8 text-center space-y-4">
            <div className="text-5xl animate-bounce">🔍</div>
            <h2 className="text-xl font-bold">正在尋找對手...</h2>
            <div className="flex gap-1 justify-center">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-ocean-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <button onClick={onCancelQueue} className="btn-ghost text-sm">
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
