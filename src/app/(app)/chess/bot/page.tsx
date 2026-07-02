"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Chess } from "chess.js";
import { CodexChessboard } from "@/components/CodexChessboard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import {
  BOT_NAME,
  difficultyLabel,
  pickBotMove,
  type BotDifficulty,
} from "@/lib/chessBot";
import { useAuthStore } from "@/stores/authStore";
import { sanitizeUserError } from "@/lib/utils";

type GameStatus = "active" | "finished";

interface LocalGameState {
  fen: string;
  status: GameStatus;
  result: string | null;
  winner: "human" | "bot" | "draw" | null;
}

function parseDifficulty(value: string | null): BotDifficulty {
  return value === "medium" ? "medium" : "easy";
}

function resultMessage(state: LocalGameState, humanName: string): string {
  if (state.status !== "finished" || !state.result) return "";
  if (state.winner === "human") return `You win — ${state.result}`;
  if (state.winner === "bot") return `${BOT_NAME} wins — ${state.result}`;
  return `Draw — ${state.result}`;
}

function detectGameEnd(chess: Chess): Pick<LocalGameState, "status" | "result" | "winner"> {
  if (!chess.isGameOver()) {
    return { status: "active", result: null, winner: null };
  }
  if (chess.isCheckmate()) {
    return {
      status: "finished",
      result: "checkmate",
      winner: chess.turn() === "w" ? "bot" : "human",
    };
  }
  if (chess.isStalemate()) {
    return { status: "finished", result: "stalemate", winner: "draw" };
  }
  return { status: "finished", result: "draw", winner: "draw" };
}

function freshGame(): LocalGameState {
  return {
    fen: new Chess().fen(),
    status: "active",
    result: null,
    winner: null,
  };
}

export default function ChessBotPage() {
  const searchParams = useSearchParams();
  const difficulty = parseDifficulty(searchParams.get("difficulty"));
  const { user } = useAuthStore();
  const [game, setGame] = useState<LocalGameState>(freshGame);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const humanName = user?.displayName || "You";
  const isHumanTurn = useMemo(() => {
    const chess = new Chess(game.fen);
    return game.status === "active" && chess.turn() === "w";
  }, [game.fen, game.status]);

  const clearBotTimer = useCallback(() => {
    if (botTimerRef.current) {
      clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearBotTimer(), [clearBotTimer]);

  const scheduleBotMove = useCallback(
    (fen: string) => {
      clearBotTimer();
      setThinking(true);
      botTimerRef.current = setTimeout(() => {
        try {
          const chess = new Chess(fen);
          if (chess.turn() !== "b" || chess.isGameOver()) {
            setThinking(false);
            return;
          }
          const botMove = pickBotMove(chess, difficulty);
          if (!botMove) {
            setThinking(false);
            return;
          }
          chess.move({ ...botMove, promotion: botMove.promotion ?? "q" });
          const end = detectGameEnd(chess);
          setGame({
            fen: chess.fen(),
            ...end,
          });
        } catch (err) {
          setError(sanitizeUserError(err, "Bot move failed"));
        } finally {
          setThinking(false);
        }
      }, 450);
    },
    [clearBotTimer, difficulty]
  );

  const applyHumanMove = useCallback(
    (sourceSquare: string, targetSquare: string) => {
      setError("");
      const chess = new Chess(game.fen);
      const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
      if (!move) return false;

      const end = detectGameEnd(chess);
      const next: LocalGameState = { fen: chess.fen(), ...end };
      setGame(next);

      if (next.status === "active" && chess.turn() === "b") {
        scheduleBotMove(chess.fen());
      }
      return true;
    },
    [game.fen, scheduleBotMove]
  );

  function handleResign() {
    clearBotTimer();
    setThinking(false);
    setGame({
      fen: game.fen,
      status: "finished",
      result: "resign",
      winner: "bot",
    });
  }

  function handleNewGame() {
    clearBotTimer();
    setThinking(false);
    setError("");
    setGame(freshGame());
  }

  return (
    <div className="codex-chess-page">
      <PageHeader title={`${humanName} vs ${BOT_NAME}`} />
      <p className="border-b border-[var(--color-border)] px-4 py-3 text-sm codex-text-muted">
        Practice mode · {difficultyLabel(difficulty)} bot · You are white
        {thinking ? " · Bot is thinking..." : ""}
      </p>
      <p className="border-b border-[var(--color-border)] px-4 py-2 text-xs codex-text-muted">
        Local game only — does not affect ELO or send notifications.
      </p>

      {error && (
        <p className="border-b border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="border-b border-[var(--color-border)]">
        <CodexChessboard
          position={game.fen}
          onPieceDrop={applyHumanMove}
          boardOrientation="white"
          arePiecesDraggable={isHumanTurn && !thinking}
          playerColor="w"
        />
      </div>

      {game.status === "active" && (
        <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)] px-4 py-4">
          <Button variant="danger" size="sm" onClick={handleResign} disabled={thinking}>
            Resign
          </Button>
          <Button variant="secondary" size="sm" onClick={handleNewGame} disabled={thinking}>
            New game
          </Button>
        </div>
      )}

      {game.status === "finished" && (
        <div className="space-y-3 px-4 py-4">
          <p className="text-[var(--color-accent)]">{resultMessage(game, humanName)}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="accent" size="sm" onClick={handleNewGame}>
              Play again
            </Button>
            <Link
              href="/chess"
              className="codex-btn-secondary inline-flex items-center rounded-full px-4 py-2 text-sm"
            >
              Back to chess
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
