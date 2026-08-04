import React from 'react';
import { X, Trophy, BookOpen, Star, Hash } from 'lucide-react';

export default function PlayerHistoryModal({ player, onClose }) {
  if (!player) return null;

  const totalWordsCount = player.wordsHistory ? player.wordsHistory.length : 0;
  const bestWord = player.wordsHistory && player.wordsHistory.length > 0
    ? [...player.wordsHistory].sort((a, b) => b.score - a.score)[0]
    : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={24} />
        </button>

        {/* Player Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{
            fontSize: '2.5rem',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '2px solid var(--accent-gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {player.avatar}
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {player.name} {player.isBot && <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent-blue)', borderRadius: '12px' }}>BOT</span>}
            </h2>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '4px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <span style={{ color: 'var(--accent-gold)', fontWeight: '700' }}>🏆 {player.score} Puan</span>
              <span>•</span>
              <span>📝 {totalWordsCount} Kelime</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '0.85rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Star size={14} color="var(--accent-gold)" /> En Yüksek Puanlı Kelime
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--accent-gold)', marginTop: '4px' }}>
              {bestWord ? `${bestWord.word} (${bestWord.score} p)` : '-'}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '0.85rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Hash size={14} color="var(--accent-cyan)" /> Ortalama Kelime Puanı
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--accent-cyan)', marginTop: '4px' }}>
              {totalWordsCount > 0 ? Math.round(player.score / totalWordsCount) : 0} Puan
            </div>
          </div>
        </div>

        {/* Word History Header */}
        <h3 style={{ fontSize: '1rem', color: '#FFF', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem' }}>
          <BookOpen size={18} color="var(--accent-gold)" /> Oynanan Kelimeler Geçmişi
        </h3>

        {/* Word History List */}
        <div className="history-list">
          {(!player.wordsHistory || player.wordsHistory.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Henüz bu oyuncu tarafından kelime oynanmadı.
            </div>
          ) : (
            player.wordsHistory.map((item, idx) => (
              <div key={idx} className="history-item">
                <div>
                  <div className="history-word">{item.word}</div>
                  {item.meaning && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.3' }}>
                      {item.meaning}
                    </div>
                  )}
                </div>
                <div className="history-pts">
                  +{item.score} p
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
