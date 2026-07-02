"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Chess } from "chess.js";
import { CodexChessboard } from "@/components/CodexChessboard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { applyMove, getGameById, listenGame, resignGame } from "@/services/chessService";
import { useAuthStore } from "@/stores/authStore";
import type { ChessGame } from "@/models";
import { sanitizeUserError } from "@/lib/utils";

export default function ChessGamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuthStore();
  const [game, setGame] = useState<ChessGame | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getGameById(gameId).then(setGame);
    return listenGame(gameId, setGame);
  }, [gameId]);

  const myColor = useMemo(() => {
    if (!game || !user) return null;
    if (game.whiteUid === user.uid) return "white" as const;
    if (game.blackUid === user.uid) return "black" as const;
    return null;
  }, [game, user]);

  const myPieceColor = useMemo(() => {
    if (!game || !user) return null;
    if (game.whiteUid === user.uid) return "w" as const;
    if (game.blackUid === user.uid) return "b" as const;
    return null;
  }, [game, user]);

  const isMyTurn = useMemo(() => {
    if (!game || !myPieceColor) return false;
    return myPieceColor === game.turn;
  }, [game, myPieceColor]);

  const onDrop = useCallback(
    (sourceSquare: string, targetSquare: string) => {
      if (!game || game.status !== "active" || !isMyTurn) return false;
      (async () => {
        try {
          const chess = new Chess(game.fen);
          const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
          if (!move) return;
          await applyMove(gameId, sourceSquare, targetSquare, move.promotion);
        } catch (err) {
          setError(sanitizeUserError(err, "Invalid move"));
        }
      })();
      return true;
    },
    [game, gameId, isMyTurn]
  );

  if (!game) {
    return (
      <div className="px-4 py-8 codex-text-muted">
        Loading game...
      </div>
    );
  }

  return (
    <div className="codex-chess-page">
      <PageHeader title={`${game.whiteName} vs ${game.blackName}`} />
      <p className="border-b border-[var(--color-border)] px-4 py-3 text-sm codex-text-muted">
        Status: {game.status} · Turn: {game.turn === "w" ? "White" : "Black"}
        {myColor && ` · You are ${myColor}`}
      </p>

      {error && (
        <p className="border-b border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="border-b border-[var(--color-border)]">
        <CodexChessboard
          position={game.fen}
          onPieceDrop={onDrop}
          boardOrientation={myColor || "white"}
          arePiecesDraggable={game.status === "active" && isMyTurn}
          playerColor={myPieceColor ?? undefined}
        />
      </div>

      {game.status === "active" && myColor && (
        <div className="border-b border-[var(--color-border)] px-4 py-4">
          <Button variant="danger" size="sm" onClick={() => resignGame(gameId)}>
            Resign
          </Button>
        </div>
      )}

      {game.status === "finished" && (
        <p className="px-4 py-4 text-[var(--color-accent)]">
          Game over: {game.result}
          {game.winnerUid &&
            ` — Winner: ${game.winnerUid === game.whiteUid ? game.whiteName : game.blackName}`}
        </p>
      )}
    </div>
  );
}
