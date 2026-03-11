import { move, Tile } from './src/gameLogic';

const testTiles: Tile[] = [
  { id: 1, value: 8, r: 1, c: 0 },
  { id: 2, value: 8, r: 1, c: 3 },
];

console.log("Initial state:");
testTiles.forEach(t => console.log(`Tile ID ${t.id}, Value ${t.value}, Row ${t.r}, Col ${t.c}`));

const resultLeft = move(testTiles, 'LEFT', 4);
console.log("\nAfter moving LEFT:");
resultLeft.tiles.filter(t => !t.isDestroyed).forEach(t => {
    console.log(`Tile ID ${t.id}, Value ${t.value}, Row ${t.r}, Col ${t.c}${t.isMerged ? ' (Merged)' : ''}`);
});

const resultRight = move(testTiles, 'RIGHT', 4);
console.log("\nAfter moving RIGHT:");
resultRight.tiles.filter(t => !t.isDestroyed).forEach(t => {
    console.log(`Tile ID ${t.id}, Value ${t.value}, Row ${t.r}, Col ${t.c}${t.isMerged ? ' (Merged)' : ''}`);
});
