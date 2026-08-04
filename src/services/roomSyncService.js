import { io } from 'socket.io-client';

class RoomSyncService {
  constructor() {
    this.socket = null;
    this.listeners = new Set();
  }

  connect() {
    if (!this.socket && typeof window !== 'undefined') {
      const hostname = window.location.hostname || 'localhost';
      const serverUrl = `http://${hostname}:3001`;
      console.log(`🔌 Connecting to Real-Time Socket Server at ${serverUrl}`);
      
      this.socket = io(serverUrl, {
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000
      });

      this.socket.on('room_state_update', (roomState) => {
        this.notifyListeners({ type: 'STATE_SYNC', data: roomState });
      });

      this.socket.on('match_started', ({ roomState }) => {
        this.notifyListeners({ type: 'MATCH_STARTED', data: roomState });
      });

      this.socket.on('word_played', (data) => {
        this.notifyListeners({ type: 'ACTION_PLAY_WORD', data });
      });

      this.socket.on('turn_passed', (data) => {
        this.notifyListeners({ type: 'ACTION_PASS_TURN', data });
      });

      this.socket.on('chat_received', (msgObj) => {
        this.notifyListeners({ type: 'ACTION_CHAT', data: msgObj });
      });

      this.socket.on('radio_changed', ({ stationId }) => {
        this.notifyListeners({ type: 'RADIO_CHANGED', data: { stationId } });
      });
      this.socket.on('room_error', ({ message }) => {
        this.notifyListeners({ type: 'ROOM_ERROR', data: { message } });
      });

      this.socket.on('game_over', (data) => {
        this.notifyListeners({ type: 'GAME_OVER', data });
      });

      this.socket.on('rematch_started', ({ roomState }) => {
        this.notifyListeners({ type: 'REMATCH_STARTED', data: roomState });
      });
    }
    return this.socket;
  }

  createRoom(roomData, callback) {
    const s = this.connect();
    s.emit('create_room', roomData);

    s.once('room_created', ({ myPlayerId, roomState }) => {
      if (callback) callback({ myPlayerId, roomState });
    });
  }

  joinRoom(joinData, callback) {
    const s = this.connect();
    s.emit('join_room', joinData);

    const onJoined = ({ myPlayerId, roomState }) => {
      s.off('room_error', onError);
      if (callback) callback({ myPlayerId, roomState });
    };

    const onError = ({ message }) => {
      s.off('room_joined', onJoined);
      if (callback) callback({ error: message });
    };

    s.once('room_joined', onJoined);
    s.once('room_error', onError);
  }

  startMatch(roomCode) {
    if (this.socket) {
      this.socket.emit('start_match', { roomCode });
    }
  }

  playWord(playData) {
    if (this.socket) {
      this.socket.emit('play_word', playData);
    }
  }

  passTurn(passData) {
    if (this.socket) {
      this.socket.emit('pass_turn', passData);
    }
  }

  sendChat(chatData) {
    if (this.socket) {
      this.socket.emit('send_chat', chatData);
    }
  }

  sendRadioChange(roomCode, stationId) {
    if (this.socket) {
      this.socket.emit('radio_change', { roomCode, stationId });
    }
  }

  rematch(roomCode) {
    if (this.socket) {
      this.socket.emit('rematch', { roomCode });
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  notifyListeners(payload) {
    this.listeners.forEach(listener => listener(payload));
  }
}

export const roomSyncService = new RoomSyncService();
