// src/components/ResultScreen.jsx
import { useEffect, useState } from 'react';
import { GRID_SIZE } from '../utils/gameUtils';
import { sfxVictory, sfxDefeat, sfxClick } from '../utils/audioEngine';

const CONFETTI_COLORS = ['#38bdf8', '#818cf8', '#34d399', '#fbbf24', '#f87171', '#e879f9'];

function ConfettiParticle({ color, left, delay, size }) {
  return (
    <div
      className="confetti-particle"
      style={{
        backgroundColor: color,
        left: `${left}%`,
        top: '-20px',
        width: size,
        height: size,
        animationDelay: `${delay}s`,
        animationDuration: `${1.5 + Math.random() * 1.5}s`,
      }}
    />
  );
}

function MiniBoard({ ships, attacks }) {
  const shipMap = {};
  (ships || []).forEach((ship) => {
    ship.cells.forEach(([r, c]) => {
      shipMap[`${r},${c}`] = ship.sunk ? 'sunk' : 'ship';
    });
  });
  const attackMap = {};
  (attacks || []).forEach(([r, c, type]) => {
    attackMap[`${r},${c}`] = type;
  });

  return (
    <div
      className="grid gap-0.5"
      style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 2rem)` }}
    >
      {Array.from({ length: GRID_SIZE }, (_, r) =>
        Array.from({ length: GRID_SIZE }, (_, c) => {
          const key = `${r},${c}`;
          const ship = shipMap[key];
          const atk = attackMap[key];
          let bg = 'bg-navy-800/60 border-white/10';
          let icon = null;
          if (atk === 'hit') { bg = 'bg-red-600/80 border-red-400'; icon = '💥'; }
          else if (atk === 'sunk') { bg = 'bg-orange-600/80 border-orange-400'; icon = '☠️'; }
          else if (atk === 'miss') { bg = 'bg-slate-700/60 border-slate-500/30'; icon = '·'; }
          else if (atk === 'auto-miss') { bg = 'bg-slate-800/60 border-slate-600/20'; icon = '〜'; }
          else if (ship === 'ship') { bg = 'bg-sky-600/60 border-sky-400/50'; icon = '🚢'; }
          else if (ship === 'sunk') { bg = 'bg-orange-600/40 border-orange-400/30'; icon = '☠️'; }
          return (
            <div key={key} className={`w-8 h-8 rounded border flex items-center justify-center text-xs ${bg}`}>
              {icon}
            </div>
          );
        })
      )}
    </div>
  );
}

export default function ResultScreen({ isWinner, myShips, myAttacksReceived, myAttacksDone, oppShips, onPlayAgain, onLobby, isAI, aiDifficulty }) {
  const [confetti, setConfetti] = useState([]);

  useEffect(() => {
    if (isWinner) {
      sfxVictory();
      setConfetti(
        Array.from({ length: 40 }, (_, i) => ({
          id: i,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          left: Math.random() * 100,
          delay: Math.random() * 1.5,
          size: `${6 + Math.floor(Math.random() * 8)}px`,
        }))
      );
    } else {
      sfxDefeat();
    }
  }, [isWinner]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Confetti */}
      {confetti.map((p) => (
        <ConfettiParticle key={p.id} {...p} />
      ))}

      {/* Result Banner */}
      <div className={`text-center mb-10 ${isWinner ? 'animate-float' : ''}`}>
        <div className="text-8xl mb-4">{isWinner ? '🏆' : '💀'}</div>
        <h1 className={`text-5xl font-black mb-2 bg-gradient-to-r ${
          isWinner
            ? 'from-yellow-300 via-amber-400 to-orange-400'
            : 'from-slate-400 to-slate-600'
        } bg-clip-text text-transparent`}>
          {isWinner ? '勝利！' : '失敗'}
        </h1>
        <p className="text-white/50">
          {isWinner
            ? isAI ? `你擊敗了 ${aiDifficulty === 'boss' ? 'Boss AI！太強了！' : 'AI！'}` : '你擊沉了對手的艦隊！'
            : isAI ? `被 AI 擊沉了...` : '你的艦隊全滅了'}
        </p>
      </div>

      {/* Boards reveal */}
      <div className="flex flex-col md:flex-row gap-8 justify-center mb-10">
        <div className="glass-card p-5 text-center">
          <h3 className="text-sm font-semibold text-white/50 mb-3 uppercase tracking-wider">我的海域</h3>
          <MiniBoard ships={myShips} attacks={myAttacksReceived} />
        </div>
        <div className="glass-card p-5 text-center">
          <h3 className="text-sm font-semibold text-white/50 mb-3 uppercase tracking-wider">對手海域</h3>
          <MiniBoard ships={oppShips} attacks={myAttacksDone} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button onClick={() => { sfxClick(); onPlayAgain(); }} className="btn-primary text-base px-8 py-3">
          🔁 再來一局
        </button>
        <button onClick={() => { sfxClick(); onLobby(); }} className="btn-ghost text-base px-6 py-3">
          ← 回到大廳
        </button>
      </div>
    </div>
  );
}
