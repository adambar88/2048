import { move, Tile, initGame } from './src/gameLogic';

let nextId = 0;
const getId = () => nextId++;

// Try to perfectly reproduce the first picture's state
let tiles: Tile[] = [
    { id: getId(), value: 2, r: 0, c: 1, isNew: false, isMerged: false, isDestroyed: false },
    { id: getId(), value: 8, r: 0, c: 2, isNew: false, isMerged: false, isDestroyed: false },
    { id: getId(), value: 2, r: 0, c: 3, isNew: false, isMerged: false, isDestroyed: false },

    { id: getId(), value: 8, r: 1, c: 3, isNew: false, isMerged: false, isDestroyed: false },

    { id: getId(), value: 2, r: 2, c: 1, isNew: false, isMerged: false, isDestroyed: false },
    { id: getId(), value: 2, r: 2, c: 3, isNew: false, isMerged: false, isDestroyed: false },

    { id: getId(), value: 2, r: 3, c: 2, isNew: false, isMerged: false, isDestroyed: false },
    { id: getId(), value: 4, r: 3, c: 3, isNew: false, isMerged: false, isDestroyed: false }
];

console.log("Testing LEFT move on initial state:");
let result = move(tiles, 'LEFT');

const printBoard = (t: Tile[]) => {
    const board = Array(4).fill(0).map(() => Array(4).fill(0));
    t.filter(tile => !tile.isDestroyed).forEach(tile => {
        board[tile.r][tile.c] = tile.value;
    });
    console.table(board);
};

console.log("Original board:");
printBoard(tiles);

console.log("Board after 1 LEFT move:");
printBoard(result.tiles);

let temp = result.tiles;
result = move(temp, 'LEFT');
console.log("Board after 2 LEFT moves:");
printBoard(result.tiles);

result = move(result.tiles, 'LEFT');
console.log("Board after 3 LEFT moves:");
printBoard(result.tiles);

console.log("\nIf we test UP from original:");
printBoard(move(tiles, 'UP').tiles);

console.log("\nIf we test DOWN from original:");
printBoard(move(tiles, 'DOWN').tiles);

console.log("\nIf we test RIGHT from original:");
printBoard(move(tiles, 'RIGHT').tiles);


