// src/components/BattleScreen.jsx
import { useState, useEffect, useRef } from 'react';
import { GRID_SIZE } from '../utils/gameUtils';

const CELL_STATES = {
  water: { bg: 'bg-navy-800/60 border-white/10 hover:bg-ocean-500/20 hover:border-ocean-400/50', icon: null, cursor: 'cursor-crosshair' },
  ship: { bg: 'bg-sky-600/70 border-sky-400/50', icon: '🚢', cursor: 'cursor-default' },
  hit: { bg: 'bg-red-600 border-red-500 shadow-inner shadow-black/50', icon: '🚢', cursor: 'cursor-default' },
  miss: { bg: 'bg-black border-gray-800', icon: '❌', cursor: 'cursor-default' },
  'auto-miss': { bg: 'bg-black/80 border-gray-800/80', icon: '❌', cursor: 'cursor-default' },
  sunk: { bg: 'bg-orange-600/80 border-orange-400', icon: '☠️', cursor: 'cursor-default' },
};

function Cell({ state, attackState, isMyBoard, onClick, isMyTurn, disabled, isSelected }) {
  const effectiveState = attackState || state;
  const style = CELL_STATES[effectiveState] || CELL_STATES.water;
  const canClick = !isMyBoard && isMyTurn && !attackState && !disabled;

  return (
    <div
      onClick={canClick ? onClick : undefined}
      className={`
        w-12 h-12 rounded-lg border flex items-center justify-center text-lg
        transition-all duration-150 select-none
        ${style.bg}
        ${canClick ? style.cursor + ' active:scale-90' : 'cursor-default'}
        ${isSelected ? 'ring-4 ring-yellow-400 scale-110 z-10 shadow-lg shadow-yellow-500/50 bg-yellow-500/20' : ''}
        ${attackState === 'hit' ? 'cell-hit' : ''}
        ${attackState === 'miss' ? 'cell-miss' : ''}
      `}
    >
      {style.icon}
    </div>
  );
}

export default function BattleScreen({
  myShips,
  myAttacksReceived,  // 我被打的紀錄
  myAttacksDone,      // 我打對手的紀錄
  oppShips,           // 遊戲結束後揭露
  currentTurn,        // 0 or 1
  myIdx,
  isAI,
  aiDifficulty,
  onAttack,
  gameOver,
  winner,
  lastEvent,          // { type: 'hit'|'miss'|'sunk', row, col, attackerIdx }
  onLeave,            // 退出遊戲
}) {
  const isMyTurn = currentTurn === myIdx;
  const [flashCells, setFlashCells] = useState({});
  const [selectedCell, setSelectedCell] = useState(null); // 新增選取狀態
  const bannerRef = useRef(null);

  // 當換回合或遊戲結束時，清除選取
  useEffect(() => {
    if (!isMyTurn || gameOver) setSelectedCell(null);
  }, [isMyTurn, gameOver]);

  useEffect(() => {
    if (!lastEvent) return;
    const key = `${lastEvent.row},${lastEvent.col}`;
    setFlashCells((prev) => ({ ...prev, [key]: lastEvent.type }));
    const t = setTimeout(() => {
      setFlashCells((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 600);
    return () => clearTimeout(t);
  }, [lastEvent]);

  // 建立我的防守格 map
  const myDefenseMap = {};
  (myAttacksReceived || []).forEach(([r, c, type]) => {
    myDefenseMap[`${r},${c}`] = type;
  });

  // 我自己的船隻位置 map
  const myShipMap = {};
  (myShips || []).forEach((ship) => {
    ship.cells.forEach(([r, c]) => {
      myShipMap[`${r},${c}`] = ship.sunk ? 'sunk' : 'ship';
    });
  });

  // 我攻擊對手的紀錄 map
  const myAttackMap = {};
  (myAttacksDone || []).forEach(([r, c, type]) => {
    myAttackMap[`${r},${c}`] = type;
  });

  // 對手船隻揭露
  const oppShipMap = {};
  if (oppShips) {
    oppShips.forEach((ship) => {
      ship.cells.forEach(([r, c]) => {
        oppShipMap[`${r},${c}`] = ship.sunk ? 'sunk' : 'ship';
      });
    });
  }

  const renderBoard = (isMyBoard) => (
    <div className="flex flex-col items-center gap-3">
      <div className="text-center">
        <h3 className="font-bold text-sm text-white/60 uppercase tracking-wider mb-1">
          {isMyBoard ? '🛡️ 我的海域' : isAI ? `⚔️ AI 的海域` : '⚔️ 對手的海域'}
        </h3>
        {!isMyBoard && !gameOver && (
          <p className={`text-xs ${isMyTurn ? 'text-emerald-400 animate-pulse' : 'text-white/30'}`}>
            {isMyTurn ? '👆 點擊格子攻擊！' : '⏳ 等待對手...'}
          </p>
        )}
        {!isMyBoard && gameOver && (
          <p className="text-xs text-white/40">對手艦隊已揭露</p>
        )}
      </div>

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
              let attackState = null;
              if (myShipState) state = myShipState;
              if (receivedAttack) attackState = receivedAttack;
              return (
                <Cell
                  key={key}
                  state={state}
                  attackState={attackState}
                  isMyBoard={true}
                  isMyTurn={isMyTurn}
                  disabled={gameOver}
                />
              );
            } else {
              const attackState = myAttackMap[key] || (oppShipMap[key] && gameOver ? oppShipMap[key] : null);
              const isSelected = selectedCell && selectedCell[0] === r && selectedCell[1] === c;
              return (
                <Cell
                  key={key}
                  state="water"
                  attackState={attackState}
                  isMyBoard={false}
                  isMyTurn={isMyTurn}
                  disabled={gameOver || !!myAttackMap[key]}
                  isSelected={isSelected}
                  onClick={() => setSelectedCell([r, c])}
                />
              );
            }
          })
        )}
      </div>

      {!isMyBoard && isMyTurn && !gameOver && (
        <div className="mt-4 w-full px-3">
          <button
            className={`w-full py-3 rounded-xl font-bold text-lg transition-all duration-200 shadow-lg ${
              selectedCell
                ? 'bg-red-600 hover:bg-red-500 text-white active:scale-95 cursor-pointer shadow-red-900/50'
                : 'bg-navy-700 text-white/30 cursor-not-allowed border border-white/10'
            }`}
            disabled={!selectedCell}
            onClick={() => {
              if (selectedCell) {
                onAttack(selectedCell[0], selectedCell[1]);
                setSelectedCell(null);
              }
            }}
          >
            {selectedCell ? '💥 確認開砲' : '👆 請先選擇攻擊座標'}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      {/* 標題與狀態列 */}
      <div className="relative text-center mb-8 w-full max-w-4xl flex justify-center items-center">
        <button onClick={onLeave} className="absolute left-0 btn-ghost text-sm flex items-center gap-2 px-4 py-2">
          🚪 退出
        </button>
        <div>
          <h1 className="text-3xl font-black mb-2 bg-gradient-to-r from-sky-400 to-blue-300 bg-clip-text text-transparent">
            ⚔️ 海戰進行中
          </h1>
          {isAI && (
            <span className={`text-xs px-3 py-1 rounded-full font-bold ${
              aiDifficulty === 'easy' ? 'bg-emerald-500/20 text-emerald-400' :
              aiDifficulty === 'hard' ? 'bg-amber-500/20 text-amber-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {aiDifficulty === 'easy' ? '🟢 簡單 AI' : aiDifficulty === 'hard' ? '🟡 困難 AI' : '🔴 Boss AI'}
            </span>
          )}
        </div>
      </div>

      {/* 回合橫幅 */}
      {!gameOver && (
        <div
          ref={bannerRef}
          className={`mb-6 px-6 py-3 rounded-2xl font-bold text-lg transition-all duration-300 ${
            isMyTurn
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
              : 'bg-slate-700/40 border border-slate-600/40 text-white/50'
          }`}
        >
          {isMyTurn ? '💥 你的回合，開砲！' : isAI ? '🤖 AI 思考中...' : '⏳ 等待對手攻擊...'}
        </div>
      )}

      {/* 棋盤區域 */}
      <div className="flex flex-col md:flex-row gap-8 items-start justify-center">
        {renderBoard(true)}

        <div className="flex items-center justify-center text-3xl text-white/20 self-center">
          ⚡
        </div>

        {renderBoard(false)}
      </div>

      {/* 最近事件提示 */}
      {lastEvent && !gameOver && (
        <div className={`mt-6 px-4 py-2 rounded-xl text-sm font-semibold transition-all animate-fade-in ${
          lastEvent.type === 'hit' || lastEvent.type === 'sunk'
            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
            : 'bg-slate-600/20 text-slate-300 border border-slate-500/30'
        }`}>
          {lastEvent.attackerIdx === myIdx
            ? lastEvent.type === 'sunk' ? '🔥 爆破！對手一艘艦沉沒了！'
              : lastEvent.type === 'hit' ? '💥 命中！繼續攻擊！'
              : '💧 未中，換對手回合'
            : lastEvent.type === 'sunk' ? '☠️ 你的艦艇被擊沉了！'
              : lastEvent.type === 'hit' ? '🚨 遭受命中！'
              : '😮‍💨 對手未中'}
        </div>
      )}
    </div>
  );
}
