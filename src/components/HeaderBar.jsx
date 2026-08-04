import React, { useState, useRef, useEffect } from 'react';
import RadioPlayer from './RadioPlayer';
import { Volume2, Volume1, VolumeX, RefreshCw, Clock, Layers, Share2, Check, PlayCircle, Trophy } from 'lucide-react';

export default function HeaderBar({
  roomCode,
  players,
  activePlayerIndex,
  timerSec,
  maxTimerSec,
  tileBagCount,
  onOpenPlayerHistory,
  onNewGame,
  isMuted,
  onToggleMute,
  onVolumeChange,
  soundVolume,
  isHost,
  isGameActive,
  onStartMatch,
  onRadioChange,
  radioStationId,
  gameHistory,
  showHistory,
  onToggleHistory
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyInviteLink = () => {
    if (!roomCode) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const inviteUrl = `${origin}/?room=${roomCode}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <header className="header-bar">
      {/* Brand & Top-Left Invite & Start Match Buttons */}
      <div className="logo-area" style={{ gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div className="logo-icon">K</div>
          <div>
            <div className="logo-text">Kelimelik</div>
            <span className="badge-tdk">TDK SÖZLÜK</span>
          </div>
        </div>

        {/* Start Match Button (Host only when game is not active) */}
        {isHost && !isGameActive && (
          <button
            className="btn btn-primary"
            onClick={onStartMatch}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '12px',
              fontSize: '0.85rem',
              fontWeight: '800',
              boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)'
            }}
          >
            <PlayCircle size={18} /> Oyunu Başlat
          </button>
        )}

        {/* Lobby Status for Guests */}
        {!isGameActive && !isHost && (
          <div className="badge-tdk" style={{ background: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent-gold)', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '0.4rem 0.75rem' }}>
            Lobi: Ev Sahibinin Oyunu Başlatması Bekleniyor...
          </div>
        )}

        {/* Radio Player */}
        <RadioPlayer onRadioChange={onRadioChange} activeStationId={radioStationId} />

        {/* Top-Left Invite Link Button */}
        {roomCode && (
          <button
            className="btn btn-warning"
            onClick={handleCopyInviteLink}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '12px',
              fontSize: '0.82rem',
              fontWeight: '700'
            }}
            title="Arkadaşlarınızı davet etmek için tıklayın"
          >
            {copied ? (
              <>
                <Check size={16} color="var(--accent-green)" />
                <span style={{ color: 'var(--accent-green)' }}>Link Kopyalandı!</span>
              </>
            ) : (
              <>
                <Share2 size={16} />
                <span>Davet Linki ({roomCode})</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* 2 to 6 Players List */}
      <div className="header-players">
        {players.map((p, idx) => {
          const isActive = isGameActive && idx === activePlayerIndex;
          return (
            <div
              key={p.id}
              className={`player-chip ${isActive ? 'active' : ''}`}
              onClick={() => onOpenPlayerHistory(p)}
              title="Geçmiş kelimeleri görmek için tıklayın"
            >
              {isActive && <div className="turn-indicator-dot" />}
              <div className="player-avatar">{p.avatar}</div>
              <div className="player-info-meta">
                <div className="player-name-str">{p.name}</div>
                <div className="player-score-str">{p.score} Puan</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Right Tools: Timer, Tile Bag, Audio, Reset */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Remaining Tiles Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0.4rem 0.8rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            fontSize: '0.82rem',
            fontWeight: '600'
          }}
          title="Kese içinde kalan harf sayısı"
        >
          <Layers size={16} color="var(--accent-gold)" />
          <span>Kese: {tileBagCount}</span>
        </div>

        {/* Turn Timer (Only ticks when game is active) */}
        {maxTimerSec > 0 && (
          <div className={`header-timer ${timerSec <= 10 && isGameActive ? 'warning' : ''}`}>
            <Clock size={16} />
            <span>{isGameActive ? `${timerSec}s` : `${maxTimerSec}s`}</span>
          </div>
        )}

        {/* Trophy: Geçmiş Oyunlar */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={onToggleHistory}
            title="Geçmiş oyun skorları"
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '0.4rem 0.75rem',
              borderRadius: '12px',
              border: `1px solid ${showHistory ? 'var(--accent-gold)' : 'var(--border-color)'}`,
              background: showHistory ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.05)',
              color: showHistory ? 'var(--accent-gold)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.82rem', fontWeight: '700',
              transition: 'all 0.2s'
            }}
          >
            <Trophy size={15} />
            <span>{gameHistory?.length > 0 ? gameHistory.length : ''}</span>
          </button>

          {showHistory && (
             <div style={{
              position: 'absolute',
              top: '110%', right: 0,
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '0.85rem',
              zIndex: 2000,
              minWidth: '340px',
              maxHeight: '500px',
              overflowY: 'auto',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(12px)'
            }}>
              {/* Header */}
              <div style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--accent-gold)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Trophy size={14} /> Turnuva Genel Tablosu
              </div>

              {(!gameHistory || gameHistory.length === 0) ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '1rem 0' }}>Henüz tamamlanan oyun yok.</div>
              ) : (() => {
                // Build cumulative totals
                const totals = {};
                gameHistory.forEach(game => {
                  game.players.forEach(p => {
                    if (!totals[p.id]) totals[p.id] = { id: p.id, name: p.name, avatar: p.avatar, total: 0, wins: 0, games: 0 };
                    totals[p.id].total += p.score;
                    totals[p.id].games += 1;
                    if (game.winner?.id === p.id) totals[p.id].wins += 1;
                  });
                });
                const sorted = Object.values(totals).sort((a, b) => b.total - a.total);

                return (
                  <>
                    {/* ── Genel Toplam ── */}
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.04))',
                      border: '1px solid rgba(245,158,11,0.35)',
                      borderRadius: '14px',
                      padding: '0.75rem 0.9rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                        🏅 Genel Toplam — {gameHistory.length} Oyun
                      </div>
                      {sorted.map((p, i) => (
                        <div key={p.id} style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '0.35rem 0',
                          borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none'
                        }}>
                          <span style={{ fontSize: '1rem', minWidth: '22px' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                          <span style={{ fontSize: '1.1rem' }}>{p.avatar}</span>
                          <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: '700', color: i === 0 ? 'var(--accent-gold)' : 'var(--text-primary)' }}>{p.name}</span>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.88rem', fontWeight: '800', color: i === 0 ? 'var(--accent-gold)' : 'var(--text-primary)' }}>{p.total} puan</div>
                            <div style={{ fontSize: '0.69rem', color: 'var(--text-muted)' }}>{p.wins}G / {p.games}O</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ── Oyun Geçmişi ── */}
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>
                      📋 Oyun Geçmişi
                    </div>
                    {[...gameHistory].reverse().map((game) => (
                      <div key={game.gameNum} style={{
                        marginBottom: '0.6rem',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '12px',
                        padding: '0.55rem 0.8rem',
                        border: '1px solid var(--border-color)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.8rem', color: 'var(--text-primary)' }}>Oyun #{game.gameNum}</span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{game.date}</span>
                        </div>
                        {[...game.players].sort((a, b) => b.score - a.score).map((p, i) => (
                          <div key={p.id} style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '0.25rem 0',
                            borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none'
                          }}>
                            <span style={{ fontSize: '0.8rem' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                            <span style={{ fontSize: '0.95rem' }}>{p.avatar}</span>
                            <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: '600', color: i === 0 ? 'var(--accent-gold)' : 'var(--text-primary)' }}>{p.name}</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: i === 0 ? 'var(--accent-gold)' : 'var(--text-muted)' }}>{p.score} puan</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Site Ses Düzeyi Slider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0.35rem 0.7rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
          }}
          title="Site ses düzeyi"
        >
          <button
            onClick={() => {
              const newVol = soundVolume > 0 ? 0 : 0.5;
              onVolumeChange(newVol);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              color: soundVolume === 0 ? 'var(--text-muted)' : 'var(--accent-gold)',
            }}
            title={soundVolume === 0 ? 'Sesi Aç' : 'Sesi Kapat'}
          >
            {soundVolume === 0 ? (
              <VolumeX size={17} />
            ) : soundVolume < 0.4 ? (
              <Volume1 size={17} />
            ) : (
              <Volume2 size={17} />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={soundVolume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            style={{
              width: '72px',
              accentColor: 'var(--accent-gold)',
              cursor: 'pointer',
            }}
            title={`Ses: ${Math.round(soundVolume * 100)}%`}
          />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: '28px' }}>
            {Math.round(soundVolume * 100)}%
          </span>
        </div>

        {/* Reset Game */}
        <button
          className="btn btn-secondary"
          style={{ padding: '0.5rem 0.8rem' }}
          onClick={onNewGame}
          title="Odadanal/Ayrıl ve Yeni Masa Aç"
        >
          <RefreshCw size={16} />
          <span style={{ fontSize: '0.8rem' }}>Masa Değiş</span>
        </button>
      </div>
    </header>
  );
}
