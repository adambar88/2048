import { move, Tile } from './src/gameLogic';

const testTiles: Tile[] = [
  { id: 1, value: 2, r: 0, c: 1 },
  { id: 2, value: 8, r: 0, c: 2 },
  { id: 3, value: 2, r: 0, c: 3 },
  { id: 4, value: 8, r: 1, c: 3 },
  { id: 5, value: 2, r: 2, c: 1 },
  { id: 6, value: 2, r: 2, c: 3 },
  { id: 7, value: 2, r: 3, c: 2 },
  { id: 8, value: 4, r: 3, c: 3 },
];

console.log("Initial state:");
testTiles.forEach(t => console.log(`Tile ID ${t.id}, Value ${t.value}, Row ${t.r}, Col ${t.c}`));

const resultLeft = move(testTiles, 'LEFT', 4);
console.log("\nAfter moving LEFT:");
resultLeft.tiles.filter(t => !t.isDestroyed).forEach(t => {
    console.log(`Tile ID ${t.id}, Value ${t.value}, Row ${t.r}, Col ${t.c}${t.isMerged ? ' (Merged)' : ''}`);
});

const resultUp = move(testTiles, 'UP', 4);
console.log("\nAfter moving UP:");
resultUp.tiles.filter(t => !t.isDestroyed).forEach(t => {
    console.log(`Tile ID ${t.id}, Value ${t.value}, Row ${t.r}, Col ${t.c}${t.isMerged ? ' (Merged)' : ''}`);
});

const resultDown = move(testTiles, 'DOWN', 4);
console.log("\nAfter moving DOWN:");
resultDown.tiles.filter(t => !t.isDestroyed).forEach(t => {
    console.log(`Tile ID ${t.id}, Value ${t.value}, Row ${t.r}, Col ${t.c}${t.isMerged ? ' (Merged)' : ''}`);
});
