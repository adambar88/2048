import re
with open('src/App.tsx', 'r') as f:
    content = f.read()

header_buttons_inject = """
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
          <button className="icon-button" onClick={handleToggleMute} aria-label="Toggle Mute" title="Toggle Mute">
            {isMutedState ? '🔇' : '🔊'}
          </button>
          <div style={{ position: 'relative' }}>
            <button className="icon-button" onClick={() => setShowAchievements(!showAchievements)} title="Achievements">
              🏆
            </button>
            {showAchievements && (
              <div className="achievements-modal">
                <h4 style={{margin: '0 0 5px', color: 'var(--text)'}}>Achievements</h4>
                {badges.map(b => (
                  <div key={b.id} className={`badge-item ${b.isUnlocked ? 'unlocked' : ''}`}>
                    <span className="badge-name" style={{color: 'var(--text)'}}>{b.name}</span>
                    <span className="badge-desc">{b.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <select 
            value={gameMode} 
            onChange={(e) => {
              const newMode = e.target.value as GameMode;
              setGameMode(newMode);
              setTimeout(() => {
                storage.removeItem('2048-save');
                setUndoSnapshot(null);
                setScore(0);
                setGameOver(false);
                setHasWon(false);
                setKeepPlaying(false);
                setParticles([]);
                if (newMode === GameMode.BLITZ) setBlitzTimeLeft(60000);
                setTiles(initGame(gridSize, newMode));
              }, 0);
            }}
            style={{ padding: '5px', borderRadius: '4px', background: 'var(--btn-bg)', color: 'var(--text)', border: '1px solid var(--btn-border)' }}
          >
            <option value={GameMode.CLASSIC}>Classic</option>
            <option value={GameMode.BLITZ}>Blitz</option>
            <option value={GameMode.OBSTACLES}>Obstacles</option>
            <option value={GameMode.FIBONACCI}>Fibonacci</option>
          </select>
        </div>
"""

content = re.sub(
    r"(<div className=\"header\">)",
    r"\1\n" + header_buttons_inject,
    content
)

with open('src/App.tsx', 'w') as f:
    f.write(content)

