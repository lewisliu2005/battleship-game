// src/components/BattleScreen.jsx
import { useState, useEffect, useRef } from 'react';
import { GRID_SIZE } from '../utils/gameUtils';
import ShipSVG from './ShipSVG';
import { sfxClick, sfxHit, sfxMiss, sfxSunk, sfxYourTurn, sfxAIAttack } from '../utils/audioEngine';

const CELL_PX = 48; // w-12 = 48px
const GAP_PX = 4;

const CELL_STATES = {
  water:       { bg: 'bg-steel-800/70 border-white/8 hover:bg-yellow-400/10 hover:border-yellow-400/30', icon: null, cursor: 'cursor-crosshair' },
  ship:        { bg: 'bg-blue-700/40 border-yellow-400/15', icon: null, cursor: 'cursor-default' },
  hit:         { bg: 'bg-red-700 border-red-500 shadow-inner shadow-black/50', icon: '💥', cursor: 'cursor-default' },
  miss:        { bg: 'bg-black border-gray-800', icon: '❌', cursor: 'cursor-default' },
  'auto-miss': { bg: 'bg-black/80 border-gray-800/80', icon: '❌', cursor: 'cursor-default' },
  sunk:        { bg: 'bg-alert/80 border-alert', icon: '✕', cursor: 'cursor-default' },
};

function Cell({ state, attackState, isMyBoard, onClick, isMyTurn, disabled, isSelected }) {
  const effectiveState = attackState || state;
  const style = CELL_STATES[effectiveState] || CELL_STATES.water;
  const canClick = !isMyBoard && isMyTurn && !attackState && !disabled;

  return (
    <div
      onClick={canClick ? onClick : undefined}
      className={`
        w-12 h-12 border flex items-center justify-center text-sm font-bold
        transition-all duration-150 select-none rounded
        ${style.bg}
        ${canClick ? style.cursor + ' active:scale-90' : 'cursor-default'}
        ${isSelected ? 'ring-2 ring-yellow-400 scale-110 z-10 shadow-lg shadow-yellow-500/50 bg-yellow-500/20' : ''}
        ${attackState === 'hit' || attackState === 'sunk' ? 'cell-hit' : ''}
        ${attackState === 'miss' || attackState === 'auto-miss' ? 'cell-miss' : ''}
      `}
    >
      {style.icon}
    </div>
  );
}

export default function BattleScreen({
  myShips,
  myAttacksReceived,
  myAttacksDone,
  oppShips,
  currentTurn,
  myIdx,
  isAI,
  aiDifficulty,
  onAttack,
  gameOver,
  winner,
  lastEvent,
  turnDeadline,
  onLeave,
}) {
  const isMyTurn = currentTurn === myIdx;
  const [selectedCell, setSelectedCell] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const prevTurnRef = useRef(isMyTurn);
  const prevEventRef = useRef(null);

  // 倒數計時
  useEffect(() => {
    if (gameOver || !turnDeadline) return;
    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((turnDeadline - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    updateTimer();
    const timerId = setInterval(updateTimer, 500);
    return () => clearInterval(timerId);
  }, [turnDeadline, gameOver]);

  // 回合切換音效
  useEffect(() => {
    if (!gameOver && isMyTurn && !prevTurnRef.current) sfxYourTurn();
    prevTurnRef.current = isMyTurn;
  }, [isMyTurn, gameOver]);

  // 攻擊事件音效
  useEffect(() => {
    if (!lastEvent) return;
    if (prevEventRef.current === lastEvent) return;
    prevEventRef.current = lastEvent;
    if (lastEvent.type === 'sunk') sfxSunk();
    else if (lastEvent.type === 'hit') sfxHit();
    else if (lastEvent.type === 'miss') {
      if (!isAI || lastEvent.attackerIdx !== myIdx) sfxMiss();
      else sfxAIAttack();
    }
  }, [lastEvent]);

  // 當換回合或遊戲結束時，清除選取
  useEffect(() => {
    if (!isMyTurn || gameOver) setSelectedCell(null);
  }, [isMyTurn, gameOver]);

  // 建立 map
  const myDefenseMap = {};
  (myAttacksReceived || []).forEach(([r, c, type]) => { myDefenseMap[`${r},${c}`] = type; });

  const myShipMap = {};
  (myShips || []).forEach((ship) => {
    ship.cells.forEach(([r, c]) => { myShipMap[`${r},${c}`] = ship.sunk ? 'sunk' : 'ship'; });
  });

  const myAttackMap = {};
  (myAttacksDone || []).forEach(([r, c, type]) => { myAttackMap[`${r},${c}`] = type; });

  const oppShipMap = {};
  if (oppShips) {
    oppShips.forEach((ship) => {
      ship.cells.forEach(([r, c]) => { oppShipMap[`${r},${c}`] = ship.sunk ? 'sunk' : 'ship'; });
    });
  }

  // 計算 ShipSVG overlay 位置
  const renderShipOverlays = (ships, attackMap) => {
    return (ships || []).map((ship, si) => {
      const { cells } = ship;
      if (!cells || cells.length === 0) return null;
      const minR = Math.min(...cells.map(([r]) => r));
      const minC = Math.min(...cells.map(([, c]) => c));
      const maxR = Math.max(...cells.map(([r]) => r));
      const isH = minR === maxR;
      const size = cells.length;
      const top = 12 + minR * (CELL_PX + GAP_PX);
      const left = 12 + minC * (CELL_PX + GAP_PX);
      const w = isH ? size * CELL_PX + (size - 1) * GAP_PX : CELL_PX;
      const h = isH ? CELL_PX : size * CELL_PX + (size - 1) * GAP_PX;
      const isHit = cells.some(([r, c]) => attackMap[`${r},${c}`] === 'hit');
      const isSunk = ship.sunk;
      return (
        <div
          key={si}
          className="ship-overlay"
          style={{ top, left, width: w, height: h, opacity: isSunk ? 0.5 : 1 }}
        >
          <ShipSVG size={size} isHorizontal={isH} hit={isHit} sunk={isSunk} />
        </div>
      );
    });
  };

  const renderBoard = (isMyBoard) => {
    const ships = isMyBoard ? myShips : (oppShips && gameOver ? oppShips : null);
    const attackOverlay = isMyBoard ? myDefenseMap : myAttackMap;

    return (
      <div className="flex flex-col items-center gap-3">
        <div className="text-center">
          <h3 className="font-bold text-xs text-white/50 uppercase tracking-widest mb-1" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {isMyBoard ? '[ 我的陣地 ]' : isAI ? '[ AI 陣地 ]' : '[ 敵方陣地 ]'}
          </h3>
          {!isMyBoard && !gameOver && (
            <p className={`text-xs ${isMyTurn ? 'text-yellow-400 animate-pulse' : 'text-white/25'}`}>
              {isMyTurn ? '▶ 選擇目標並開砲' : '⏸ 等待對手...'}
            </p>
          )}
        </div>

        <div className="relative ship-grid-wrapper">
          <div
            className={`grid gap-1 p-3 glass-card ${!isMyBoard && isMyTurn && !gameOver ? 'animate-glow' : ''}`}
            style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 3rem)` }}
          >
            {Array.from({ length: GRID_SIZE }, (_, r) =>
              Array.from({ length: GRID_SIZE }, (_, c) => {
                const key = `${r},${c}`;
                if (isMyBoard) {
                  const receivedAttack = myDefenseMap[key];
                  const myShipState = myShipMap[key];
                  let state = 'water';
                  let atk = null;
                  if (myShipState) state = myShipState;
                  if (receivedAttack) atk = receivedAttack;
                  return <Cell key={key} state={state} attackState={atk} isMyBoard isMyTurn={isMyTurn} disabled={gameOver} />;
                } else {
                  const atk = myAttackMap[key] || (oppShipMap[key] && gameOver ? oppShipMap[key] : null);
                  const isSelected = selectedCell && selectedCell[0] === r && selectedCell[1] === c;
                  return (
                    <Cell
                      key={key}
                      state="water"
                      attackState={atk}
                      isMyBoard={false}
                      isMyTurn={isMyTurn}
                      disabled={gameOver || !!myAttackMap[key]}
                      isSelected={isSelected}
                      onClick={() => { sfxClick(); setSelectedCell([r, c]); }}
                    />
                  );
                }
              })
            )}
          </div>

          {/* Ship overlays */}
          {isMyBoard && renderShipOverlays(myShips, myDefenseMap)}
          {!isMyBoard && gameOver && renderShipOverlays(oppShips, myAttackMap)}
        </div>

        {!isMyBoard && isMyTurn && !gameOver && (
          <div className="mt-3 w-full px-3">
            <button
              className={`w-full py-3 rounded font-bold text-base uppercase tracking-wider transition-all duration-200 ${
                selectedCell
                  ? 'btn-warning cursor-pointer'
                  : 'bg-steel-700 text-white/25 cursor-not-allowed border border-white/8'
              }`}
              disabled={!selectedCell}
              onClick={() => {
                if (selectedCell) {
                  sfxClick();
                  onAttack(selectedCell[0], selectedCell[1]);
                  setSelectedCell(null);
                }
              }}
            >
              {selectedCell ? '💥 確認開砲' : '▷ 請先選擇攻擊座標'}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      {/* 標題列 */}
      <div className="relative text-center mb-6 w-full max-w-4xl flex justify-center items-center">
        <button onClick={() => { sfxClick(); onLeave(); }} className="absolute left-0 btn-ghost text-sm flex items-center gap-2 px-4 py-2">
          ← 退出
        </button>
        <div>
          <h1 className="text-2xl font-black mb-1 tracking-widest" style={{ color: '#F5A623', textShadow: '0 0 20px rgba(245,166,35,0.5)' }}>
            ⚙ 戰鬥進行中
          </h1>
          {isAI && (
            <span className={`text-xs px-3 py-1 rounded font-bold uppercase tracking-wider border ${
              aiDifficulty === 'easy' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' :
              aiDifficulty === 'hard' ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10' :
              'border-red-500/30 text-red-400 bg-red-500/10'
            }`}>
              {aiDifficulty === 'easy' ? 'AI: EASY' : aiDifficulty === 'hard' ? 'AI: HARD' : 'AI: BOSS'}
            </span>
          )}
        </div>
      </div>

      {/* 狀態橫幅 */}
      {!gameOver && (
        <div
          className={`mb-5 px-6 py-2.5 rounded status-banner font-bold text-sm uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-4 ${
            isMyTurn
              ? 'text-yellow-400 border-yellow-500/30'
              : 'text-white/40 border-white/10'
          }`}
        >
          <span>{isMyTurn ? '▶ 你的回合' : isAI ? '⚙ AI 計算中...' : '⏸ 對手回合'}</span>
          {turnDeadline && (
            <span className={`text-lg ml-2 ${timeLeft <= 5 ? 'text-red-500 animate-bounce' : ''}`} style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
            </span>
          )}
        </div>
      )}

      {/* 棋盤 */}
      <div className="flex flex-col md:flex-row gap-8 items-start justify-center">
        {renderBoard(true)}

        <div className="flex items-center justify-center text-2xl text-yellow-400/30 self-center animate-pulse font-mono">
          VS
        </div>

        {renderBoard(false)}
      </div>

      {/* 事件提示 */}
      {lastEvent && !gameOver && (
        <div className={`mt-5 px-4 py-2 rounded status-banner text-sm font-semibold ${
          lastEvent.type === 'hit' || lastEvent.type === 'sunk'
            ? 'text-red-300 border-red-500/30'
            : 'text-white/50 border-white/10'
        }`}>
          {lastEvent.attackerIdx === myIdx
            ? lastEvent.type === 'sunk' ? '🔥 擊沉！對手艦艇報廢！'
              : lastEvent.type === 'hit' ? '💥 命中！繼續攻擊！'
              : '◌ 未命中，換對手'
            : lastEvent.type === 'sunk' ? '☠ 我方艦艇被擊沉！'
              : lastEvent.type === 'hit' ? '⚠ 我方遭受命中！'
              : '◌ 對手未中'}
        </div>
      )}
    </div>
  );
}
