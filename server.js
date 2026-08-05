import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { get as httpGet, request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { URL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());

// Serve the built React app
app.use(express.static(path.join(__dirname, 'dist')));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// ─── Radio Stream Proxy ───────────────────────────────────────────────────────
// Streams Turkish radio stations server-side to avoid browser CORS restrictions
const RADIO_STREAMS = {
  trtfm:    'https://trt.radyotvonline.net/trtfm',
  kral:     'http://46.20.3.204:80/',
  kralpop:  'http://46.20.3.201:80/',
  viva:     'http://46.20.3.230/',
  r45lik:   'http://stream.radyo45lik.com:4545/stream',
  trtturku: 'https://trt.radyotvonline.net/trtturku',
  trtmuzik: 'https://trt.radyotvonline.net/trtmuzik',
  trtnagme: 'https://trt.radyotvonline.net/trtnagme'
};

function proxyStream(targetUrl, req, res) {
  const parsed = new URL(targetUrl);
  const reqFn = parsed.protocol === 'https:' ? httpsRequest : httpRequest;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache');

  const proxyReq = reqFn(
    {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Icy-MetaData': '0',
        'Connection': 'keep-alive'
      }
    },
    (proxyRes) => {
      // Forward content-type & status
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': proxyRes.headers['content-type'] || 'audio/mpeg',
        'Access-Control-Allow-Origin': '*',
        'Transfer-Encoding': 'chunked'
      });
      proxyRes.pipe(res, { end: true });

      // If the target redirects, follow it
      if ([301, 302, 303, 307, 308].includes(proxyRes.statusCode)) {
        const location = proxyRes.headers['location'];
        if (location) {
          proxyRes.resume();
          return proxyStream(location, req, res);
        }
      }
    }
  );

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    if (!res.headersSent) res.status(502).send('Stream unavailable');
  });

  req.on('close', () => proxyReq.destroy());
  proxyReq.end();
}

app.get('/radio-proxy', (req, res) => {
  const stationId = req.query.id;
  const targetUrl = RADIO_STREAMS[stationId];

  if (!targetUrl) {
    return res.status(400).json({ error: `Unknown station: ${stationId}` });
  }

  console.log(`📻 Proxying radio: ${stationId} → ${targetUrl}`);
  proxyStream(targetUrl, req, res);
});

// TDK API Proxy - browser CORS sorununu önlemek için
app.get('/tdk-proxy', async (req, res) => {
  const word = req.query.word;

  if (!word) {
    return res.status(400).json({ error: 'Kelime belirtilmedi' });
  }

  try {
    const tdkUrl = `https://sozluk.gov.tr/gts?ara=${encodeURIComponent(word)}`;

    const response = await fetch(tdkUrl);
    const data = await response.json();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(data);
  } catch (error) {
    console.error('TDK proxy error:', error.message);
    res.status(500).json({ error: 'TDK API bağlantısı başarısız' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────

// Active Rooms State Store
const rooms = new Map();
const DATA_DIR = path.join(__dirname, 'data');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');

function saveRooms() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const data = Object.fromEntries(rooms);
    const tempFile = `${ROOMS_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, ROOMS_FILE);
  } catch (err) {
    console.error('Could not save rooms:', err.message);
  }
}

function loadRooms() {
  try {
    if (!fs.existsSync(ROOMS_FILE)) return;
    const data = JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf8'));
    for (const [roomCode, roomState] of Object.entries(data)) {
      // Socket IDs are only valid for the current server process.
      roomState.hostSocketId = null;
      for (const player of roomState.players || []) player.socketId = null;
      rooms.set(roomCode, roomState);
    }
    console.log(`💾 Restored ${rooms.size} saved room(s).`);
  } catch (err) {
    console.error('Could not load saved rooms:', err.message);
  }
}

loadRooms();

// Helper to create tile bag
function createTileBag() {
  const letters = [
    { char: 'A', score: 1, count: 12 }, { char: 'B', score: 2, count: 2 },
    { char: 'C', score: 2, count: 2 }, { char: 'Ç', score: 4, count: 2 },
    { char: 'D', score: 2, count: 3 }, { char: 'E', score: 1, count: 8 },
    { char: 'F', score: 7, count: 1 }, { char: 'G', score: 5, count: 1 },
    { char: 'Ğ', score: 8, count: 1 }, { char: 'H', score: 5, count: 1 },
    { char: 'I', score: 2, count: 4 }, { char: 'İ', score: 1, count: 7 },
    { char: 'J', score: 10, count: 1 }, { char: 'K', score: 1, count: 7 },
    { char: 'L', score: 1, count: 7 }, { char: 'M', score: 1, count: 4 },
    { char: 'N', score: 1, count: 5 }, { char: 'O', score: 2, count: 3 },
    { char: 'Ö', score: 7, count: 1 }, { char: 'P', score: 5, count: 1 },
    { char: 'R', score: 1, count: 6 }, { char: 'S', score: 1, count: 3 },
    { char: 'Ş', score: 4, count: 2 }, { char: 'T', score: 1, count: 5 },
    { char: 'U', score: 2, count: 3 }, { char: 'Ü', score: 3, count: 2 },
    { char: 'V', score: 7, count: 1 }, { char: 'Y', score: 2, count: 2 },
    { char: 'Z', score: 4, count: 2 }, { char: '*', score: 0, count: 2 }
  ];

  const bag = [];
  let idCounter = 1;
  letters.forEach(item => {
    for (let i = 0; i < item.count; i++) {
      bag.push({ id: `tile-${idCounter++}`, char: item.char, score: item.score });
    }
  });

  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // 1. Host Creates Room (In Lobby Mode, isGameActive: false)
  socket.on('create_room', ({ roomCode, username, avatar, playerCount, turnTimerSec, playerToken }) => {
    socket.join(roomCode);

    const hostId = `p-${socket.id.slice(0, 6)}`;

    const roomState = {
      roomCode,
      hostSocketId: socket.id,
      hostId,
      turnTimerSec: turnTimerSec || 60,
      maxPlayers: playerCount || 4,
      isGameActive: false, // Match has not been started yet!
      players: [
        {
          id: hostId,
          playerToken: playerToken || `token-${hostId}`,
          socketId: socket.id,
          name: username,
          avatar,
          score: 0,
          wordsHistory: []
        }
      ],
      boardState: Array.from({ length: 15 }, () => Array(15).fill(null)),
      tileBag: [],
      playerRacks: { [hostId]: [] },
      activePlayerIdx: 0,
      isFirstMove: true,
      consecutivePasses: 0,
      gameHistory: [],   // array of { gameNum, players:[{name,score}], winner, date }
      chatMessages: [
        {
          id: `sys-${Date.now()}`,
          sender: 'Sistem',
          text: `🏠 ${roomCode} masası açıldı. Oyuncular katılınca sol üstteki "Oyunu Başlat" butonuna basın!`,
          type: 'system'
        }
      ]
    };

    rooms.set(roomCode, roomState);
    saveRooms();

    socket.emit('room_created', {
      myPlayerId: hostId,
      roomState
    });

    console.log(`✨ Room created (Lobby): ${roomCode} by ${username}`);
  });

  // 2. Guest Joins Room Lobby
  socket.on('join_room', ({ roomCode, username, avatar, playerToken }) => {
    const roomState = rooms.get(roomCode);

    if (!roomState) {
      socket.emit('room_error', { message: `"${roomCode}" kodlu masa bulunamadı!` });
      return;
    }

    // Check if same-name player is reconnecting (was in the room before)
    const normalizedUsername = String(username || '').trim().toLocaleLowerCase('tr-TR');
    const reconnecting = roomState.players.find(p => {
      const sameToken = playerToken && p.playerToken && p.playerToken === playerToken;
      const sameName = String(p.name || '').trim().toLocaleLowerCase('tr-TR') === normalizedUsername;
      return (sameToken || sameName) && p.socketId !== socket.id;
    });

    // Block if game already started AND not a reconnecting player
    if (roomState.isGameActive && !reconnecting) {
      socket.emit('room_error', { message: `"${roomCode}" masasında oyun zaten başladı, katılamazsınız!` });
      return;
    }

    // Block joining if room is full AND not a reconnecting player
    const isAlreadyInRoom = roomState.players.some(p => p.socketId === socket.id);
    if (!isAlreadyInRoom && !reconnecting && roomState.players.length >= roomState.maxPlayers) {
      socket.emit('room_error', { message: `"${roomCode}" masası dolu! (Maksimum ${roomState.maxPlayers} oyuncu)` });
      return;
    }

    socket.join(roomCode);

    let guestPlayer;
    let guestId;

    if (reconnecting) {
      // Reconnect: update socketId on the existing player slot
      reconnecting.socketId = socket.id;
      reconnecting.playerToken = reconnecting.playerToken || playerToken || `token-${reconnecting.id}`;
      reconnecting.name = username.trim();
      reconnecting.avatar = avatar; // allow avatar refresh
      guestPlayer = reconnecting;
      guestId = reconnecting.id;

      roomState.chatMessages.push({
        id: `sys-${Date.now()}`,
        sender: 'Sistem',
        text: `🔁 ${username} yeniden bağlandı!`,
        type: 'system'
      });
    } else {
      guestId = `p-${socket.id.slice(0, 6)}`;
      guestPlayer = roomState.players.find(p => p.socketId === socket.id);

      if (!guestPlayer) {
        guestPlayer = {
          id: guestId,
          playerToken: playerToken || `token-${guestId}`,
          socketId: socket.id,
          name: username,
          avatar,
          score: 0,
          wordsHistory: []
        };

        roomState.players.push(guestPlayer);
        roomState.playerRacks[guestId] = [];

        roomState.chatMessages.push({
          id: `sys-${Date.now()}`,
          sender: 'Sistem',
          text: `🎉 ${username} masaya katıldı!`,
          type: 'system'
        });
      }
    }

    saveRooms();
    io.to(roomCode).emit('room_state_update', roomState);

    socket.emit('room_joined', {
      myPlayerId: guestId,
      roomState
    });

    console.log(`👥 ${username} joined lobby ${roomCode}${reconnecting ? ' (reconnect)' : ''}`);
  });

  // 3. Host Starts Match ("Oyunu Başlat")
  socket.on('start_match', ({ roomCode }) => {
    const roomState = rooms.get(roomCode);
    if (!roomState) return;

    // Deal 7 tiles to each joined player
    let bag = createTileBag();
    roomState.playerRacks = {};

    roomState.players.forEach(p => {
      roomState.playerRacks[p.id] = bag.slice(0, 7);
      bag = bag.slice(7);
    });

    roomState.tileBag = bag;
    roomState.isGameActive = true;
    roomState.activePlayerIdx = 0;
    roomState.isFirstMove = true;

    roomState.chatMessages.push({
      id: `sys-${Date.now()}`,
      sender: 'Sistem',
      text: `🚀 Oyun Ev Sahibi Tarafından Başlatıldı! Başarılar!`,
      type: 'system'
    });

    saveRooms();
    io.to(roomCode).emit('match_started', { roomState });
    console.log(`🚀 Match started in room ${roomCode}`);
  });

  // 4. Play Word Move
  socket.on('play_word', ({ roomCode, cleanBoardGrid, newTileBag, newPlayerRacks, nextTurnIdx, updatedPlayers, newBubble, systemMsg, gameOverByEmptyRack, tilePenalties, playingPlayerId }) => {
    const roomState = rooms.get(roomCode);
    if (!roomState || !roomState.isGameActive) return;

    roomState.boardState = cleanBoardGrid;
    roomState.tileBag = newTileBag;
    roomState.consecutivePasses = 0; // reset on word play

    // Apply tile penalties if empty-rack game over triggered
    let finalPlayers = updatedPlayers;
    if (gameOverByEmptyRack && tilePenalties) {
      finalPlayers = updatedPlayers.map(p => {
        if (p.id === playingPlayerId) {
          // Winner gets sum of all penalties
          const bonus = Object.values(tilePenalties).reduce((s, v) => s + v, 0);
          return { ...p, score: p.score + bonus };
        }
        const penalty = tilePenalties[p.id] || 0;
        return { ...p, score: Math.max(0, p.score - penalty) };
      });
    }

    roomState.playerRacks = newPlayerRacks;
    roomState.activePlayerIdx = nextTurnIdx;
    roomState.players = finalPlayers;
    roomState.isFirstMove = false;

    if (systemMsg) roomState.chatMessages.push(systemMsg);

    // ── Rack empty + bag empty → game over ──────────────
    if (gameOverByEmptyRack) {
      roomState.isGameActive = false;
      const sorted = [...finalPlayers].sort((a, b) => b.score - a.score);
      const winner = sorted[0];

      // Save to game history
      const histEntry = {
        gameNum: (roomState.gameHistory?.length || 0) + 1,
        date: new Date().toLocaleString('tr-TR'),
        players: finalPlayers.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score })),
        winner: { id: winner.id, name: winner.name, score: winner.score }
      };
      if (!roomState.gameHistory) roomState.gameHistory = [];
      roomState.gameHistory.push(histEntry);

      const gameOverMsg = {
        id: `sys-${Date.now()}`,
        sender: 'Sistem',
        text: `🏁 Bir oyuncunun taşları bitti ve torbada taş kalmadı. Oyun sona erdi! 🏆 Kazanan: ${winner.name} (${winner.score} puan)`,
        type: 'system'
      };
      roomState.chatMessages.push(gameOverMsg);

      saveRooms();
      io.to(roomCode).emit('game_over', {
        roomState,
        winner,
        reason: 'empty_rack',
        gameOverMsg,
        gameHistory: roomState.gameHistory
      });
      console.log(`🏁 Game over in ${roomCode} — empty rack + bag. Winner: ${winner.name}`);
      return;
    }
    // ────────────────────────────────────────────────────

    saveRooms();
    io.to(roomCode).emit('word_played', {
      roomState,
      newBubble,
      systemMsg
    });
  });

  // 5. Pass Turn
  socket.on('pass_turn', ({ roomCode, nextTurnIdx, updatedPlayerRacks, systemMsg }) => {
    const roomState = rooms.get(roomCode);
    if (!roomState || !roomState.isGameActive) return;

    roomState.consecutivePasses = (roomState.consecutivePasses || 0) + 1;
    roomState.activePlayerIdx = nextTurnIdx;
    if (updatedPlayerRacks) roomState.playerRacks = updatedPlayerRacks;
    if (systemMsg) roomState.chatMessages.push(systemMsg);

    // Game over: all players passed 2 full rounds
    const passLimit = roomState.players.length * 2;
    if (roomState.consecutivePasses >= passLimit) {
      roomState.isGameActive = false;

      // Find winner (highest score)
      const sorted = [...roomState.players].sort((a, b) => b.score - a.score);
      const winner = sorted[0];

      const gameOverMsg = {
        id: `sys-${Date.now()}`,
        sender: 'Sistem',
        text: `🏁 Tüm oyuncular 2 tur boyunca pas geçti. Oyun sona erdi! 🏆 Kazanan: ${winner.name} (${winner.score} puan)`,
        type: 'system'
      };
      roomState.chatMessages.push(gameOverMsg);

      // Save to game history
      const histEntry = {
        gameNum: (roomState.gameHistory?.length || 0) + 1,
        date: new Date().toLocaleString('tr-TR'),
        players: roomState.players.map(p => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score })),
        winner: { id: winner.id, name: winner.name, score: winner.score }
      };
      if (!roomState.gameHistory) roomState.gameHistory = [];
      roomState.gameHistory.push(histEntry);

      saveRooms();
      io.to(roomCode).emit('game_over', {
        roomState,
        winner,
        reason: 'consecutive_passes',
        gameOverMsg,
        gameHistory: roomState.gameHistory
      });

      console.log(`🏁 Game over in ${roomCode} — consecutive passes limit reached. Winner: ${winner.name}`);
      return;
    }

    saveRooms();
    io.to(roomCode).emit('turn_passed', {
      roomState,
      systemMsg
    });
  });

  // 6. Chat Message
  socket.on('send_chat', ({ roomCode, msgObj }) => {
    const roomState = rooms.get(roomCode);
    if (roomState) {
      roomState.chatMessages.push(msgObj);
      saveRooms();
    }
    io.to(roomCode).emit('chat_received', msgObj);
  });

  // Save history + game_over for consecutive passes (already handled above in pass_turn)
  // The pass_turn handler also needs to save history:

  // 7. Radio Station Change
  socket.on('radio_change', ({ roomCode, stationId }) => {
    io.to(roomCode).emit('radio_changed', { stationId });
  });

  // 8. Rematch — same players, same room, new game
  socket.on('rematch', ({ roomCode }) => {
    const roomState = rooms.get(roomCode);
    if (!roomState) return;

    // Reset game state but keep players and history
    let bag = createTileBag();
    roomState.playerRacks = {};
    roomState.players.forEach(p => {
      p.score = 0;
      p.wordsHistory = [];
      roomState.playerRacks[p.id] = bag.slice(0, 7);
      bag = bag.slice(7);
    });

    roomState.boardState = Array.from({ length: 15 }, () => Array(15).fill(null));
    roomState.tileBag = bag;
    roomState.isGameActive = true;
    roomState.activePlayerIdx = 0;
    roomState.isFirstMove = true;
    roomState.consecutivePasses = 0;

    roomState.chatMessages.push({
      id: `sys-${Date.now()}`,
      sender: 'Sistem',
      text: `🔄 Yeni tur başladı! Herkes hazır, başarılar!`,
      type: 'system'
    });

    saveRooms();
    io.to(roomCode).emit('rematch_started', { roomState });
    console.log(`🔄 Rematch started in ${roomCode}`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);

    // Keep the player in the room so closing/reopening the app can reconnect
    // to the same match with the same username.
    let changed = false;
    for (const roomState of rooms.values()) {
      for (const player of roomState.players || []) {
        if (player.socketId === socket.id) {
          player.socketId = null;
          changed = true;
        }
      }
      if (roomState.hostSocketId === socket.id) {
        roomState.hostSocketId = null;
        changed = true;
      }
    }
    if (changed) saveRooms();
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Kelimelik Real-Time WebSocket Server listening on http://localhost:${PORT}`);
});
