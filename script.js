const COLS = ['A','B','C','D','E','F','G','H','I','J'];
const ROWS = [1,2,3,4,5,6,7,8,9,10];

const SHIPS_CONFIG = [
  { name: 'Carrier',    size: 5, id: 'carrier'    },
  { name: 'Battleship', size: 4, id: 'battleship' },
  { name: 'Cruiser',    size: 3, id: 'cruiser'    },
  { name: 'Submarine',  size: 3, id: 'submarine'  },
  { name: 'Destroyer',  size: 2, id: 'destroyer'  },
];

//Create the starting state of the game
let state = {};

function createBoard() {
  const b = [];
  for (let r = 0; r < 10; r++) {
    b[r] = [];
    for (let c = 0; c < 10; c++) b[r][c] = { ship: null, hit: false };
  }
  return b;
}

function createPlayer(name) {
  return { name, board: createBoard(), ships: [], shipsPlaced: [], hits: 0, misses: 0 };
}

function resetState() {
  state = {
    phase: 'placement',
    placementStep: 0,
    turn: 0,
    players: [createPlayer('PLAYER 1'), createPlayer('PLAYER 2')],
    selectedShipId: null,
    orientation: 'H',
    winner: null,
  };
}

function placer()   { return state.players[state.placementStep]; }
function attacker() { return state.players[state.turn]; }
function defender() { return state.players[1 - state.turn]; }
function $(id)      { return document.getElementById(id); }

function setMsg(msg, color) {
  $('message-box').textContent = msg;
  $('message-box').style.color = color || 'var(--accent)';
}
function setPhase(txt) { $('phase-label').textContent = txt; }
function show(id) { $(id).style.display = 'block'; }
function hide(id) { $(id).style.display = 'none'; }

function updateIndicators() {
  const active = state.phase === 'battle' ? state.turn : state.placementStep;
  $('p1-indicator').classList.toggle('active', active === 0);
  $('p2-indicator').classList.toggle('active', active === 1);
}

// Create the axis labels for both grids
function buildAxisLabels() {
  ['p1', 'p2'].forEach(side => {
    const colEl = $(`${side}-col-labels`);
    const rowEl = $(`${side}-row-labels`);
    colEl.innerHTML = '';
    rowEl.innerHTML = '';
    COLS.forEach(c => {
      const d = document.createElement('div');
      d.className = 'col-label'; d.textContent = c; colEl.appendChild(d);
    });
    ROWS.forEach(r => {
      const d = document.createElement('div');
      d.className = 'row-label'; d.textContent = r; rowEl.appendChild(d);
    });
  });
}

function buildCells(gridId) {
  const grid = $(gridId);
  grid.innerHTML = '';
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell empty';
      cell.dataset.r = r;
      cell.dataset.c = c;
      grid.appendChild(cell);
    }
  }
}

function setupGridListeners() {
  const p1Grid = $('p1-grid');
  const p2Grid = $('p2-grid');

  // Create the list of actions that will happen for player 1 when they hover over player2's grid
  p1Grid.addEventListener('click', e => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    if (state.phase === 'placement') {
      placeShip(+cell.dataset.r, +cell.dataset.c);
    } else if (state.phase === 'battle' && state.turn === 1) {
      attackCell(+cell.dataset.r, +cell.dataset.c);
    }
  });

  p1Grid.addEventListener('mouseover', e => {
    const cell = e.target.closest('.cell');
    if (!cell || state.phase !== 'placement') return;
    clearPreview();
    showPreview(+cell.dataset.r, +cell.dataset.c);
  });

  p1Grid.addEventListener('mouseout', e => {
    if (state.phase === 'placement') clearPreview();
  });

  p1Grid.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (state.phase === 'placement') toggleOrientation();
  });

  // Create the list of actions that will happen for player 2 when they hover over player1's grid
  p2Grid.addEventListener('click', e => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    if (state.phase === 'placement' && state.placementStep === 1) {
      placeShip(+cell.dataset.r, +cell.dataset.c);
    } else if (state.phase === 'battle' && state.turn === 0) {
      attackCell(+cell.dataset.r, +cell.dataset.c);
    }
  });

  p2Grid.addEventListener('mouseover', e => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    if (state.phase === 'placement' && state.placementStep === 1) {
      clearPreview();
      showPreview(+cell.dataset.r, +cell.dataset.c);
    }
  });

  p2Grid.addEventListener('mouseout', e => {
    if (state.phase === 'placement' && state.placementStep === 1) clearPreview();
  });

  p2Grid.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (state.phase === 'placement') toggleOrientation();
  });
}

function getCell(gridId, r, c) {
  return $(gridId).querySelector(`[data-r="${r}"][data-c="${c}"]`);
}

function placerGridId() {
  return state.placementStep === 0 ? 'p1-grid' : 'p2-grid';
}

function clearPreview() {
  const gId = placerGridId();
  $(gId).querySelectorAll('.ship-preview,.ship-preview-invalid').forEach(cell => {
    cell.classList.remove('ship-preview', 'ship-preview-invalid');
  });
}

function showPreview(r, c) {
  if (!state.selectedShipId) return;
  const cfg   = SHIPS_CONFIG.find(s => s.id === state.selectedShipId);
  const board = placer().board;
  const cells = shipCells(r, c, cfg.size, state.orientation);
  const valid = canPlace(board, r, c, cfg.size, state.orientation);
  const gId   = placerGridId();

  cells.forEach(([cr, cc]) => {
    if (cr >= 0 && cr < 10 && cc >= 0 && cc < 10) {
      getCell(gId, cr, cc).classList.add(valid ? 'ship-preview' : 'ship-preview-invalid');
    }
  });
}

function shipCells(r, c, size, orientation) {
  const cells = [];
  for (let i = 0; i < size; i++)
    cells.push(orientation === 'H' ? [r, c + i] : [r + i, c]);
  return cells;
}

function canPlace(board, r, c, size, orientation) {
  return shipCells(r, c, size, orientation).every(([cr, cc]) =>
    cr >= 0 && cr < 10 && cc >= 0 && cc < 10 && !board[cr][cc].ship
  );
}

function renderBoard(gridId, player, hideShips) {
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const cell = getCell(gridId, r, c);
      const data = player.board[r][c];
      cell.className = 'cell';
      cell.innerHTML = '';

      if (data.hit && data.ship) {
        const ship = player.ships.find(s => s.id === data.ship);
        cell.classList.add(ship && ship.sunk ? 'sunk' : 'hit');
        addMark(cell, 'hit-mark');
      } else if (data.hit && !data.ship) {
        cell.classList.add('miss');
        addMark(cell, 'miss-mark');
      } else if (data.ship && !hideShips) {
        const ship = player.ships.find(s => s.id === data.ship);
        cell.classList.add(ship && ship.sunk ? 'sunk' : 'ship');
      } else {
        cell.classList.add('empty');
      }
    }
  }
}

function addMark(cell, cls) {
  if (!cell.querySelector('.' + cls)) {
    const m = document.createElement('div'); m.className = cls; cell.appendChild(m);
  }
}

function renderScores() {
  $('p1-hits').textContent   = state.players[0].hits;
  $('p1-misses').textContent = state.players[0].misses;
  $('p2-hits').textContent   = state.players[1].hits;
  $('p2-misses').textContent = state.players[1].misses;
}

//Create the list of ships that will be used
function buildShipList() {
  const list   = $('ship-list');
  list.innerHTML = '';
  const placed = placer().shipsPlaced;

  SHIPS_CONFIG.forEach(cfg => {
    const item = document.createElement('div');
    item.className = 'ship-item';
    item.id = `ship-item-${cfg.id}`;
    if (placed.includes(cfg.id))         item.classList.add('placed');
    if (state.selectedShipId === cfg.id) item.classList.add('selected');

    const icon = document.createElement('div'); icon.className = 'ship-icon';
    for (let i = 0; i < cfg.size; i++) {
      const seg = document.createElement('div'); seg.className = 'ship-seg'; icon.appendChild(seg);
    }
    const nameEl = document.createElement('span'); nameEl.className = 'ship-name'; nameEl.textContent = cfg.name;
    const sizeEl = document.createElement('span'); sizeEl.className = 'ship-size'; sizeEl.textContent = cfg.size;
    item.appendChild(icon); item.appendChild(nameEl); item.appendChild(sizeEl);

    item.addEventListener('click', () => {
      if (!placer().shipsPlaced.includes(cfg.id)) selectShip(cfg.id);
    });
    list.appendChild(item);
  });
}

function selectShip(id) {
  state.selectedShipId = id;
  buildShipList();
  const cfg = SHIPS_CONFIG.find(s => s.id === id);
  setMsg(`Placing ${cfg.name} (size ${cfg.size}) — click grid to place`);
}

function toggleOrientation() {
  state.orientation = state.orientation === 'H' ? 'V' : 'H';
  const btn = $('orient-btn');
  btn.textContent = state.orientation === 'H' ? '⟷ HORIZONTAL' : '⟸ VERTICAL';
  btn.className   = state.orientation === 'H' ? 'horizontal' : 'vertical';
}

//Figure out how the placement of ships will be coordinated on grids
function placeShip(r, c) {
  if (!state.selectedShipId) {
    setMsg('Select a ship from the list first!', 'var(--accent2)'); return;
  }
  const cfg   = SHIPS_CONFIG.find(s => s.id === state.selectedShipId);
  const p     = placer();
  const gId   = placerGridId();

  if (!canPlace(p.board, r, c, cfg.size, state.orientation)) {
    setMsg('Invalid placement! Ships cannot overlap or go off-grid.', 'var(--accent2)');
    shakeGrid(gId); return;
  }

  const cells = shipCells(r, c, cfg.size, state.orientation);
  cells.forEach(([cr, cc]) => { p.board[cr][cc].ship = state.selectedShipId; });
  p.ships.push({ id: state.selectedShipId, cells, sunk: false });
  p.shipsPlaced.push(state.selectedShipId);

  clearPreview();
  state.selectedShipId = null;
  buildShipList();
  renderBoard(gId, p, false);

  cells.forEach(([cr, cc], i) => {
    const cell = getCell(gId, cr, cc);
    setTimeout(() => {
      cell.style.animation = 'none';
      cell.offsetHeight;
      cell.style.animation = 'hitFlash 0.4s ease-out';
    }, i * 60);
  });

  const next = SHIPS_CONFIG.find(s => !p.shipsPlaced.includes(s.id));
  if (next) {
    selectShip(next.id);
  } else {
    setMsg('All ships placed! Click READY TO BATTLE.', 'var(--gold)');
    show('ready-btn');
  }
  show('reset-btn');
}

function resetPlacement() {
  const p   = placer();
  const gId = placerGridId();
  p.board       = createBoard();
  p.ships       = [];
  p.shipsPlaced = [];
  state.selectedShipId = null;
  clearPreview();
  buildShipList();
  renderBoard(gId, p, false);
  hide('ready-btn');
  hide('reset-btn');
  setMsg('Fleet reset. Select a ship to place.');
  selectShip(SHIPS_CONFIG[0].id);
}

function shakeGrid(id) {
  const g = $(id);
  g.style.animation = 'none'; g.offsetHeight;
  g.style.animation = 'shake 0.3s ease-out';
}

function readyUp() {
  if (placer().shipsPlaced.length < SHIPS_CONFIG.length) {
    setMsg('Place all ships first!', 'var(--accent2)'); return;
  }
  if (state.placementStep === 0) {
    state.placementStep = 1;
    showPassScreen('PASS TO PLAYER 2', "Player 2, it's your turn to place your fleet!<br>Don't let Player 1 see!");
  } else {
    startBattle();
  }
}

//Create the screen to pass the computer to one player to another
function showPassScreen(title, desc) {
  $('pass-title').textContent = title;
  $('pass-desc').innerHTML    = desc;
  $('pass-screen').classList.add('visible');
}

function confirmPass() {
  $('pass-screen').classList.remove('visible');
  if (state.phase === 'placement') {
    setupPlacementView();
  } else {
    setupBattleView();
  }
}

function setupPlacementView() {
  state.selectedShipId = null;
  state.orientation    = 'H';
  $('orient-btn').textContent    = '⟷ HORIZONTAL';
  $('orient-btn').className      = 'horizontal';
  $('orient-btn').style.display  = '';

  const p   = placer();
  const gId = placerGridId();

  buildCells(gId);
  renderBoard(gId, p, false);

  const otherGId = gId === 'p1-grid' ? 'p2-grid' : 'p1-grid';
  buildCells(otherGId);

  hide('ready-btn');
  hide('reset-btn');
  hide('score-box');
  hide('forfeit-btn');

  updateIndicators();
  setPhase(`${p.name} — FLEET DEPLOYMENT`);
  $('p1-label').textContent = state.placementStep === 0 ? 'YOUR FLEET'      : "PLAYER 1'S FLEET";
  $('p2-label').textContent = state.placementStep === 1 ? 'YOUR FLEET'      : "PLAYER 2'S FLEET";

  buildShipList();
  setMsg(`${p.name}: Select a ship and place it on your grid.`);
  selectShip(SHIPS_CONFIG[0].id);
}
//Begin the game
function startBattle() {
  state.phase = 'battle';
  state.turn  = 0;
  showPassScreen('BATTLE BEGINS!', "Player 1, you fire first!<br>Cover the screen while passing.");
}

function setupBattleView() {
  const atkGridId = state.turn === 0 ? 'p1-grid' : 'p2-grid';
  const defGridId = state.turn === 0 ? 'p2-grid' : 'p1-grid';

  buildCells(atkGridId);
  buildCells(defGridId);

  renderBoard(atkGridId, attacker(), false);
  renderBoard(defGridId, defender(), true);

  $(atkGridId).classList.remove('attack-mode');
  $(defGridId).classList.add('attack-mode');

  $('ship-list').innerHTML      = '';
  $('orient-btn').style.display = 'none';
  hide('ready-btn');
  hide('reset-btn');
  show('score-box');
  show('forfeit-btn');

  renderScores();
  updateIndicators();
  setPhase(`${attacker().name} — ATTACK PHASE`);
  $('p1-label').textContent = state.turn === 0 ? 'YOUR FLEET'       : "PLAYER 1'S WATERS";
  $('p2-label').textContent = state.turn === 1 ? 'YOUR FLEET'       : "PLAYER 2'S WATERS";
  setMsg(`${attacker().name}: Click ${defender().name}'s grid to fire!`);
}

//Attacking will be conducted 
function attackCell(r, c) {
  const def       = defender();
  const atk       = attacker();
  const data      = def.board[r][c];
  const defGridId = state.turn === 0 ? 'p2-grid' : 'p1-grid';

  if (data.hit) {
    setMsg('Already fired here! Choose another target.', 'var(--accent2)'); return;
  }

  data.hit = true;
  const domCell = getCell(defGridId, r, c);

  if (data.ship) {
    atk.hits++;
    domCell.classList.remove('empty');
    domCell.classList.add('hit');
    addMark(domCell, 'hit-mark');
    addExplosion(domCell);
    setMsg(`💥 HIT! ${atk.name} scores!`, 'var(--hit)');

    const ship = def.ships.find(s => s.id === data.ship);
    if (ship && ship.cells.every(([sr, sc]) => def.board[sr][sc].hit)) {
      ship.sunk = true;
      ship.cells.forEach(([sr, sc]) => {
        const sc2 = getCell(defGridId, sr, sc);
        sc2.classList.remove('hit'); sc2.classList.add('sunk');
        setTimeout(() => addExplosion(sc2), Math.random() * 400);
      });
      const cfg = SHIPS_CONFIG.find(s => s.id === ship.id);
      setMsg(`🔥 ${atk.name} SUNK ${def.name}'s ${cfg.name}!`, 'var(--gold)');
      spawnParticles();
    }

    if (def.ships.every(s => s.sunk)) {
      setTimeout(() => endGame(state.turn), 800); return;
    }
    renderScores();
    //If a ship is hit then the attacker will go again

  } else {
    atk.misses++;
    domCell.classList.remove('empty');
    domCell.classList.add('miss');
    addMark(domCell, 'miss-mark');
    addRipple(domCell);
    setMsg(`~ Miss. ${def.name}'s turn.`, 'var(--miss)');
    renderScores();

    setTimeout(() => {
      state.turn = 1 - state.turn;
      showPassScreen(
        `PASS TO ${attacker().name}`,
        `${attacker().name}, it's your turn to fire!<br>Cover the screen while passing.`
      );
    }, 700);
  }
}

//
function addExplosion(cell) {
  const exp = document.createElement('div');
  exp.className = 'explosion';
  exp.innerHTML = `<svg viewBox="0 0 40 40" width="46" height="46">
    <circle cx="20" cy="20" r="8" fill="rgba(255,100,0,0.8)"/>
    ${[0,45,90,135,180,225,270,315].map((a,i)=>`
      <line x1="20" y1="20"
        x2="${20+Math.cos(a*Math.PI/180)*14}" y2="${20+Math.sin(a*Math.PI/180)*14}"
        stroke="rgba(255,${180-i*10},0,0.9)" stroke-width="${2-i*0.1}"/>`).join('')}
    <circle cx="20" cy="20" r="5" fill="rgba(255,255,200,0.9)"/>
  </svg>`;
  cell.appendChild(exp);
  setTimeout(() => exp.remove(), 900);
}

function addRipple(cell) {
  const r = document.createElement('div'); r.className = 'ripple';
  cell.appendChild(r); setTimeout(() => r.remove(), 900);
}

function spawnParticles(count = 12) {
  const emojis = ['💥','⭐','🌊','💫','🔥','✨','⚓'];
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const p = document.createElement('div');
      p.className = 'particle';
      p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      p.style.left = Math.random() * 100 + 'vw';
      p.style.top  = '-30px';
      p.style.animationDuration = (1.5 + Math.random() * 2) + 's';
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 4000);
    }, i * 80);
  }
}

//Once there is a winner there will be a screen that will show who won and their stats for the game
function endGame(winnerIdx) {
  state.phase = 'gameover';
  const win   = state.players[winnerIdx];
  const lose  = state.players[1 - winnerIdx];
  const shots = win.hits + win.misses;
  const rate  = shots > 0 ? Math.round(win.hits / shots * 100) : 0;

  $('win-title').textContent = `${win.name} WINS!`;
  $('win-title').style.color = winnerIdx === 0 ? 'var(--accent)' : 'var(--accent2)';
  $('win-name').textContent  = win.name;
  $('win-shots').textContent = shots;
  $('win-rate').textContent  = `${rate}%`;
  $('win-sunk').textContent  = `${lose.ships.filter(s=>s.sunk).length}/${SHIPS_CONFIG.length}`;
  $('win-screen').classList.add('visible');
  spawnParticles(30);
}

function forfeit() {
  if (state.phase !== 'battle') return;
  if (window.confirm(`${attacker().name} forfeits? The other player wins.`))
    endGame(1 - state.turn);
}

document.addEventListener('keydown', e => {
  if ((e.key === 'r' || e.key === 'R') && state.phase === 'placement') toggleOrientation();
});

function initGame() {
  $('win-screen').classList.remove('visible');
  $('pass-screen').classList.remove('visible');

  resetState();
  buildAxisLabels();
  buildCells('p1-grid');
  buildCells('p2-grid');

  if (!initGame._listenersAttached) {
    setupGridListeners();
    initGame._listenersAttached = true;
  }

  hide('score-box');
  hide('forfeit-btn');
  hide('ready-btn');
  hide('reset-btn');
  $('orient-btn').style.display = '';
  $('orient-btn').textContent   = '⟷ HORIZONTAL';
  $('orient-btn').className     = 'horizontal';

  updateIndicators();
  setPhase('PLAYER 1 — FLEET DEPLOYMENT');
  $('p1-label').textContent = 'YOUR FLEET';
  $('p2-label').textContent = "PLAYER 2'S FLEET";

  buildShipList();
  setMsg('PLAYER 1: Select a ship and place it on your grid.');
  selectShip(SHIPS_CONFIG[0].id);
}

window.addEventListener('load', initGame);