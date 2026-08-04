import React, { useState } from 'react';
import { User, Users, Clock, Play, Sparkles, LogIn, KeyRound } from 'lucide-react';

const AVATARS = ['👑', '🦁', '🦊', '🦅', '⚡', '🦉', '🎯', '🚀'];

const getInitialRoomCode = () => {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('room');
  if (fromUrl) return fromUrl.trim().toUpperCase();
  return localStorage.getItem('kelimelik_last_room') || '';
};

const getPlayerToken = () => {
  if (typeof window === 'undefined') return '';
  let token = localStorage.getItem('kelimelik_player_token');
  if (!token) {
    token = (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem('kelimelik_player_token', token);
  }
  return token;
};

const getInitialUsername = () => {
  if (typeof window === 'undefined') return 'Oyuncu_1';
  return localStorage.getItem('kelimelik_last_username') || 'Oyuncu_1';
};

export default function LoginModal({ onStartGame }) {
  const [roomCode, setRoomCode] = useState(getInitialRoomCode);
  const [playerToken] = useState(getPlayerToken);
  const [username, setUsername] = useState(getInitialUsername);
  const [selectedAvatar, setSelectedAvatar] = useState(() =>
    AVATARS[Math.floor(Math.random() * AVATARS.length)]
  );
  const [playerCount, setPlayerCount] = useState(2);
  const [turnTimerSec, setTurnTimerSec] = useState(60);

  const isGuestMode = roomCode.trim().length > 0;

  const handleRoomCodeChange = (e) => {
    setRoomCode(
      e.target.value
        .toUpperCase()
        .replace(/\s/g, '')
        .slice(0, 12)
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    const cleanUsername = username.trim();
    const cleanRoomCode = roomCode.trim().toUpperCase();

    localStorage.setItem('kelimelik_last_username', cleanUsername);

    if (cleanRoomCode) {
      localStorage.setItem('kelimelik_last_room', cleanRoomCode);
      onStartGame({
        mode: 'join',
        roomCode: cleanRoomCode,
        username: cleanUsername,
        avatar: selectedAvatar,
        playerToken
      });
    } else {
      const newRoomCode = `MASA-${Math.floor(Math.random() * 8999 + 1000)}`;
      localStorage.setItem('kelimelik_last_room', newRoomCode);
      onStartGame({
        mode: 'host',
        roomCode: newRoomCode,
        username: cleanUsername,
        avatar: selectedAvatar,
        playerToken,
        playerCount,
        turnTimerSec
      });
    }
  };

  const clearRoom = () => {
    setRoomCode('');
    localStorage.removeItem('kelimelik_last_room');
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'inline-flex', padding: '0.8rem', borderRadius: '16px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-gold)', marginBottom: '0.5rem' }}>
            <Sparkles size={36} />
          </div>
          <h1 className="modal-title">Kelimelik (Scrabble)</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {isGuestMode ? `Odaya Katıl: ${roomCode}` : 'TDK Entegreli Çok Oyunculu Kelime Oyunu'}
          </p>
        </div>

        <div style={{
          background: isGuestMode ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255, 255, 255, 0.04)',
          border: isGuestMode ? '1px solid rgba(6, 182, 212, 0.35)' : '1px solid var(--border-color)',
          borderRadius: '14px',
          padding: '1rem',
          marginBottom: '1.25rem'
        }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <KeyRound size={16} /> Oda Kodu
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="form-input"
              value={roomCode}
              onChange={handleRoomCodeChange}
              placeholder="Örn: MASA-1234"
              maxLength={12}
              style={{ textTransform: 'uppercase', fontWeight: '800', letterSpacing: '1px' }}
            />
            {isGuestMode && (
              <button type="button" className="btn" onClick={clearRoom} style={{ padding: '0 12px', whiteSpace: 'nowrap' }}>
                Yeni Masa
              </button>
            )}
          </div>
          <div style={{ marginTop: '7px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Daha önce oynadığınız oyunun kodu otomatik doldurulur. Yeni bir odaya girmek için kodu değiştirin.
          </div>
        </div>

        {isGuestMode && (
          <div style={{
            background: 'rgba(6, 182, 212, 0.12)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            borderRadius: '12px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            color: 'var(--accent-cyan)',
            textAlign: 'center'
          }}>
            🔄 <strong>{username || 'Oyuncu'}</strong> olarak <strong>{roomCode}</strong> odasına yeniden bağlanabilirsiniz.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={16} /> Kullanıcı Adınız
            </label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Adınızı girin..."
              maxLength={15}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Profil İkonu</label>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {AVATARS.map((av) => (
                <button
                  type="button"
                  key={av}
                  onClick={() => setSelectedAvatar(av)}
                  style={{
                    fontSize: '1.4rem', padding: '0.4rem 0.6rem', borderRadius: '10px',
                    border: selectedAvatar === av ? '2px solid var(--accent-gold)' : '1px solid var(--border-color)',
                    background: selectedAvatar === av ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer'
                  }}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {!isGuestMode && (
            <>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={16} /> Toplam Masa Oyuncusu (2 - 6 Kişi)
                </label>
                <div className="players-count-selector">
                  {[2, 3, 4, 5, 6].map((num) => (
                    <button type="button" key={num} className={`count-btn ${playerCount === num ? 'active' : ''}`} onClick={() => setPlayerCount(num)}>
                      {num} Kişi
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} /> Tur Süresi Limit
                </label>
                <select className="form-select" value={turnTimerSec} onChange={(e) => setTurnTimerSec(Number(e.target.value))}>
                  <option value={30}>30 Saniye (Hızlı Mod)</option>
                  <option value={60}>60 Saniye (Standart)</option>
                  <option value={90}>90 Saniye (Rahat Mod)</option>
                  <option value={0}>Sınırsız (Zaman Sınırlaması Yok)</option>
                </select>
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '1rem', marginTop: '0.75rem' }}>
            {isGuestMode ? <><LogIn size={18} /> Oyuna Geri Dön</> : <><Play size={18} /> Masa Aç ve Oyna</>}
          </button>
        </form>
      </div>
    </div>
  );
}
