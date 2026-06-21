import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  limit,
  updateDoc,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { Chess } from "chess.js";
import { getFirebaseAuth, getFirebaseDb, getFirebaseFunctions } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/constants";
import { chessGameId } from "@/lib/utils";
import type { ChessGame, ChessLeaderboardEntry } from "@/models";
import { fetchUser } from "./authService";

export async function getGameById(gameId: string): Promise<ChessGame | null> {
  const snap = await getDoc(doc(getFirebaseDb(), COLLECTIONS.CHESS_GAMES, gameId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<ChessGame, "id">) };
}

export async function getGameWithUser(opponentUid: string): Promise<ChessGame | null> {
  const me = getFirebaseAuth().currentUser?.uid;
  if (!me) return null;
  return getGameById(chessGameId(me, opponentUid));
}

export function listenGame(
  gameId: string,
  onUpdate: (game: ChessGame | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(getFirebaseDb(), COLLECTIONS.CHESS_GAMES, gameId),
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
        return;
      }
      onUpdate({ id: snap.id, ...(snap.data() as Omit<ChessGame, "id">) });
    },
    (err) => onError?.(err)
  );
}

export async function startChessGame(opponentUid: string): Promise<ChessGame> {
  const me = getFirebaseAuth().currentUser?.uid;
  if (!me) throw new Error("Sign in required");
  if (me === opponentUid) throw new Error("Cannot play yourself");

  try {
    const fn = httpsCallable(getFirebaseFunctions(), "startChessGame");
    const result = await fn({ opponentUid });
    const data = result.data as { gameId?: string };
    if (data.gameId) {
      const game = await getGameById(data.gameId);
      if (game) return game;
    }
  } catch {
    // fall through to client-side read
  }

  const existing = await getGameWithUser(opponentUid);
  if (existing && (existing.status === "active" || existing.status === "pending")) {
    return existing;
  }
  throw new Error("Could not start chess game. Deploy startChessGame Cloud Function.");
}

export async function applyMove(gameId: string, from: string, to: string, promotion?: string): Promise<void> {
  const me = getFirebaseAuth().currentUser?.uid;
  if (!me) throw new Error("Not signed in");

  const game = await getGameById(gameId);
  if (!game || game.status !== "active") throw new Error("Game not active");
  if (!game.playerUids.includes(me)) throw new Error("Not a player");

  const chess = new Chess(game.fen);
  const move = chess.move({ from, to, promotion: promotion as "q" | "r" | "b" | "n" | undefined });
  if (!move) throw new Error("Invalid move");

  const updates: Partial<ChessGame> & Record<string, unknown> = {
    fen: chess.fen(),
    turn: chess.turn(),
    updatedAt: Timestamp.now(),
  };

  if (chess.isGameOver()) {
    updates.status = "finished";
    if (chess.isCheckmate()) {
      updates.result = "checkmate";
      updates.winnerUid = game.turn === "w" ? game.whiteUid : game.blackUid;
    } else if (chess.isStalemate()) {
      updates.result = "stalemate";
    } else {
      updates.result = "draw";
    }
  }

  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.CHESS_GAMES, gameId), updates);
}

export async function resignGame(gameId: string): Promise<void> {
  const me = getFirebaseAuth().currentUser?.uid;
  if (!me) throw new Error("Not signed in");
  const game = await getGameById(gameId);
  if (!game) throw new Error("Game not found");
  const winner = game.whiteUid === me ? game.blackUid : game.whiteUid;
  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.CHESS_GAMES, gameId), {
    status: "finished",
    result: "resign",
    winnerUid: winner,
    updatedAt: Timestamp.now(),
  });
}

export async function getChessLeaderboard(max = 50): Promise<ChessLeaderboardEntry[]> {
  const snap = await getDocs(query(collection(getFirebaseDb(), COLLECTIONS.USERS), limit(200)));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        displayName: (data.displayName as string) || "User",
        photoUrl: data.photoUrl as string | undefined,
        elo: Number(data.chessElo) || 1200,
        wins: Number(data.chessWins) || 0,
        losses: Number(data.chessLosses) || 0,
        draws: Number(data.chessDraws) || 0,
        gamesPlayed: Number(data.chessGamesPlayed) || 0,
      };
    })
    .filter((e) => e.gamesPlayed > 0)
    .sort((a, b) => b.elo - a.elo)
    .slice(0, max);
}

export async function getMyActiveGames(): Promise<ChessGame[]> {
  const me = getFirebaseAuth().currentUser?.uid;
  if (!me) return [];
  const snap = await getDocs(
    query(
      collection(getFirebaseDb(), COLLECTIONS.CHESS_GAMES),
      where("playerUids", "array-contains", me),
      limit(20)
    )
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<ChessGame, "id">) }))
    .filter((g) => g.status === "active" || g.status === "pending");
}