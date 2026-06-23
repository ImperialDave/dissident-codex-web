"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { applyMove, getGameById, listenGame, resignGame } from "@/services/chessService";
import { useAuthStore } from "@/stores/authStore";
import type { ChessGame } from "@/models";

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

  const isMyTurn = useMemo(() => {
    if (!game || !user) return false;
    const color = game.whiteUid === user.uid ? "w" : game.blackUid === user.uid ? "b" : null;
    return color === game.turn;
  }, [game, user]);

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
          setError(err instanceof Error ? err.message : "Invalid move");
        }
      })();
      return true;
    },
    [game, gameId, isMyTurn]
  );

  if (!game) return <p className="text-slate-400">Loading game...</p>;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-bold">
        {game.whiteName} vs {game.blackName}
      </h1>
      <p className="text-sm text-slate-400">
        Status: {game.status} · Turn: {game.turn === "w" ? "White" : "Black"}
        {myColor && ` · You are ${myColor}`}
      </p>
      {error && <p className="text-red-400">{error}</p>}

      <div className="codex-surface overflow-hidden rounded-xl">
        <Chessboard
          position={game.fen}
          onPieceDrop={onDrop}
          boardOrientation={myColor || "white"}
          arePiecesDraggable={game.status === "active" && isMyTurn}
        />
      </div>

      {game.status === "active" && myColor && (
        <button
          onClick={() => resignGame(gameId)}
          className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-300"
        >
          Resign
        </button>
      )}

      {game.status === "finished" && (
        <p className="text-[var(--color-accent)]">
          Game over: {game.result}
          {game.winnerUid &&
            ` — Winner: ${game.winnerUid === game.whiteUid ? game.whiteName : game.blackName}`}
        </p>
      )}
    </div>
  );
}