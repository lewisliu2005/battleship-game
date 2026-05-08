// aiEngine.js - AI 攻擊策略

const GRID_SIZE = 5;

function getAllCells() {
  const cells = [];
  for (let r = 0; r < GRID_SIZE; r++)
    for (let c = 0; c < GRID_SIZE; c++)
      cells.push([r, c]);
  return cells;
}

/**
 * 取得尚未攻擊的格子
 */
function getUnattacked(attacks) {
  const attacked = new Set(attacks.map(([r, c]) => `${r},${c}`));
  return getAllCells().filter(([r, c]) => !attacked.has(`${r},${c}`));
}

/**
 * 簡單模式：完全隨機
 */
function easyAI(aiState) {
  const unattacked = getUnattacked(aiState.attacks);
  if (unattacked.length === 0) return null;
  return unattacked[Math.floor(Math.random() * unattacked.length)];
}

/**
 * 困難模式：Hunt & Target
 * - Hunt: 棋盤格交錯（checkerboard）隨機選
 * - Target: 命中後沿直線追擊
 */
function hardAI(aiState) {
  const attacks = aiState.attacks;
  const attackedSet = new Set(attacks.map(([r, c]) => `${r},${c}`));
  const unattacked = getUnattacked(attacks);
  if (unattacked.length === 0) return null;

  // 找到所有命中但還沒擊沉的格子
  const hits = attacks.filter(([, , type]) => type === 'hit');

  if (hits.length > 0) {
    // Target 模式：找有命中的格子，攻擊相鄰
    // 如果已有兩個命中確定方向，沿方向延伸
    if (hits.length >= 2) {
      // 找出同一直線的命中群組
      const groups = findHitGroups(hits);
      for (const group of groups) {
        const targets = getLineTargets(group, attackedSet);
        if (targets.length > 0) {
          return targets[Math.floor(Math.random() * targets.length)];
        }
      }
    }

    // 只有一個命中或沒有直線延伸，攻擊命中格周圍
    const candidates = [];
    for (const [hr, hc] of hits) {
      const neighbors = [
        [hr - 1, hc], [hr + 1, hc], [hr, hc - 1], [hr, hc + 1],
      ];
      for (const [nr, nc] of neighbors) {
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
          if (!attackedSet.has(`${nr},${nc}`)) {
            candidates.push([nr, nc]);
          }
        }
      }
    }
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
  }

  // Hunt 模式：棋盤格交錯優先
  const checkerboard = unattacked.filter(([r, c]) => (r + c) % 2 === 0);
  const pool = checkerboard.length > 0 ? checkerboard : unattacked;
  return pool[Math.floor(Math.random() * pool.length)];
}

function findHitGroups(hits) {
  // 找出所有水平/垂直相連的命中群組
  const groups = [];
  const used = new Set();

  for (const [r, c] of hits) {
    const key = `${r},${c}`;
    if (used.has(key)) continue;

    // 找水平鄰居
    const hGroup = [[r, c]];
    used.add(key);
    for (const [hr, hc] of hits) {
      if (hr === r && !used.has(`${hr},${hc}`)) {
        hGroup.push([hr, hc]);
        used.add(`${hr},${hc}`);
      }
    }
    if (hGroup.length > 1) {
      groups.push(hGroup);
      continue;
    }

    // 找垂直鄰居
    const vGroup = [[r, c]];
    for (const [vr, vc] of hits) {
      if (vc === c && !used.has(`${vr},${vc}`)) {
        vGroup.push([vr, vc]);
        used.add(`${vr},${vc}`);
      }
    }
    if (vGroup.length > 1) {
      groups.push(vGroup);
    } else {
      groups.push([[r, c]]);
    }
  }

  return groups;
}

function getLineTargets(group, attackedSet) {
  if (group.length === 0) return [];
  const rows = group.map(([r]) => r);
  const cols = group.map(([, c]) => c);
  const isHorizontal = new Set(rows).size === 1;
  const targets = [];

  if (isHorizontal) {
    const r = rows[0];
    const minC = Math.min(...cols);
    const maxC = Math.max(...cols);
    if (minC - 1 >= 0 && !attackedSet.has(`${r},${minC - 1}`)) targets.push([r, minC - 1]);
    if (maxC + 1 < GRID_SIZE && !attackedSet.has(`${r},${maxC + 1}`)) targets.push([r, maxC + 1]);
  } else {
    const c = cols[0];
    const minR = Math.min(...rows);
    const maxR = Math.max(...rows);
    if (minR - 1 >= 0 && !attackedSet.has(`${minR - 1},${c}`)) targets.push([minR - 1, c]);
    if (maxR + 1 < GRID_SIZE && !attackedSet.has(`${maxR + 1},${c}`)) targets.push([maxR + 1, c]);
  }

  return targets;
}

/**
 * Boss 模式：機率密度圖
 * 對每個未攻擊格子計算船隻可能覆蓋次數，攻擊機率最高的格子
 */
function bossAI(aiState, remainingShips) {
  const attacks = aiState.attacks;
  const attackedSet = new Set(attacks.map(([r, c]) => `${r},${c}`));
  const missSet = new Set(
    attacks.filter(([, , t]) => t === 'miss' || t === 'auto-miss').map(([r, c]) => `${r},${c}`)
  );
  const hitSet = new Set(
    attacks.filter(([, , t]) => t === 'hit').map(([r, c]) => `${r},${c}`)
  );
  const unattacked = getUnattacked(attacks);
  if (unattacked.length === 0) return null;

  // 如果有命中格，先用 Target 邏輯（Boss 也不浪費）
  const hits = attacks.filter(([, , t]) => t === 'hit');
  if (hits.length > 0) {
    const groups = findHitGroups(hits);
    for (const group of groups) {
      const targets = getLineTargets(group, attackedSet);
      if (targets.length > 0) {
        // Boss 從 targets 中選機率最高的
        const scored = targets.map(([r, c]) => {
          return { r, c, score: computeProbability(r, c, remainingShips, missSet, hitSet) };
        });
        scored.sort((a, b) => b.score - a.score);
        return [scored[0].r, scored[0].c];
      }
    }
    // 攻擊命中格周圍機率最高的
    const candidates = [];
    for (const [hr, hc] of hits) {
      const neighbors = [
        [hr - 1, hc], [hr + 1, hc], [hr, hc - 1], [hr, hc + 1],
      ];
      for (const [nr, nc] of neighbors) {
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && !attackedSet.has(`${nr},${nc}`)) {
          candidates.push([nr, nc]);
        }
      }
    }
    if (candidates.length > 0) {
      const scored = candidates.map(([r, c]) => ({
        r, c, score: computeProbability(r, c, remainingShips, missSet, hitSet),
      }));
      scored.sort((a, b) => b.score - a.score);
      return [scored[0].r, scored[0].c];
    }
  }

  // Hunt 模式：機率密度圖
  const probMap = {};
  for (const [r, c] of unattacked) {
    probMap[`${r},${c}`] = computeProbability(r, c, remainingShips, missSet, hitSet);
  }

  let best = null;
  let bestScore = -1;
  for (const [r, c] of unattacked) {
    const score = probMap[`${r},${c}`];
    if (score > bestScore) {
      bestScore = score;
      best = [r, c];
    }
  }

  return best;
}

/**
 * 計算某格被剩餘船隻覆蓋的機率分數
 */
function computeProbability(r, c, remainingShips, missSet, hitSet) {
  let score = 0;
  for (const size of remainingShips) {
    // 水平放置
    for (let startC = c - size + 1; startC <= c; startC++) {
      let valid = true;
      const cells = [];
      for (let k = 0; k < size; k++) {
        const nc = startC + k;
        if (nc < 0 || nc >= GRID_SIZE || missSet.has(`${r},${nc}`)) {
          valid = false;
          break;
        }
        cells.push([r, nc]);
      }
      if (valid) score++;
    }
    // 垂直放置
    for (let startR = r - size + 1; startR <= r; startR++) {
      let valid = true;
      for (let k = 0; k < size; k++) {
        const nr = startR + k;
        if (nr < 0 || nr >= GRID_SIZE || missSet.has(`${nr},${c}`)) {
          valid = false;
          break;
        }
      }
      if (valid) score++;
    }
  }
  return score;
}

/**
 * 主入口：依難度回傳攻擊座標
 * difficulty: 'easy' | 'hard' | 'boss'
 * aiState: { attacks: [[r,c,type],...] }
 * remainingShips: [size,...] 剩餘未擊沉船隻大小清單
 */
function getAIMove(difficulty, aiState, remainingShips) {
  switch (difficulty) {
    case 'easy': return easyAI(aiState);
    case 'hard': return hardAI(aiState);
    case 'boss': return bossAI(aiState, remainingShips);
    default: return easyAI(aiState);
  }
}

module.exports = { getAIMove };
