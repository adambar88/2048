import { describe, it, expect, beforeEach } from 'vitest'
import { move, isGameOver, addRandomTile, Tile } from './gameLogic'

// ─── helpers ────────────────────────────────────────────

let _id = 1000
const id = () => _id++

/** Build a flat tile array from a 2-D value matrix (0 = empty). */
function board(rows: number[][], gridSize = rows.length): Tile[] {
  const tiles: Tile[] = []
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      if (rows[r][c] !== 0) {
        tiles.push({ id: id(), value: rows[r][c], r, c })
      }
    }
  }
  return tiles
}

/** Render surviving tiles back to a 2-D value matrix. */
function toMatrix(tiles: Tile[], gridSize: number): number[][] {
  const m = Array.from({ length: gridSize }, () => Array(gridSize).fill(0))
  tiles.filter(t => !t.isDestroyed).forEach(t => { m[t.r][t.c] = t.value })
  return m
}

// ─── move() ─────────────────────────────────────────────

describe('move – LEFT', () => {
  it('slides a single tile to the leftmost column', () => {
    const { tiles } = move(board([[0, 0, 0, 4], [0,0,0,0], [0,0,0,0], [0,0,0,0]]), 'LEFT')
    expect(toMatrix(tiles, 4)[0]).toEqual([4, 0, 0, 0])
  })

  it('merges two equal tiles and reports correct score', () => {
    const { tiles, score } = move(board([[2, 2, 0, 0], [0,0,0,0], [0,0,0,0], [0,0,0,0]]), 'LEFT')
    expect(toMatrix(tiles, 4)[0]).toEqual([4, 0, 0, 0])
    expect(score).toBe(4)
  })

  it('does NOT double-merge: [2,2,2,0] → [4,2,0,0]', () => {
    const { tiles } = move(board([[2, 2, 2, 0], [0,0,0,0], [0,0,0,0], [0,0,0,0]]), 'LEFT')
    expect(toMatrix(tiles, 4)[0]).toEqual([4, 2, 0, 0])
  })

  it('does NOT double-merge: [2,2,2,2] → [4,4,0,0]', () => {
    const { tiles } = move(board([[2, 2, 2, 2], [0,0,0,0], [0,0,0,0], [0,0,0,0]]), 'LEFT')
    expect(toMatrix(tiles, 4)[0]).toEqual([4, 4, 0, 0])
  })

  it('handles gap between equal tiles: [2,0,2,0] → [4,0,0,0]', () => {
    const { tiles } = move(board([[2, 0, 2, 0], [0,0,0,0], [0,0,0,0], [0,0,0,0]]), 'LEFT')
    expect(toMatrix(tiles, 4)[0]).toEqual([4, 0, 0, 0])
  })

  it('only merges equal values: [2,4,2,0] → no merge, just slide', () => {
    const { tiles } = move(board([[2, 4, 2, 0], [0,0,0,0], [0,0,0,0], [0,0,0,0]]), 'LEFT')
    expect(toMatrix(tiles, 4)[0]).toEqual([2, 4, 2, 0])
  })

  it('already-aligned board registers changed=false', () => {
    const { changed } = move(board([[4, 2, 0, 0], [0,0,0,0], [0,0,0,0], [0,0,0,0]]), 'LEFT')
    expect(changed).toBe(false)
  })

  it('merges across gaps: [4,0,0,4] → [8,0,0,0]', () => {
    const { tiles } = move(board([[4, 0, 0, 4], [0,0,0,0], [0,0,0,0], [0,0,0,0]]), 'LEFT')
    expect(toMatrix(tiles, 4)[0]).toEqual([8, 0, 0, 0])
  })

  it('score accumulates for multiple merges in one move', () => {
    const { score } = move(board([[2, 2, 4, 4], [0,0,0,0], [0,0,0,0], [0,0,0,0]]), 'LEFT')
    expect(score).toBe(12) // 4 + 8
  })
})

describe('move – RIGHT', () => {
  it('slides tile to the rightmost column', () => {
    const { tiles } = move(board([[4, 0, 0, 0], [0,0,0,0], [0,0,0,0], [0,0,0,0]]), 'RIGHT')
    expect(toMatrix(tiles, 4)[0]).toEqual([0, 0, 0, 4])
  })

  it('[2,2,0,0] → [0,0,0,4]', () => {
    const { tiles } = move(board([[2, 2, 0, 0], [0,0,0,0], [0,0,0,0], [0,0,0,0]]), 'RIGHT')
    expect(toMatrix(tiles, 4)[0]).toEqual([0, 0, 0, 4])
  })

  it('[2,2,2,2] → [0,0,4,4]', () => {
    const { tiles } = move(board([[2, 2, 2, 2], [0,0,0,0], [0,0,0,0], [0,0,0,0]]), 'RIGHT')
    expect(toMatrix(tiles, 4)[0]).toEqual([0, 0, 4, 4])
  })

  it('[2,2,2,0] → [0,0,2,4]', () => {
    const { tiles } = move(board([[2, 2, 2, 0], [0,0,0,0], [0,0,0,0], [0,0,0,0]]), 'RIGHT')
    expect(toMatrix(tiles, 4)[0]).toEqual([0, 0, 2, 4])
  })
})

describe('move – UP', () => {
  it('slides tile to row 0', () => {
    const { tiles } = move(board([[0], [0], [0], [4]]), 'UP', 4)
    expect(toMatrix(tiles, 4)[0][0]).toBe(4)
  })

  it('merges equal tiles in a column', () => {
    const { tiles } = move(board([[2, 0, 0, 0], [2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), 'UP')
    expect(toMatrix(tiles, 4)[0][0]).toBe(4)
    expect(toMatrix(tiles, 4)[1][0]).toBe(0)
  })

  it('[2,2,2,2] column → [4,4,0,0] after UP', () => {
    const t = board([[2, 0, 0, 0], [2, 0, 0, 0], [2, 0, 0, 0], [2, 0, 0, 0]])
    const { tiles } = move(t, 'UP')
    const col = toMatrix(tiles, 4).map(row => row[0])
    expect(col).toEqual([4, 4, 0, 0])
  })
})

describe('move – DOWN', () => {
  it('slides tile to last row', () => {
    const { tiles } = move(board([[4, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), 'DOWN')
    expect(toMatrix(tiles, 4)[3][0]).toBe(4)
  })

  it('[2,2,2,2] column → [0,0,4,4] after DOWN', () => {
    const t = board([[2, 0, 0, 0], [2, 0, 0, 0], [2, 0, 0, 0], [2, 0, 0, 0]])
    const { tiles } = move(t, 'DOWN')
    const col = toMatrix(tiles, 4).map(row => row[0])
    expect(col).toEqual([0, 0, 4, 4])
  })
})

describe('move – symmetry', () => {
  it('LEFT then RIGHT on a symmetric board returns to original positions', () => {
    const initial = board([[2, 0, 0, 2], [0,0,0,0], [0,0,0,0], [0,0,0,0]])
    const { tiles: afterLeft } = move(initial, 'LEFT')
    // [4,0,0,0]
    expect(toMatrix(afterLeft, 4)[0]).toEqual([4, 0, 0, 0])
  })

  it('UP and DOWN are vertical mirrors of LEFT and RIGHT logic', () => {
    const t = board([[2, 0, 0, 0], [2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]])
    const { tiles: up } = move(t, 'UP')
    expect(toMatrix(up, 4)[0][0]).toBe(4)

    const { tiles: down } = move(t, 'DOWN')
    expect(toMatrix(down, 4)[3][0]).toBe(4)
  })
})

// ─── 3×3 grid ───────────────────────────────────────────

describe('move – 3×3 grid', () => {
  it('merges correctly on a 3×3 board', () => {
    const t = board([[2, 2, 0], [0, 0, 0], [0, 0, 0]], 3)
    const { tiles } = move(t, 'LEFT', 3)
    expect(toMatrix(tiles, 3)).toEqual([[4, 0, 0], [0, 0, 0], [0, 0, 0]])
  })

  it('isGameOver works on full 3×3 with no moves', () => {
    const t = board([[2, 4, 2], [4, 2, 4], [2, 4, 2]], 3)
    expect(isGameOver(t, 3)).toBe(true)
  })

  it('isGameOver false on 3×3 with one empty cell', () => {
    const t = board([[2, 4, 2], [4, 0, 4], [2, 4, 2]], 3)
    expect(isGameOver(t, 3)).toBe(false)
  })
})

// ─── 5×5 grid ───────────────────────────────────────────

describe('move – 5×5 grid', () => {
  it('slides and merges across 5 columns', () => {
    const t = board([[2, 0, 0, 0, 2]], 5)
    const { tiles } = move(t, 'LEFT', 5)
    expect(tiles.filter(x => !x.isDestroyed).find(x => x.value === 4)?.c).toBe(0)
  })
})

// ─── isGameOver ─────────────────────────────────────────

describe('isGameOver', () => {
  it('returns false when board has empty cells', () => {
    const t = board([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 0]])
    expect(isGameOver(t)).toBe(false)
  })

  it('returns false when full board has adjacent equal values (horizontal)', () => {
    // Two equal values adjacent — a merge is still possible
    const t = board([
      [2, 2, 4, 8],
      [16, 32, 64, 128],
      [256, 512, 1024, 2048],
      [4, 8, 16, 32],
    ])
    expect(isGameOver(t)).toBe(false)
  })

  it('returns false when full board has adjacent equal values (vertical)', () => {
    const t = board([
      [2, 4, 8, 16],
      [2, 32, 64, 128],
      [8, 256, 512, 1024],
      [16, 8, 4, 2],
    ])
    expect(isGameOver(t)).toBe(false)
  })

  it('returns true on a fully locked board', () => {
    // Classic maximally locked 4×4 — checkerboard of values with no adjacent pairs
    const t = board([
      [2,  4,  2,  4],
      [4,  2,  4,  2],
      [2,  4,  2,  4],
      [4,  2,  4,  2],
    ])
    expect(isGameOver(t)).toBe(true)
  })

  it('returns true on single-cell board with one tile', () => {
    const t = board([[4]], 1)
    expect(isGameOver(t, 1)).toBe(true)
  })

  it('returns false on single-cell empty board', () => {
    expect(isGameOver([], 1)).toBe(false)
  })
})

// ─── addRandomTile ───────────────────────────────────────

describe('addRandomTile', () => {
  it('adds exactly one tile to an empty board', () => {
    const tiles = addRandomTile([], 4)
    expect(tiles.length).toBe(1)
    expect(tiles[0].value).toBe(2)
    expect(tiles[0].isNew).toBe(true)
  })

  it('does not add a tile when the board is full', () => {
    const full = board([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ])
    const after = addRandomTile(full, 4)
    expect(after.length).toBe(full.length)
  })

  it('places tile only in an empty cell', () => {
    // Only one empty cell at [0,3]
    const t = board([
      [2, 4, 2, 0],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ])
    const after = addRandomTile(t, 4)
    const newTile = after.find(x => x.isNew)!
    expect(newTile.r).toBe(0)
    expect(newTile.c).toBe(3)
  })
})

// ─── score correctness ───────────────────────────────────

describe('score', () => {
  it('score is 0 when no merges happen', () => {
    const { score } = move(board([[2, 0, 0, 0]]), 'LEFT')
    expect(score).toBe(0)
  })

  it('cascading merges across all rows accumulate correctly', () => {
    const t = board([
      [2, 2, 0, 0],
      [4, 4, 0, 0],
      [8, 8, 0, 0],
      [16, 16, 0, 0],
    ])
    const { score } = move(t, 'LEFT')
    expect(score).toBe(4 + 8 + 16 + 32)
  })

  it('chain merge 1024+1024 yields 2048 score', () => {
    const { score } = move(board([[1024, 1024, 0, 0]]), 'LEFT')
    expect(score).toBe(2048)
  })
})

// ─── changed flag ────────────────────────────────────────

describe('changed flag', () => {
  it('is false when nothing moves or merges', () => {
    expect(move(board([[2, 4, 8, 16]]), 'LEFT').changed).toBe(false)
    expect(move(board([[0, 0, 2, 4]]), 'RIGHT').changed).toBe(false)
  })

  it('is true when a tile slides', () => {
    expect(move(board([[0, 0, 0, 4]]), 'LEFT').changed).toBe(true)
  })

  it('is true when a merge happens', () => {
    expect(move(board([[2, 2, 0, 0]]), 'LEFT').changed).toBe(true)
  })

  it('is false on empty board', () => {
    expect(move([], 'LEFT').changed).toBe(false)
  })
})

// ─── tile identity / isDestroyed ────────────────────────

describe('tile state after move', () => {
  it('merged source tiles are marked isDestroyed', () => {
    const initial = board([[2, 2, 0, 0]])
    const { tiles } = move(initial, 'LEFT')
    const destroyed = tiles.filter(t => t.isDestroyed)
    expect(destroyed.length).toBe(2)
  })

  it('surviving tile has isMerged=true after merge', () => {
    const { tiles } = move(board([[4, 4, 0, 0]]), 'LEFT')
    const merged = tiles.find(t => t.isMerged && !t.isDestroyed)
    expect(merged).toBeDefined()
    expect(merged!.value).toBe(8)
  })

  it('second move clears isMerged flag on existing tiles', () => {
    const { tiles: after1 } = move(board([[4, 4, 0, 0]]), 'LEFT')
    const { tiles: after2 } = move(after1, 'RIGHT')
    const stillMerged = after2.filter(t => !t.isDestroyed && t.isMerged)
    expect(stillMerged.length).toBe(0)
  })
})
