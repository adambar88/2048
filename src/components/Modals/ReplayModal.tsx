import React, { useState } from 'react';
import { ReplaySession, encodeReplayToString, decodeReplayFromString } from '../../utils/replaySerializer';
import { useReplayEngine } from '../../hooks/useReplayEngine';
import { TileComponent } from '../GameBoard/TileComponent';
import { GridSize } from '../../types/game';

interface ReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ReplaySession | null;
  onLoadCustomSession?: (session: ReplaySession) => void;
}

export const ReplayModal: React.FC<ReplayModalProps> = ({
  isOpen,
  onClose,
  session,
  onLoadCustomSession,
}) => {
  const [activeSession, setActiveSession] = useState<ReplaySession | null>(session);
  const [importString, setImportString] = useState('');
  const [copyNotification, setCopyNotification] = useState('');

  // Update active session when prop session changes
  React.useEffect(() => {
    setActiveSession(session);
  }, [session]);

  const {
    currentStep,
    totalSteps,
    isPlaying,
    speed,
    setSpeed,
    togglePlay,
    stepForward,
    stepBackward,
    setStep,
    currentFrame,
  } = useReplayEngine(activeSession);

  if (!isOpen) return null;

  const gridSize: GridSize = (activeSession?.gridSize as GridSize) ?? 4;
  const gridCells = Array.from({ length: gridSize }, (_, r) =>
    Array.from({ length: gridSize }, (_, c) => ({ r, c }))
  ).flat();

  const handleExport = () => {
    if (!activeSession) return;
    try {
      const encoded = encodeReplayToString(activeSession);
      navigator.clipboard.writeText(encoded);
      setCopyNotification('Replay string copied to clipboard!');
      setTimeout(() => setCopyNotification(''), 3000);
    } catch {
      setCopyNotification('Failed to export replay.');
      setTimeout(() => setCopyNotification(''), 3000);
    }
  };

  const handleImport = () => {
    if (!importString.trim()) return;
    try {
      const decoded = decodeReplayFromString(importString.trim());
      setActiveSession(decoded);
      onLoadCustomSession?.(decoded);
      setImportString('');
      setCopyNotification('Replay loaded successfully!');
      setTimeout(() => setCopyNotification(''), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid replay string';
      setCopyNotification(`Import failed: ${message}`);
      setTimeout(() => setCopyNotification(''), 3000);
    }
  };

  return (
    <div
      className="help-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Replay Engine"
    >
      <div
        className="help-panel replay-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px', width: '90%' }}
      >
        <button className="help-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2 className="help-title">Game Replay Scrubber</h2>

        {activeSession ? (
          <>
            <div
              className="game-container replay-board"
              style={
                {
                  '--grid-size': gridSize,
                  '--cell-size': `calc((var(--board-size) - var(--cell-gap) * ${gridSize + 1}) / ${gridSize})`,
                  '--cell-step': `calc((var(--board-size) - var(--cell-gap) * ${gridSize + 1}) / ${gridSize} + var(--cell-gap))`,
                  margin: '10px auto',
                } as React.CSSProperties
              }
            >
              <div className="grid-container">
                {gridCells.map(({ r, c }) => (
                  <div key={`${r}-${c}`} className="grid-cell" />
                ))}
                {currentFrame.tiles.map((tile) => (
                  <TileComponent key={tile.id} tile={tile} />
                ))}
              </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <strong>Score: {currentFrame.score}</strong> | Step {currentStep} of {totalSteps}
            </div>

            {/* Timeline Scrubber */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <input
                type="range"
                min={0}
                max={totalSteps}
                value={currentStep}
                onChange={(e) => setStep(parseInt(e.target.value, 10))}
                style={{ flex: 1, cursor: 'pointer' }}
                aria-label="Replay Timeline"
              />
            </div>

            {/* Playback Controls */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '15px',
                flexWrap: 'wrap',
              }}
            >
              <button className="retry-button" onClick={stepBackward} disabled={currentStep <= 0}>
                Prev
              </button>

              <button className="keep-playing-button" onClick={togglePlay}>
                {isPlaying ? 'Pause' : 'Play'}
              </button>

              <button className="retry-button" onClick={stepForward} disabled={currentStep >= totalSteps}>
                Next
              </button>

              <select
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                style={{
                  padding: '6px',
                  borderRadius: '4px',
                  background: 'var(--btn-bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--btn-border)',
                  cursor: 'pointer',
                }}
                aria-label="Playback Speed"
              >
                <option value={0.5}>0.5x Speed</option>
                <option value={1}>1.0x Speed</option>
                <option value={2}>2.0x Speed</option>
                <option value={4}>4.0x Speed</option>
              </select>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              <button className="stats-button" onClick={handleExport}>
                Export Replay String
              </button>
            </div>
          </>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            No active replay session available. Make some moves first!
          </p>
        )}

        {/* Import section */}
        <div style={{ borderTop: '1px solid var(--btn-border)', paddingTop: '12px', marginTop: '10px' }}>
          <h4 style={{ margin: '0 0 8px', color: 'var(--text)' }}>Import Replay Code</h4>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Paste Base64 replay string..."
              value={importString}
              onChange={(e) => setImportString(e.target.value)}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: '4px',
                border: '1px solid var(--btn-border)',
                background: 'var(--bg)',
                color: 'var(--text)',
              }}
            />
            <button className="restart-button" onClick={handleImport}>
              Load
            </button>
          </div>
        </div>

        {copyNotification && (
          <p style={{ textAlign: 'center', color: 'var(--primary)', marginTop: '10px', fontWeight: 'bold' }}>
            {copyNotification}
          </p>
        )}
      </div>
    </div>
  );
};
