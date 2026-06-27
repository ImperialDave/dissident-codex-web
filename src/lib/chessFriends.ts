import type { ChessGame, Friend } from "@/models";

export function getOpponentUid(game: ChessGame, myUid: string): string | null {
  if (game.whiteUid === myUid) return game.blackUid;
  if (game.blackUid === myUid) return game.whiteUid;
  return null;
}

export function buildFriendGameMap(
  games: ChessGame[],
  myUid: string
): Map<string, ChessGame> {
  const map = new Map<string, ChessGame>();
  for (const game of games) {
    const opponent = getOpponentUid(game, myUid);
    if (opponent) map.set(opponent, game);
  }
  return map;
}

export function sortFriendsForChess(
  friends: Friend[],
  gameMap: Map<string, ChessGame>
): Friend[] {
  return [...friends].sort((a, b) => {
    const aActive = gameMap.has(a.uid);
    const bActive = gameMap.has(b.uid);
    if (aActive !== bActive) return aActive ? -1 : 1;
    return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" });
  });
}