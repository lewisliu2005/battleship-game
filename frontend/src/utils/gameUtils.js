// src/utils/gameUtils.js - 前端共用遊戲工具

export const GRID_SIZE = 5;
export const SHIPS_TO_PLACE = [
  { size: 3, label: '3格艦', shipIdx: 0 },
  { size: 2, label: '2格艦 (1)', shipIdx: 1 },
  { size: 2, label: '2格艦 (2)', shipIdx: 2 },
  { size: 1, label: '1格艦', shipIdx: 3 },
];

/**
 * 建立空的 5x5 棋盤
 */
export function createEmptyGrid() {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({ state: 'water', shipIdx: -1 }))
  );
}

/**
 * 把 ships 陣列渲染到 grid 上
 */
export function shipsToGrid(ships) {
  const grid = createEmptyGrid();
  ships.forEach((ship, idx) => {
    ship.cells.forEach(([r, c]) => {
      if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
        grid[r][c] = { state: 'ship', shipIdx: idx };
      }
    });
  });
  return grid;
}

/**
 * 把攻擊紀錄覆蓋到 grid 上（對手視角）
 */
export function applyAttacks(grid, attacks) {
  const newGrid = grid.map((row) => row.map((cell) => ({ ...cell })));
  (attacks || []).forEach(([r, c, type]) => {
    if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
      newGrid[r][c].attackState = type;
    }
  });
  return newGrid;
}

/**
 * 前端驗證擺放合法性（即時反饋）
 */
export function validatePlacementFE(ships) {
  if (!ships || ships.length === 0) return true;

  const occupied = new Set();
  const forbidden = new Set();

  for (const ship of ships) {
    for (const [r, c] of ship.cells) {
      const key = `${r},${c}`;
      if (forbidden.has(key)) return false;
      occupied.add(key);
    }
    // 加緩衝
    for (const [r, c] of ship.cells) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          forbidden.add(`${r + dr},${c + dc}`);
        }
      }
    }
  }

  return true;
}

/**
 * 前端隨機擺放（與後端邏輯相同）
 */
export function randomPlacementFE() {
  const shipSizes = [3, 2, 2, 1];

  function tryPlace() {
    const forbidden = new Set();
    const ships = [];

    for (let si = 0; si < shipSizes.length; si++) {
      const size = shipSizes[si];
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < 200) {
        attempts++;
        const isHorizontal = Math.random() < 0.5;
        const r = Math.floor(Math.random() * GRID_SIZE);
        const c = Math.floor(Math.random() * GRID_SIZE);

        const cells = [];
        let valid = true;

        for (let k = 0; k < size; k++) {
          const nr = isHorizontal ? r : r + k;
          const nc = isHorizontal ? c + k : c;
          if (nr >= GRID_SIZE || nc >= GRID_SIZE) { valid = false; break; }
          if (forbidden.has(`${nr},${nc}`)) { valid = false; break; }
          cells.push([nr, nc]);
        }

        if (valid) {
          for (const [nr, nc] of cells) {
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                forbidden.add(`${nr + dr},${nc + dc}`);
              }
            }
          }
          ships.push({ cells, shipIndex: si });
          placed = true;
        }
      }

      if (!placed) return null;
    }

    return ships;
  }

  let result = null;
  while (!result) result = tryPlace();
  return result;
}
