import React, { useState } from 'react';
import { Play, RotateCcw, Shuffle, ArrowLeftRight, FastForward } from 'lucide-react';
import { audioService } from '../services/audioService';

export default function PlayerRack({
  rackTiles,
  selectedTile,
  tempPlacedTilesCount,
  isMyTurn,
  onSelectTile,
  onPlayWord,
  onRecallAll,
  onShuffleRack,
  onExchangeTiles,
  onPassTurn,
  onReorderRack,
  isCurrentPlayerBot,
  activePlayerName
}) {
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [draggingRackIdx, setDraggingRackIdx] = useState(null);

  const RACK_CAPACITY = 7;
  const displaySlots = Array.from({ length: RACK_CAPACITY }, (_, i) => rackTiles[i] || null);

  const handleTileDragStart = (e, tile, idx) => {
    // Always allow rack tile reordering, but only allow board placement on your turn
    audioService.playTileDropSound();
    // Tag with rackIdx so we can differentiate rack-to-rack drag vs board drag
    e.dataTransfer.setData('application/json', JSON.stringify({ ...tile, rackIdx: idx }));
    setDraggingRackIdx(idx);
  };

  const handleSlotDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIdx(idx);
  };

  const handleSlotDrop = (e, targetIdx) => {
    e.preventDefault();
    e.stopPropagation(); // Don't bubble up to rack-container drop handler
    setDragOverIdx(null);
    setDraggingRackIdx(null);

    const tileDataStr = e.dataTransfer.getData('application/json');
    if (!tileDataStr) return;

    try {
      const tile = JSON.parse(tileDataStr);

      // Only handle rack-to-rack reorder (tile has rackIdx, no row/col)
      if (tile.rackIdx !== undefined && tile.row === undefined) {
        const fromIdx = tile.rackIdx;
        if (fromIdx === targetIdx) return;
        if (onReorderRack) onReorderRack(fromIdx, targetIdx);
      }
    } catch (err) {}
  };

  const handleSlotDragLeave = () => {
    setDragOverIdx(null);
  };

  return (
    <div className="bottom-controls">
      {/* Turn Banner */}
      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>Sıradaki Oyuncu:</span>
        <span style={{ color: 'var(--accent-gold)', fontWeight: '700' }}>{activePlayerName}</span>
        {isCurrentPlayerBot && <span className="badge-tdk">BOT DÜŞÜNÜYOR...</span>}
      </div>

      {/* Rack Container */}
      <div
        className="rack-container"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(e) => {
          // Only handle board → rack recall (tiles with row/col)
          const tileDataStr = e.dataTransfer.getData('application/json');
          if (tileDataStr) {
            try {
              const tile = JSON.parse(tileDataStr);
              if (tile.row !== undefined && tile.col !== undefined) {
                onRecallAll();
              }
            } catch (err) {}
          }
        }}
      >
        {displaySlots.map((tile, idx) => (
          <div
            key={tile ? tile.id : `empty-${idx}`}
            className="rack-slot"
            onDragOver={(e) => handleSlotDragOver(e, idx)}
            onDragLeave={handleSlotDragLeave}
            onDrop={(e) => handleSlotDrop(e, idx)}
            style={{
              outline: dragOverIdx === idx && draggingRackIdx !== idx
                ? '2px dashed var(--accent-gold)'
                : 'none',
              borderRadius: '10px',
              transition: 'outline 0.1s'
            }}
          >
            {tile && (
              <div
                className="scrabble-tile"
                draggable={true} // Always draggable for rack reorder
                onDragStart={(e) => handleTileDragStart(e, tile, idx)}
                onClick={() => {
                  if (isMyTurn && !isCurrentPlayerBot) {
                    audioService.playTileDropSound();
                    onSelectTile(selectedTile?.id === tile.id ? null : tile);
                  }
                }}
                style={{
                  border: selectedTile?.id === tile.id ? '2px solid var(--accent-gold)' : 'none',
                  transform: selectedTile?.id === tile.id ? 'translateY(-6px)' : 'none',
                  boxShadow: selectedTile?.id === tile.id ? '0 8px 16px var(--accent-gold-glow)' : 'var(--tile-shadow)',
                  opacity: draggingRackIdx === idx ? 0.4 : isMyTurn ? 1 : 0.8,
                  cursor: 'grab'
                }}
              >
                <span>{tile.char}</span>
                <span className="tile-score">{tile.score}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Buttons Row */}
      <div className="action-buttons-row">
        <button
          className="btn btn-primary"
          onClick={onPlayWord}
          disabled={!isMyTurn || tempPlacedTilesCount === 0 || isCurrentPlayerBot}
        >
          <Play size={18} /> Oyna ({tempPlacedTilesCount} harf)
        </button>

        <button
          className="btn btn-secondary"
          onClick={onRecallAll}
          disabled={!isMyTurn || tempPlacedTilesCount === 0 || isCurrentPlayerBot}
          title="Tahtadaki geçici harfleri elinize geri alır"
        >
          <RotateCcw size={16} /> Temizle
        </button>

        <button
          className="btn btn-secondary"
          onClick={onShuffleRack}
          disabled={isCurrentPlayerBot}
          title="Elinizdeki harfleri karıştırır"
        >
          <Shuffle size={16} /> Karıştır
        </button>

        <button
          className="btn btn-warning"
          onClick={onExchangeTiles}
          disabled={!isMyTurn || tempPlacedTilesCount > 0 || isCurrentPlayerBot}
          title="Seçilen veya tüm harfleri kese ile değiştirir"
        >
          <ArrowLeftRight size={16} /> Harf Değiştir
        </button>

        <button
          className="btn btn-danger"
          onClick={onPassTurn}
          disabled={!isMyTurn || isCurrentPlayerBot}
          title="Turu oynamadan sıradaki oyuncuya devreder"
        >
          <FastForward size={16} /> Pas
        </button>
      </div>
    </div>
  );
}
