// ====== BASIC REFERENCES ======
const BOARD_SIZE = 8;

const boardGridEl = document.getElementById("board-grid");
const movesLogEl = document.getElementById("moves-log");
const currentTurnEl = document.getElementById("current-turn");
const newGameBtn = document.getElementById("new-game");

let selectedSquare = null;
let selectedPiece = null;
let currentTurn = "pink"; // pink ходит первым

// ====== ASSETS PATH ======
// ./pieces/game is life/pink/king.png и т.д.
function getPieceSrc(color, type) {
  return `./pieces/game is life/${color}/${type}.png`;
}

// ====== BOARD CREATION ======
function createBoardGrid() {
  boardGridEl.innerHTML = "";

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const square = document.createElement("div");
      square.classList.add("square");
      square.dataset.row = row;
      square.dataset.col = col;

      // цвет клетки (как настоящая шахматная доска)
      if ((row + col) % 2 === 0) {
        square.classList.add("light");
      } else {
        square.classList.add("dark");
      }

      square.addEventListener("click", onSquareClick);
      boardGridEl.appendChild(square);
    }
  }
}

function getSquare(row, col) {
  return boardGridEl.querySelector(
    `.square[data-row="${row}"][data-col="${col}"]`
  );
}

// ====== PIECES PLACEMENT ======
function placePiece(color, type, row, col) {
  const square = getSquare(row, col);
  if (!square) return;

  const img = document.createElement("img");
  img.classList.add("piece");
  img.dataset.color = color;
  img.dataset.type = type;
  img.src = getPieceSrc(color, type);

  square.innerHTML = "";
  square.appendChild(img);
}

function setupInitialPosition() {
  clearSelections();
  selectedSquare = null;
  selectedPiece = null;
  currentTurn = "pink";
  currentTurnEl.textContent = currentTurn;
  movesLogEl.innerHTML = "";

  const backRankOrder = [
    "tower",
    "hourse",
    "elephant",
    "queen",
    "king",
    "elephant",
    "hourse",
    "tower",
  ];

  // верх — cyan
  backRankOrder.forEach((type, col) => {
    placePiece("cyan", type, 0, col);
  });
  for (let col = 0; col < BOARD_SIZE; col++) {
    placePiece("cyan", "pawn", 1, col);
  }

  // низ — pink
  for (let col = 0; col < BOARD_SIZE; col++) {
    placePiece("pink", "pawn", 6, col);
  }
  backRankOrder.forEach((type, col) => {
    placePiece("pink", type, 7, col);
  });
}

// ====== SELECTION / MOVES ======
function clearSelections() {
  document.querySelectorAll(".piece.selected").forEach((p) => {
    p.classList.remove("selected");
  });
}

function onSquareClick(e) {
  const square = e.currentTarget;
  const piece = square.querySelector(".piece");

  // 1) Ничего не выбрано — выбираем свою фигуру
  if (!selectedPiece) {
    if (!piece) return;
    if (piece.dataset.color !== currentTurn) return;

    clearSelections();
    selectedPiece = piece;
    selectedSquare = square;
    piece.classList.add("selected");
    return;
  }

  // 2) Клик по той же клетке — снять выбор
  if (square === selectedSquare) {
    clearSelections();
    selectedPiece = null;
    selectedSquare = null;
    return;
  }

  const targetPiece = square.querySelector(".piece");

  // 3) Клик по своей фигуре в другой клетке — сменить выбор
  if (targetPiece && targetPiece.dataset.color === selectedPiece.dataset.color) {
    clearSelections();
    selectedPiece = targetPiece;
    selectedSquare = square;
    targetPiece.classList.add("selected");
    return;
  }

  // 4) Иначе — делаем ход
  makeMove(selectedSquare, square, selectedPiece);
}

function makeMove(fromSquare, toSquare, piece) {
  const fromRow = Number(fromSquare.dataset.row);
  const fromCol = Number(fromSquare.dataset.col);
  const toRow = Number(toSquare.dataset.row);
  const toCol = Number(toSquare.dataset.col);

  const fromNotation = toAlgebraic(fromRow, fromCol);
  const toNotation = toAlgebraic(toRow, toCol);
  const moveText = `${piece.dataset.type[0].toUpperCase()}: ${fromNotation} → ${toNotation}`;

  fromSquare.innerHTML = "";
  toSquare.innerHTML = "";
  toSquare.appendChild(piece);

  const li = document.createElement("li");
  li.textContent = `${currentTurn}: ${moveText}`;
  movesLogEl.appendChild(li);
  movesLogEl.scrollTop = movesLogEl.scrollHeight;

  clearSelections();
  selectedPiece = null;
  selectedSquare = null;

  currentTurn = currentTurn === "pink" ? "cyan" : "pink";
  currentTurnEl.textContent = currentTurn;
}

// algebraic notation: a1..h8
function toAlgebraic(row, col) {
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const file = files[col];
  const rank = 8 - row;
  return `${file}${rank}`;
}

// ====== NEW GAME BUTTON ======
newGameBtn.addEventListener("click", () => {
  createBoardGrid();
  setupInitialPosition();
});

function createCoordinates() {
  const files = ["A","B","C","D","E","F","G","H"];

  // Верх и низ
  const top = document.getElementById("board-top");
  const bottom = document.getElementById("board-bottom");
  top.innerHTML = "";
  bottom.innerHTML = "";

  for (let i = 0; i < 8; i++) {
    const cellTop = document.createElement("div");
    const cellBottom = document.createElement("div");
    cellTop.textContent = files[i];
    cellBottom.textContent = files[i];
    top.appendChild(cellTop);
    bottom.appendChild(cellBottom);
  }

  // Лево и право (8 → 1)
  const left = document.getElementById("board-left");
  const right = document.getElementById("board-right");

  left.innerHTML = "";
  right.innerHTML = "";

  for (let i = 0; i < 8; i++) {
    const num = document.createElement("div");
    num.textContent = 8 - i;

    const num2 = document.createElement("div");
    num2.textContent = 8 - i;

    left.appendChild(num);
    right.appendChild(num2);
  }
}


// ====== INITIALIZE ======
createBoardGrid();
setupInitialPosition();
