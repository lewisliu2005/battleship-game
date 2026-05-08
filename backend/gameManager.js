// gameManager.js - 核心遊戲邏輯

const GRID_SIZE = 5;
const SHIPS_CONFIG = [
  { id: 0, size: 3, count: 1 },
  { id: 1, size: 2, count: 2 },
  { id: 2, size: 1, count: 1 },
];

/**
 * 取得所有需要擺放的船隻清單
 * e.g. [{shipTypeId:0, size:3}, {shipTypeId:1, size:2}, {shipTypeId:1, size:2}, {shipTypeId:2, size:1}]
 */
function getShipList() {
  const list = [];
  SHIPS_CONFIG.forEach((cfg) => {
    for (let i = 0; i < cfg.count; i++) {
      list.push({ size: cfg.size });
    }
  });
  return list;
}

/**
 * 驗證船隻擺放是否合法
 * ships: [{cells: [[r,c], ...]}]
 * 回傳 { valid: bool, reason: string }
 */
function validatePlacement(ships) {
  if (!ships || ships.length !== 4) {
    return { valid: false, reason: '船隻數量不正確，需要 4 艘' };
  }

  const sizes = ships.map((s) => s.cells.length).sort((a, b) => a - b);
  const expected = [1, 2, 2, 3];
  for (let i = 0; i < 4; i++) {
    if (sizes[i] !== expected[i]) {
      return { valid: false, reason: '船隻大小不正確' };
    }
  }

  const occupied = new Set();

  for (const ship of ships) {
    const { cells } = ship;
    // 檢查格子在棋盤內
    for (const [r, c] of cells) {
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
        return { valid: false, reason: '船隻超出棋盤範圍' };
      }
    }

    // 檢查連續性（水平或垂直）
    if (cells.length > 1) {
      const rows = cells.map(([r]) => r);
      const cols = cells.map(([, c]) => c);
      const uniqueRows = [...new Set(rows)];
      const uniqueCols = [...new Set(cols)];
      if (uniqueRows.length > 1 && uniqueCols.length > 1) {
        return { valid: false, reason: '船隻必須水平或垂直放置' };
      }
      if (uniqueRows.length === 1) {
        const sortedCols = [...cols].sort((a, b) => a - b);
        for (let i = 1; i < sortedCols.length; i++) {
          if (sortedCols[i] - sortedCols[i - 1] !== 1) {
            return { valid: false, reason: '船隻格子必須連續' };
          }
        }
      } else {
        const sortedRows = [...rows].sort((a, b) => a - b);
        for (let i = 1; i < sortedRows.length; i++) {
          if (sortedRows[i] - sortedRows[i - 1] !== 1) {
            return { valid: false, reason: '船隻格子必須連續' };
          }
        }
      }
    }

    // 檢查重疊
    for (const [r, c] of cells) {
      const key = `${r},${c}`;
      if (occupied.has(key)) {
        return { valid: false, reason: '船隻重疊' };
      }
      occupied.add(key);
    }
  }

  // 檢查船隻間距（周圍八宮格）
  const shipCells = ships.map((s) => new Set(s.cells.map(([r, c]) => `${r},${c}`)));
  for (let i = 0; i < ships.length; i++) {
    for (const [r, c] of ships[i].cells) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          const key = `${nr},${nc}`;
          for (let j = 0; j < ships.length; j++) {
            if (i !== j && shipCells[j].has(key)) {
              return { valid: false, reason: '船隻之間必須相隔至少一格' };
            }
          }
        }
      }
    }
  }

  return { valid: true };
}

/**
 * 隨機產生合法的船隻擺放
 * 回傳 ships: [{cells: [[r,c],...], shipIndex: number}]
 */
function randomPlacement() {
  const shipSizes = [3, 2, 2, 1];

  function tryPlace() {
    const occupied = new Set();
    const forbidden = new Set(); // occupied + buffer zone
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
          if (nr >= GRID_SIZE || nc >= GRID_SIZE) {
            valid = false;
            break;
          }
          const key = `${nr},${nc}`;
          if (forbidden.has(key)) {
            valid = false;
            break;
          }
          cells.push([nr, nc]);
        }

        if (valid) {
          // 加入佔用與緩衝
          for (const [nr, nc] of cells) {
            occupied.add(`${nr},${nc}`);
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
  while (!result) {
    result = tryPlace();
  }
  return result;
}

/**
 * 取得某艘船周圍需自動標為 miss 的格子
 */
function getSurroundingCells(cells) {
  const cellSet = new Set(cells.map(([r, c]) => `${r},${c}`));
  const surrounding = [];
  for (const [r, c] of cells) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
        const key = `${nr},${nc}`;
        if (!cellSet.has(key)) {
          surrounding.push([nr, nc]);
        }
      }
    }
  }
  // 去重
  const seen = new Set();
  return surrounding.filter(([r, c]) => {
    const k = `${r},${c}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * 建立初始遊戲狀態
 * ships: 雙方的船隻配置
 */
function createGameState(ships0, ships1, firstPlayer) {
  return {
    players: [
      {
        ships: ships0.map((s) => ({ cells: s.cells, sunk: false, shipIndex: s.shipIndex })),
        attacks: [], // [[r,c,'hit'|'miss'|'sunk']]
      },
      {
        ships: ships1.map((s) => ({ cells: s.cells, sunk: false, shipIndex: s.shipIndex })),
        attacks: [],
      },
    ],
    currentTurn: firstPlayer, // 0 or 1
    gameOver: false,
    winner: null,
  };
}

/**
 * 處理攻擊
 * attackerIdx: 0 or 1 (攻擊方)
 * targetIdx: 1 - attackerIdx (被攻擊方)
 * row, col: 攻擊座標
 * 回傳: { result: 'hit'|'miss'|'sunk'|'invalid', autoMissed: [[r,c]], gameOver: bool, winner: 0|1|null, nextTurn: 0|1 }
 */
function processAttack(gameState, attackerIdx, row, col) {
  if (gameState.gameOver) return { result: 'invalid', reason: '遊戲已結束' };
  if (gameState.currentTurn !== attackerIdx) return { result: 'invalid', reason: '不是你的回合' };

  const targetIdx = 1 - attackerIdx;
  const target = gameState.players[targetIdx];

  // 檢查是否已攻擊過
  const alreadyAttacked = target.attacks.some(([r, c]) => r === row && c === col);
  if (alreadyAttacked) return { result: 'invalid', reason: '已攻擊過此格' };

  // 找是否命中
  let hitShipIdx = -1;
  for (let i = 0; i < target.ships.length; i++) {
    if (target.ships[i].sunk) continue;
    for (const [r, c] of target.ships[i].cells) {
      if (r === row && c === col) {
        hitShipIdx = i;
        break;
      }
    }
    if (hitShipIdx !== -1) break;
  }

  let result;
  let autoMissed = [];
  let gameOver = false;
  let winner = null;

  if (hitShipIdx !== -1) {
    // 命中
    target.attacks.push([row, col, 'hit']);

    // 檢查是否擊沉
    const ship = target.ships[hitShipIdx];
    const allHit = ship.cells.every(([r, c]) =>
      target.attacks.some(([ar, ac, type]) => ar === r && ac === c && type === 'hit')
    );

    if (allHit) {
      // 擊沉！
      ship.sunk = true;
      result = 'sunk';

      // 自動標記周圍格為 miss
      const surrounding = getSurroundingCells(ship.cells);
      for (const [sr, sc] of surrounding) {
        const alreadyMarked = target.attacks.some(([r, c]) => r === sr && c === sc);
        if (!alreadyMarked) {
          target.attacks.push([sr, sc, 'auto-miss']);
          autoMissed.push([sr, sc]);
        }
      }

      // 判斷勝負
      const allSunk = target.ships.every((s) => s.sunk);
      if (allSunk) {
        gameOver = true;
        winner = attackerIdx;
        gameState.gameOver = true;
        gameState.winner = attackerIdx;
      }
    } else {
      result = 'hit';
    }

    // 命中或擊沉：攻擊方繼續
    gameState.currentTurn = attackerIdx;
  } else {
    // 未中
    result = 'miss';
    target.attacks.push([row, col, 'miss']);
    // 換人
    gameState.currentTurn = targetIdx;
  }

  return {
    result,
    row,
    col,
    autoMissed,
    gameOver,
    winner,
    nextTurn: gameState.currentTurn,
    // 附帶方便前端顯示的完整攻擊紀錄
    attackerAttacks: gameState.players[targetIdx].attacks,
  };
}

module.exports = {
  GRID_SIZE,
  getShipList,
  validatePlacement,
  randomPlacement,
  createGameState,
  processAttack,
};
