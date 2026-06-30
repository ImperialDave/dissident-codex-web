import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  limit,
  deleteField,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { Chess } from "chess.js";
import { getFirebaseAuth, getFirebaseDb, getFirebaseFunctions } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/constants";
import { chessGameId, mapFirestoreError } from "@/lib/utils";
import type { ChessGame, ChessLeaderboardEntry, User } from "@/models";
import { fetchUser } from "./authService";
import { isBlockedEitherWay } from "./blockService";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function isPermissionDenied(err: unknown): boolean {
  return err instanceof Error && err.message.includes("permission-denied");
}

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

async function activateGame(gameId: string, current: ChessGame): Promise<ChessGame> {
  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.CHESS_GAMES, gameId), {
    status: "active",
    updatedAt: Timestamp.now(),
  });
  return (await getGameById(gameId)) ?? { ...current, status: "active" };
}

async function resetForNewGame(
  gameId: string,
  challengerUid: string,
  prev: ChessGame,
  myUser: User,
  oppUser: User
): Promise<ChessGame> {
  const now = Timestamp.now();
  const whiteName =
    prev.whiteUid === myUser.uid
      ? myUser.displayName || "Player"
      : oppUser.displayName || "Player";
  const blackName =
    prev.blackUid === myUser.uid
      ? myUser.displayName || "Player"
      : oppUser.displayName || "Player";

  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.CHESS_GAMES, gameId), {
    playerUids: [prev.whiteUid, prev.blackUid],
    whiteUid: prev.whiteUid,
    blackUid: prev.blackUid,
    whiteName,
    blackName,
    challengerUid,
    status: "active",
    fen: START_FEN,
    turn: "w",
    winnerUid: deleteField(),
    result: deleteField(),
    eloApplied: false,
    updatedAt: now,
  });

  const game = await getGameById(gameId);
  if (!game) throw new Error("Game reset failed");
  return game;
}

async function createNewGame(
  gameId: string,
  challengerUid: string,
  opponentUid: string,
  myUser: User,
  oppUser: User
): Promise<ChessGame> {
  const now = Timestamp.now();
  const activeGame: ChessGame = {
    id: gameId,
    playerUids: [challengerUid, opponentUid],
    whiteUid: challengerUid,
    blackUid: opponentUid,
    whiteName: myUser.displayName || "Player",
    blackName: oppUser.displayName || "Player",
    challengerUid,
    status: "active",
    fen: START_FEN,
    turn: "w",
    createdAt: now,
    updatedAt: now,
  };

  const ref = doc(getFirebaseDb(), COLLECTIONS.CHESS_GAMES, gameId);
  try {
    await setDoc(ref, activeGame);
    return activeGame;
  } catch (err) {
    if (!isPermissionDenied(err)) throw err;
    const pendingGame = { ...activeGame, status: "pending" };
    await setDoc(ref, pendingGame);
    return activateGame(gameId, pendingGame);
  }
}

async function startChessGameClient(opponentUid: string): Promise<ChessGame> {
  const me = getFirebaseAuth().currentUser?.uid;
  if (!me) throw new Error("Sign in required");
  if (me === opponentUid) throw new Error("Cannot play yourself");

  const [myUser, oppUser] = await Promise.all([fetchUser(me), fetchUser(opponentUid)]);
  if (!myUser) throw new Error("Profile missing");
  if (!oppUser) throw new Error("Opponent not found");

  const gameId = chessGameId(me, opponentUid);
  const ref = doc(getFirebaseDb(), COLLECTIONS.CHESS_GAMES, gameId);

  let existing;
  try {
    existing = await getDoc(ref);
  } catch (err) {
    if (!isPermissionDenied(err)) throw err;
    existing = null;
  }

  if (existing?.exists()) {
    const current = { id: gameId, ...(existing.data() as Omit<ChessGame, "id">) };
    if (current.status === "active") return current;
    if (current.status === "pending") return activateGame(gameId, current);
    if (current.status === "finished" || current.status === "declined") {
      return resetForNewGame(gameId, me, current, myUser, oppUser);
    }
  }

  return createNewGame(gameId, me, opponentUid, myUser, oppUser);
}

export async function startChessGame(opponentUid: string): Promise<ChessGame> {
  if (await isBlockedEitherWay(opponentUid)) {
    throw new Error("You cannot play chess with this user");
  }
  try {
    const fn = httpsCallable(getFirebaseFunctions(), "startChessGame");
    const result = await fn({ opponentUid });
    const data = result.data as { gameId?: string };
    if (data.gameId) {
      const game = await getGameById(data.gameId);
      if (game) return game;
    }
  } catch {
    // fall through to client-side create/read
  }

  try {
    return await startChessGameClient(opponentUid);
  } catch (err) {
    const existing = await getGameWithUser(opponentUid);
    if (existing && (existing.status === "active" || existing.status === "pending")) {
      return existing;
    }
    throw new Error(mapFirestoreError(err instanceof Error ? err.message : "Could not start chess game"));
  }
}

export async function applyMove(gameId: string, from: string, to: string, promotion?: string): Promise<void> {
  const me = getFirebaseAuth().currentUser?.uid;
  if (!me) throw new Error("Not signed in");

  const game = await getGameById(gameId);
  if (!game || game.status !== "active") throw new Error("Game not active");
  const isPlayer =
    game.playerUids?.includes(me) || game.whiteUid === me || game.blackUid === me;
  if (!isPlayer) throw new Error("Not a player");

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

  const fromArray = await getDocs(
    query(
      collection(getFirebaseDb(), COLLECTIONS.CHESS_GAMES),
      where("playerUids", "array-contains", me),
      limit(20)
    )
  ).then((snap) =>
    snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<ChessGame, "id">) }))
      .filter((g) => g.status === "active" || g.status === "pending")
  );

  if (fromArray.length > 0) return fromArray;

  const [whiteSnap, blackSnap] = await Promise.all([
    getDocs(query(collection(getFirebaseDb(), COLLECTIONS.CHESS_GAMES), where("whiteUid", "==", me), limit(20))),
    getDocs(query(collection(getFirebaseDb(), COLLECTIONS.CHESS_GAMES), where("blackUid", "==", me), limit(20))),
  ]);

  const merged = new Map<string, ChessGame>();
  for (const d of [...whiteSnap.docs, ...blackSnap.docs]) {
    const game = { id: d.id, ...(d.data() as Omit<ChessGame, "id">) };
    if (game.status === "active" || game.status === "pending") merged.set(game.id, game);
  }
  return [...merged.values()];
}
