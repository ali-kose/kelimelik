import React, { useState } from 'react';
import { getSquareMultiplier, BOARD_SIZE } from '../data/turkishDictionary';

export default function ScrabbleBoard({
  boardState,
  tempPlacedTiles,
  selectedRackTile,
  onSquareClick,
  onDropTileOnSquare,
  onRecallTempTile
}) {
  const [dragOverSquare, setDragOverSquare] = useState(null);

  const handleDragOver = (e, row, col) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSquare(`${row}-${col}`);
  };

  const handleDragLeave = () => {
    setDragOverSquare(null);
  };

  const handleDrop = (e, row, col) => {
    e.preventDefault();
    setDragOverSquare(null);
    const tileDataStr = e.dataTransfer.getData('application/json');
    if (tileDataStr) {
      try {
        const tile = JSON.parse(tileDataStr);
        onDropTileOnSquare(tile, row, col);
      } catch (err) {
        console.error('Failed to parse dropped tile JSON', err);
      }
    }
  };

  const renderSquare = (row, col) => {
    const squareKey = `${row}-${col}`;
    const multiplier = getSquareMultiplier(row, col);
    const lockedTile = boardState[row][col];
    const tempTile = tempPlacedTiles.find(t => t.row === row && t.col === col);
    const isDragOver = dragOverSquare === squareKey;

    let squareClass = `board-square square-${multiplier.type}`;
    if (isDragOver) squareClass += ' drag-over';

    return (
      <div
        key={squareKey}
        className={squareClass}
        onClick={() => onSquareClick(row, col)}
        onDragOver={(e) => handleDragOver(e, row, col)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, row, col)}
      >
        {lockedTile ? (
          // Confirmed Tile on Board
          <div className="scrabble-tile" style={{ cursor: 'default' }}>
            <span>{lockedTile.char}</span>
            <span className="tile-score">{lockedTile.score}</span>
          </div>
        ) : tempTile ? (
          // Temporary Tile placed in current turn (Draggable between squares on board)
          <div
            className="scrabble-tile tile-temp"
            draggable={true}
            onDragStart={(e) => {
              e.dataTransfer.setData('application/json', JSON.stringify(tempTile));
            }}
            onClick={(e) => {
              e.stopPropagation();
              onRecallTempTile(tempTile);
            }}
            title="Başka kareye kaydırmak için sürükleyin veya elinize almak için tıklayın"
          >
            <span>{tempTile.char}</span>
            <span className="tile-score">{tempTile.score}</span>
          </div>
        ) : (
          // Empty Multiplier Square
          multiplier.label && <span className="square-label">{multiplier.label}</span>
        )}
      </div>
    );
  };

  const gridSquares = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      gridSquares.push(renderSquare(r, c));
    }
  }

  return (
    <div className="board-container-outer">
      <div className="scrabble-board">
        {gridSquares}
      </div>

      {/* Floating Legend Overlay */}
      <div className="board-legend-overlay">
        <span className="legend-item legend-k3"><span className="legend-badge">K3</span> 3 Kat Kelime</span>
        <span className="legend-item legend-k2"><span className="legend-badge">K2</span> 2 Kat Kelime</span>
        <span className="legend-item legend-h3"><span className="legend-badge">H3</span> 3 Kat Harf</span>
        <span className="legend-item legend-h2"><span className="legend-badge">H2</span> 2 Kat Harf</span>
        <span className="legend-item legend-star"><span className="legend-badge">★</span> 2 Kat Kelime (Başlangıç)</span>
      </div>
    </div>
  );
}
