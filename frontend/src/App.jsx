// src/App.jsx - 主狀態機
import { useState, useEffect, useCallback, useRef } from 'react';
import socket from './socket';
import LobbyScreen from './components/LobbyScreen';
import PlacementScreen from './components/PlacementScreen';
import BattleScreen from './components/BattleScreen';
import ResultScreen from './components/ResultScreen';
import AudioControls from './components/AudioControls';
import { startBGM } from './utils/audioEngine';

const PHASE = {
  LOBBY: 'LOBBY',
  WAITING_ROOM: 'WAITING_ROOM',  // 建立房間後等對手加入
  PLACEMENT: 'PLACEMENT',
  BATTLE: 'BATTLE',
  RESULT: 'RESULT',
};

export default function App() {
  const [phase, setPhase] = useState(PHASE.LOBBY);
  const [mode, setMode] = useState(null);            // 'quick' | 'pvp' | 'ai'
  const [aiDifficulty, setAiDifficulty] = useState(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [playerIdx, setPlayerIdx] = useState(null);
  const [opponentReady, setOpponentReady] = useState(false);
  const [myPlacedShips, setMyPlacedShips] = useState(null);

  // 戰鬥狀態
  const [gameState, setGameState] = useState(null);
  const [lastEvent, setLastEvent] = useState(null);
  const [isWinner, setIsWinner] = useState(false);

  // BGM 首次互動後啟動
  useEffect(() => {
    const handleFirst = () => {
      startBGM();
      window.removeEventListener('click', handleFirst);
      window.removeEventListener('keydown', handleFirst);
    };
    window.addEventListener('click', handleFirst);
    window.addEventListener('keydown', handleFirst);
    return () => {
      window.removeEventListener('click', handleFirst);
      window.removeEventListener('keydown', handleFirst);
    };
  }, []);

  // ── 通知顯示 ──────────────────────────────────────
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Socket 事件監聽 ───────────────────────────────
  useEffect(() => {
    // 快速配對：進入等待
    socket.on('waiting', () => {
      setWaitingForOpponent(true);
    });

    // 配對成功（快速 or 房號）
    socket.on('matched', ({ roomCode: code, playerIdx: idx }) => {
      setRoomCode(code);
      setPlayerIdx(idx);
      setWaitingForOpponent(false);
      setMode('pvp');
      setPhase(PHASE.PLACEMENT);
      showToast('🎉 配對成功！請佈署艦隊', 'success');
    });

    // 建立房間成功
    socket.on('room_created', ({ roomCode: code, playerIdx: idx }) => {
      setRoomCode(code);
      setPlayerIdx(idx);
      setMode('pvp');
      setPhase(PHASE.WAITING_ROOM);
    });

    // 加入房間成功
    socket.on('joined_room', ({ roomCode: code, playerIdx: idx }) => {
      setRoomCode(code);
      setPlayerIdx(idx);
      setMode('pvp');
      setPhase(PHASE.PLACEMENT);
      showToast('🔑 成功加入房間！', 'success');
    });

    // 對手加入
    socket.on('opponent_joined', () => {
      setPhase(PHASE.PLACEMENT);
      showToast('👤 對手已加入！請佈署艦隊', 'success');
    });

    // 加入錯誤
    socket.on('join_error', ({ message }) => {
      showToast(`❌ ${message}`, 'error');
    });

    // 擺放成功
    socket.on('placement_ok', () => {
      showToast('✅ 艦隊佈署完成，等待對手...', 'info');
    });

    // 擺放錯誤
    socket.on('placement_error', ({ message }) => {
      showToast(`❌ ${message}`, 'error');
    });

    // 對手已準備
    socket.on('opponent_ready', () => {
      setOpponentReady(true);
      showToast('✅ 對手已完成佈署', 'info');
    });

    // 遊戲開始
    socket.on('game_start', ({ firstPlayer }) => {
      setPhase(PHASE.BATTLE);
      showToast(`🚀 戰鬥開始！${firstPlayer === playerIdx ? '你先手！' : '對手先手'}`, 'success');
    });

    // 遊戲狀態更新
    socket.on('game_update', (state) => {
      setGameState(state);
      if (state.gameOver) {
        setTimeout(() => {
          setIsWinner(state.winner === state.myIdx);
          setPhase(PHASE.RESULT);
        }, 1200);
      }
    });

    // 攻擊結果（雙方通用）
    socket.on('attack_result', (result) => {
      setLastEvent({
        type: result.result,
        row: result.row,
        col: result.col,
        attackerIdx: result.attackerIdx,
      });
    });

    // AI 攻擊
    socket.on('ai_attack', (result) => {
      setLastEvent({
        type: result.result,
        row: result.row,
        col: result.col,
        attackerIdx: 1, // AI 是 player 1
      });
    });

    // AI 遊戲開始
    socket.on('ai_game_start', ({ firstPlayer }) => {
      setPhase(PHASE.BATTLE);
      showToast(`🤖 挑戰 AI！${firstPlayer === 0 ? '你先手！' : 'AI 先手！'}`, 'success');
    });

    // 對手斷線
    socket.on('opponent_disconnected', () => {
      showToast('💔 對手已斷線', 'error');
      setTimeout(() => resetToLobby(), 2000);
    });

    return () => {
      socket.off('waiting');
      socket.off('matched');
      socket.off('room_created');
      socket.off('joined_room');
      socket.off('opponent_joined');
      socket.off('join_error');
      socket.off('placement_ok');
      socket.off('placement_error');
      socket.off('opponent_ready');
      socket.off('game_start');
      socket.off('game_update');
      socket.off('attack_result');
      socket.off('ai_attack');
      socket.off('ai_game_start');
      socket.off('opponent_disconnected');
    };
  }, [playerIdx, showToast]);

  // ── 模式選擇 ─────────────────────────────────────
  const handleModeSelect = useCallback(({ mode: m, roomCode: rc, difficulty }) => {
    if (m === 'quick') {
      setMode('quick');
      socket.emit('quick_match');
    } else if (m === 'create_room') {
      socket.emit('create_room');
    } else if (m === 'join_room') {
      socket.emit('join_room', { roomCode: rc });
    } else if (m === 'ai') {
      setMode('ai');
      setAiDifficulty(difficulty);
      setPlayerIdx(0);
      setPhase(PHASE.PLACEMENT);
    }
  }, []);

  // ── 取消等待 ─────────────────────────────────────
  const handleCancelQueue = useCallback(() => {
    socket.emit('cancel_queue');
    setWaitingForOpponent(false);
  }, []);

  // ── 佈署完成 ─────────────────────────────────────
  const handleReady = useCallback((ships) => {
    setMyPlacedShips(ships);
    if (mode === 'ai') {
      socket.emit('start_ai_game', { playerShips: ships, difficulty: aiDifficulty });
    } else {
      socket.emit('submit_placement', { ships });
    }
  }, [mode, aiDifficulty]);

  // ── 攻擊 ────────────────────────────────────────
  const handleAttack = useCallback((row, col) => {
    if (mode === 'ai') {
      socket.emit('ai_attack_player', { row, col });
    } else {
      socket.emit('attack', { row, col });
    }
  }, [mode]);

  // ── 重置到大廳 ──────────────────────────────────
  const resetToLobby = useCallback(() => {
    setPhase(PHASE.LOBBY);
    setMode(null);
    setAiDifficulty(null);
    setWaitingForOpponent(false);
    setRoomCode('');
    setPlayerIdx(null);
    setOpponentReady(false);
    setMyPlacedShips(null);
    setGameState(null);
    setLastEvent(null);
    setIsWinner(false);
  }, []);

  // ── 退出遊戲 ────────────────────────────────────
  const handleLeaveGame = useCallback(() => {
    socket.emit('leave_game');
    resetToLobby();
  }, [resetToLobby]);

  // ── 再來一局 ────────────────────────────────────
  const handlePlayAgain = useCallback(() => {
    if (mode === 'ai') {
      setGameState(null);
      setLastEvent(null);
      setMyPlacedShips(null);
      setOpponentReady(false);
      setPhase(PHASE.PLACEMENT);
    } else {
      resetToLobby();
    }
  }, [mode, resetToLobby]);

  // ── 渲染 ─────────────────────────────────────────
  return (
    <div className="wave-bg min-h-screen">
      {/* Toast 通知 */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl backdrop-blur-sm transition-all duration-300 ${
          toast.type === 'success' ? 'bg-emerald-500/90 text-white' :
          toast.type === 'error' ? 'bg-red-600/90 text-white' :
          'bg-navy-700/90 text-white border border-white/20'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* 等待房號頁 */}
      {phase === PHASE.WAITING_ROOM && (
        <div className="min-h-screen flex items-center justify-center">
          <div className="glass-card p-8 text-center space-y-5 max-w-sm w-full mx-4">
            <div className="text-5xl animate-bounce">🔑</div>
            <h2 className="text-xl font-bold">房間已建立！</h2>
            <p className="text-white/50 text-sm">把這組房號分享給你的朋友</p>
            <div className="bg-navy-700 border border-ocean-500/50 rounded-2xl px-8 py-4">
              <div className="text-4xl font-black tracking-[0.4em] text-ocean-400">{roomCode}</div>
            </div>
            <div className="flex gap-1 justify-center text-white/40">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2 h-2 bg-ocean-400/60 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
              <span className="ml-2 text-xs">等待對手加入...</span>
            </div>
            <button onClick={resetToLobby} className="btn-ghost text-sm w-full">
              取消
            </button>
          </div>
        </div>
      )}

      {phase === PHASE.LOBBY && (
        <LobbyScreen
          onModeSelect={handleModeSelect}
          waitingForOpponent={waitingForOpponent}
          onCancelQueue={handleCancelQueue}
        />
      )}

      {phase === PHASE.PLACEMENT && (
        <PlacementScreen
          onReady={handleReady}
          roomCode={roomCode}
          playerIdx={playerIdx}
          isAI={mode === 'ai'}
          aiDifficulty={aiDifficulty}
          opponentReady={opponentReady}
          onLeave={handleLeaveGame}
        />
      )}

      {phase === PHASE.BATTLE && gameState && (
        <BattleScreen
          myShips={gameState.myShips}
          myAttacksReceived={gameState.myAttacksReceived}
          myAttacksDone={gameState.myAttacksDone}
          oppShips={gameState.oppShips}
          currentTurn={gameState.currentTurn}
          myIdx={gameState.myIdx ?? playerIdx ?? 0}
          isAI={mode === 'ai'}
          aiDifficulty={aiDifficulty}
          onAttack={handleAttack}
          gameOver={gameState.gameOver}
          winner={gameState.winner}
          lastEvent={lastEvent}
          onLeave={handleLeaveGame}
        />
      )}

      {phase === PHASE.RESULT && gameState && (
        <ResultScreen
          isWinner={isWinner}
          myShips={gameState.myShips}
          myAttacksReceived={gameState.myAttacksReceived}
          myAttacksDone={gameState.myAttacksDone}
          oppShips={gameState.oppShips}
          onPlayAgain={handlePlayAgain}
          onLobby={resetToLobby}
          isAI={mode === 'ai'}
          aiDifficulty={aiDifficulty}
        />
      )}
    </div>
    <AudioControls />
  );
}
