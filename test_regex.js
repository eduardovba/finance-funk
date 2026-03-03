const fs = require('fs');
const ds11Data = fs.readFileSync('ds11.txt', 'utf8');
const pointsMatch = ds11Data.match(/\[\d+\.?\d*,\s*[-+]?\d+\.?\d*,\s*([-+]?\d+\.?\d*),\s*2,\s*2,\s*[23]\]/g);
console.log("pointsMatch:", pointsMatch);
