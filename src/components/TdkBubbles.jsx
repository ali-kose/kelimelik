import React from 'react';
import { BookOpen, X, Sparkles } from 'lucide-react';

export default function TdkBubbles({ bubbles, onDismiss }) {
  if (!bubbles || bubbles.length === 0) return null;

  return (
    <div className="tdk-bubbles-container">
      {bubbles.map((item) => (
        <div key={item.id} className="tdk-bubble">
          <div className="bubble-header">
            <div className="bubble-word-title">
              <BookOpen size={18} color="var(--accent-cyan)" />
              <span>{item.word}</span>
              <span className="badge-tdk" style={{ marginLeft: '6px' }}>{item.source || 'TDK'}</span>
            </div>
            <button className="bubble-close-btn" onClick={() => onDismiss(item.id)}>
              <X size={16} />
            </button>
          </div>

          <div className="bubble-meaning-text">
            {item.meanings && item.meanings.length > 0 ? (
              item.meanings.map((m, i) => (
                <div key={i} style={{ marginBottom: i > 0 ? '4px' : '0' }}>
                  {item.meanings.length > 1 ? `${i + 1}. ` : ''}{m}
                </div>
              ))
            ) : (
              'Anlam bilgisi bulunamadı.'
            )}
          </div>

          <div className="bubble-meta-footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>{item.playerAvatar || '👤'}</span>
              <span>{item.playerName}</span>
            </div>
            <div className="bubble-score-tag">
              <Sparkles size={12} style={{ display: 'inline', marginRight: '3px' }} />
              +{item.score} Puan
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
