import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { BOARD_SIZE, getSquareMultiplier, FALLBACK_DICTIONARY, toTurkishUpper } from './data/turkishDictionary';
import { fetchWordMeaning } from './services/tdkService';
import { audioService } from './services/audioService';
import { roomSyncService } from './services/roomSyncService';

import HeaderBar from './components/HeaderBar';
import ScrabbleBoard from './components/ScrabbleBoard';
import PlayerRack from './components/PlayerRack';
import ChatPanel from './components/ChatPanel';
import TdkBubbles from './components/TdkBubbles';
import LoginModal from './components/LoginModal';
import PlayerHistoryModal from './components/PlayerHistoryModal';
import JokerModal from './components/JokerModal';

export default function App() {
  // Room & Multiplayer State
  const [gameStarted, setGameStarted] = useState(false);
  const [isGameActive, setIsGameActive] = useState(false); // Lobby mode vs Active Match
  const [roomCode, setRoomCode] = useState('');
  const [myPlayerId, setMyPlayerId] = useState('');
  const [players, setPlayers] = useState([]);
  const [activePlayerIdx, setActivePlayerIdx] = useState(0);
  const [turnTimerSetting, setTurnTimerSetting] = useState(60);
  const [timerSec, setTimerSec] = useState(60);

  // Board & Tiles state
  const [boardState, setBoardState] = useState(() =>
    Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null))
  );
  const [tileBag, setTileBag] = useState([]);
  const [playerRacks, setPlayerRacks] = useState({});
  const [tempPlacedTiles, setTempPlacedTiles] = useState([]);
  const [selectedRackTile, setSelectedRackTile] = useState(null);

  // Chat & UI State
  const [chatMessages, setChatMessages] = useState([]);
  const [tdkBubbles, setTdkBubbles] = useState([]);
  const [selectedPlayerForHistory, setSelectedPlayerForHistory] = useState(null);
  const [pendingJokerPlacement, setPendingJokerPlacement] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [soundVolume, setSoundVolume] = useState(0.5);
  const [isFirstMove, setIsFirstMove] = useState(true);
  const [radioStationId, setRadioStationId] = useState('trtfm');
  const [gameOver, setGameOver] = useState(null); // { winner, players, reason }
  const [gameHistory, setGameHistory] = useState([]); // all past games in this room
  const [showHistory, setShowHistory] = useState(false);

  // Subscribe to Real-Time Socket Events
  useEffect(() => {
    if (!roomCode) return;

    const unsubscribe = roomSyncService.subscribe((payload) => {
      if (!payload) return;

      switch (payload.type) {
        case 'STATE_SYNC': {
          const {
            players: syncedPlayers,
            boardState: syncedBoard,
            tileBag: syncedBag,
            playerRacks: syncedRacks,
            activePlayerIdx: syncedTurnIdx,
            turnTimerSec: syncedTimer,
            isFirstMove: syncedFirstMove,
            chatMessages: syncedChat,
            isGameActive: syncedGameActive
          } = payload.data;

          if (syncedPlayers) setPlayers(syncedPlayers);
          if (syncedBoard) setBoardState(syncedBoard);
          if (syncedBag) setTileBag(syncedBag);
          if (syncedRacks) setPlayerRacks(syncedRacks);
          if (syncedTurnIdx !== undefined) setActivePlayerIdx(syncedTurnIdx);
          if (syncedTimer !== undefined) setTurnTimerSetting(syncedTimer);
          if (syncedFirstMove !== undefined) setIsFirstMove(syncedFirstMove);
          if (syncedChat) setChatMessages(syncedChat);
          if (syncedGameActive !== undefined) setIsGameActive(syncedGameActive);
          break;
        }

        case 'MATCH_STARTED': {
          const roomState = payload.data;
          if (roomState) {
            setPlayers(roomState.players);
            setBoardState(roomState.boardState);
            setTileBag(roomState.tileBag);
            setPlayerRacks(roomState.playerRacks);
            setActivePlayerIdx(roomState.activePlayerIdx);
            setIsGameActive(true);
            setIsFirstMove(true);
            setChatMessages(roomState.chatMessages);
          }
          audioService.playScoreSound();
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          break;
        }

        case 'ACTION_PLAY_WORD': {
          const { roomState, newBubble, systemMsg } = payload.data;
          if (roomState) {
            setBoardState(roomState.boardState);
            setTileBag(roomState.tileBag);
            setPlayerRacks(roomState.playerRacks);
            setActivePlayerIdx(roomState.activePlayerIdx);
            setPlayers(roomState.players);
            setIsFirstMove(roomState.isFirstMove);
            setChatMessages(roomState.chatMessages);
          }

          if (newBubble) setTdkBubbles(prev => [newBubble, ...prev].slice(0, 3));
          audioService.playScoreSound();
          audioService.playBubbleSound();
          break;
        }

        case 'ACTION_PASS_TURN': {
          const { roomState, systemMsg } = payload.data;
          if (roomState) {
            setActivePlayerIdx(roomState.activePlayerIdx);
            setPlayerRacks(roomState.playerRacks);
            setChatMessages(roomState.chatMessages);
          }
          audioService.playTurnSound();
          break;
        }

        case 'ACTION_CHAT': {
          if (payload.data) {
            setChatMessages(prev => [...prev, payload.data]);
          }
          break;
        }

        case 'RADIO_CHANGED': {
          if (payload.data?.stationId) {
            setRadioStationId(payload.data.stationId);
          }
          break;
        }

        case 'GAME_OVER': {
          const { roomState, winner, gameOverMsg, gameHistory: hist } = payload.data;
          if (roomState) {
            setPlayers(roomState.players);
            setIsGameActive(false);
            if (roomState.chatMessages) setChatMessages(roomState.chatMessages);
          }
          if (hist) setGameHistory(hist);
          setGameOver({ winner, players: roomState?.players || players });
          confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 } });
          audioService.playScoreSound();
          break;
        }

        case 'REMATCH_STARTED': {
          const rs = payload.data;
          if (rs) {
            setPlayers(rs.players);
            setBoardState(rs.boardState);
            setTileBag(rs.tileBag);
            setPlayerRacks(rs.playerRacks);
            setActivePlayerIdx(rs.activePlayerIdx);
            setIsGameActive(true);
            setIsFirstMove(true);
            setChatMessages(rs.chatMessages);
            setTempPlacedTiles([]);
            setSelectedRackTile(null);
          }
          setGameOver(null);
          audioService.playScoreSound();
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
          break;
        }

        default:
          break;
      }
    });

    return () => unsubscribe();
  }, [roomCode]);

  // Initialize Game via Socket.io
  const handleStartGame = ({ mode, roomCode: selectedRoomCode, username, avatar, playerToken, playerCount, turnTimerSec }) => {
    setRoomCode(selectedRoomCode);
    // Reset match history whenever a new session is started
    setGameHistory([]);
    setShowHistory(false);

    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `?room=${selectedRoomCode}`);
    }

    if (mode === 'host') {
      roomSyncService.createRoom(
        { roomCode: selectedRoomCode, username, avatar, playerToken, playerCount, turnTimerSec },
        ({ myPlayerId, roomState }) => {
          setMyPlayerId(myPlayerId);
          setPlayers(roomState.players);
          setBoardState(roomState.boardState);
          setTileBag(roomState.tileBag || []);
          setPlayerRacks(roomState.playerRacks || {});
          setActivePlayerIdx(roomState.activePlayerIdx || 0);
          setTurnTimerSetting(roomState.turnTimerSec || 60);
          setTimerSec(roomState.turnTimerSec || 60);
          setIsGameActive(false); // In Lobby mode until Host clicks "Oyunu Başlat"
          setIsFirstMove(true);
          setChatMessages(roomState.chatMessages);
          setGameStarted(true);
        }
      );
    } else {
      roomSyncService.joinRoom(
        { roomCode: selectedRoomCode, username, avatar, playerToken },
        ({ myPlayerId, roomState, error }) => {
          if (error) {
            alert(error);
            return;
          }
          setMyPlayerId(myPlayerId);
          setPlayers(roomState.players);
          setBoardState(roomState.boardState);
          setTileBag(roomState.tileBag || []);
          setPlayerRacks(roomState.playerRacks || {});
          setActivePlayerIdx(roomState.activePlayerIdx || 0);
          setTurnTimerSetting(roomState.turnTimerSec || 60);
          setTimerSec(roomState.turnTimerSec || 60);
          setIsGameActive(roomState.isGameActive || false);
          setIsFirstMove(roomState.isFirstMove);
          setChatMessages(roomState.chatMessages);
          setGameStarted(true);
        }
      );
    }
  };

  // Host Clicks "Oyunu Başlat"
  const handleHostStartMatch = () => {
    roomSyncService.startMatch(roomCode);
  };

  const activePlayer = players[activePlayerIdx] || players[0];
  const isHost = myPlayerId === 'p-1' || (players.length > 0 && players[0].id === myPlayerId);
  const isMyTurn = isGameActive && activePlayer && activePlayer.id === myPlayerId;

  // Turn Timer Effect (ONLY ticks when isGameActive is true!)
  useEffect(() => {
    if (!gameStarted || !isGameActive || turnTimerSetting === 0 || !activePlayer) return;

    setTimerSec(turnTimerSetting);

    const interval = setInterval(() => {
      setTimerSec(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [activePlayerIdx, gameStarted, isGameActive, turnTimerSetting]);

  // Handle Timeout Auto-Pass
  useEffect(() => {
    if (!gameStarted || !isGameActive || turnTimerSetting === 0 || timerSec !== 0) return;
    if (isMyTurn) {
      handlePassTurn(true);
    }
  }, [timerSec, isGameActive]);

  // Handle Square Click
  const handleSquareClick = (row, col) => {
    if (!selectedRackTile || !isMyTurn || !isGameActive) return;
    if (boardState[row][col] || tempPlacedTiles.some(t => t.row === row && t.col === col)) return;

    if (selectedRackTile.char === '*') {
      setPendingJokerPlacement({ tile: selectedRackTile, row, col });
      return;
    }

    const newTempTile = { ...selectedRackTile, row, col };
    setTempPlacedTiles(prev => [...prev, newTempTile]);
    setPlayerRacks(prev => ({
      ...prev,
      [myPlayerId]: (prev[myPlayerId] || []).filter(t => t.id !== selectedRackTile.id)
    }));
    setSelectedRackTile(null);
  };

  // Handle Drop Tile
  const handleDropTileOnSquare = (tile, row, col) => {
    if (!isMyTurn || !isGameActive) return;
    if (boardState[row][col] || tempPlacedTiles.some(t => t.row === row && t.col === col)) return;

    const existingTempIndex = tempPlacedTiles.findIndex(t => t.id === tile.id);
    if (existingTempIndex !== -1) {
      setTempPlacedTiles(prev =>
        prev.map(t => (t.id === tile.id ? { ...t, row, col } : t))
      );
      audioService.playTileDropSound();
      return;
    }

    if (tile.char === '*') {
      setPendingJokerPlacement({ tile, row, col });
      return;
    }

    const newTempTile = { ...tile, row, col };
    setTempPlacedTiles(prev => [...prev, newTempTile]);
    setPlayerRacks(prev => ({
      ...prev,
      [myPlayerId]: (prev[myPlayerId] || []).filter(t => t.id !== tile.id)
    }));
    setSelectedRackTile(null);
  };

  // Handle Joker Letter Selection
  const handleJokerLetterSelected = (chosenLetter) => {
    if (!pendingJokerPlacement || !isMyTurn || !isGameActive) return;
    const { tile, row, col } = pendingJokerPlacement;
    const newTempTile = {
      id: tile.id,
      char: chosenLetter,
      score: 0,
      isJoker: true,
      row,
      col
    };

    setTempPlacedTiles(prev => [...prev, newTempTile]);
    setPlayerRacks(prev => ({
      ...prev,
      [myPlayerId]: (prev[myPlayerId] || []).filter(t => t.id !== tile.id)
    }));

    setSelectedRackTile(null);
    setPendingJokerPlacement(null);
  };

  // Recall single temp tile
  const handleRecallTempTile = (tempTile) => {
    setTempPlacedTiles(prev => prev.filter(t => !(t.row === tempTile.row && t.col === tempTile.col)));
    setPlayerRacks(prev => {
      const currentRack = prev[myPlayerId] || [];
      if (currentRack.some(t => t.id === tempTile.id)) return prev;
      const tileToReturn = {
        id: tempTile.id,
        char: tempTile.isJoker ? '*' : tempTile.char,
        score: tempTile.isJoker ? 0 : tempTile.score
      };
      return {
        ...prev,
        [myPlayerId]: [...currentRack, tileToReturn].slice(0, 7)
      };
    });
  };

  // Recall all temp tiles
  const handleRecallAll = () => {
    if (tempPlacedTiles.length === 0) return;
    setTempPlacedTiles(currentTempTiles => {
      const recalledRackTiles = currentTempTiles.map(t => ({
        id: t.id,
        char: t.isJoker ? '*' : t.char,
        score: t.isJoker ? 0 : t.score
      }));

      setPlayerRacks(prev => {
        const currentRack = prev[myPlayerId] || [];
        const existingIds = new Set(currentRack.map(t => t.id));
        const uniqueRecalled = recalledRackTiles.filter(t => !existingIds.has(t.id));
        return {
          ...prev,
          [myPlayerId]: [...currentRack, ...uniqueRecalled].slice(0, 7)
        };
      });

      return [];
    });
  };

  // Pass Turn via Socket
  const handlePassTurn = (isTimeout = false) => {
    const currentPassingPlayer = players[activePlayerIdx];
    if (!currentPassingPlayer || !isGameActive) return;

    // Security check: ONLY allow passing turn if it's timer timeout OR if it's my turn!
    if (!isTimeout && !isMyTurn) return;

    setSelectedRackTile(null);
    setPendingJokerPlacement(null);

    const recalledRackTiles = tempPlacedTiles.map(t => ({
      id: t.id,
      char: t.isJoker ? '*' : t.char,
      score: t.isJoker ? 0 : t.score
    }));

    const currentRack = playerRacks[currentPassingPlayer.id] || [];
    const existingIds = new Set(currentRack.map(t => t.id));
    const uniqueRecalled = recalledRackTiles.filter(t => !existingIds.has(t.id));
    const updatedRack = [...currentRack, ...uniqueRecalled].slice(0, 7);

    const updatedRacks = { ...playerRacks, [currentPassingPlayer.id]: updatedRack };
    const nextTurnIdx = (activePlayerIdx + 1) % Math.max(1, players.length);

    setTempPlacedTiles([]);

    const systemMsg = {
      id: `sys-${Date.now()}`,
      sender: currentPassingPlayer.name,
      text: isTimeout ? `⏰ ${currentPassingPlayer.name} süresi dolduğu için pas geçti.` : `⏭️ ${currentPassingPlayer.name} pas geçti.`,
      type: 'system'
    };

    roomSyncService.passTurn({
      roomCode,
      nextTurnIdx,
      updatedPlayerRacks: updatedRacks,
      systemMsg
    });
  };

  // Play Word via Socket
  const handlePlayWord = async () => {
    if (tempPlacedTiles.length === 0 || !isMyTurn || !isGameActive) return;

    if (isFirstMove) {
      const coversCenter = tempPlacedTiles.some(t => t.row === 7 && t.col === 7);
      if (!coversCenter) {
        audioService.playErrorSound();
        handleRecallAll();
        addChatMessage({
          sender: 'Sistem',
          text: `❌ İlk hamle tahtanın tam ortasındaki (★) yıldız karesini içermelidir!`,
          type: 'system'
        });
        return;
      }
    }

    const rows = tempPlacedTiles.map(t => t.row);
    const cols = tempPlacedTiles.map(t => t.col);
    const isSameRow = rows.every(r => r === rows[0]);
    const isSameCol = cols.every(c => c === cols[0]);

    if (!isSameRow && !isSameCol) {
      audioService.playErrorSound();
      handleRecallAll();
      addChatMessage({
        sender: 'Sistem',
        text: `❌ Harfler aynı düz çizgi (satır veya sütun) üzerinde olmalıdır!`,
        type: 'system'
      });
      return;
    }

    // Grid representation with new tiles placed
    const grid = boardState.map(r => [...r]);
    tempPlacedTiles.forEach(t => {
      grid[t.row][t.col] = { char: t.char, score: t.score, isNew: true };
    });

    let checkHorizontal = false;
    let checkVertical = false;

    if (tempPlacedTiles.length === 1) {
      checkHorizontal = true;
      checkVertical = true;
    } else if (isSameRow && isSameCol) {
      checkHorizontal = true;
      checkVertical = true;
    } else if (isSameRow) {
      checkHorizontal = true;
    } else {
      checkVertical = true;
    }

    const formedWords = [];

    // Check Horizontal Word
    if (checkHorizontal) {
      const r = rows[0];
      let minC = Math.min(...cols);
      let maxC = Math.max(...cols);
      while (minC > 0 && grid[r][minC - 1]) minC--;
      while (maxC < BOARD_SIZE - 1 && grid[r][maxC + 1]) maxC++;

      let hWord = '';
      let hTiles = [];
      let hasGap = false;
      for (let c = minC; c <= maxC; c++) {
        const item = grid[r][c];
        if (!item) { hasGap = true; break; }
        hWord += item.char;
        hTiles.push({ ...item, row: r, col: c });
      }

      if (!hasGap && hWord.length >= 2) {
        formedWords.push({ word: hWord, tiles: hTiles, isPrimary: true });
      }
    }

    // Check Vertical Word
    if (checkVertical) {
      const c = cols[0];
      let minR = Math.min(...rows);
      let maxR = Math.max(...rows);
      while (minR > 0 && grid[minR - 1][c]) minR--;
      while (maxR < BOARD_SIZE - 1 && grid[maxR + 1][c]) maxR++;

      let vWord = '';
      let vTiles = [];
      let hasGap = false;
      for (let r = minR; r <= maxR; r++) {
        const item = grid[r][c];
        if (!item) { hasGap = true; break; }
        vWord += item.char;
        vTiles.push({ ...item, row: r, col: c });
      }

      if (!hasGap && vWord.length >= 2) {
        // If horizontal already found a word, vertical is cross-word, otherwise primary
        const alreadyHasWord = formedWords.length > 0;
        formedWords.push({ word: vWord, tiles: vTiles, isPrimary: !alreadyHasWord });
      }
    }

    // Check perpendicular cross-words created by each newly placed tile
    tempPlacedTiles.forEach(t => {
      const { row: r, col: c } = t;
      if (checkHorizontal && !checkVertical) {
        let minR = r;
        let maxR = r;
        while (minR > 0 && grid[minR - 1][c]) minR--;
        while (maxR < BOARD_SIZE - 1 && grid[maxR + 1][c]) maxR++;
        if (minR !== maxR) {
          let crossWord = '';
          let crossTiles = [];
          for (let rowIdx = minR; rowIdx <= maxR; rowIdx++) {
            const item = grid[rowIdx][c];
            crossWord += item.char;
            crossTiles.push({ ...item, row: rowIdx, col: c });
          }
          if (crossWord.length >= 2 && !formedWords.some(w => w.word === crossWord && w.tiles[0].row === crossTiles[0].row && w.tiles[0].col === crossTiles[0].col)) {
            formedWords.push({ word: crossWord, tiles: crossTiles, isPrimary: false });
          }
        }
      }
      if (checkVertical && !checkHorizontal) {
        let minC = c;
        let maxC = c;
        while (minC > 0 && grid[r][minC - 1]) minC--;
        while (maxC < BOARD_SIZE - 1 && grid[r][maxC + 1]) maxC++;
        if (minC !== maxC) {
          let crossWord = '';
          let crossTiles = [];
          for (let colIdx = minC; colIdx <= maxC; colIdx++) {
            const item = grid[r][colIdx];
            crossWord += item.char;
            crossTiles.push({ ...item, row: r, col: colIdx });
          }
          if (crossWord.length >= 2 && !formedWords.some(w => w.word === crossWord && w.tiles[0].row === crossTiles[0].row && w.tiles[0].col === crossTiles[0].col)) {
            formedWords.push({ word: crossWord, tiles: crossTiles, isPrimary: false });
          }
        }
      }
    });

    if (formedWords.length === 0) {
      audioService.playErrorSound();
      handleRecallAll();
      addChatMessage({
        sender: 'Sistem',
        text: `❌ Geçerli en az 2 harfli bir kelime oluşturulamadı!`,
        type: 'system'
      });
      return;
    }

    if (!isFirstMove) {
      let isConnectedToExistingBoard = false;
      formedWords.forEach(w => {
        if (w.tiles.some(t => !t.isNew)) {
          isConnectedToExistingBoard = true;
        }
      });

      if (!isConnectedToExistingBoard) {
        tempPlacedTiles.forEach(t => {
          const { row, col } = t;
          const neighbors = [
            [row - 1, col],
            [row + 1, col],
            [row, col - 1],
            [row, col + 1]
          ];
          neighbors.forEach(([r, c]) => {
            if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
              if (boardState[r][c] !== null) {
                isConnectedToExistingBoard = true;
              }
            }
          });
        });
      }

      if (!isConnectedToExistingBoard) {
        audioService.playErrorSound();
        handleRecallAll();
        addChatMessage({
          sender: 'Sistem',
          text: `❌ Yeni yerleştirilen harfler tahtadaki mevcut kelimelere bağlanmalıdır!`,
          type: 'system'
        });
        return;
      }
    }

    // Verify all formed words against TDK
    for (const w of formedWords) {
      const tdkData = await fetchWordMeaning(w.word);
      if (!tdkData.isValid) {
        audioService.playErrorSound();
        handleRecallAll();
        addChatMessage({
          sender: 'Sistem',
          text: `❌ "${w.word}" kelimesi TDK sözlüğünde bulunamadı!`,
          type: 'system'
        });
        return;
      }
      w.meaning = tdkData.meanings ? tdkData.meanings[0] : '';
      w.source = tdkData.source;
    }

    // Calculate total score for all formed words
    let turnTotalScore = 0;
    const primaryWordObj = formedWords.find(w => w.isPrimary) || formedWords[0];

    formedWords.forEach(w => {
      let wordMult = 1;
      let letterSum = 0;
      w.tiles.forEach(t => {
        const sqMult = getSquareMultiplier(t.row, t.col);
        if (t.isNew) {
          letterSum += t.score * sqMult.letterMult;
          wordMult *= sqMult.wordMult;
        } else {
          letterSum += t.score;
        }
      });
      turnTotalScore += (letterSum * wordMult);
    });

    if (tempPlacedTiles.length === 7) {
      turnTotalScore += 50;
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
    }

    // Commit clean board grid
    const cleanBoardGrid = grid.map(rowArr =>
      rowArr.map(cell => (cell ? { char: cell.char, score: cell.score, used: true } : null))
    );

    // Replenish tiles from bag
    const currentMyRack = (playerRacks[myPlayerId] || []);
    const tilesNeeded = 7 - currentMyRack.length;
    const drawnTiles = tileBag.slice(0, tilesNeeded);
    const newTileBag = tileBag.slice(tilesNeeded);

    const newMyRack = [...currentMyRack, ...drawnTiles].slice(0, 7);
    const newPlayerRacks = { ...playerRacks, [myPlayerId]: newMyRack };

    // ── Empty rack + empty bag → game over trigger ────────
    const gameOverByEmptyRack = newMyRack.length === 0 && newTileBag.length === 0;
    let tilePenalties = null;
    if (gameOverByEmptyRack) {
      tilePenalties = {};
      Object.entries(newPlayerRacks).forEach(([pid, rack]) => {
        if (pid !== myPlayerId) {
          tilePenalties[pid] = rack.reduce((sum, t) => sum + (t.score || 0), 0);
        }
      });
    }
    // ─────────────────────────────────────────────────────

    const playedWordObj = {
      word: primaryWordObj.word,
      score: turnTotalScore,
      meaning: primaryWordObj.meaning || '',
      timestamp: new Date().toLocaleTimeString()
    };

    const updatedPlayers = players.map((p, idx) => {
      if (idx === activePlayerIdx) {
        return {
          ...p,
          score: p.score + turnTotalScore,
          wordsHistory: [playedWordObj, ...(p.wordsHistory || [])]
        };
      }
      return p;
    });

    const nextTurnIdx = (activePlayerIdx + 1) % Math.max(1, players.length);

    const newBubble = {
      id: `bubble-${Date.now()}`,
      word: primaryWordObj.word,
      meanings: primaryWordObj.meaning ? [primaryWordObj.meaning] : [],
      source: primaryWordObj.source || 'TDK',
      score: turnTotalScore,
      playerName: activePlayer.name,
      playerAvatar: activePlayer.avatar
    };

    const systemMsg = {
      id: `sys-${Date.now()}`,
      sender: activePlayer.name,
      text: `✨ ${activePlayer.name} "${primaryWordObj.word}" kelimesini oynadı ve +${turnTotalScore} puan kazandı!`,
      type: 'system'
    };

    setTempPlacedTiles([]);

    // Broadcast move via Socket
    roomSyncService.playWord({
      roomCode,
      cleanBoardGrid,
      newTileBag,
      newPlayerRacks,
      nextTurnIdx,
      updatedPlayers,
      newBubble,
      systemMsg,
      gameOverByEmptyRack,
      tilePenalties,
      playingPlayerId: myPlayerId
    });

  };

  const handleUserSendMessage = (text) => {
    const me = players.find(p => p.id === myPlayerId) || players[0];
    const msgObj = {
      id: `msg-${Date.now()}-${Math.random()}`,
      sender: me.name,
      avatar: me.avatar,
      text,
      timestamp: new Date().toLocaleTimeString()
    };

    roomSyncService.sendChat({ roomCode, msgObj });
  };

  const addChatMessage = (msg) => {
    setChatMessages(prev => [...prev, msg]);
  };

  const handleDismissBubble = (bubbleId) => {
    setTdkBubbles(prev => prev.filter(b => b.id !== bubbleId));
  };

  const handleToggleMute = () => {
    const muted = audioService.toggleMute();
    setIsMuted(muted);
    setSoundVolume(muted ? 0 : audioService.volume);
  };

  const handleVolumeChange = (v) => {
    audioService.setVolume(v);
    setSoundVolume(v);
    setIsMuted(v === 0);
  };

  return (
    <div className="app-container">
      {!gameStarted ? (
        <LoginModal onStartGame={handleStartGame} />
      ) : (
        <>
          {/* ── Game Over Overlay ─────────────────────────────── */}
          {gameOver && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.82)',
              backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <div style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '24px',
                padding: '2.5rem 2rem',
                maxWidth: '480px', width: '90%',
                textAlign: 'center',
                boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                animation: 'fadeInScale 0.4s ease'
              }}>
                {/* Title */}
                <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>🏁</div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>
                  Oyun Bitti!
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Tüm oyuncular 2 tur boyunca pas geçti.
                </p>

                {/* Winner Banner */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05))',
                  border: '1px solid rgba(245,158,11,0.4)',
                  borderRadius: '16px',
                  padding: '1rem 1.5rem',
                  marginBottom: '1.5rem',
                  display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center'
                }}>
                  <span style={{ fontSize: '2.2rem' }}>🏆</span>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Kazanan</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--accent-gold)' }}>{gameOver.winner?.name}</div>
                    <div style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: '600' }}>{gameOver.winner?.score} Puan</div>
                  </div>
                </div>

                {/* Scoreboard */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '2rem' }}>
                  {[...(gameOver.players || [])].sort((a, b) => b.score - a.score).map((p, i) => (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '0.6rem 1rem',
                      background: i === 0 ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.03)',
                      borderRadius: '12px',
                      border: i === 0 ? '1px solid rgba(245,158,11,0.3)' : '1px solid var(--border-color)'
                    }}>
                      <span style={{ fontSize: '1.2rem', minWidth: '28px', textAlign: 'center' }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                      </span>
                      <span style={{ fontSize: '1.4rem' }}>{p.avatar}</span>
                      <span style={{ flex: 1, textAlign: 'left', fontWeight: '600', color: 'var(--text-primary)' }}>{p.name}</span>
                      <span style={{ fontWeight: '700', color: i === 0 ? 'var(--accent-gold)' : 'var(--text-muted)' }}>{p.score} puan</span>
                    </div>
                  ))}
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  {/* Devam Et — rematch in same room */}
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '0.85rem', fontSize: '1rem', fontWeight: '800', borderRadius: '14px' }}
                    onClick={() => roomSyncService.rematch(roomCode)}
                  >
                    🔄 Devam Et
                  </button>
                  {/* Çık — go back to lobby screen */}
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '0.85rem', fontSize: '1rem', fontWeight: '700', borderRadius: '14px' }}
                    onClick={() => {
                      setGameOver(null);
                      setGameStarted(false);
                      if (typeof window !== 'undefined') {
                        window.history.pushState(null, '', window.location.pathname);
                      }
                    }}
                  >
                    🚪 Çık
                  </button>
                </div>
              </div>
              <style>{`
                @keyframes fadeInScale {
                  from { opacity: 0; transform: scale(0.85); }
                  to   { opacity: 1; transform: scale(1); }
                }
              `}</style>
            </div>
          )}
          {/* ─────────────────────────────────────────────────── */}

          {/* Header Bar */}

          <HeaderBar
            roomCode={roomCode}
            players={players}
            activePlayerIndex={activePlayerIdx}
            timerSec={timerSec}
            maxTimerSec={turnTimerSetting}
            tileBagCount={tileBag.length}
            onOpenPlayerHistory={(p) => setSelectedPlayerForHistory(p)}
            onNewGame={() => {
              setGameStarted(false);
              if (typeof window !== 'undefined') {
                window.history.pushState(null, '', window.location.pathname);
              }
            }}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            soundVolume={soundVolume}
            onVolumeChange={handleVolumeChange}
            isHost={isHost}
            isGameActive={isGameActive}
            onStartMatch={handleHostStartMatch}
            gameHistory={gameHistory}
            showHistory={showHistory}
            onToggleHistory={() => setShowHistory(v => !v)}
            onRadioChange={(stationId) => {
              setRadioStationId(stationId);
              roomSyncService.sendRadioChange(roomCode, stationId);
            }}
            radioStationId={radioStationId}
          />

          {/* Main Layout Grid */}
          <div className="main-layout">
            {/* Scrabble Board & Rack Area */}
            <div className="game-area">
              <ScrabbleBoard
                boardState={boardState}
                tempPlacedTiles={tempPlacedTiles}
                selectedRackTile={selectedRackTile}
                onSquareClick={handleSquareClick}
                onDropTileOnSquare={handleDropTileOnSquare}
                onRecallTempTile={handleRecallTempTile}
              />

              <PlayerRack
                rackTiles={playerRacks[myPlayerId] || []}
                selectedTile={selectedRackTile}
                tempPlacedTilesCount={tempPlacedTiles.length}
                isMyTurn={isMyTurn}
                onSelectTile={(t) => {
                  if (isMyTurn) setSelectedRackTile(t);
                }}
                onPlayWord={handlePlayWord}
                onRecallAll={handleRecallAll}
                onReorderRack={(fromIdx, toIdx) => {
                  setPlayerRacks(prev => {
                    const rack = [...(prev[myPlayerId] || [])];
                    const [moved] = rack.splice(fromIdx, 1);
                    rack.splice(toIdx, 0, moved);
                    return { ...prev, [myPlayerId]: rack };
                  });
                }}
                onShuffleRack={() => {
                  const myRack = [...(playerRacks[myPlayerId] || [])];
                  for (let i = myRack.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [myRack[i], myRack[j]] = [myRack[j], myRack[i]];
                  }
                  setPlayerRacks(prev => ({ ...prev, [myPlayerId]: myRack }));
                }}
                onExchangeTiles={() => {
                  if (!isMyTurn || !isGameActive || tempPlacedTiles.length > 0 || tileBag.length === 0) return;
                  const myRack = playerRacks[myPlayerId] || [];
                  const returnedCount = myRack.length;
                  const newBag = [...tileBag, ...myRack];
                  for (let i = newBag.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [newBag[i], newBag[j]] = [newBag[j], newBag[i]];
                  }
                  const newRack = newBag.slice(0, returnedCount);
                  const updatedBag = newBag.slice(returnedCount);

                  const nextTurnIdx = (activePlayerIdx + 1) % Math.max(1, players.length);
                  const systemMsg = {
                    id: `sys-${Date.now()}`,
                    sender: activePlayer.name,
                    text: `🔄 ${activePlayer.name} harflerini değiştirdi.`,
                    type: 'system'
                  };

                  roomSyncService.passTurn({
                    roomCode,
                    nextTurnIdx,
                    updatedPlayerRacks: { ...playerRacks, [myPlayerId]: newRack },
                    systemMsg
                  });
                }}
                onPassTurn={() => handlePassTurn(false)}
                isCurrentPlayerBot={false}
                activePlayerName={
                  !isGameActive
                    ? 'LOBİ (EV SAHİBİNİN BAŞLATMASI BEKLENİYOR)'
                    : isMyTurn
                    ? `${activePlayer.name} (SİZİN SIRANIZ)`
                    : activePlayer.name
                }
              />
            </div>

            {/* Right-Side Chat Panel */}
            <ChatPanel
              messages={chatMessages}
              onSendMessage={handleUserSendMessage}
              activePlayerName={players.find(p => p.id === myPlayerId)?.name}
            />
          </div>

          {/* Bottom-Left TDK Speech Bubbles */}
          <TdkBubbles
            bubbles={tdkBubbles}
            onDismiss={handleDismissBubble}
          />

          {/* Player Profile & Word History Modal */}
          {selectedPlayerForHistory && (
            <PlayerHistoryModal
              player={selectedPlayerForHistory}
              onClose={() => setSelectedPlayerForHistory(null)}
            />
          )}

          {/* Joker Letter Selection Modal */}
          <JokerModal
            isOpen={!!pendingJokerPlacement}
            onSelectLetter={handleJokerLetterSelected}
            onClose={() => setPendingJokerPlacement(null)}
          />
        </>
      )}
    </div>
  );
}
