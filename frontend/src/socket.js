// src/socket.js - Socket.io 單例
// VITE_BACKEND_URL 由環境變數注入：
//   本地開發 (.env.local)  → http://localhost:3001
//   Vercel 部署            → 填入 Render 給的網址
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const socket = io(BACKEND_URL, {
  autoConnect: true,
  reconnection: true,
  transports: ['websocket', 'polling'],
});

export default socket;
