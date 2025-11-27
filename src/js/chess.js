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
let moveCount = 1; // счётчик ходов в Info

let castlingRights = {
  pink: { kingSide: true, queenSide: true },
  cyan: { kingSide: true, queenSide: true },
};

let promotionResolve = null; // callback for pending promotion

// ====== ASSETS PATH ======
function getPieceSrc(color, type) {
  // ./public/pieces/game is life/pink/king.png → ./pieces/game is life/pink/king.png
  return `./pieces/game is life/${color}/${type}.png`;
}

// ====== WINNER BANNER ======
function hideWinnerBanner() {
  const banner = document.getElementById("winner-banner");
  if (!banner) return;
  banner.style.display = "none";
  banner.textContent = "";
}

function showWinnerBanner(winnerColor) {
  const banner = document.getElementById("winner-banner");
  if (!banner) return;
  banner.textContent = `${winnerColor.toUpperCase()} WINS!`;
  banner.style.display = "block";
}

// ====== PROMOTION DIALOG ======
function openPromotionDialog(color, callback) {
  const modal = document.getElementById("promotion-modal");
  if (!modal) {
    // fallback: auto-queen if modal is missing
    callback("queen");
    return;
  }
  promotionResolve = callback;
  modal.classList.remove("hidden");
}

function closePromotionDialog() {
  const modal = document.getElementById("promotion-modal");
  if (modal) {
    modal.classList.add("hidden");
  }
  promotionResolve = null;
}

// global click handler for promotion choice buttons
document.addEventListener("click", (e) => {
  if (!promotionResolve) return;
  const btn = e.target.closest("[data-piece]");
  if (!btn) return;
  const modal = document.getElementById("promotion-modal");
  if (!modal || !modal.contains(btn)) return;

  const chosen = btn.dataset.piece;
  const cb = promotionResolve;
  closePromotionDialog();
  cb(chosen);
});

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

// Состояние доски в виде массива 8×8
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
  return board.map((row) =>
    row.map((cell) => (cell ? { color: cell.color, type: cell.type } : null))
  );
}

function getPieceAtBoard(board, row, col) {
  if (!isInside(row, col)) return null;
  return board[row][col];
}

// ====== LOGGING HELPERS ======
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

function applyPromotion(piece, newType) {
  piece.dataset.type = newType;
  const color = piece.dataset.color;
  piece.src = getPieceSrc(color, newType);
}

// ====== CASTLING RIGHTS ======
function updateCastlingRightsOnMove(
  fromRow,
  fromCol,
  toRow,
  toCol,
  piece,
  capturedPieceEl
) {
  const color = piece.dataset.color;
  const type = piece.dataset.type;

  // король сделал ход — рокировок больше нет
  if (type === "king" && castlingRights[color]) {
    castlingRights[color].kingSide = false;
    castlingRights[color].queenSide = false;
  }

  // ладья делает ход со стартовой клетки
  if (type === "tower") {
    if (color === "pink") {
      if (fromRow === 7 && fromCol === 0 && castlingRights.pink) {
        castlingRights.pink.queenSide = false;
      }
      if (fromRow === 7 && fromCol === 7 && castlingRights.pink) {
        castlingRights.pink.kingSide = false;
      }
    } else if (color === "cyan") {
      if (fromRow === 0 && fromCol === 0 && castlingRights.cyan) {
        castlingRights.cyan.queenSide = false;
      }
      if (fromRow === 0 && fromCol === 7 && castlingRights.cyan) {
        castlingRights.cyan.kingSide = false;
      }
    }
  }

  // если ладью съели на её стартовом поле
  if (capturedPieceEl && capturedPieceEl.dataset.type === "tower") {
    const capturedColor = capturedPieceEl.dataset.color;
    const r = toRow;
    const c = toCol;

    if (capturedColor === "pink" && castlingRights.pink) {
      if (r === 7 && c === 0) castlingRights.pink.queenSide = false;
      if (r === 7 && c === 7) castlingRights.pink.kingSide = false;
    } else if (capturedColor === "cyan" && castlingRights.cyan) {
      if (r === 0 && c === 0) castlingRights.cyan.queenSide = false;
      if (r === 0 && c === 7) castlingRights.cyan.kingSide = false;
    }
  }
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
  hideWinnerBanner();
  clearSelections();
  clearCheckHighlight();

  selectedSquare = null;
  selectedPiece = null;
  currentTurn = "pink";
  currentTurnEl.textContent = currentTurn;
  movesLogEl.innerHTML = "";
  moveCount = 1;

  castlingRights = {
    pink: { kingSide: true, queenSide: true },
    cyan: { kingSide: true, queenSide: true },
  };

  // очистить все клетки
  document.querySelectorAll(".square").forEach((sq) => {
    sq.innerHTML = "";
  });

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

  // --- PAWN ---
  if (type === "pawn") {
    const dir = color === "pink" ? -1 : 1;
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

  // --- ROOK / QUEEN (по прямым) ---
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

  // --- BISHOP / QUEEN (по диагонали) ---
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

  // --- KNIGHT ---
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

  // --- KING ---
  if (type === "king") {
    // обычные ходы 1 клетка
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

    // рокировка — только когда НЕ считаем атаки
    if (!attackOnly && castlingRights[color]) {
      const enemy = enemyColor;
      const baseRow = color === "pink" ? 7 : 0;

      if (row === baseRow && col === 4) {
        // короткая рокировка (king side)
        if (castlingRights[color].kingSide) {
          const rookCol = 7;
          const sq5 = getPieceAtBoard(board, baseRow, 5);
          const sq6 = getPieceAtBoard(board, baseRow, 6);
          const rook = getPieceAtBoard(board, baseRow, rookCol);
          if (!sq5 && !sq6 && rook && rook.color === color && rook.type === "tower") {
            if (
              !isKingInCheck(board, color) &&
              !isSquareAttacked(board, baseRow, 5, enemy) &&
              !isSquareAttacked(board, baseRow, 6, enemy)
            ) {
              moves.push({ row: baseRow, col: 6 }); // e → g
            }
          }
        }

        // длинная рокировка (queen side)
        if (castlingRights[color].queenSide) {
          const rookCol = 0;
          const sq1 = getPieceAtBoard(board, baseRow, 1);
          const sq2 = getPieceAtBoard(board, baseRow, 2);
          const sq3 = getPieceAtBoard(board, baseRow, 3);
          const rook = getPieceAtBoard(board, baseRow, rookCol);
          if (!sq1 && !sq2 && !sq3 && rook && rook.color === color && rook.type === "tower") {
            if (
              !isKingInCheck(board, color) &&
              !isSquareAttacked(board, baseRow, 2, enemy) &&
              !isSquareAttacked(board, baseRow, 3, enemy)
            ) {
              moves.push({ row: baseRow, col: 2 }); // e → c
            }
          }
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
          return true;
        }
      }
    }
  }
  return false;
}

// Легальные ходы конкретной фигуры
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
  hideWinnerBanner(); // если нет мата, баннер не должен висеть

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

  // 1) ещё не выбрана фигура
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

  // 2) клик по той же клетке — снять выбор
  if (square === selectedSquare) {
    clearSelections();
    selectedPiece = null;
    selectedSquare = null;
    return;
  }

  const targetPiece = square.querySelector(".piece");

  // 3) клик по своей другой фигуре — смена выбора
  if (targetPiece && targetPiece.dataset.color === selectedPiece.dataset.color) {
    clearSelections();
    selectedPiece = targetPiece;
    selectedSquare = square;
    targetPiece.classList.add("selected");

    const moves = getLegalMovesForPiece(square, targetPiece);
    showMoveHints(moves);
    return;
  }

  // 4) проверяем, легален ли ход
  const toRow = Number(square.dataset.row);
  const toCol = Number(square.dataset.col);
  const isLegal = currentLegalMoves.some(
    (m) => m.row === toRow && m.col === toCol
  );
  if (!isLegal) return;

  // 5) делаем ход
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

  // была ли фигура на целевой клетке ДО хода
  const capturedPieceEl = toSquare.querySelector(".piece");
  let captureInfo = "";
  if (capturedPieceEl) {
    const capturedColor = formatColorLabel(capturedPieceEl.dataset.color);
    const capturedName = getPieceName(capturedPieceEl.dataset.type);
    captureInfo = ` (captured ${capturedColor} ${capturedName})`;
  }

  // обновляем права рокировки
  updateCastlingRightsOnMove(
    fromRow,
    fromCol,
    toRow,
    toCol,
    piece,
    capturedPieceEl
  );

  fromSquare.innerHTML = "";
  toSquare.innerHTML = "";
  toSquare.appendChild(piece);

  // если это рокировка — двигаем ладью
  if (piece.dataset.type === "king" && Math.abs(toCol - fromCol) === 2) {
    const row = toRow;

    if (toCol === 6) {
      // короткая рокировка: h → f
      const rookFrom = getSquare(row, 7);
      const rookTo = getSquare(row, 5);
      if (rookFrom && rookTo) {
        const rookPiece = rookFrom.querySelector(".piece");
        if (rookPiece) {
          rookFrom.innerHTML = "";
          rookTo.innerHTML = "";
          rookTo.appendChild(rookPiece);
        }
      }
    } else if (toCol === 2) {
      // длинная рокировка: a → d
      const rookFrom = getSquare(row, 0);
      const rookTo = getSquare(row, 3);
      if (rookFrom && rookTo) {
        const rookPiece = rookFrom.querySelector(".piece");
        if (rookPiece) {
          rookFrom.innerHTML = "";
          rookTo.innerHTML = "";
          rookTo.appendChild(rookPiece);
        }
      }
    }
  }

  const isPawnPromotion =
    piece.dataset.type === "pawn" && (toRow === 0 || toRow === 7);

  if (isPawnPromotion) {
    // окно для выбора фигуры
    openPromotionDialog(piece.dataset.color, (chosenType) => {
      applyPromotion(piece, chosenType);
      finishMoveLoggingAndCheck(
        piece,
        movedColor,
        fromNotation,
        toNotation,
        captureInfo
      );
    });
  } else {
    finishMoveLoggingAndCheck(
      piece,
      movedColor,
      fromNotation,
      toNotation,
      captureInfo
    );
  }
}

function finishMoveLoggingAndCheck(
  piece,
  movedColor,
  fromNotation,
  toNotation,
  captureInfo
) {
  const pieceName = getPieceName(piece.dataset.type);
  const colorLabel = formatColorLabel(movedColor);
  const moveCore = `${pieceName} - ${fromNotation} \u2192 ${toNotation}`;

  clearSelections();
  selectedPiece = null;
  selectedSquare = null;

  // смена хода
  currentTurn = currentTurn === "pink" ? "cyan" : "pink";
  currentTurnEl.textContent = currentTurn;

  // после смены хода смотрим, что чувствует сторона, которой теперь ходить
  const boardAfterMove = getBoardState();
  const colorToMoveNow = currentTurn;
  let checkInfo = "";
  if (isKingInCheck(boardAfterMove, colorToMoveNow)) {
    const hasMoves = hasAnyLegalMove(boardAfterMove, colorToMoveNow);
    checkInfo = hasMoves ? " (check)" : " (check me)";
  }

  const li = document.createElement("li");
  li.textContent = `${moveCount}. ${colorLabel}: ${moveCore}${captureInfo}${checkInfo}`;
  movesLogEl.appendChild(li);
  moveCount += 1;
  movesLogEl.scrollTop = movesLogEl.scrollHeight;

  // визуал шах/мат + баннер
  updateCheckStatus();
}

// algebraic notation: a1..h8
function toAlgebraic(row, col) {
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const file = files[col];
  const rank = 8 - row;
  return `${file}${rank}`;
}

// ====== NEW GAME BUTTON / INIT ======
function initGame() {
  const modal = document.getElementById("promotion-modal");
  if (modal) {
    modal.classList.add("hidden");
  }
  promotionResolve = null;

  createBoardGrid();
  createCoordinates();
  setupInitialPosition();
}

newGameBtn.addEventListener("click", () => {
  initGame();
});

// ====== INITIALIZE ======
initGame();