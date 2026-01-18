// Simple Tetris — single-file core logic for easy editing.
// Features: 10x20 grid, 7-bag, hold, next queue, ghost, basic rotation kicks.

// ------------ CONFIG ------------
const COLS = 10;
const ROWS = 20;
const BLOCK = 30; // pixel size (canvas uses these to draw)
const NEXT_COUNT = 5;
const DROP_INTERVAL_BASE = 1000; // ms at level 1
const LEVEL_DROP_MULTIPLIER = 0.85; // how much faster each level gets

// scoring: classic-ish
const SCORE_TABLE = { 1: 100, 2: 300, 3: 500, 4: 800 };

// colors for tetrominoes
const COLORS = {
  I: '#00f0f0',
  J: '#0000f0',
  L: '#f0a000',
  O: '#f0f000',
  S: '#00f000',
  T: '#a000f0',
  Z: '#f00000',
  X: '#6c7c86' // for ghost
};

// ------------ DOM & CANVAS ------------
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
canvas.width = COLS * BLOCK;
canvas.height = ROWS * BLOCK;

const holdCanvas = document.getElementById('hold');
const holdCtx = holdCanvas.getContext('2d');
holdCanvas.width = 4 * BLOCK;
holdCanvas.height = 4 * BLOCK;

const nextContainer = document.getElementById('next');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const btnStart = document.getElementById('btn-start');
const btnPause = document.getElementById('btn-pause');

// ------------ TETROMINO DATA (rotations as arrays of [x,y]) ------------
const TETROMINOES = {
  I: [
    [[-1,0],[0,0],[1,0],[2,0]],
    [[1,-1],[1,0],[1,1],[1,2]],
    [[-1,1],[0,1],[1,1],[2,1]],
    [[0,-1],[0,0],[0,1],[0,2]]
  ],
  J: [
    [[-1,0],[0,0],[1,0],[1,1]],
    [[0,-1],[0,0],[0,1],[1,-1]],
    [[-1,-1],[-1,0],[0,0],[1,0]],
    [[-1,1],[0,-1],[0,0],[0,1]]
  ],
  L: [
    [[-1,0],[0,0],[1,0],[-1,1]],
    [[0,-1],[0,0],[0,1],[1,1]],
    [[1,-1],[-1,0],[0,0],[1,0]],
    [[-1,-1],[0,-1],[0,0],[0,1]]
  ],
  O: [
    [[0,0],[1,0],[0,1],[1,1]],
    [[0,0],[1,0],[0,1],[1,1]],
    [[0,0],[1,0],[0,1],[1,1]],
    [[0,0],[1,0],[0,1],[1,1]]
  ],
  S: [
    [[-1,1],[0,1],[0,0],[1,0]],
    [[0,-1],[0,0],[1,0],[1,1]],
    [[-1,1],[0,1],[0,0],[1,0]],
    [[0,-1],[0,0],[1,0],[1,1]]
  ],
  T: [
    [[-1,0],[0,0],[1,0],[0,1]],
    [[0,-1],[0,0],[0,1],[1,0]],
    [[0,-1],[-1,0],[0,0],[1,0]],
    [[-1,0],[0,-1],[0,0],[0,1]]
  ],
  Z: [
    [[-1,0],[0,0],[0,1],[1,1]],
    [[1,-1],[0,0],[1,0],[0,1]],
    [[-1,0],[0,0],[0,1],[1,1]],
    [[1,-1],[0,0],[1,0],[0,1]]
  ]
};

const BAG = ['I','J','L','O','S','T','Z'];

// ------------ GAME STATE ------------
let grid = createGrid(COLS, ROWS);
let bag = [];
let queue = [];
let current = null;
let hold = null;
let canHold = true;
let score = 0;
let lines = 0;
let level = 1;
let dropCounter = 0;
let dropInterval = DROP_INTERVAL_BASE;
let lastTime = 0;
let paused = false;
let gameOver = false;

// ------------ HELPERS ------------
function createGrid(c,w) {
  const out = [];
  for (let y=0;y<w;y++){
    out[y]=new Array(c).fill(0);
  }
  return out;
}

function randBag() {
  const arr = BAG.slice();
  // fisher-yates
  for (let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

function spawnNext() {
  if (queue.length < NEXT_COUNT) {
    if (bag.length === 0) bag = randBag();
    queue.push(...bag.splice(0, Math.min(7, NEXT_COUNT - queue.length)));
  }
  const id = queue.shift();
  const piece = {
    id,
    rotation: 0,
    x: Math.floor(COLS/2),
    y: 0
  };
  current = piece;
  // position adjust so piece spawns slightly higher for some pieces
  if (id === 'I') current.y = -1;
  if (id === 'O') current.y = 0;
  canHold = true;

  // check immediate collision -> game over
  if (collides(current, 0, 0)) {
    gameOver = true;
    paused = true;
  }

  // refill queue
  while (queue.length < NEXT_COUNT) {
    if (bag.length === 0) bag = randBag();
    queue.push(bag.shift());
  }
  renderNext();
}

function collides(piece, dx=0, dy=0, rot=null) {
  const r = rot === null ? piece.rotation : rot;
  const shape = TETROMINOES[piece.id][r];
  for (const [sx,sy] of shape){
    const x = piece.x + sx + dx;
    const y = piece.y + sy + dy;
    if (x < 0 || x >= COLS || y >= ROWS) return true;
    if (y >= 0 && grid[y][x]) return true;
  }
  return false;
}

function lockPiece() {
  const shape = TETROMINOES[current.id][current.rotation];
  for (const [sx,sy] of shape){
    const x = current.x + sx;
    const y = current.y + sy;
    if (y >= 0 && y < ROWS && x >=0 && x < COLS) {
      grid[y][x] = current.id;
    }
  }
  const cleared = clearLines();
  if (cleared > 0) {
    score += SCORE_TABLE[cleared] * level;
    lines += cleared;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, DROP_INTERVAL_BASE * Math.pow(LEVEL_DROP_MULTIPLIER, level-1));
  }
  spawnNext();
}

function clearLines() {
  let cleared = 0;
  outer: for (let y = ROWS - 1; y >= 0; y--) {
    for (let x = 0; x < COLS; x++) {
      if (!grid[y][x]) continue outer;
    }
    // row full
    grid.splice(y,1);
    grid.unshift(new Array(COLS).fill(0));
    cleared++;
    y++; // recheck same row index after shift
  }
  return cleared;
}

// simple wall kick attempts
const KICKS = [[0,0],[ -1,0 ],[1,0],[ -2,0 ],[2,0],[0,-1],[0,1]];

function rotate(dir) {
  const oldRot = current.rotation;
  const newRot = (current.rotation + dir + 4) % 4;
  for (const [kx,ky] of KICKS){
    if (!collides(current, kx, ky, newRot)) {
      current.x += kx;
      current.y += ky;
      current.rotation = newRot;
      return;
    }
  }
  // if all kicks fail — no rotate
}

function hardDrop() {
  while (!collides(current,0,1)) {
    current.y++;
  }
  // lock
  lockPiece();
  score += 2; // small reward for hard drop
}

function softDrop() {
  if (!collides(current,0,1)) {
    current.y++;
    score += 1;
  } else {
    lockPiece();
  }
}

function holdPiece(){
  if (!canHold) return;
  if (!hold) {
    hold = { id: current.id };
    spawnNext();
  } else {
    const old = hold.id;
    hold.id = current.id;
    // place old as current
    current = { id: old, rotation:0, x: Math.floor(COLS/2), y: 0 };
    if (old === 'I') current.y = -1;
    if (collides(current,0,0)) {
      gameOver = true;
      paused = true;
    }
  }
  canHold = false;
  renderHold();
}

// draw helpers
function drawCell(ctx2, x, y, color, alpha=1){
  ctx2.globalAlpha = alpha;
  ctx2.fillStyle = color;
  ctx2.fillRect(x*BLOCK, y*BLOCK, BLOCK-1, BLOCK-1);
  ctx2.globalAlpha = 1;
}

function drawGrid(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // --------- placed blocks ----------
  for (let y=0;y<ROWS;y++){
    for (let x=0;x<COLS;x++){
      if (grid[y][x]) {
        drawCell(ctx, x, y, COLORS[grid[y][x]]);
      }
    }
  }

  // --------- ghost (current position) ----------
  const ghostY = computeGhostY();
  let shape = TETROMINOES[current.id][current.rotation];
  ctx.globalAlpha = 0.25;
  for (const [sx,sy] of shape){
    const x = current.x + sx;
    const y = ghostY + sy;
    if (y >= 0) drawCell(ctx, x, y, COLORS.X, 0.25);
  }
  ctx.globalAlpha = 1;

  // --------- BEST PLACEMENT HIGHLIGHT ----------
  const best = computeBestPlacement();
  if (best){
    const bestShape = TETROMINOES[current.id][best.rot];
    ctx.globalAlpha = 0.35;
    for (const [sx,sy] of bestShape){
      const x = best.x + sx;
      const y = best.y + sy;
      if (y >= 0) {
        drawCell(ctx, x, y, COLORS[current.id], 0.35);
      }
    }
    ctx.globalAlpha = 1;
  }

  // --------- current piece ----------
  for (const [sx,sy] of shape){
    const x = current.x + sx;
    const y = current.y + sy;
    if (y >= 0) drawCell(ctx, x, y, COLORS[current.id]);
  }

  // --------- grid lines ----------
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  for (let x=0;x<=COLS;x++){
    ctx.beginPath();
    ctx.moveTo(x*BLOCK,0);
    ctx.lineTo(x*BLOCK,ROWS*BLOCK);
    ctx.stroke();
  }
  for (let y=0;y<=ROWS;y++){
    ctx.beginPath();
    ctx.moveTo(0,y*BLOCK);
    ctx.lineTo(COLS*BLOCK,y*BLOCK);
    ctx.stroke();
  }
}

function computeGhostY(){
  let gy = current.y;
  while (!collides(current,0,gy - current.y + 1)){
    gy++;
    if (gy > ROWS) break;
  }
  return gy;
}

function renderNext(){
  nextContainer.innerHTML = '';
  for (let i=0;i<NEXT_COUNT;i++){
    const id = queue[i] || '';
    const item = document.createElement('div');
    item.className = 'next-item';
    item.textContent = id;
    item.style.color = id ? COLORS[id] : '#fff';
    nextContainer.appendChild(item);
  }
}

function renderHold(){
  holdCtx.clearRect(0,0,holdCanvas.width,holdCanvas.height);
  if (!hold) return;
  const id = hold.id;
  const shape = TETROMINOES[id][0];
  holdCtx.fillStyle = COLORS[id];
  for (const [sx,sy] of shape){
    holdCtx.fillRect((sx+1)*BLOCK, (sy+1)*BLOCK, BLOCK-2, BLOCK-2);
  }
}

function updateScoreUI(){
  scoreEl.textContent = score;
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

// ------------ INPUT ------------
document.addEventListener('keydown', (e)=>{
  if (gameOver) return;
  if (e.repeat) return;
  switch(e.key){
    case 'ArrowLeft':
      if (!collides(current,-1,0)) current.x--;
      break;
    case 'ArrowRight':
      if (!collides(current,1,0)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case ' ':
      e.preventDefault();
      hardDrop();
      break;
    case 'z':
    case 'Z':
      rotate(-1);
      break;
    case 'x':
    case 'X':
    case 'ArrowUp':
      rotate(1);
      break;
    case 'c':
    case 'C':
      holdPiece();
      break;
    case 'p':
    case 'P':
      togglePause();
      break;
  }
});

btnStart.addEventListener('click', startGame);
btnPause.addEventListener('click', togglePause);

function togglePause(){
  if (gameOver) return;
  paused = !paused;
  btnPause.textContent = paused ? 'Resume' : 'Pause';
  if (!paused) {
    lastTime = performance.now();
    update();
  }
}

function startGame(){
  grid = createGrid(COLS, ROWS);
  bag = randBag();
  queue = [];
  for (let i=0;i<NEXT_COUNT;i++) queue.push(bag.shift());
  current = null;
  hold = null;
  canHold = true;
  score = 0;
  lines = 0;
  level = 1;
  dropInterval = DROP_INTERVAL_BASE;
  paused = false;
  gameOver = false;
  spawnNext();
  renderHold();
  lastTime = performance.now();
  update();
}

// ------------ MAIN LOOP ------------
function update(time = performance.now()){
  if (paused) return;
  const delta = time - lastTime;
  lastTime = time;
  dropCounter += delta;
  if (dropCounter > dropInterval) {
    dropCounter = 0;
    if (!collides(current,0,1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  drawGrid();
  updateScoreUI();
  if (!gameOver) requestAnimationFrame(update);
  else {
    // simple game over display
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, (canvas.height/2)-40, canvas.width, 80);
    ctx.fillStyle = 'white';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 + 8);
  }
}

// start automatically
startGame();

// Expose for console tweaking
window.Tetris = {
  grid, startGame, togglePause
};

// ================================
// NAV-STYLE AUTOMATION (NO AI)
// ================================

let assistSuggestion = null;

// ---- heuristics helpers ----
function cloneGrid(g){
  return g.map(r => r.slice());
  
}

function countHoles(g){
  let holes = 0;
  for (let x=0;x<COLS;x++){
    let seen = false;
    for (let y=0;y<ROWS;y++){
      if (g[y][x]) seen = true;
      else if (seen) holes++;
    }
  }
  return holes;
}

function clearLines(){
  let cleared = 0;

  // crée un nouveau tableau filtré
  const newGrid = grid.filter(row => !row.every(cell => cell));

  cleared = ROWS - newGrid.length; // nombre de lignes supprimées

  // ajoute les lignes vides en haut
  while(newGrid.length < ROWS){
    newGrid.unshift(new Array(COLS).fill(0));
  }

  grid = newGrid;
  return cleared;
}



function maxHeight(g){
  for (let y=0;y<ROWS;y++){
    for (let x=0;x<COLS;x++){
      if (g[y][x]) return ROWS - y;
    }
  }
  return 0;
}

// ---- simulate drop ----
function simulateDrop(piece, testX){
  let test = {
    id: piece.id,
    rotation: piece.rotation,
    x: testX,
    y: piece.y
  };

  while (!collides(test,0,1)) test.y++;
  if (collides(test,0,0)) return null;

  const g = cloneGrid(grid);
  const shape = TETROMINOES[test.id][test.rotation];

  for (const [sx,sy] of shape){
    const x = test.x + sx;
    const y = test.y + sy;
    if (y >= 0 && y < ROWS) g[y][x] = test.id;
  }

  return g;
}

// ---- best column only ----
function computeBestColumn(){
  let best = null;
  let bestScore = -Infinity;

  for (let x=0;x<COLS;x++){
    const g = simulateDrop(current, x);
    if (!g) continue;

const g2 = cloneGrid(g);
const lines = clearLines(g2);

const holes = countHoles(g2);
const height = maxHeight(g2);

const score =
  (lines * 8) -
  (holes * 5) -
  (height * 1.5);


    if (score > bestScore){
      bestScore = score;
      best = { x, score, holes, height, lines };
    }
  }
  return best;
}

// ---- reason label ----
function assistReason(m){
  if (m.lines >= 3) return "Prépare lignes";
  if (m.holes > 0) return "Réduit trous";
  if (m.height > 14) return "Réduit hauteur";
  return "Stabilise surface";
}

// ---- when to suggest ----
function maybeSuggest(){
  const h = maxHeight(grid);
  const holes = countHoles(grid);

  if (h < 14 && holes < 2){
    assistSuggestion = null;
    document.getElementById('assist-suggestion').textContent = "—";
    document.getElementById('assist-reason').textContent = "";
    return;
  }

  const m = computeBestColumn();
  if (!m) return;

  assistSuggestion = m;
  document.getElementById('assist-suggestion').textContent =
    `Colonne ${m.x}`;
  document.getElementById('assist-reason').textContent =
    assistReason(m);
}

// ---- accept explicitly ----
function acceptAssist(){
  if (!assistSuggestion) return;
  current.x = assistSuggestion.x;
  assistSuggestion = null;
  document.getElementById('assist-suggestion').textContent = "—";
  document.getElementById('assist-reason').textContent = "";
}

// ---- hook into game ----
const oldSpawn = spawnNext;
spawnNext = function(){
  oldSpawn();
  maybeSuggest();
};

// ---- input ----
document.addEventListener('keydown', e=>{
  if (e.key === 'a' || e.key === 'A'){
    acceptAssist();
  }
});


// ================================
// BEST PLACEMENT AUTOMATION (NAV)
// ================================

let bestPlacement = null;

// ------------------------------
// AI Highlight Logic (NAV-style)
// ------------------------------

function cloneGrid(g){
  return g.map(r => r.slice());
}

// compte les trous
function countHoles(g){
  let holes = 0;
  for (let x=0; x<COLS; x++){
    let blockSeen = false;
    for (let y=0; y<ROWS; y++){
      if (g[y][x]) blockSeen = true;
      else if (blockSeen) holes++;
    }
  }
  return holes;
}

// hauteur maximale
function maxHeight(g){
  for (let y=0; y<ROWS; y++){
    for (let x=0; x<COLS; x++){
      if (g[y][x]) return ROWS - y;
    }
  }
  return 0;
}

// simule la pièce tombant à x avec rotation rot
function simulatePlacement(piece, rot, xPos){
  const test = { id: piece.id, rotation: rot, x: xPos, y: piece.y };
  while (!collides(test,0,1)) test.y++;
  if (collides(test,0,0)) return null;

  const g = cloneGrid(grid);
  const shape = TETROMINOES[test.id][rot];
  for (const [sx,sy] of shape){
    const px = test.x + sx;
    const py = test.y + sy;
    if (py >= 0 && py < ROWS && px >=0 && px < COLS) {
      g[py][px] = test.id;
    }
  }

  // calcule lignes complètes après placement
  let linesCleared = 0;
  for (let y=0;y<ROWS;y++){
    if (g[y].every(v=>v)) linesCleared++;
  }

  const holes = countHoles(g);
  const height = maxHeight(g);

  // score inspiré du python: maximise lignes, minimise trous et hauteur
  const score = (linesCleared*10) - (holes*5) - height;

  return { grid: g, y: test.y, score };
}

// calcule le meilleur placement
function computeBestPlacement(){
  let best = null;
  let bestScore = -Infinity;

  for (let rot=0; rot<4; rot++){
    // on teste x de -2 à COLS+2 pour prendre en compte certaines rotations larges
    for (let x=-2; x<COLS+2; x++){
      const sim = simulatePlacement(current, rot, x);
      if (!sim) continue;

      if (sim.score > bestScore){
        bestScore = sim.score;
        best = { rot, x, y: sim.y };
      }
    }
  }

  return best;
}

