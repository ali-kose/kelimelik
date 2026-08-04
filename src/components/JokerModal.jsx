import React from 'react';
import { Sparkles, X } from 'lucide-react';

const TURKISH_ALPHABET = [
  'A', 'B', 'C', 'Ç', 'D', 'E', 'F', 'G', 'Ğ', 'H',
  'I', 'İ', 'J', 'K', 'L', 'M', 'N', 'O', 'Ö', 'P',
  'R', 'S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z'
];

export default function JokerModal({ isOpen, onSelectLetter, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 300 }}>
      <div className="modal-content" style={{ maxWidth: '440px', padding: '1.5rem', textAlign: 'center' }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'inline-flex', padding: '0.6rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-gold)', marginBottom: '0.5rem' }}>
          <Sparkles size={28} />
        </div>

        <h3 style={{ fontSize: '1.2rem', color: '#FFF', marginBottom: '0.25rem' }}>Joker Harf Seçimi</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Joker taşınızı hangi harf olarak kullanmak istiyorsunuz?
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '8px',
          maxHeight: '260px',
          overflowY: 'auto',
          padding: '4px'
        }}>
          {TURKISH_ALPHABET.map(letter => (
            <button
              key={letter}
              type="button"
              onClick={() => onSelectLetter(letter)}
              style={{
                padding: '0.6rem 0.4rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)',
                color: '#451A03',
                fontFamily: 'Outfit, sans-serif',
                fontWeight: '800',
                fontSize: '1.1rem',
                cursor: 'pointer',
                transition: 'transform 0.1s ease, filter 0.1s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
