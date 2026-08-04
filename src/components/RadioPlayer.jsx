import React, { useState, useRef, useEffect } from 'react';
import { Radio, Volume2, Volume1, VolumeX, ChevronDown, Music } from 'lucide-react';

// All streams are proxied via our local server to avoid browser CORS restrictions
const PROXY_BASE = 'http://localhost:3001/radio-proxy?id=';

const RADIO_STATIONS = [
  {
    id: 'trtfm',
    name: 'TRT FM',
    genre: 'Pop & Hit',
    color: '#e11d48',
    logo: '📻',
    stream: `${PROXY_BASE}trtfm`
  },
  {
    id: 'kral',
    name: 'Kral FM',
    genre: 'Türkçe Pop',
    color: '#d97706',
    logo: '👑',
    stream: `${PROXY_BASE}kral`
  },
  {
    id: 'kralpop',
    name: 'Kral Pop',
    genre: 'Türkçe Pop',
    color: '#ea580c',
    logo: '🌟',
    stream: `${PROXY_BASE}kralpop`
  },
  {
    id: 'viva',
    name: 'Radyo Viva',
    genre: 'Türkçe Pop',
    color: '#7c3aed',
    logo: '💜',
    stream: `${PROXY_BASE}viva`
  },
  {
    id: 'r45lik',
    name: "Radyo 45'lik",
    genre: 'Nostalji',
    color: '#0891b2',
    logo: '🎵',
    stream: `${PROXY_BASE}r45lik`
  },
  {
    id: 'trtturku',
    name: 'TRT Türkü',
    genre: 'Türk Halk Müziği',
    color: '#059669',
    logo: '🪘',
    stream: `${PROXY_BASE}trtturku`
  },
  {
    id: 'trtmuzik',
    name: 'TRT Müzik',
    genre: 'Türk Sanat Müziği',
    color: '#be185d',
    logo: '🎶',
    stream: `${PROXY_BASE}trtmuzik`
  },
  {
    id: 'trtnagme',
    name: 'TRT Nağme',
    genre: 'Klasik Türk',
    color: '#4f46e5',
    logo: '🎼',
    stream: `${PROXY_BASE}trtnagme`
  }
];


export default function RadioPlayer({ onRadioChange, activeStationId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStation, setCurrentStation] = useState(RADIO_STATIONS[0]);
  const [volume, setVolume] = useState(0.5);
  const [isLoading, setIsLoading] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const audioRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = volume;
    // No crossOrigin needed - streams go through our local proxy

    audioRef.current.addEventListener('playing', () => {
      setIsLoading(false);
      setIsPlaying(true);
    });

    audioRef.current.addEventListener('waiting', () => {
      setIsLoading(true);
    });

    audioRef.current.addEventListener('error', () => {
      setIsLoading(false);
      setIsPlaying(false);
    });

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setShowVolume(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync to remote station change from other players
  useEffect(() => {
    if (!activeStationId) return;
    const station = RADIO_STATIONS.find(s => s.id === activeStationId);
    if (!station || station.id === currentStation.id) return;

    setCurrentStation(station);
    if (isPlaying && audioRef.current) {
      setIsLoading(true);
      audioRef.current.src = station.stream;
      audioRef.current.load();
      audioRef.current.play().catch(() => {
        setIsLoading(false);
        setIsPlaying(false);
      });
    }
  }, [activeStationId]);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsLoading(true);
      audioRef.current.src = currentStation.stream;
      audioRef.current.load();
      audioRef.current.play().catch(() => {
        setIsLoading(false);
        setIsPlaying(false);
      });
    }
  };

  const switchStation = (station) => {
    setCurrentStation(station);
    setIsOpen(false);
    setIsLoading(true);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = station.stream;
      audioRef.current.load();
      audioRef.current.play().catch(() => {
        setIsLoading(false);
        setIsPlaying(false);
      });
    }

    // Broadcast station change to all room players
    if (onRadioChange) {
      onRadioChange(station.id);
    }
  };

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
      {/* Radio Play/Stop Button */}
      <button
        onClick={togglePlay}
        title={isPlaying ? 'Radyoyu Durdur' : 'Radyoyu Çal'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '0.4rem 0.75rem',
          borderRadius: '12px',
          border: `1px solid ${isPlaying ? currentStation.color : 'var(--border-color)'}`,
          background: isPlaying
            ? `${currentStation.color}22`
            : 'rgba(255,255,255,0.05)',
          color: isPlaying ? currentStation.color : 'var(--text-muted)',
          cursor: 'pointer',
          fontSize: '0.82rem',
          fontWeight: '700',
          transition: 'all 0.2s ease',
          whiteSpace: 'nowrap'
        }}
      >
        {isLoading ? (
          <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
        ) : (
          <Radio size={15} style={{ color: isPlaying ? currentStation.color : 'inherit' }} />
        )}
        <span style={{ maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {isPlaying ? currentStation.name : 'Radyo'}
        </span>
        {isPlaying && (
          <span style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '14px' }}>
            {[0.4, 0.7, 1, 0.6].map((h, i) => (
              <span
                key={i}
                style={{
                  width: '3px',
                  background: currentStation.color,
                  borderRadius: '2px',
                  animation: `equalizer ${0.4 + i * 0.1}s ease-in-out infinite alternate`,
                  height: `${h * 14}px`
                }}
              />
            ))}
          </span>
        )}
      </button>

      {/* Volume Button */}
      <button
        onClick={() => setShowVolume(v => !v)}
        title="Ses Seviyesi"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0.4rem',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          background: 'rgba(255,255,255,0.05)',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        <VolumeIcon size={16} />
      </button>

      {/* Volume Slider Popup */}
      {showVolume && (
        <div style={{
          position: 'absolute',
          top: '110%',
          left: '0',
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '0.75rem',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          minWidth: '140px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>
            Ses: {Math.round(volume * 100)}%
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: currentStation.color }}
          />
        </div>
      )}

      {/* Station Selector Button */}
      <button
        onClick={() => setIsOpen(v => !v)}
        title="Radyo İstasyonu Seç"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '0.4rem 0.6rem',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          background: 'rgba(255,255,255,0.05)',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        <Music size={14} />
        <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {/* Station Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '110%',
          left: '0',
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          padding: '0.5rem',
          zIndex: 1000,
          minWidth: '220px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(12px)'
        }}>
          <div style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', padding: '4px 8px 8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            🎵 Canlı Radyo İstasyonları
          </div>
          {RADIO_STATIONS.map(station => (
            <button
              key={station.id}
              onClick={() => switchStation(station)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '0.55rem 0.75rem',
                borderRadius: '10px',
                border: 'none',
                background: currentStation.id === station.id
                  ? `${station.color}22`
                  : 'transparent',
                color: currentStation.id === station.id ? station.color : 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                fontWeight: currentStation.id === station.id ? '700' : '500'
              }}
              onMouseOver={e => {
                if (currentStation.id !== station.id) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                }
              }}
              onMouseOut={e => {
                if (currentStation.id !== station.id) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>{station.logo}</span>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 'inherit' }}>{station.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{station.genre}</div>
              </div>
              {currentStation.id === station.id && isPlaying && (
                <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: station.color, fontWeight: '700' }}>▶ CANLI</span>
              )}
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes equalizer {
          0% { transform: scaleY(0.3); }
          100% { transform: scaleY(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
