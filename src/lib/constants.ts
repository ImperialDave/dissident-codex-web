export const FOUNDER_EMAIL = "ericdanielevans@gmail.com";
export const ALL_CATEGORY_LABEL = "All";

export const MAX_TITLE = 120;
export const MAX_BODY = 4000;
export const MAX_COMMENT = 1000;
export const MAX_NAME = 50;
export const MAX_BIO = 300;
export const MAX_FLAIR = 40;
export const MAX_CHAT_MESSAGE = 1000;

export const COLLECTIONS = {
  USERS: "users",
  POSTS: "posts",
  COMMENTS: "comments",
  CATEGORIES: "categories",
  CHAT_ROOMS: "chatRooms",
  MESSAGES: "messages",
  FRIEND_REQUESTS: "friendRequests",
  HIDDEN_TOPICS: "hiddenTopics",
  CHESS_GAMES: "chessGames",
} as const;

export const THEMES = [
  { id: "midnight", label: "Midnight", primary: "#0F172A", surface: "#1E2937", accent: "#14B8A6" },
  { id: "ocean", label: "Ocean", primary: "#0B1B2B", surface: "#132F4C", accent: "#29B6F6" },
  { id: "ember", label: "Ember", primary: "#1A0F0F", surface: "#2D1B1B", accent: "#F97316" },
  { id: "forest", label: "Forest", primary: "#0B1A12", surface: "#1A2E23", accent: "#22C55E" },
  { id: "aurora", label: "Aurora", primary: "#120B1F", surface: "#231535", accent: "#A855F7" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];