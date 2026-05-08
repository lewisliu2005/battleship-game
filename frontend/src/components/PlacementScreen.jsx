// src/components/PlacementScreen.jsx
import { useState, useCallback, useRef } from 'react';
import { GRID_SIZE, SHIPS_TO_PLACE, randomPlacementFE } from '../utils/gameUtils';
import ShipSVG from './ShipSVG';
import { sfxClick, sfxPlace, sfxUnplace } from '../utils/audioEngine';

const SHIP_SIZES = [3, 2, 2, 1];
const CELL_PX = 56; // w-14 = 56px
const GAP_PX = 4;   // gap-1 = 4px

function isValidPlacement(placedShips, newCells) {
  const forbidden = new Set();
  for (const ship of placedShips) {
    for (const [r, c] of ship.cells) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          forbidden.add(`${r + dr},${c + dc}`);
        }
      }
    }
  }
  return newCells.every(([r, c]) =>
    r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && !forbidden.has(`${r},${c}`)
  );
}

function getCells(r, c, size, isHorizontal) {
  let startR = r;
  let startC = c;
  if (isHorizontal) {
    if (startC + size > GRID_SIZE) {
      startC = Math.max(0, GRID_SIZE - size);
    }
  } else {
    if (startR + size > GRID_SIZE) {
      startR = Math.max(0, GRID_SIZE - size);
    }
  }

  const cells = [];
  for (let k = 0; k < size; k++) {
    const nr = isHorizontal ? startR : startR + k;
    const nc = isHorizontal ? startC + k : startC;
    cells.push([nr, nc]);
  }
  return cells;
}

export default function PlacementScreen({ onReady, roomCode, playerIdx, isAI, aiDifficulty, opponentReady, onLeave }) {
  const [placedShips, setPlacedShips] = useState([]);
  const [currentShipIdx, setCurrentShipIdx] = useState(0);
  const [isHorizontal, setIsHorizontal] = useState(true);
  const [hoverCells, setHoverCells] = useState([]);
  const [hoverValid, setHoverValid] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const currentSize = currentShipIdx < SHIP_SIZES.length ? SHIP_SIZES[currentShipIdx] : null;

  // 計算格子狀態
  const occupiedMap = {};
  placedShips.forEach((ship, si) => {
    ship.cells.forEach(([r, c]) => {
      occupiedMap[`${r},${c}`] = si;
    });
  });

  const hoverSet = new Set(hoverCells.map(([r, c]) => `${r},${c}`));

  const handleHover = useCallback((r, c) => {
    if (currentSize === null) return;
    const cells = getCells(r, c, currentSize, isHorizontal);
    const inBounds = cells.every(([nr, nc]) => nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE);
    if (!inBounds) { setHoverCells([]); return; }
    setHoverCells(cells);
    setHoverValid(isValidPlacement(placedShips, cells));
  }, [currentSize, isHorizontal, placedShips]);

  const handleClick = useCallback((r, c) => {
    if (currentSize === null || submitted) return;
    const cells = getCells(r, c, currentSize, isHorizontal);
    const inBounds = cells.every(([nr, nc]) => nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE);
    if (!inBounds || !isValidPlacement(placedShips, cells)) return;

    sfxPlace();
    const newShips = [...placedShips, { cells, shipIndex: currentShipIdx }];
    setPlacedShips(newShips);
    setCurrentShipIdx((prev) => prev + 1);
    setHoverCells([]);
  }, [currentSize, isHorizontal, placedShips, currentShipIdx, submitted]);

  const handleReset = () => {
    sfxClick();
    setPlacedShips([]);
    setCurrentShipIdx(0);
    setHoverCells([]);
    setSubmitted(false);
  };

  const handleRandomize = () => {
    sfxPlace();
    const ships = randomPlacementFE();
    setPlacedShips(ships);
    setCurrentShipIdx(SHIP_SIZES.length);
    setHoverCells([]);
  };

  const handleRemoveLast = () => {
    if (placedShips.length === 0) return;
    sfxUnplace();
    setPlacedShips((prev) => prev.slice(0, -1));
    setCurrentShipIdx((prev) => prev - 1);
  };

  const handleSubmit = () => {
    if (placedShips.length < SHIP_SIZES.length) return;
    setSubmitted(true);
    onReady(placedShips);
  };

  const allPlaced = currentShipIdx >= SHIP_SIZES.length;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="relative text-center mb-8 w-full max-w-4xl flex justify-center items-center">
        <button onClick={onLeave} className="absolute left-0 btn-ghost text-sm flex items-center gap-2 px-4 py-2">
          🚪 退出
        </button>
        <div>
          <h1 className="text-3xl font-black mb-1 bg-gradient-to-r from-sky-400 to-blue-300 bg-clip-text text-transparent">
            📍 佈署艦隊
          </h1>
          {!isAI && roomCode && (
            <p className="text-white/40 text-sm">
              房號：<span className="text-ocean-400 font-bold tracking-widest">{roomCode}</span>
              {' '}｜ 玩家 {playerIdx + 1}
            </p>
          )}
          {isAI && (
            <p className="text-white/40 text-sm">
              對手：AI {aiDifficulty === 'easy' ? '🟢 簡單' : aiDifficulty === 'hard' ? '🟡 困難' : '🔴 Boss'}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start justify-center w-full max-w-4xl">
        {/* 棋盤 */}
        <div className="flex flex-col items-center gap-4">
          {/* 方向切換 */}
          <button
            onClick={() => setIsHorizontal((h) => !h)}
            className="btn-ghost text-sm flex items-center gap-2"
          >
            {isHorizontal ? '↔ 水平' : '↕ 垂直'}
            <span className="text-white/40 text-xs">（點擊切換）</span>
          </button>

          {/* 5x5 棋盤 + 船艦 Overlay */}
          <div className="relative ship-grid-wrapper">
            <div
              className="grid gap-1 p-3 glass-card animate-glow"
              style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 3.5rem)` }}
              onMouseLeave={() => setHoverCells([])}
            >
              {Array.from({ length: GRID_SIZE }, (_, r) =>
                Array.from({ length: GRID_SIZE }, (_, c) => {
                  const key = `${r},${c}`;
                  const isOccupied = key in occupiedMap;
                  const isHover = hoverSet.has(key);

                  let cellClass =
                    'w-14 h-14 rounded border transition-all duration-100 cursor-pointer flex items-center justify-center ';

                  if (isOccupied && !isHover) {
                    cellClass += 'bg-blue-700/30 border-yellow-400/20 ';
                  } else if (isHover && hoverValid) {
                    cellClass += 'bg-yellow-400/20 border-yellow-400 scale-105 ';
                  } else if (isHover && !hoverValid) {
                    cellClass += 'bg-red-500/30 border-red-400 cursor-not-allowed ';
                  } else {
                    cellClass += 'bg-steel-800/60 border-white/8 hover:bg-white/8 hover:border-yellow-400/20 ';
                  }

                  return (
                    <div
                      key={key}
                      className={cellClass}
                      onMouseEnter={() => handleHover(r, c)}
                      onClick={() => handleClick(r, c)}
                    />
                  );
                })
              )}
            </div>

            {/* Ship SVG overlays */}
            {placedShips.map((ship, si) => {
              const { cells } = ship;
              if (!cells || cells.length === 0) return null;
              const minR = Math.min(...cells.map(([r]) => r));
              const minC = Math.min(...cells.map(([, c]) => c));
              const maxR = Math.max(...cells.map(([r]) => r));
              const maxC = Math.max(...cells.map(([, c]) => c));
              const isH = minR === maxR;
              const size = cells.length;
              const top = 12 + minR * (CELL_PX + GAP_PX);
              const left = 12 + minC * (CELL_PX + GAP_PX);
              const w = isH ? size * CELL_PX + (size - 1) * GAP_PX : CELL_PX;
              const h = isH ? CELL_PX : size * CELL_PX + (size - 1) * GAP_PX;
              return (
                <div
                  key={si}
                  className="ship-overlay"
                  style={{ top, left, width: w, height: h }}
                >
                  <ShipSVG size={size} isHorizontal={isH} />
                </div>
              );
            })}
          </div>

          {/* 操作按鈕 */}
          <div className="flex gap-2 flex-wrap justify-center">
            <button onClick={handleRandomize} className="btn-warning text-sm">
              🎲 一鍵隨機
            </button>
            <button onClick={handleRemoveLast} disabled={placedShips.length === 0} className="btn-ghost text-sm disabled:opacity-40">
              ↩ 撤回
            </button>
            <button onClick={handleReset} disabled={placedShips.length === 0} className="btn-danger text-sm disabled:opacity-40">
              🗑 清除
            </button>
          </div>
        </div>

        {/* 側邊欄：船隻清單 + 準備 */}
        <div className="glass-card p-6 w-64 space-y-5">
          <h3 className="font-bold text-sm text-white/60 uppercase tracking-wider">艦隊清單</h3>
          <div className="space-y-3">
            {SHIPS_TO_PLACE.map((ship, idx) => {
              const isPlaced = idx < placedShips.length;
              const isCurrent = idx === currentShipIdx;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    isPlaced
                      ? 'bg-sky-600/20 border border-sky-500/30'
                      : isCurrent
                      ? 'bg-emerald-500/20 border border-emerald-500/40 animate-pulse'
                      : 'bg-white/5 border border-white/10 opacity-50'
                  }`}
                >
                  <span className="text-lg">{isPlaced ? '✅' : isCurrent ? '👆' : '⬜'}</span>
                  <div>
                    <div className="text-sm font-semibold">{ship.label}</div>
                    <div className="flex gap-0.5 mt-0.5">
                      {Array.from({ length: ship.size }, (_, k) => (
                        <div key={k} className="w-4 h-3 rounded-sm bg-sky-400/60" />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 狀態 */}
          <div className="border-t border-white/10 pt-4 space-y-3">
            {!isAI && opponentReady && !submitted && (
              <div className="text-emerald-400 text-xs text-center animate-pulse">
                ✅ 對手已準備完畢
              </div>
            )}
            {submitted && !isAI ? (
              <div className="text-sky-400 text-sm text-center animate-pulse">
                ⏳ 等待對手佈署...
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!allPlaced || submitted}
                className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {allPlaced ? '✅ 準備好了！' : `還需放 ${SHIP_SIZES.length - currentShipIdx} 艘`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
