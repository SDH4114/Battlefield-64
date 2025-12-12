// Константы и настройки
const BOT_BOARD_SIZE = 8;
const HUMAN_COLOR = "pink";
const BOT_COLOR = "cyan";
const PIECE_SCORES = {
  pawn: 100,
  hourse: 300,
  elephant: 310,
  tower: 500,
  queen: 900,
  king: 50000,
};
const CHECKMATE_SCORE = 1000000;

// DOM ссылки
const botBoardGrid = document.getElementById("board-grid");
const botMovesLog = document.getElementById("moves-log");
const botCurrentTurnEl = document.getElementById("current-turn");
const botDifficultyEl = document.getElementById("bot-difficulty");
const botNewGameBtn = document.getElementById("new-game");

const botSettings = loadBotSettings();

// Состояние игры
let botBoardState = [];
let botCastlingRights = {
  pink: { kingSide: true, queenSide: true },
  cyan: { kingSide: true, queenSide: true },
};
let botSelectedSquare = null;
let botSelectedPiece = null;
let botCurrentTurn = HUMAN_COLOR; // игрок ходит первым
let botCurrentLegalMoves = [];
let botMoveCount = 1;
let botPromotionResolve = null;
let isBotThinking = false;
let botGameOver = false;

// Уровень сложности
const savedDifficulty = localStorage.getItem("difficulty") || "medium";
const difficultyToDepth = {
  easy: 0,
  medium: 1,
  hard: 2,
  expert: 3,
};
const botSearchDepth = difficultyToDepth[savedDifficulty] ?? 1;
if (botDifficultyEl) {
  botDifficultyEl.textContent = savedDifficulty;
}

// Хелперы
function botGetPieceSrc(color, type) {
  const theme = botSettings.theme || "basic";

  if (theme === "classic") {
    const mappedColor = color === "pink" ? "white" : "black";
    return `./pieces/classic/${mappedColor}/${type}.png`;
  }

  if (theme === "universal") {
    const mappedColor = color === "pink" ? "purple" : "yellow";
    return `./pieces/game is life/${mappedColor}/${type}.png`;
  }

  return `./pieces/game is life/${color}/${type}.png`;
}

function loadBotSettings() {
  const storedTheme = localStorage.getItem("theme");
  const theme =
    storedTheme && ["basic", "classic"].includes(storedTheme)
      ? storedTheme
      : "basic";
  if (theme !== storedTheme) {
    localStorage.setItem("theme", theme);
  }
  return {
    sound: localStorage.getItem("sound") !== "false",
    hints: localStorage.getItem("hints") !== "false",
    animation: localStorage.getItem("animation") !== "false",
    theme,
  };
}

function botApplyTheme() {
  const body = document.body;
  ["theme-basic", "theme-classic", "theme-universal"].forEach((cls) =>
    body.classList.remove(cls)
  );
  body.classList.add(`theme-${botSettings.theme}`);
}

function botHideWinnerBanner() {
  const banner = document.getElementById("winner-banner");
  if (banner) {
    banner.style.display = "none";
    banner.textContent = "";
  }
}

function botShowWinnerBanner(text) {
  const banner = document.getElementById("winner-banner");
  if (banner) {
    banner.style.display = "block";
    banner.textContent = text;
  }
}

function botFormatColor(color) {
  return color === "pink" ? "Pink" : "Cyan";
}

// Построение доски
function botCreateBoardGrid() {
  botBoardGrid.innerHTML = "";

  for (let row = 0; row < BOT_BOARD_SIZE; row++) {
    for (let col = 0; col < BOT_BOARD_SIZE; col++) {
      const square = document.createElement("div");
      square.classList.add("square");
      square.dataset.row = row;
      square.dataset.col = col;

      if ((row + col) % 2 === 0) {
        square.classList.add("light");
      } else {
        square.classList.add("dark");
      }

      square.addEventListener("click", botOnSquareClick);
      botBoardGrid.appendChild(square);
    }
  }
}

function botCreateCoordinates() {
  const files = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const top = document.getElementById("board-top");
  const bottom = document.getElementById("board-bottom");
  const left = document.getElementById("board-left");
  const right = document.getElementById("board-right");

  if (!top || !bottom || !left || !right) return;

  top.innerHTML = "";
  bottom.innerHTML = "";
  left.innerHTML = "";
  right.innerHTML = "";

  for (let i = 0; i < 8; i++) {
    const t = document.createElement("div");
    const b = document.createElement("div");
    t.textContent = files[i];
    b.textContent = files[i];
    top.appendChild(t);
    bottom.appendChild(b);
  }

  for (let i = 0; i < 8; i++) {
    const l = document.createElement("div");
    const r = document.createElement("div");
    const rank = 8 - i;
    l.textContent = rank;
    r.textContent = rank;
    left.appendChild(l);
    right.appendChild(r);
  }
}

function botGetSquare(row, col) {
  return botBoardGrid.querySelector(
    `.square[data-row="${row}"][data-col="${col}"]`
  );
}

function botRenderBoard() {
  for (let r = 0; r < BOT_BOARD_SIZE; r++) {
    for (let c = 0; c < BOT_BOARD_SIZE; c++) {
      const square = botGetSquare(r, c);
      if (!square) continue;
      square.innerHTML = "";

      const piece = botBoardState[r][c];
      if (piece) {
        const img = document.createElement("img");
        img.classList.add("piece");
        img.dataset.color = piece.color;
        img.dataset.type = piece.type;
        img.src = botGetPieceSrc(piece.color, piece.type);
        square.appendChild(img);
      }
    }
  }
}

// Инициализация позиции
function botSetupInitialPosition() {
  botHideWinnerBanner();
  botClearSelections();
  botClearCheckHighlight();

  botBoardState = [];
  for (let r = 0; r < BOT_BOARD_SIZE; r++) {
    botBoardState.push(new Array(BOT_BOARD_SIZE).fill(null));
  }

  botCastlingRights = {
    pink: { kingSide: true, queenSide: true },
    cyan: { kingSide: true, queenSide: true },
  };

  botSelectedSquare = null;
  botSelectedPiece = null;
  botCurrentTurn = HUMAN_COLOR;
  botMoveCount = 1;
  botGameOver = false;
  botCurrentTurnEl.textContent = botCurrentTurn;
  botMovesLog.innerHTML = "";

  const backRank = [
    "tower",
    "hourse",
    "elephant",
    "queen",
    "king",
    "elephant",
    "hourse",
    "tower",
  ];

  // cyan сверху
  backRank.forEach((type, col) => {
    botBoardState[0][col] = { color: "cyan", type };
  });
  for (let col = 0; col < BOT_BOARD_SIZE; col++) {
    botBoardState[1][col] = { color: "cyan", type: "pawn" };
  }

  // pink снизу
  for (let col = 0; col < BOT_BOARD_SIZE; col++) {
    botBoardState[6][col] = { color: "pink", type: "pawn" };
  }
  backRank.forEach((type, col) => {
    botBoardState[7][col] = { color: "pink", type };
  });

  botRenderBoard();
  botUpdateCheckStatus();
}

// Математика доски
function botIsInside(row, col) {
  return row >= 0 && row < BOT_BOARD_SIZE && col >= 0 && col < BOT_BOARD_SIZE;
}

function botCloneBoard(board) {
  return board.map((row) =>
    row.map((cell) => (cell ? { color: cell.color, type: cell.type } : null))
  );
}

function botCloneCastling(rights) {
  return {
    pink: { ...rights.pink },
    cyan: { ...rights.cyan },
  };
}

function botFindKing(board, color) {
  for (let r = 0; r < BOT_BOARD_SIZE; r++) {
    for (let c = 0; c < BOT_BOARD_SIZE; c++) {
      const cell = board[r][c];
      if (cell && cell.color === color && cell.type === "king") {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

// Подсказки и выделения
function botClearMoveHints() {
  document.querySelectorAll(".square.move-hint").forEach((sq) => {
    sq.classList.remove("move-hint");
  });
  document.querySelectorAll(".square.capture-hint").forEach((sq) => {
    sq.classList.remove("capture-hint");
  });
  document.querySelectorAll(".piece.capture-hint").forEach((p) => {
    p.classList.remove("capture-hint");
  });
  botCurrentLegalMoves = [];
}

function botShowMoveHints(moves, movingColor) {
  botClearMoveHints();
  botCurrentLegalMoves = moves;
  if (!botSettings.hints) {
    return;
  }
  moves.forEach(({ toRow, toCol }) => {
    const sq = botGetSquare(toRow, toCol);
    if (!sq) return;
    const targetPiece = botBoardState[toRow][toCol];
    if (targetPiece && targetPiece.color !== movingColor) {
      sq.classList.add("capture-hint");
      const targetImg = sq.querySelector(".piece");
      if (targetImg) targetImg.classList.add("capture-hint");
    } else {
      sq.classList.add("move-hint");
    }
  });
}

function botClearCheckHighlight() {
  document.querySelectorAll(".square.in-check").forEach((sq) => {
    sq.classList.remove("in-check");
  });
}

function botHighlightCheck(board, color) {
  botClearCheckHighlight();
  const kingPos = botFindKing(board, color);
  if (!kingPos) return;
  const sq = botGetSquare(kingPos.row, kingPos.col);
  if (sq) sq.classList.add("in-check");
}

// Генерация ходов
function botGetPseudoMoves(board, row, col, color, type, rights, options = {}) {
  const moves = [];
  const enemy = color === "pink" ? "cyan" : "pink";
  const attackOnly = options.attackOnly === true;

  if (type === "pawn") {
    const dir = color === "pink" ? -1 : 1;
    const startRow = color === "pink" ? 6 : 1;

    // атака
    [col - 1, col + 1].forEach((c) => {
      const r = row + dir;
      if (!botIsInside(r, c)) return;
      const target = board[r][c];
      if (target && target.color === enemy) {
        moves.push({ toRow: r, toCol: c, promotion: r === 0 || r === 7 });
      }
    });

    if (!attackOnly) {
      const one = row + dir;
      if (botIsInside(one, col) && !board[one][col]) {
        moves.push({ toRow: one, toCol: col, promotion: one === 0 || one === 7 });
        const two = row + dir * 2;
        if (
          row === startRow &&
          botIsInside(two, col) &&
          !board[two][col]
        ) {
          moves.push({ toRow: two, toCol: col });
        }
      }
    }
  }

  if (type === "tower" || type === "queen") {
    const dirs = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];
    dirs.forEach(({ dr, dc }) => {
      let r = row + dr;
      let c = col + dc;
      while (botIsInside(r, c)) {
        const target = board[r][c];
        if (!target) {
          moves.push({ toRow: r, toCol: c });
        } else {
          if (target.color === enemy) moves.push({ toRow: r, toCol: c });
          break;
        }
        r += dr;
        c += dc;
      }
    });
  }

  if (type === "elephant" || type === "queen") {
    const dirs = [
      { dr: -1, dc: -1 },
      { dr: -1, dc: 1 },
      { dr: 1, dc: -1 },
      { dr: 1, dc: 1 },
    ];
    dirs.forEach(({ dr, dc }) => {
      let r = row + dr;
      let c = col + dc;
      while (botIsInside(r, c)) {
        const target = board[r][c];
        if (!target) {
          moves.push({ toRow: r, toCol: c });
        } else {
          if (target.color === enemy) moves.push({ toRow: r, toCol: c });
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
      if (!botIsInside(r, c)) return;
      const target = board[r][c];
      if (!target || target.color === enemy) {
        moves.push({ toRow: r, toCol: c });
      }
    });
  }

  if (type === "king") {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr;
        const c = col + dc;
        if (!botIsInside(r, c)) continue;
        const target = board[r][c];
        if (!target || target.color === enemy) {
          moves.push({ toRow: r, toCol: c });
        }
      }
    }

    if (!attackOnly && rights && rights[color] && row === (color === "pink" ? 7 : 0) && col === 4) {
      const baseRow = color === "pink" ? 7 : 0;
      const enemyColor = enemy;

      if (rights[color].kingSide) {
        const rook = board[baseRow][7];
        const f5 = board[baseRow][5];
        const f6 = board[baseRow][6];
        if (!f5 && !f6 && rook && rook.color === color && rook.type === "tower") {
          if (
            !botIsSquareAttacked(board, baseRow, 4, enemyColor, rights) &&
            !botIsSquareAttacked(board, baseRow, 5, enemyColor, rights) &&
            !botIsSquareAttacked(board, baseRow, 6, enemyColor, rights)
          ) {
            moves.push({ toRow: baseRow, toCol: 6, castling: "king" });
          }
        }
      }

      if (rights[color].queenSide) {
        const rook = board[baseRow][0];
        const f1 = board[baseRow][1];
        const f2 = board[baseRow][2];
        const f3 = board[baseRow][3];
        if (!f1 && !f2 && !f3 && rook && rook.color === color && rook.type === "tower") {
          if (
            !botIsSquareAttacked(board, baseRow, 4, enemyColor, rights) &&
            !botIsSquareAttacked(board, baseRow, 3, enemyColor, rights) &&
            !botIsSquareAttacked(board, baseRow, 2, enemyColor, rights)
          ) {
            moves.push({ toRow: baseRow, toCol: 2, castling: "queen" });
          }
        }
      }
    }
  }

  return moves.map((m) => ({ ...m, fromRow: row, fromCol: col }));
}

function botIsSquareAttacked(board, row, col, byColor, rights) {
  for (let r = 0; r < BOT_BOARD_SIZE; r++) {
    for (let c = 0; c < BOT_BOARD_SIZE; c++) {
      const cell = board[r][c];
      if (!cell || cell.color !== byColor) continue;
      const pseudo = botGetPseudoMoves(board, r, c, cell.color, cell.type, rights, {
        attackOnly: true,
      });
      if (pseudo.some((m) => m.toRow === row && m.toCol === col)) return true;
    }
  }
  return false;
}

function botIsKingInCheck(board, color, rights) {
  const king = botFindKing(board, color);
  if (!king) return false;
  const enemy = color === "pink" ? "cyan" : "pink";
  return botIsSquareAttacked(board, king.row, king.col, enemy, rights);
}

function botUpdateCastlingRights(rights, move, movingPiece, capturedPiece) {
  const nextRights = botCloneCastling(rights);
  const color = movingPiece.color;

  if (movingPiece.type === "king") {
    nextRights[color].kingSide = false;
    nextRights[color].queenSide = false;
  }

  if (movingPiece.type === "tower") {
    if (color === "pink") {
      if (move.fromRow === 7 && move.fromCol === 0) nextRights.pink.queenSide = false;
      if (move.fromRow === 7 && move.fromCol === 7) nextRights.pink.kingSide = false;
    } else if (color === "cyan") {
      if (move.fromRow === 0 && move.fromCol === 0) nextRights.cyan.queenSide = false;
      if (move.fromRow === 0 && move.fromCol === 7) nextRights.cyan.kingSide = false;
    }
  }

  if (capturedPiece && capturedPiece.type === "tower") {
    const capturedColor = capturedPiece.color;
    if (capturedColor === "pink") {
      if (move.toRow === 7 && move.toCol === 0) nextRights.pink.queenSide = false;
      if (move.toRow === 7 && move.toCol === 7) nextRights.pink.kingSide = false;
    } else if (capturedColor === "cyan") {
      if (move.toRow === 0 && move.toCol === 0) nextRights.cyan.queenSide = false;
      if (move.toRow === 0 && move.toCol === 7) nextRights.cyan.kingSide = false;
    }
  }

  return nextRights;
}

function botApplyMove(board, rights, move, promotionChoice) {
  const newBoard = botCloneBoard(board);
  const movingPiece = { ...newBoard[move.fromRow][move.fromCol] };
  const capturedPiece = newBoard[move.toRow][move.toCol]
    ? { ...newBoard[move.toRow][move.toCol] }
    : null;

  newBoard[move.fromRow][move.fromCol] = null;

  let pieceType = movingPiece.type;
  if (move.promotion) {
    pieceType = promotionChoice || move.promotionType || "queen";
  }

  // рокировка на доске
  if (movingPiece.type === "king" && Math.abs(move.toCol - move.fromCol) === 2) {
    const row = move.toRow;
    if (move.toCol === 6) {
      const rookPiece = newBoard[row][7];
      newBoard[row][7] = null;
      newBoard[row][5] = rookPiece;
    } else if (move.toCol === 2) {
      const rookPiece = newBoard[row][0];
      newBoard[row][0] = null;
      newBoard[row][3] = rookPiece;
    }
  }

  newBoard[move.toRow][move.toCol] = { color: movingPiece.color, type: pieceType };

  const updatedRights = botUpdateCastlingRights(rights, move, movingPiece, capturedPiece);
  return { board: newBoard, rights: updatedRights };
}

function botGetLegalMovesForPiece(board, row, col, rights) {
  const cell = board[row][col];
  if (!cell) return [];
  const pseudo = botGetPseudoMoves(board, row, col, cell.color, cell.type, rights);
  const legal = [];

  for (const move of pseudo) {
    const { board: nextBoard, rights: nextRights } = botApplyMove(
      board,
      rights,
      move,
      "queen"
    );
    if (!botIsKingInCheck(nextBoard, cell.color, nextRights)) {
      legal.push(move);
    }
  }
  return legal;
}

function botGenerateAllMoves(board, color, rights) {
  const moves = [];
  for (let r = 0; r < BOT_BOARD_SIZE; r++) {
    for (let c = 0; c < BOT_BOARD_SIZE; c++) {
      const cell = board[r][c];
      if (!cell || cell.color !== color) continue;
      const legal = botGetLegalMovesForPiece(board, r, c, rights);
      legal.forEach((m) => moves.push({ ...m, piece: cell }));
    }
  }
  return moves;
}

// Состояние партии
function botUpdateCheckStatus() {
  botClearCheckHighlight();
  const inCheck = botIsKingInCheck(botBoardState, botCurrentTurn, botCastlingRights);
  if (inCheck) botHighlightCheck(botBoardState, botCurrentTurn);
}

function botCheckEndGame() {
  const legal = botGenerateAllMoves(botBoardState, botCurrentTurn, botCastlingRights);
  const inCheck = botIsKingInCheck(botBoardState, botCurrentTurn, botCastlingRights);

  if (legal.length === 0) {
    if (inCheck) {
      const winner = botCurrentTurn === HUMAN_COLOR ? BOT_COLOR : HUMAN_COLOR;
      botShowWinnerBanner(`${botFormatColor(winner)} wins!`);
    } else {
      botShowWinnerBanner("Stalemate");
    }
    isBotThinking = false;
    botGameOver = true;
    return true;
  }

  botHighlightCheck(botBoardState, botCurrentTurn);
  return false;
}

// Работа с UI выбором
function botClearSelections() {
  document.querySelectorAll(".piece.selected").forEach((p) => {
    p.classList.remove("selected");
  });
  document.querySelectorAll(".piece.selected-static").forEach((p) => {
    p.classList.remove("selected-static");
  });
  botClearMoveHints();
}

function botOnSquareClick(e) {
  if (isBotThinking || botCurrentTurn !== HUMAN_COLOR || botGameOver) return;
  const square = e.currentTarget;
  const row = Number(square.dataset.row);
  const col = Number(square.dataset.col);
  const piece = botBoardState[row][col];

  if (!botSelectedPiece) {
    if (!piece || piece.color !== HUMAN_COLOR) return;
    botClearSelections();
    botSelectedPiece = piece;
    botSelectedSquare = { row, col };
    const img = square.querySelector(".piece");
    if (img) {
      if (botSettings.animation) {
        img.classList.add("selected");
      } else {
        img.classList.add("selected-static");
      }
    }
    const moves = botGetLegalMovesForPiece(botBoardState, row, col, botCastlingRights);
    botShowMoveHints(moves, piece.color);
    return;
  }

  // Повторный выбор
  if (botSelectedSquare && botSelectedSquare.row === row && botSelectedSquare.col === col) {
    botClearSelections();
    botSelectedPiece = null;
    botSelectedSquare = null;
    return;
  }

  // Выбор другой своей фигуры
  if (piece && piece.color === HUMAN_COLOR) {
    botClearSelections();
    botSelectedPiece = piece;
    botSelectedSquare = { row, col };
    const img = square.querySelector(".piece");
    if (img) {
      if (botSettings.animation) {
        img.classList.add("selected");
      } else {
        img.classList.add("selected-static");
      }
    }
    const moves = botGetLegalMovesForPiece(botBoardState, row, col, botCastlingRights);
    botShowMoveHints(moves, piece.color);
    return;
  }

  // Проверяем ход
  const legal = botCurrentLegalMoves.find(
    (m) => m.toRow === row && m.toCol === col && m.fromRow === botSelectedSquare.row && m.fromCol === botSelectedSquare.col
  );
  if (!legal) return;

  botHandlePlayerMove(legal);
}

function botHandlePlayerMove(move) {
  const needsPromotion =
    botSelectedPiece.type === "pawn" &&
    (move.toRow === 0 || move.toRow === 7);

  if (needsPromotion) {
    botOpenPromotionDialog((chosen) => {
      botPerformMove(move, chosen);
    });
  } else {
    botPerformMove(move);
  }
}

// Промоция UI
function botOpenPromotionDialog(callback) {
  const modal = document.getElementById("promotion-modal");
  if (!modal) {
    callback("queen");
    return;
  }
  botPromotionResolve = callback;
  modal.classList.remove("hidden");
}

function botClosePromotionDialog() {
  const modal = document.getElementById("promotion-modal");
  if (modal) modal.classList.add("hidden");
  botPromotionResolve = null;
}

document.addEventListener("click", (e) => {
  if (!botPromotionResolve) return;
  const btn = e.target.closest("[data-piece]");
  if (!btn) return;
  const modal = document.getElementById("promotion-modal");
  if (!modal || !modal.contains(btn)) return;
  const chosen = btn.dataset.piece;
  const cb = botPromotionResolve;
  botClosePromotionDialog();
  cb(chosen);
});

// Выполнение хода
function botPerformMove(move, promotionChoice) {
  const fromSq = botGetSquare(move.fromRow, move.fromCol);
  const toSq = botGetSquare(move.toRow, move.toCol);
  const movingPiece = botBoardState[move.fromRow][move.fromCol];
  const captured = botBoardState[move.toRow][move.toCol];

  const fromNotation = botToAlgebraic(move.fromRow, move.fromCol);
  const toNotation = botToAlgebraic(move.toRow, move.toCol);

  // Обновляем состояние
  const { board: nextBoard, rights: nextRights } = botApplyMove(
    botBoardState,
    botCastlingRights,
    move,
    promotionChoice
  );
  botBoardState = nextBoard;
  botCastlingRights = nextRights;

  // Обновляем DOM
  botRenderBoard();

  botLogMove(movingPiece, fromNotation, toNotation, captured, promotionChoice);

  botClearSelections();
  botSelectedPiece = null;
  botSelectedSquare = null;

  botCurrentTurn = botCurrentTurn === HUMAN_COLOR ? BOT_COLOR : HUMAN_COLOR;
  botCurrentTurnEl.textContent = botCurrentTurn;

  if (botCheckEndGame()) return;

  if (botCurrentTurn === BOT_COLOR) {
    isBotThinking = true;
    setTimeout(botMakeBotMove, 300);
  } else {
    botUpdateCheckStatus();
  }
}

function botLogMove(piece, fromNotation, toNotation, captured, promotionChoice) {
  const colorLabel = botFormatColor(piece.color);
  const name = botPieceName(piece.type);
  const captureInfo = captured
    ? ` (captured ${botFormatColor(captured.color)} ${botPieceName(captured.type)})`
    : "";
  const promoInfo = promotionChoice ? ` =${promotionChoice}` : "";

  const boardAfter = botBoardState;
  const colorToMove = botCurrentTurn === HUMAN_COLOR ? BOT_COLOR : HUMAN_COLOR;
  let checkInfo = "";
  if (botIsKingInCheck(boardAfter, colorToMove, botCastlingRights)) {
    const hasMoves = botGenerateAllMoves(boardAfter, colorToMove, botCastlingRights).length > 0;
    checkInfo = hasMoves ? " (check)" : " (checkmate)";
  }

  const li = document.createElement("li");
  li.textContent = `${botMoveCount}. ${colorLabel}: ${name} - ${fromNotation} → ${toNotation}${promoInfo}${captureInfo}${checkInfo}`;
  botMovesLog.appendChild(li);
  botMovesLog.scrollTop = botMovesLog.scrollHeight;
  botMoveCount += 1;
}

function botPieceName(type) {
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

function botToAlgebraic(row, col) {
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const file = files[col];
  const rank = 8 - row;
  return `${file}${rank}`;
}

// Бот
function botEvaluateBoard(board) {
  let score = 0;
  for (let r = 0; r < BOT_BOARD_SIZE; r++) {
    for (let c = 0; c < BOT_BOARD_SIZE; c++) {
      const cell = board[r][c];
      if (!cell) continue;
      const value = PIECE_SCORES[cell.type] || 0;
      score += cell.color === BOT_COLOR ? value : -value;
    }
  }
  return score;
}

function botMinimax(board, rights, depth, isMaximizing, alpha, beta) {
  const color = isMaximizing ? BOT_COLOR : HUMAN_COLOR;
  const moves = botGenerateAllMoves(board, color, rights);
  const inCheck = botIsKingInCheck(board, color, rights);

  if (moves.length === 0 || depth === 0) {
    if (moves.length === 0 && inCheck) {
      const mateScore = isMaximizing ? -CHECKMATE_SCORE : CHECKMATE_SCORE;
      return { score: mateScore + (isMaximizing ? depth : -depth) };
    }
    if (moves.length === 0) return { score: 0 }; // пат
    return { score: botEvaluateBoard(board) };
  }

  let bestMove = null;

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const { board: nextBoard, rights: nextRights } = botApplyMove(
        board,
        rights,
        move,
        "queen"
      );
      const { score } = botMinimax(nextBoard, nextRights, depth - 1, false, alpha, beta);
      if (score > maxEval) {
        maxEval = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return { score: maxEval, move: bestMove };
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const { board: nextBoard, rights: nextRights } = botApplyMove(
        board,
        rights,
        move,
        "queen"
      );
      const { score } = botMinimax(nextBoard, nextRights, depth - 1, true, alpha, beta);
      if (score < minEval) {
        minEval = score;
        bestMove = move;
      }
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return { score: minEval, move: bestMove };
  }
}

function botPickMoveByDifficulty(legalMoves) {
  if (legalMoves.length === 0) return null;

  // easy: случайный
  if (savedDifficulty === "easy") {
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  // medium: лучший размен по ценности
  if (savedDifficulty === "medium") {
    let best = legalMoves[0];
    let bestScore = -Infinity;
    for (const move of legalMoves) {
      const target = botBoardState[move.toRow][move.toCol];
      const gain = target ? (PIECE_SCORES[target.type] || 0) : 0;
      if (gain > bestScore) {
        bestScore = gain;
        best = move;
      }
    }
    return best;
  }

  // hard / expert: минимакс
  const depth = botSearchDepth;
  const { move } = botMinimax(
    botBoardState,
    botCastlingRights,
    depth,
    true,
    -Infinity,
    Infinity
  );
  if (move) return move;
  return legalMoves[Math.floor(Math.random() * legalMoves.length)];
}

function botMakeBotMove() {
  const legal = botGenerateAllMoves(botBoardState, BOT_COLOR, botCastlingRights);
  if (legal.length === 0) {
    botCheckEndGame();
    return;
  }

  const chosen = botPickMoveByDifficulty(legal);
  if (!chosen) return;

  // Промоция бота всегда в ферзя
  chosen.promotionType = "queen";
  botPerformMove(chosen, "queen");
  isBotThinking = false;
}

// Запуск игры
function botInitGame() {
  botApplyTheme();
  botCreateBoardGrid();
  botCreateCoordinates();
  botSetupInitialPosition();
}

botNewGameBtn?.addEventListener("click", () => {
  isBotThinking = false;
  botInitGame();
});

botInitGame();
