import { Timestamp } from "firebase/firestore";

export type RoleName =
  | "FOUNDER"
  | "ADMIN"
  | "MOD"
  | "USER"
  | "SUSPENDED"
  | "BANNED";

export function roleFromString(value?: string | null): RoleName {
  switch (value?.toUpperCase()) {
    case "FOUNDER":
      return "FOUNDER";
    case "ADMIN":
      return "ADMIN";
    case "MOD":
    case "MODERATOR":
      return "MOD";
    case "SUSPENDED":
      return "SUSPENDED";
    case "BANNED":
      return "BANNED";
    default:
      return "USER";
  }
}

export function roleDisplayName(role: RoleName): string {
  switch (role) {
    case "FOUNDER":
      return "Founder";
    case "ADMIN":
      return "Admin";
    case "MOD":
      return "Moderator";
    case "SUSPENDED":
      return "Suspended";
    case "BANNED":
      return "Banned";
    default:
      return "Member";
  }
}

export function canPost(role: RoleName): boolean {
  return role === "FOUNDER" || role === "ADMIN" || role === "MOD" || role === "USER";
}

export function canModerate(role: RoleName): boolean {
  return role === "FOUNDER" || role === "ADMIN" || role === "MOD";
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoUrl?: string | null;
  bio?: string;
  backgroundUrl?: string | null;
  flair?: string | null;
  friendCount?: number;
  chessElo?: number;
  chessGamesPlayed?: number;
  chessWins?: number;
  chessLosses?: number;
  chessDraws?: number;
  role: string;
  createdAt?: Timestamp | null;
  lastActive?: Timestamp | null;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl?: string | null;
  authorRole: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  mediaType?: string | null;
  category: string;
  likeCount: number;
  commentCount: number;
  hiddenFromFeed?: boolean;
  hiddenBy?: string | null;
  hiddenAt?: Timestamp | null;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface Comment {
  id: string;
  postId: string;
  parentCommentId?: string | null;
  replyToAuthorName?: string | null;
  authorId: string;
  authorName: string;
  authorPhotoUrl?: string | null;
  authorRole: string;
  text: string;
  imageUrl?: string | null;
  mediaType?: string | null;
  likeCount: number;
  createdAt?: Timestamp | null;
}

export interface PostCategory {
  id: string;
  name: string;
  postCount?: number;
  createdAt?: Timestamp | null;
}

export interface ChatRoom {
  id: string;
  type: string;
  title: string;
  topicId?: string | null;
  topicName?: string | null;
  memberIds: string[];
  createdBy: string;
  createdAt?: Timestamp | null;
  lastMessageAt?: Timestamp | null;
  lastMessagePreview: string;
  lastMessageAuthorId: string;
  messageCount: number;
  locked?: boolean;
  lockedBy?: string | null;
  lockedAt?: Timestamp | null;
}

export const CHAT_TYPE_TOPIC = "topic";
export const CHAT_TYPE_DM = "dm";

export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl?: string | null;
  authorRole: string;
  text: string;
  imageUrl?: string | null;
  mediaType?: string | null;
  createdAt?: Timestamp | null;
  type: string;
}

export interface Friend {
  uid: string;
  displayName: string;
  photoUrl?: string | null;
  since?: Timestamp | null;
}

export interface FriendRequest {
  id: string;
  fromUid: string;
  fromName: string;
  fromPhotoUrl?: string | null;
  toUid: string;
  status: string;
  createdAt?: Timestamp | null;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  actorUid?: string | null;
  actorName?: string | null;
  targetId?: string | null;
  read: boolean;
  createdAt?: Timestamp | null;
}

export interface LeaderboardEntry {
  rank: number;
  title: string;
  roomId: string;
  messageCount: number;
  postCount: number;
  score: number;
  lastMessageAt?: Timestamp | null;
  isTopic: boolean;
}

export interface LeaderboardData {
  topTopics: LeaderboardEntry[];
  topChats: LeaderboardEntry[];
}

export interface ChessGame {
  id: string;
  playerUids: string[];
  whiteUid: string;
  blackUid: string;
  whiteName: string;
  blackName: string;
  challengerUid: string;
  status: string;
  fen: string;
  turn: string;
  winnerUid?: string | null;
  result?: string | null;
  eloApplied?: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface ChessLeaderboardEntry {
  uid: string;
  displayName: string;
  photoUrl?: string | null;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
}

export interface BannedTopic {
  id: string;
  name: string;
  categoryId?: string | null;
  bannedAt?: Timestamp | null;
}
