// server.js - Socket.io 伺服器

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const {
  validatePlacement,
  randomPlacement,
  createGameState,
  processAttack,
} = require('./gameManager');
const { getAIMove } = require('./aiEngine');

const app = express();
app.use(cors());
// 健康檢查端點（Render 需要）
app.get('/', (req, res) => res.send('🚢 海戰棋伺服器運行中'));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});

const PORT = process.env.PORT || 3001;

// ── 資料結構 ──────────────────────────────────────────
let waitingQueue = null; // 等待快速配對的 socket
const rooms = new Map(); // roomCode -> { players: [socket, socket?], state, ready: [bool,bool], ships: [ships,ships] }

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  } while (rooms.has(code));
  return code;
}

// ── 輔助函數 ─────────────────────────────────────────
function getRemainingShipSizes(gameState, playerIdx) {
  return gameState.players[playerIdx].ships
    .filter((s) => !s.sunk)
    .map((s) => s.cells.length);
}

function startTurnTimer(room, code, isAI = false, socket = null) {
  if (room.timerId) clearTimeout(room.timerId);
  if (room.state && !room.state.gameOver) {
    const timeLimit = (room.turnTime || 20) * 1000;
    room.turnDeadline = Date.now() + timeLimit;
    
    room.timerId = setTimeout(() => {
      // 沒收回合換對方攻擊
      room.state.currentTurn = 1 - room.state.currentTurn;
      
      if (isAI && socket) {
        // AI 房間
        socket.emit('game_update', {
          myShips: room.state.players[0].ships,
          myAttacksReceived: room.state.players[0].attacks,
          myAttacksDone: room.state.players[1].attacks,
          oppShips: null,
          currentTurn: room.state.currentTurn,
          gameOver: room.state.gameOver,
          winner: room.state.winner,
          myIdx: 0,
          turnDeadline: room.turnDeadline // 下一個回合的時間戳記會被覆蓋，這裡只是廣播
        });
        if (room.state.currentTurn === 1) {
          setTimeout(() => doAIMove(socket, room), 800);
        } else {
          startTurnTimer(room, code, true, socket); // 輪回玩家，重新計時
        }
      } else {
        // PvP 房間
        io.to(code).emit('turn_skipped', { missedPlayer: 1 - room.state.currentTurn });
        startTurnTimer(room, code);
        emitGameState(room, code);
      }
    }, timeLimit);
  }
}

function emitGameState(room, roomCode) {
  const { players, state } = room;

  // 對每個玩家發送自己的視角
  players.forEach((socket, idx) => {
    if (!socket) return;
    const oppIdx = 1 - idx;

    // 自己的船隻（完整資訊）
    const myShips = state.players[idx].ships;
    // 對手的攻擊紀錄（我被打的情況）
    const myAttacksReceived = state.players[idx].attacks;
    // 我對對手的攻擊紀錄
    const myAttacksDone = state.players[oppIdx].attacks;
    // 對手還活著的船隻（遊戲結束才揭露）
    const oppShips = state.gameOver ? state.players[oppIdx].ships : null;

    socket.emit('game_update', {
      myShips,
      myAttacksReceived,
      myAttacksDone,
      oppShips,
      currentTurn: state.currentTurn,
      gameOver: state.gameOver,
      winner: state.winner,
      myIdx: idx,
      turnDeadline: room.turnDeadline,
    });
  });
}

function startPlacementTimer(room, code) {
  if (room.placementTimerId) clearTimeout(room.placementTimerId);
  room.placementTimerId = setTimeout(() => {
    // If placement takes more than 45s, kick both players to lobby
    if (room && (!room.ready[0] || !room.ready[1])) {
      room.players.forEach(p => {
        if (p) {
          p.emit('opponent_disconnected');
          p.leave(code);
          p.roomCode = null;
          p.playerIdx = null;
        }
      });
      rooms.delete(code);
    }
  }, 45000);
}

// ── AI 遊戲房間 ────────────────────────────────────────
// aiRooms: socketId -> { state, difficulty, playerShips, aiShips }
const aiRooms = new Map();

function doAIMove(socket, aiRoom) {
  const { state, difficulty } = aiRoom;
  if (state.gameOver || state.currentTurn !== 1) return;

  // AI 的攻擊紀錄（對玩家的攻擊 = players[0].attacks）
  const aiAttackState = { attacks: state.players[0].attacks };
  const remainingShips = getRemainingShipSizes(state, 0);

  const move = getAIMove(difficulty, aiAttackState, remainingShips);
  if (!move) return;

  const [row, col] = move;
  const result = processAttack(state, 1, row, col);

  socket.emit('ai_attack', { row, col, ...result });

  // 每次 AI 攻擊完，必須發送完整的遊戲狀態給前端，讓前端切換回合
  socket.emit('game_update', {
    myShips: state.players[0].ships,
    myAttacksReceived: state.players[0].attacks,
    myAttacksDone: state.players[1].attacks,
    oppShips: state.gameOver ? state.players[1].ships : null,
    currentTurn: state.currentTurn,
    gameOver: state.gameOver,
    winner: state.winner,
    myIdx: 0,
    turnDeadline: aiRoom.turnDeadline,
  });

  if (!state.gameOver && state.currentTurn === 1) {
    // AI 命中，繼續攻擊（稍微延遲模擬思考）
    setTimeout(() => doAIMove(socket, aiRoom), 800);
  } else if (!state.gameOver && state.currentTurn === 0) {
    startTurnTimer(aiRoom, socket.id, true, socket);
  }
}

// ── Socket 事件 ───────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[連線] ${socket.id}`);

  // ── 快速配對 ──
  socket.on('quick_match', () => {
    if (waitingQueue && waitingQueue.id !== socket.id) {
      const opponent = waitingQueue;
      waitingQueue = null;
      const code = generateRoomCode();
      const room = {
        players: [opponent, socket],
        state: null,
        ready: [false, false],
        ships: [null, null],
        type: 'pvp',
        turnTime: 20,
      };
      rooms.set(code, room);
      opponent.roomCode = code;
      socket.roomCode = code;
      opponent.playerIdx = 0;
      socket.playerIdx = 1;
      opponent.join(code);
      socket.join(code);
      opponent.emit('matched', { roomCode: code, playerIdx: 0 });
      socket.emit('matched', { roomCode: code, playerIdx: 1 });
      startPlacementTimer(room, code);
    } else {
      waitingQueue = socket;
      socket.emit('waiting');
    }
  });

  // ── 建立房間 ──
  socket.on('create_room', ({ turnTime } = {}) => {
    const code = generateRoomCode();
    const room = {
      players: [socket, null],
      state: null,
      ready: [false, false],
      ships: [null, null],
      type: 'pvp',
      turnTime: turnTime || 20,
    };
    rooms.set(code, room);
    socket.roomCode = code;
    socket.playerIdx = 0;
    socket.join(code);
    socket.emit('room_created', { roomCode: code, playerIdx: 0 });
  });

  // ── 加入房間 ──
  socket.on('join_room', ({ roomCode }) => {
    const code = roomCode.toUpperCase();
    const room = rooms.get(code);
    if (!room) return socket.emit('join_error', { message: '房間不存在' });
    if (room.players[1]) return socket.emit('join_error', { message: '房間已滿' });

    room.players[1] = socket;
    socket.roomCode = code;
    socket.playerIdx = 1;
    socket.join(code);
    socket.emit('joined_room', { roomCode: code, playerIdx: 1 });
    room.players[0].emit('opponent_joined');
    startPlacementTimer(room, code);
  });

  // ── 取消等待 ──
  socket.on('cancel_queue', () => {
    if (waitingQueue && waitingQueue.id === socket.id) waitingQueue = null;
  });

  // ── 提交船隻擺放 ──
  socket.on('submit_placement', ({ ships }) => {
    const validation = validatePlacement(ships);
    if (!validation.valid) {
      return socket.emit('placement_error', { message: validation.reason });
    }

    const code = socket.roomCode;
    const room = rooms.get(code);
    if (!room) return;

    const idx = socket.playerIdx;
    room.ships[idx] = ships;
    room.ready[idx] = true;

    socket.emit('placement_ok');

    // 通知對手自己已準備
    const opp = room.players[1 - idx];
    if (opp) opp.emit('opponent_ready');

    // 雙方都準備好了
    if (room.ready[0] && room.ready[1]) {
      if (room.placementTimerId) clearTimeout(room.placementTimerId);
      const firstPlayer = Math.random() < 0.5 ? 0 : 1;
      room.state = createGameState(room.ships[0], room.ships[1], firstPlayer);
      startTurnTimer(room, code);
      io.to(code).emit('game_start', { firstPlayer });
      emitGameState(room, code);
    }
  });

  // ── 取消船隻擺放 ──
  socket.on('cancel_placement', () => {
    const code = socket.roomCode;
    const room = rooms.get(code);
    if (!room || room.state) return; // 已經開始遊戲則無法取消

    const idx = socket.playerIdx;
    room.ready[idx] = false;
    room.ships[idx] = null;

    socket.emit('placement_canceled');

    // 通知對手自己取消準備
    const opp = room.players[1 - idx];
    if (opp) opp.emit('opponent_unready');
  });

  // ── 攻擊 ──
  socket.on('attack', ({ row, col }) => {
    const code = socket.roomCode;
    const room = rooms.get(code);
    if (!room || !room.state) return;

    const idx = socket.playerIdx;
    const result = processAttack(room.state, idx, row, col);

    if (result.result === 'invalid') {
      return socket.emit('attack_error', { message: result.reason });
    }

    io.to(code).emit('attack_result', { attackerIdx: idx, ...result });

    // 每次玩家攻擊完，必須發送完整的遊戲狀態給雙方，更新回合
    if (!room.state.gameOver) {
      startTurnTimer(room, code);
    } else {
      if (room.timerId) clearTimeout(room.timerId);
    }
    emitGameState(room, code);
  });

  // ── AI 模式：開始 ──
  socket.on('start_ai_game', ({ playerShips, difficulty }) => {
    const validation = validatePlacement(playerShips);
    if (!validation.valid) {
      return socket.emit('placement_error', { message: validation.reason });
    }

    const aiShips = randomPlacement();
    const firstPlayer = Math.random() < 0.5 ? 0 : 1;
    const state = createGameState(playerShips, aiShips, firstPlayer);

    const aiRoom = { state, difficulty, aiShips, turnTime: 20 };
    aiRooms.set(socket.id, aiRoom);
    
    startTurnTimer(aiRoom, socket.id, true, socket);

    socket.emit('ai_game_start', {
      firstPlayer,
      aiShips: null, // 不揭露 AI 船隻
    });

    socket.emit('game_update', {
      myShips: state.players[0].ships,
      myAttacksReceived: state.players[0].attacks,
      myAttacksDone: state.players[1].attacks,
      oppShips: null,
      currentTurn: state.currentTurn,
      gameOver: false,
      winner: null,
      myIdx: 0,
    });

    if (firstPlayer === 1) {
      // AI 先手
      setTimeout(() => doAIMove(socket, aiRoom), 1000);
    }
  });

  // ── AI 模式：玩家攻擊 ──
  socket.on('ai_attack_player', ({ row, col }) => {
    const aiRoom = aiRooms.get(socket.id);
    if (!aiRoom) return;
    const { state } = aiRoom;
    if (state.gameOver || state.currentTurn !== 0) return;

    const result = processAttack(state, 0, row, col);
    if (result.result === 'invalid') return socket.emit('attack_error', { message: result.reason });

    socket.emit('attack_result', { attackerIdx: 0, ...result });

    if (state.gameOver) {
      if (aiRoom.timerId) clearTimeout(aiRoom.timerId);
    } else {
      startTurnTimer(aiRoom, socket.id, true, socket);
    }

    // 更新遊戲狀態給玩家
    socket.emit('game_update', {
      myShips: state.players[0].ships,
      myAttacksReceived: state.players[0].attacks,
      myAttacksDone: state.players[1].attacks,
      oppShips: state.gameOver ? state.players[1].ships : null,
      currentTurn: state.currentTurn,
      gameOver: state.gameOver,
      winner: state.winner,
      myIdx: 0,
      turnDeadline: aiRoom.turnDeadline,
    });

    if (!state.gameOver && state.currentTurn === 1) {
      setTimeout(() => {
        doAIMove(socket, aiRoom);
        // 更新玩家視角
        socket.emit('game_update', {
          myShips: state.players[0].ships,
          myAttacksReceived: state.players[0].attacks,
          myAttacksDone: state.players[1].attacks,
          oppShips: state.gameOver ? state.players[1].ships : null,
          currentTurn: state.currentTurn,
          gameOver: state.gameOver,
          winner: state.winner,
          myIdx: 0,
        });
      }, 600);
    }
  });

  // ── 再來一局 ──
  socket.on('rematch', () => {
    const code = socket.roomCode;
    const room = rooms.get(code);
    if (!room) return;
    if (room.state && room.state.gameOver) {
      if (room.timerId) clearTimeout(room.timerId);
      room.state = null;
      room.ready = [false, false];
      room.ships = [null, null];
      startPlacementTimer(room, code);
    }
    // 不用發送事件，因為雙方前端按下再來一局後都會自行回到 PLACEMENT 畫面
  });

  // ── 請求隨機擺放 ──
  socket.on('request_random_placement', () => {
    const ships = randomPlacement();
    socket.emit('random_placement', { ships });
  });

  // ── 退出遊戲 ──
  socket.on('leave_game', () => {
    aiRooms.delete(socket.id);
    const code = socket.roomCode;
    if (code) {
      const room = rooms.get(code);
      if (room) {
        if (room.placementTimerId) clearTimeout(room.placementTimerId);
        const oppIdx = 1 - socket.playerIdx;
        const opp = room.players[oppIdx];
        if (opp) opp.emit('opponent_disconnected');
        rooms.delete(code);
      }
      socket.leave(code);
      socket.roomCode = null;
      socket.playerIdx = null;
    }
  });

  // ── 斷線處理 ──
  socket.on('disconnect', () => {
    console.log(`[斷線] ${socket.id}`);
    if (waitingQueue && waitingQueue.id === socket.id) waitingQueue = null;
    aiRooms.delete(socket.id);

    const code = socket.roomCode;
    if (code) {
      const room = rooms.get(code);
      if (room) {
        if (room.placementTimerId) clearTimeout(room.placementTimerId);
        const oppIdx = 1 - socket.playerIdx;
        const opp = room.players[oppIdx];
        if (opp) opp.emit('opponent_disconnected');
        rooms.delete(code);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚢 海戰棋伺服器啟動於 http://localhost:${PORT}`);
});
