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
  FEED_HIDDEN_TOPICS: "feedHiddenTopics",
  CHESS_GAMES: "chessGames",
} as const;

export type ThemeFamily = "original" | "calm";

export type ThemeId =
  | "midnight"
  | "ocean"
  | "ember"
  | "forest"
  | "aurora"
  | "sage"
  | "dusk"
  | "sand"
  | "mist"
  | "linen";

export type Theme = {
  id: ThemeId;
  label: string;
  family: ThemeFamily;
  primary: string;
  surface: string;
  accent: string;
  accentAlt: string;
  bgGradient: string;
  surfaceGradient: string;
  accentGradient: string;
  border: string;
  textGlow: string;
  swatch: string;
};

export const THEME_FAMILIES: { id: ThemeFamily; label: string; hint: string }[] = [
  { id: "original", label: "Original", hint: "Cyber palettes with neon accents" },
  { id: "calm", label: "Calm", hint: "Soft, simple tones for relaxed reading" },
];

export const THEMES: Theme[] = [
  {
    id: "midnight",
    label: "Grid",
    family: "original",
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
    label: "Wave",
    family: "original",
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
    label: "Heat",
    family: "original",
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
    label: "Matrix",
    family: "original",
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
    label: "Pulse",
    family: "original",
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
  {
    id: "sage",
    label: "Sage",
    family: "calm",
    primary: "#1a211c",
    surface: "#242b26",
    accent: "#8fa892",
    accentAlt: "#a8b5a0",
    bgGradient: "linear-gradient(180deg, #1a211c 0%, #1e2520 50%, #1a211c 100%)",
    surfaceGradient: "linear-gradient(180deg, #242b26, #1f2621)",
    accentGradient: "linear-gradient(90deg, #8fa892, #a8b5a0)",
    border: "rgba(143, 168, 146, 0.22)",
    textGlow: "none",
    swatch: "linear-gradient(135deg, #6b7f6e, #a8b5a0)",
  },
  {
    id: "dusk",
    label: "Dusk",
    family: "calm",
    primary: "#1e1b24",
    surface: "#2a2630",
    accent: "#9b8fb8",
    accentAlt: "#b8a9c9",
    bgGradient: "linear-gradient(180deg, #1e1b24 0%, #221f2a 50%, #1e1b24 100%)",
    surfaceGradient: "linear-gradient(180deg, #2a2630, #24212b)",
    accentGradient: "linear-gradient(90deg, #9b8fb8, #b8a9c9)",
    border: "rgba(155, 143, 184, 0.22)",
    textGlow: "none",
    swatch: "linear-gradient(135deg, #7a6f94, #b8a9c9)",
  },
  {
    id: "sand",
    label: "Sand",
    family: "calm",
    primary: "#1f1c18",
    surface: "#2a2620",
    accent: "#c4a882",
    accentAlt: "#d4bc9a",
    bgGradient: "linear-gradient(180deg, #1f1c18 0%, #231f1a 50%, #1f1c18 100%)",
    surfaceGradient: "linear-gradient(180deg, #2a2620, #242018)",
    accentGradient: "linear-gradient(90deg, #c4a882, #d4bc9a)",
    border: "rgba(196, 168, 130, 0.22)",
    textGlow: "none",
    swatch: "linear-gradient(135deg, #a68b62, #d4bc9a)",
  },
  {
    id: "mist",
    label: "Mist",
    family: "calm",
    primary: "#181c20",
    surface: "#22282e",
    accent: "#8ba3b5",
    accentAlt: "#a3b8c7",
    bgGradient: "linear-gradient(180deg, #181c20 0%, #1b2024 50%, #181c20 100%)",
    surfaceGradient: "linear-gradient(180deg, #22282e, #1d2228)",
    accentGradient: "linear-gradient(90deg, #8ba3b5, #a3b8c7)",
    border: "rgba(139, 163, 181, 0.22)",
    textGlow: "none",
    swatch: "linear-gradient(135deg, #6b8496, #a3b8c7)",
  },
  {
    id: "linen",
    label: "Linen",
    family: "calm",
    primary: "#1c1a18",
    surface: "#262422",
    accent: "#b5a99a",
    accentAlt: "#c9bfb2",
    bgGradient: "linear-gradient(180deg, #1c1a18 0%, #201e1c 50%, #1c1a18 100%)",
    surfaceGradient: "linear-gradient(180deg, #262422, #211f1d)",
    accentGradient: "linear-gradient(90deg, #b5a99a, #c9bfb2)",
    border: "rgba(181, 169, 154, 0.22)",
    textGlow: "none",
    swatch: "linear-gradient(135deg, #958a7c, #c9bfb2)",
  },
];