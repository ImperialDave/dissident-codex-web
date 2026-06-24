export const FOUNDER_EMAIL = "ericdanielevans@gmail.com";
export const ALL_CATEGORY_LABEL = "All";

export const MAX_TITLE = 120;
export const MAX_BODY = 4000;
export const MAX_COMMENT = 1000;
export const MAX_NAME = 50;
export const MAX_BIO = 300;
export const MAX_FLAIR = 40;
export const MAX_CHAT_MESSAGE = 1000;
export const VOICE_MAX_DM = 2;
export const VOICE_MAX_TOPIC = 25;
export const VOICE_MAX_GROUP = 25;
export const FEED_DM_STRIP_LIMIT = 12;
export const MAX_FAVORITE_CATEGORIES = 6;
export const FEED_FAVORITE_POSTS_LIMIT = 30;

export const COLLECTIONS = {
  USERS: "users",
  POSTS: "posts",
  COMMENTS: "comments",
  CATEGORIES: "categories",
  CHAT_ROOMS: "chatRooms",
  MESSAGES: "messages",
  FRIEND_REQUESTS: "friendRequests",
  HIDDEN_TOPICS: "hiddenTopics",
  FEED_HIDDEN_TOPICS: "feedHiddenTopics",
  CHESS_GAMES: "chessGames",
  VOICE_SESSIONS: "voiceSessions",
} as const;

export type ThemeId =
  | "midnight"
  | "ocean"
  | "ember"
  | "forest"
  | "aurora";

export type ThemeFamilyId = "neon" | "calm";

export const THEME_FAMILIES: {
  id: ThemeFamilyId;
  label: string;
  hint: string;
}[] = [
  {
    id: "neon",
    label: "Color schemes",
    hint: "Pick a neon palette for Codex.",
  },
];

export type Theme = {
  id: ThemeId;
  family: ThemeFamilyId;
  label: string;
  /** Solid tone for translucent overlays */
  primary: string;
  /** Card / panel base */
  surface: string;
  /** Primary neon */
  accent: string;
  /** Secondary neon for gradients */
  accentAlt: string;
  /** Full-page background */
  bgGradient: string;
  /** Card background */
  surfaceGradient: string;
  /** Accent button gradient */
  accentGradient: string;
  /** Neon border */
  border: string;
  /** Logo / heading glow */
  textGlow: string;
  /** Theme picker swatch */
  swatch: string;
};

export const THEMES: Theme[] = [
  {
    id: "midnight",
    family: "neon",
    label: "Grid",
    primary: "#0a0614",
    surface: "#140c28",
    accent: "#00f5ff",
    accentAlt: "#ff2bd6",
    bgGradient:
      "linear-gradient(165deg, #03010a 0%, #12082a 42%, #081428 100%)",
    surfaceGradient:
      "linear-gradient(145deg, rgba(22, 12, 44, 0.92), rgba(10, 22, 48, 0.82))",
    accentGradient: "linear-gradient(90deg, #00f5ff, #ff2bd6)",
    border: "rgba(0, 245, 255, 0.22)",
    textGlow: "0 0 18px rgba(0, 245, 255, 0.55), 0 0 36px rgba(255, 43, 214, 0.25)",
    swatch: "linear-gradient(135deg, #00f5ff, #ff2bd6)",
  },
  {
    id: "ocean",
    family: "neon",
    label: "Wave",
    primary: "#06101f",
    surface: "#0c1c34",
    accent: "#38bdf8",
    accentAlt: "#6366f1",
    bgGradient:
      "linear-gradient(165deg, #020814 0%, #0a1a38 45%, #061828 100%)",
    surfaceGradient:
      "linear-gradient(145deg, rgba(10, 28, 56, 0.9), rgba(8, 20, 40, 0.85))",
    accentGradient: "linear-gradient(90deg, #38bdf8, #6366f1)",
    border: "rgba(56, 189, 248, 0.24)",
    textGlow: "0 0 18px rgba(56, 189, 248, 0.5), 0 0 32px rgba(99, 102, 241, 0.3)",
    swatch: "linear-gradient(135deg, #38bdf8, #6366f1)",
  },
  {
    id: "ember",
    family: "neon",
    label: "Heat",
    primary: "#140608",
    surface: "#2a1018",
    accent: "#ff6b35",
    accentAlt: "#ff2d87",
    bgGradient:
      "linear-gradient(165deg, #0a0204 0%, #2a0818 42%, #180610 100%)",
    surfaceGradient:
      "linear-gradient(145deg, rgba(42, 14, 24, 0.92), rgba(24, 8, 16, 0.85))",
    accentGradient: "linear-gradient(90deg, #ff6b35, #ff2d87)",
    border: "rgba(255, 107, 53, 0.26)",
    textGlow: "0 0 18px rgba(255, 107, 53, 0.55), 0 0 32px rgba(255, 45, 135, 0.3)",
    swatch: "linear-gradient(135deg, #ff6b35, #ff2d87)",
  },
  {
    id: "forest",
    family: "neon",
    label: "Matrix",
    primary: "#040c06",
    surface: "#0c1e14",
    accent: "#39ff14",
    accentAlt: "#00e5a0",
    bgGradient:
      "linear-gradient(165deg, #010804 0%, #082012 45%, #041410 100%)",
    surfaceGradient:
      "linear-gradient(145deg, rgba(10, 32, 20, 0.9), rgba(6, 20, 14, 0.88))",
    accentGradient: "linear-gradient(90deg, #39ff14, #00e5a0)",
    border: "rgba(57, 255, 20, 0.22)",
    textGlow: "0 0 18px rgba(57, 255, 20, 0.45), 0 0 30px rgba(0, 229, 160, 0.25)",
    swatch: "linear-gradient(135deg, #39ff14, #00e5a0)",
  },
  {
    id: "aurora",
    family: "neon",
    label: "Pulse",
    primary: "#0c0618",
    surface: "#1a1030",
    accent: "#c084fc",
    accentAlt: "#f472b6",
    bgGradient:
      "linear-gradient(165deg, #06030e 0%, #1a0a32 42%, #12082a 100%)",
    surfaceGradient:
      "linear-gradient(145deg, rgba(28, 14, 48, 0.92), rgba(18, 10, 36, 0.86))",
    accentGradient: "linear-gradient(90deg, #c084fc, #f472b6)",
    border: "rgba(192, 132, 252, 0.24)",
    textGlow: "0 0 18px rgba(192, 132, 252, 0.5), 0 0 32px rgba(244, 114, 182, 0.3)",
    swatch: "linear-gradient(135deg, #c084fc, #f472b6)",
  },
];
