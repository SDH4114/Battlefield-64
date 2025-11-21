// ====== BASIC REFERENCES ======
const BOARD_SIZE = 8;

const boardGridEl = document.getElementById("board-grid");
const movesLogEl = document.getElementById("moves-log");
const currentTurnEl = document.getElementById("current-turn");
const newGameBtn = document.getElementById("new-game");

let selectedSquare = null;
let selectedPiece = null;
let currentTurn = "pink"; // pink ходит первым
let currentLegalMoves = [];
let moveCount = 1; // счётчик ходов для отображения в Info

// ====== ASSETS PATH ======
// ./pieces/game is life/pink/king.png и т.д.
function getPieceSrc(color, type) {
  return `./pieces/game is life/${color}/${type}.png`;
}

// ====== BOARD & DOM HELPERS ======
function createBoardGrid() {
  boardGridEl.innerHTML = "";

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const square = document.createElement("div");
      square.classList.add("square");
      square.dataset.row = row;
      square.dataset.col = col;

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

function getPieceAtDOM(row, col) {
  const sq = getSquare(row, col);
  if (!sq) return null;
  return sq.querySelector(".piece");
}

function isInside(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

// Состояние доски в виде массива 8x8: {color, type} или null
function getBoardState() {
  const board = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      const piece = getPieceAtDOM(r, c);
      if (piece) {
        row.push({
          color: piece.dataset.color,
          type: piece.dataset.type,
        });
      } else {
        row.push(null);
      }
    }
    board.push(row);
  }
  return board;
}

function cloneBoard(board) {
  return board.map(row =>
    row.map(cell => (cell ? { color: cell.color, type: cell.type } : null))
  );
}

function getPieceAtBoard(board, row, col) {
  if (!isInside(row, col)) return null;
  return board[row][col];
}

// ====== LOGGING HELPERS ======
function getPieceLetter(type) {
  switch (type) {
    case "pawn":
      return "";
    case "tower":
      return "R";   // rook
    case "elephant":
      return "B";   // bishop
    case "hourse":
      return "N";   // knight
    case "queen":
      return "Q";
    case "king":
      return "K";
    default:
      return "?";
  }
}

function getPieceName(type) {
  switch (type) {
    case "pawn":
      return "Pawn";
    case "tower":
      return "Rook";
    case "elephant":
      return "Bishop";
    case "hourse":
      return "Knight";
    case "queen":
      return "Queen";
    case "king":
      return "King";
    default:
      return "Piece";
  }
}

function formatColorLabel(color) {
  if (color === "pink") return "Pink";
  if (color === "cyan") return "Cyan";
  return color;
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
  clearCheckHighlight();
  selectedSquare = null;
  selectedPiece = null;
  currentTurn = "pink";
  currentTurnEl.textContent = currentTurn;
  movesLogEl.innerHTML = "";
  moveCount = 1;

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

  updateCheckStatus(); // на всякий случай
}

// ====== COORDINATES (A–H, 1–8) ======
function createCoordinates() {
  const files = ["A", "B", "C", "D", "E", "F", "G", "H"];

  const top = document.getElementById("board-top");
  const bottom = document.getElementById("board-bottom");
  const left = document.getElementById("board-left");
  const right = document.getElementById("board-right");

  top.innerHTML = "";
  bottom.innerHTML = "";
  left.innerHTML = "";
  right.innerHTML = "";

  for (let i = 0; i < 8; i++) {
    const cellTop = document.createElement("div");
    const cellBottom = document.createElement("div");
    cellTop.textContent = files[i];
    cellBottom.textContent = files[i];
    top.appendChild(cellTop);
    bottom.appendChild(cellBottom);
  }

  for (let i = 0; i < 8; i++) {
    const numLeft = document.createElement("div");
    const numRight = document.createElement("div");
    const rank = 8 - i;
    numLeft.textContent = rank;
    numRight.textContent = rank;
    left.appendChild(numLeft);
    right.appendChild(numRight);
  }
}

// ====== MOVE HINTS ======
function clearMoveHints() {
  document.querySelectorAll(".square.move-hint").forEach((sq) => {
    sq.classList.remove("move-hint");
  });
  currentLegalMoves = [];
}

function showMoveHints(moves) {
  clearMoveHints();
  moves.forEach(({ row, col }) => {
    const sq = getSquare(row, col);
    if (sq) sq.classList.add("move-hint");
  });
  currentLegalMoves = moves;
}

// ====== CHECK / KING HELPERS ======
function clearCheckHighlight() {
  document.querySelectorAll(".square.in-check").forEach((sq) => {
    sq.classList.remove("in-check");
  });
}

function findKing(board, color) {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = board[r][c];
      if (cell && cell.color === color && cell.type === "king") {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

// ====== PSEUDO MOVES (без проверки шаха) ======
function getPseudoMoves(board, row, col, color, type, options = {}) {
  const moves = [];
  const enemyColor = color === "pink" ? "cyan" : "pink";
  const attackOnly = options.attackOnly === true;

  if (type === "pawn") {
    const dir = color === "pink" ? -1 : 1; // pink вверх, cyan вниз
    const startRow = color === "pink" ? 6 : 1;

    // атака по диагонали (для шаха и взятий)
    const diagCols = [col - 1, col + 1];
    diagCols.forEach((c) => {
      const r = row + dir;
      if (!isInside(r, c)) return;
      const target = getPieceAtBoard(board, r, c);
      if (target && target.color === enemyColor) {
        moves.push({ row: r, col: c });
      }
    });

    if (!attackOnly) {
      // ход вперёд (без взятия)
      const oneRow = row + dir;
      if (isInside(oneRow, col) && !getPieceAtBoard(board, oneRow, col)) {
        moves.push({ row: oneRow, col });

        const twoRow = row + dir * 2;
        if (
          row === startRow &&
          isInside(twoRow, col) &&
          !getPieceAtBoard(board, twoRow, col)
        ) {
          moves.push({ row: twoRow, col });
        }
      }
    }
  }

  if (type === "tower" || type === "queen") {
    const directions = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];
    directions.forEach(({ dr, dc }) => {
      let r = row + dr;
      let c = col + dc;
      while (isInside(r, c)) {
        const target = getPieceAtBoard(board, r, c);
        if (!target) {
          moves.push({ row: r, col: c });
        } else {
          if (target.color === enemyColor) {
            moves.push({ row: r, col: c });
          }
          break;
        }
        r += dr;
        c += dc;
      }
    });
  }

  if (type === "elephant" || type === "queen") {
    const directions = [
      { dr: -1, dc: -1 },
      { dr: -1, dc: 1 },
      { dr: 1, dc: -1 },
      { dr: 1, dc: 1 },
    ];
    directions.forEach(({ dr, dc }) => {
      let r = row + dr;
      let c = col + dc;
      while (isInside(r, c)) {
        const target = getPieceAtBoard(board, r, c);
        if (!target) {
          moves.push({ row: r, col: c });
        } else {
          if (target.color === enemyColor) {
            moves.push({ row: r, col: c });
          }
          break;
        }
        r += dr;
        c += dc;
      }
    });
  }

  if (type === "hourse") {
    const jumps = [
      { dr: -2, dc: -1 },
      { dr: -2, dc: 1 },
      { dr: -1, dc: -2 },
      { dr: -1, dc: 2 },
      { dr: 1, dc: -2 },
      { dr: 1, dc: 2 },
      { dr: 2, dc: -1 },
      { dr: 2, dc: 1 },
    ];
    jumps.forEach(({ dr, dc }) => {
      const r = row + dr;
      const c = col + dc;
      if (!isInside(r, c)) return;
      const target = getPieceAtBoard(board, r, c);
      if (!target || target.color === enemyColor) {
        moves.push({ row: r, col: c });
      }
    });
  }

  if (type === "king") {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr;
        const c = col + dc;
        if (!isInside(r, c)) continue;
        const target = getPieceAtBoard(board, r, c);
        if (!target || target.color === enemyColor) {
          moves.push({ row: r, col: c });
        }
      }
    }
  }

  return moves;
}

// Клетка (row,col) под атакой цветом byColor?
function isSquareAttacked(board, row, col, byColor) {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = board[r][c];
      if (!cell || cell.color !== byColor) continue;
      const pseudo = getPseudoMoves(board, r, c, cell.color, cell.type, {
        attackOnly: true,
      });
      if (pseudo.some((m) => m.row === row && m.col === col)) {
        return true;
      }
    }
  }
  return false;
}

// Король цвета color в шахе?
function isKingInCheck(board, color) {
  const kingPos = findKing(board, color);
  if (!kingPos) return false;
  const enemy = color === "pink" ? "cyan" : "pink";
  return isSquareAttacked(board, kingPos.row, kingPos.col, enemy);
}

// Есть ли у стороны color хотя бы один легальный ход?
function hasAnyLegalMove(board, color) {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = board[r][c];
      if (!cell || cell.color !== color) continue;

      const pseudo = getPseudoMoves(board, r, c, cell.color, cell.type);
      for (const move of pseudo) {
        const newBoard = cloneBoard(board);
        newBoard[move.row][move.col] = { ...cell };
        newBoard[r][c] = null;
        if (!isKingInCheck(newBoard, color)) {
          return true; // нашёлся хотя бы один ход, который спасает короля
        }
      }
    }
  }
  return false;
}

// Легальные (с учётом короля) ходы конкретной фигуры
function getLegalMovesForPiece(square, piece) {
  const board = getBoardState();
  const row = Number(square.dataset.row);
  const col = Number(square.dataset.col);
  const color = piece.dataset.color;
  const type = piece.dataset.type;

  const pseudo = getPseudoMoves(board, row, col, color, type);
  const legal = [];

  for (const move of pseudo) {
    const newBoard = cloneBoard(board);
    const cell = newBoard[row][col];
    newBoard[move.row][move.col] = { ...cell };
    newBoard[row][col] = null;

    if (!isKingInCheck(newBoard, color)) {
      legal.push(move);
    }
  }

  return legal;
}

// Подсветка шаха/мата
function updateCheckStatus() {
  clearCheckHighlight();

  const board = getBoardState();
  const colorToMove = currentTurn; 
  const kingPos = findKing(board, colorToMove);
  if (!kingPos) return;

  const inCheck = isKingInCheck(board, colorToMove);
  if (inCheck) {
    const kingSq = getSquare(kingPos.row, kingPos.col);
    if (kingSq) kingSq.classList.add("in-check");

    const hasMoves = hasAnyLegalMove(board, colorToMove);
    if (!hasMoves) {
      showWinnerBanner(colorToMove === "pink" ? "cyan" : "pink");
    }
  }
}
function showWinnerBanner(winnerColor) {
  const banner = document.getElementById("winner-banner");
  banner.textContent = `${winnerColor.toUpperCase()} WINS!`;
  banner.style.display = "block";
}
// ====== SELECTION / MOVES ======
function clearSelections() {
  document.querySelectorAll(".piece.selected").forEach((p) => {
    p.classList.remove("selected");
  });
  clearMoveHints();
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

    const moves = getLegalMovesForPiece(square, piece);
    showMoveHints(moves);
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

    const moves = getLegalMovesForPiece(square, targetPiece);
    showMoveHints(moves);
    return;
  }

  // 4) Проверяем, можно ли сюда походить (есть ли ход в currentLegalMoves)
  const toRow = Number(square.dataset.row);
  const toCol = Number(square.dataset.col);
  const isLegal = currentLegalMoves.some(
    (m) => m.row === toRow && m.col === toCol
  );
  if (!isLegal) {
    return;
  }

  // 5) Ходим
  makeMove(selectedSquare, square, selectedPiece);
}

function makeMove(fromSquare, toSquare, piece) {
  const fromRow = Number(fromSquare.dataset.row);
  const fromCol = Number(fromSquare.dataset.col);
  const toRow = Number(toSquare.dataset.row);
  const toCol = Number(toSquare.dataset.col);

  const fromNotation = toAlgebraic(fromRow, fromCol);
  const toNotation = toAlgebraic(toRow, toCol);
  const movedColor = currentTurn;

  // check if there was a piece to capture on the target square BEFORE moving
  const capturedPieceEl = toSquare.querySelector(".piece");
  let captureInfo = "";
  if (capturedPieceEl) {
    const capturedColor = formatColorLabel(capturedPieceEl.dataset.color);
    const capturedName = getPieceName(capturedPieceEl.dataset.type);
    captureInfo = ` (captured ${capturedColor} ${capturedName})`;
  }

  fromSquare.innerHTML = "";
  toSquare.innerHTML = "";
  toSquare.appendChild(piece);

  const pieceName = getPieceName(piece.dataset.type);
  const colorLabel = formatColorLabel(movedColor);
  const moveCore = `${pieceName} - ${fromNotation} \u2192 ${toNotation}`;

  // after the move is on the board, check if it gives check to the opponent
  const boardAfterMove = getBoardState();
  const enemyColor = movedColor === "pink" ? "cyan" : "pink";
  const givesCheck = isKingInCheck(boardAfterMove, enemyColor);
  const checkInfo = givesCheck ? " (check)" : "";

  const li = document.createElement("li");
  // show explicit move number in the text so it is always visible
  li.textContent = `${moveCount}. ${colorLabel}: ${moveCore}${captureInfo}${checkInfo}`;
  movesLogEl.appendChild(li);
  moveCount += 1;
  movesLogEl.scrollTop = movesLogEl.scrollHeight;

  clearSelections();
  selectedPiece = null;
  selectedSquare = null;

  // смена хода
  currentTurn = currentTurn === "pink" ? "cyan" : "pink";
  currentTurnEl.textContent = currentTurn;

  // Проверяем шах/мат для стороны, которая теперь должна ходить
  updateCheckStatus();
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
  createCoordinates();
  setupInitialPosition();
});

// ====== INITIALIZE ======
createBoardGrid();
createCoordinates();
setupInitialPosition();