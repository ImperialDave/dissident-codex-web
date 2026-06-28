import { Chess, type Move, type Square } from "chess.js";

export type BotDifficulty = "easy" | "medium";

export const BOT_NAME = "Codex Bot";

const PIECE_VALUE: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

function pickRandom<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)] ?? null;
}

function moveToUci(move: Move): { from: Square; to: Square; promotion?: "q" } {
  return {
    from: move.from,
    to: move.to,
    promotion: move.promotion ? "q" : undefined,
  };
}

function evaluateMaterial(chess: Chess): number {
  let score = 0;
  for (const row of chess.board()) {
    for (const piece of row) {
      if (!piece) continue;
      const value = PIECE_VALUE[piece.type] ?? 0;
      score += piece.color === "w" ? value : -value;
    }
  }
  return score;
}

function minimax(chess: Chess, depth: number, alpha: number, beta: number): number {
  if (depth === 0 || chess.isGameOver()) {
    if (chess.isCheckmate()) {
      return chess.turn() === "w" ? -10000 : 10000;
    }
    if (chess.isDraw()) return 0;
    return evaluateMaterial(chess);
  }

  const moves = chess.moves({ verbose: true });
  if (chess.turn() === "b") {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move(move);
      maxEval = Math.max(maxEval, minimax(chess, depth - 1, alpha, beta));
      chess.undo();
      alpha = Math.max(alpha, maxEval);
      if (beta <= alpha) break;
    }
    return maxEval;
  }

  let minEval = Infinity;
  for (const move of moves) {
    chess.move(move);
    minEval = Math.min(minEval, minimax(chess, depth - 1, alpha, beta));
    chess.undo();
    beta = Math.min(beta, minEval);
    if (beta <= alpha) break;
  }
  return minEval;
}

function pickMediumMove(chess: Chess): Move | null {
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;

  const captures = moves.filter((m) => m.captured);
  if (captures.length > 0) {
    captures.sort((a, b) => {
      const gainA = (PIECE_VALUE[a.captured!] ?? 0) - (PIECE_VALUE[a.piece] ?? 0) * 0.1;
      const gainB = (PIECE_VALUE[b.captured!] ?? 0) - (PIECE_VALUE[b.piece] ?? 0) * 0.1;
      return gainB - gainA;
    });
    return captures[0] ?? null;
  }

  const checks = moves.filter((m) => m.san.includes("+"));
  if (checks.length > 0) return pickRandom(checks);

  let bestMove: Move | null = null;
  let bestScore = -Infinity;
  for (const move of moves) {
    chess.move(move);
    const score = minimax(chess, 2, -Infinity, Infinity);
    chess.undo();
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  return bestMove ?? pickRandom(moves);
}

export function pickBotMove(
  chess: Chess,
  difficulty: BotDifficulty
): { from: Square; to: Square; promotion?: "q" } | null {
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;

  const chosen =
    difficulty === "easy" ? pickRandom(moves) : pickMediumMove(chess);
  if (!chosen) return null;
  return moveToUci(chosen);
}

export function difficultyLabel(difficulty: BotDifficulty): string {
  return difficulty === "easy" ? "Easy" : "Medium";
}