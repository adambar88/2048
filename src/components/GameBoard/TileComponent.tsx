import React from 'react';
import { Tile } from '../../types/game';

interface TileComponentProps {
  tile: Tile;
}

export const TileComponent: React.FC<TileComponentProps> = ({ tile }) => {
  const classes = [
    'tile',
    tile.value <= 2048 ? `tile-${tile.value}` : 'tile-super',
    tile.isMerged ? 'tile-merged' : '',
    tile.isNew ? 'tile-new' : '',
    tile.isDestroyed ? 'tile-destroyed' : '',
    tile.isObstacle ? 'tile-obstacle' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      style={{
        '--r': tile.r,
        '--c': tile.c,
        transform: `translate3d(calc(var(--c) * var(--cell-step)), calc(var(--r) * var(--cell-step)), 0)`,
      } as React.CSSProperties}
    >
      <div className="tile-inner">{tile.isObstacle ? '🪨' : tile.value}</div>
    </div>
  );
};
