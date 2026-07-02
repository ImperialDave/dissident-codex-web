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
export const MAX_FOLLOWING = 200;
export const FEED_FOLLOWING_POSTS_LIMIT = 30;
export const SEARCH_POPULAR_TOPICS_LIMIT = 20;
export const SEARCH_POPULAR_CHATS_LIMIT = 20;
export const FEED_COMMUNITY_STRIP_LIMIT = 8;
export const COMMUNITIES_BROWSE_LIMIT = 30;
export const TOPICS_TRENDING_LIMIT = 6;
export const RIGHT_RAIL_COMMUNITIES_LIMIT = 5;

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
  | "aurora"
  | "sage"
  | "dusk"
  | "sand"
  | "mist"
  | "linen";

export type ThemeFamilyId = "neon" | "calm";

export const THEME_FAMILIES: {
  id: ThemeFamilyId;
  label: string;
  hint: string;
}[] = [
  {
    id: "neon",
    label: "Neon palettes",
    hint: "Bold cyber colors for Codex.",
  },
  {
    id: "calm",
    label: "Relaxed palettes",
    hint: "Muted tones with soft color washes — easier on the eyes.",
  },
];

export type ThemeLightPalette = {
  primary: string;
  surface: string;
  onSurface: string;
  textMuted: string;
  bgGradient: string;
  surfaceGradient: string;
  border: string;
  headerBg: string;
  inputBg: string;
  accentText: string;
  textGlow: string;
  surfaceShadow: string;
  ambientGlow: string;
  ambientGlowAlt: string;
};

export type Theme = {
  id: ThemeId;
  family: ThemeFamilyId;
  label: string;
  primary: string;
  surface: string;
  accent: string;
  accentAlt: string;
  bgGradient: string;
  surfaceGradient: string;
  accentGradient: string;
  border: string;
  textGlow: string;
  surfaceShadow: string;
  ambientGlow: string;
  ambientGlowAlt: string;
  swatch: string;
  light: ThemeLightPalette;
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
      "linear-gradient(155deg, #020008 0%, #0c0620 24%, color-mix(in srgb, #00f5ff 9%, #14082c) 48%, color-mix(in srgb, #ff2bd6 7%, #0a1428) 72%, #040818 100%)",
    surfaceGradient:
      "linear-gradient(148deg, color-mix(in srgb, #00f5ff 7%, rgba(22, 12, 44, 0.94)), color-mix(in srgb, #ff2bd6 5%, rgba(10, 22, 48, 0.88)))",
    accentGradient: "linear-gradient(90deg, #00f5ff, #ff2bd6)",
    border: "rgba(0, 245, 255, 0.28)",
    textGlow: "0 0 20px rgba(0, 245, 255, 0.6), 0 0 40px rgba(255, 43, 214, 0.3)",
    surfaceShadow:
      "0 4px 28px rgba(0, 245, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
    ambientGlow:
      "radial-gradient(ellipse 90% 60% at 4% 0%, rgba(0, 245, 255, 0.16), transparent 58%)",
    ambientGlowAlt:
      "radial-gradient(ellipse 78% 58% at 96% 100%, rgba(255, 43, 214, 0.14), transparent 60%)",
    swatch: "linear-gradient(135deg, #00f5ff, #ff2bd6)",
    light: {
      primary: "#ebe6f6",
      surface: "#f9f7fd",
      onSurface: "#1a1528",
      textMuted: "#5e5872",
      bgGradient:
        "linear-gradient(165deg, #f2eefb 0%, color-mix(in srgb, #00f5ff 10%, #e6f4fa) 36%, color-mix(in srgb, #ff2bd6 8%, #ece6f4) 68%, #ddd8ec 100%)",
      surfaceGradient:
        "linear-gradient(145deg, rgba(255, 255, 255, 0.98), color-mix(in srgb, #00f5ff 5%, #f2f0f8))",
      border: "color-mix(in srgb, #00f5ff 24%, #c8c2d8)",
      headerBg:
        "linear-gradient(180deg, #fefdff, color-mix(in srgb, #00f5ff 6%, #eeeaf6))",
      inputBg: "rgba(255, 255, 255, 0.9)",
      accentText: "color-mix(in srgb, #0891b2 68%, #1a1528)",
      textGlow: "0 0 14px color-mix(in srgb, #00f5ff 30%, transparent)",
      surfaceShadow: "0 2px 16px color-mix(in srgb, #00f5ff 10%, transparent)",
      ambientGlow:
        "radial-gradient(ellipse 80% 55% at 10% 6%, color-mix(in srgb, #00f5ff 16%, transparent), transparent 62%)",
      ambientGlowAlt:
        "radial-gradient(ellipse 72% 52% at 90% 94%, color-mix(in srgb, #ff2bd6 14%, transparent), transparent 58%)",
    },
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
      "linear-gradient(158deg, #010610 0%, #061428 26%, color-mix(in srgb, #38bdf8 10%, #0c2040) 50%, color-mix(in srgb, #6366f1 8%, #081c30) 74%, #041018 100%)",
    surfaceGradient:
      "linear-gradient(148deg, color-mix(in srgb, #38bdf8 8%, rgba(10, 28, 56, 0.92)), color-mix(in srgb, #6366f1 6%, rgba(8, 20, 40, 0.88)))",
    accentGradient: "linear-gradient(90deg, #38bdf8, #6366f1)",
    border: "rgba(56, 189, 248, 0.3)",
    textGlow: "0 0 20px rgba(56, 189, 248, 0.55), 0 0 36px rgba(99, 102, 241, 0.32)",
    surfaceShadow:
      "0 4px 28px rgba(56, 189, 248, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
    ambientGlow:
      "radial-gradient(ellipse 88% 58% at 8% 4%, rgba(56, 189, 248, 0.18), transparent 56%)",
    ambientGlowAlt:
      "radial-gradient(ellipse 76% 56% at 92% 96%, rgba(99, 102, 241, 0.15), transparent 58%)",
    swatch: "linear-gradient(135deg, #38bdf8, #6366f1)",
    light: {
      primary: "#e6f0fa",
      surface: "#f5fafe",
      onSurface: "#0c1a2e",
      textMuted: "#4a6278",
      bgGradient:
        "linear-gradient(165deg, #edf5fc 0%, color-mix(in srgb, #38bdf8 12%, #e2f0fa) 40%, color-mix(in srgb, #6366f1 9%, #e6eaf8) 72%, #d4e2f0 100%)",
      surfaceGradient:
        "linear-gradient(145deg, rgba(255, 255, 255, 0.98), color-mix(in srgb, #38bdf8 6%, #eef6fc))",
      border: "color-mix(in srgb, #38bdf8 26%, #b8cce0)",
      headerBg:
        "linear-gradient(180deg, #fbfdff, color-mix(in srgb, #38bdf8 7%, #e8f2fa))",
      inputBg: "rgba(255, 255, 255, 0.9)",
      accentText: "color-mix(in srgb, #0284c7 65%, #0c1a2e)",
      textGlow: "0 0 14px color-mix(in srgb, #38bdf8 32%, transparent)",
      surfaceShadow: "0 2px 16px color-mix(in srgb, #38bdf8 12%, transparent)",
      ambientGlow:
        "radial-gradient(ellipse 82% 56% at 12% 8%, color-mix(in srgb, #38bdf8 18%, transparent), transparent 60%)",
      ambientGlowAlt:
        "radial-gradient(ellipse 74% 54% at 88% 92%, color-mix(in srgb, #6366f1 14%, transparent), transparent 58%)",
    },
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
      "linear-gradient(158deg, #080204 0%, #220610 28%, color-mix(in srgb, #ff6b35 11%, #2a0c18) 52%, color-mix(in srgb, #ff2d87 8%, #1a0812) 76%, #100408 100%)",
    surfaceGradient:
      "linear-gradient(148deg, color-mix(in srgb, #ff6b35 8%, rgba(42, 14, 24, 0.94)), color-mix(in srgb, #ff2d87 6%, rgba(24, 8, 16, 0.88)))",
    accentGradient: "linear-gradient(90deg, #ff6b35, #ff2d87)",
    border: "rgba(255, 107, 53, 0.32)",
    textGlow: "0 0 20px rgba(255, 107, 53, 0.58), 0 0 36px rgba(255, 45, 135, 0.32)",
    surfaceShadow:
      "0 4px 28px rgba(255, 107, 53, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
    ambientGlow:
      "radial-gradient(ellipse 86% 58% at 6% 6%, rgba(255, 107, 53, 0.18), transparent 56%)",
    ambientGlowAlt:
      "radial-gradient(ellipse 78% 56% at 94% 94%, rgba(255, 45, 135, 0.15), transparent 58%)",
    swatch: "linear-gradient(135deg, #ff6b35, #ff2d87)",
    light: {
      primary: "#fdf0ea",
      surface: "#fff8f4",
      onSurface: "#2a1410",
      textMuted: "#7a5c52",
      bgGradient:
        "linear-gradient(165deg, #fef4ee 0%, color-mix(in srgb, #ff6b35 11%, #fce8de) 38%, color-mix(in srgb, #ff2d87 8%, #fae6e8) 70%, #f0dcd4 100%)",
      surfaceGradient:
        "linear-gradient(145deg, rgba(255, 255, 255, 0.98), color-mix(in srgb, #ff6b35 5%, #fef4ee))",
      border: "color-mix(in srgb, #ff6b35 24%, #e0c8bc)",
      headerBg:
        "linear-gradient(180deg, #fffcfa, color-mix(in srgb, #ff6b35 7%, #fdf0ea))",
      inputBg: "rgba(255, 255, 255, 0.9)",
      accentText: "color-mix(in srgb, #ea580c 62%, #2a1410)",
      textGlow: "0 0 14px color-mix(in srgb, #ff6b35 30%, transparent)",
      surfaceShadow: "0 2px 16px color-mix(in srgb, #ff6b35 10%, transparent)",
      ambientGlow:
        "radial-gradient(ellipse 80% 55% at 10% 8%, color-mix(in srgb, #ff6b35 16%, transparent), transparent 60%)",
      ambientGlowAlt:
        "radial-gradient(ellipse 72% 52% at 90% 92%, color-mix(in srgb, #ff2d87 12%, transparent), transparent 58%)",
    },
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
      "linear-gradient(158deg, #010604 0%, #061810 26%, color-mix(in srgb, #39ff14 9%, #0a2218) 50%, color-mix(in srgb, #00e5a0 7%, #061410) 74%, #030a08 100%)",
    surfaceGradient:
      "linear-gradient(148deg, color-mix(in srgb, #39ff14 7%, rgba(10, 32, 20, 0.92)), color-mix(in srgb, #00e5a0 5%, rgba(6, 20, 14, 0.9)))",
    accentGradient: "linear-gradient(90deg, #39ff14, #00e5a0)",
    border: "rgba(57, 255, 20, 0.28)",
    textGlow: "0 0 20px rgba(57, 255, 20, 0.5), 0 0 34px rgba(0, 229, 160, 0.28)",
    surfaceShadow:
      "0 4px 28px rgba(57, 255, 20, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
    ambientGlow:
      "radial-gradient(ellipse 88% 58% at 6% 4%, rgba(57, 255, 20, 0.14), transparent 56%)",
    ambientGlowAlt:
      "radial-gradient(ellipse 76% 56% at 94% 96%, rgba(0, 229, 160, 0.13), transparent 58%)",
    swatch: "linear-gradient(135deg, #39ff14, #00e5a0)",
    light: {
      primary: "#ecf6ee",
      surface: "#f6fbf7",
      onSurface: "#102018",
      textMuted: "#4a6a58",
      bgGradient:
        "linear-gradient(165deg, #f0faf2 0%, color-mix(in srgb, #39ff14 9%, #e4f6e8) 40%, color-mix(in srgb, #00e5a0 8%, #e0f4ee) 72%, #d0e8d8 100%)",
      surfaceGradient:
        "linear-gradient(145deg, rgba(255, 255, 255, 0.98), color-mix(in srgb, #00e5a0 5%, #eef8f2))",
      border: "color-mix(in srgb, #00e5a0 22%, #b8d4c4)",
      headerBg:
        "linear-gradient(180deg, #fbfffc, color-mix(in srgb, #00e5a0 6%, #ecf6ee))",
      inputBg: "rgba(255, 255, 255, 0.9)",
      accentText: "color-mix(in srgb, #059669 65%, #102018)",
      textGlow: "0 0 14px color-mix(in srgb, #00e5a0 28%, transparent)",
      surfaceShadow: "0 2px 16px color-mix(in srgb, #00e5a0 10%, transparent)",
      ambientGlow:
        "radial-gradient(ellipse 82% 56% at 10% 8%, color-mix(in srgb, #39ff14 14%, transparent), transparent 60%)",
      ambientGlowAlt:
        "radial-gradient(ellipse 74% 54% at 90% 92%, color-mix(in srgb, #00e5a0 12%, transparent), transparent 58%)",
    },
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
      "linear-gradient(158deg, #04020a 0%, #140828 26%, color-mix(in srgb, #c084fc 10%, #1c1034) 50%, color-mix(in srgb, #f472b6 8%, #12082c) 74%, #080414 100%)",
    surfaceGradient:
      "linear-gradient(148deg, color-mix(in srgb, #c084fc 8%, rgba(28, 14, 48, 0.94)), color-mix(in srgb, #f472b6 6%, rgba(18, 10, 36, 0.9)))",
    accentGradient: "linear-gradient(90deg, #c084fc, #f472b6)",
    border: "rgba(192, 132, 252, 0.3)",
    textGlow: "0 0 20px rgba(192, 132, 252, 0.55), 0 0 36px rgba(244, 114, 182, 0.32)",
    surfaceShadow:
      "0 4px 28px rgba(192, 132, 252, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
    ambientGlow:
      "radial-gradient(ellipse 88% 58% at 6% 4%, rgba(192, 132, 252, 0.17), transparent 56%)",
    ambientGlowAlt:
      "radial-gradient(ellipse 78% 56% at 94% 96%, rgba(244, 114, 182, 0.15), transparent 58%)",
    swatch: "linear-gradient(135deg, #c084fc, #f472b6)",
    light: {
      primary: "#f3ecf8",
      surface: "#faf6fc",
      onSurface: "#221830",
      textMuted: "#6a5c78",
      bgGradient:
        "linear-gradient(165deg, #f6f0fa 0%, color-mix(in srgb, #c084fc 11%, #eee6f8) 38%, color-mix(in srgb, #f472b6 9%, #fae8f2) 70%, #e4d8ec 100%)",
      surfaceGradient:
        "linear-gradient(145deg, rgba(255, 255, 255, 0.98), color-mix(in srgb, #c084fc 5%, #f4eef8))",
      border: "color-mix(in srgb, #c084fc 24%, #d0c4dc)",
      headerBg:
        "linear-gradient(180deg, #fefcff, color-mix(in srgb, #c084fc 7%, #f3ecf8))",
      inputBg: "rgba(255, 255, 255, 0.9)",
      accentText: "color-mix(in srgb, #9333ea 62%, #221830)",
      textGlow: "0 0 14px color-mix(in srgb, #c084fc 30%, transparent)",
      surfaceShadow: "0 2px 16px color-mix(in srgb, #c084fc 10%, transparent)",
      ambientGlow:
        "radial-gradient(ellipse 82% 56% at 10% 8%, color-mix(in srgb, #c084fc 16%, transparent), transparent 60%)",
      ambientGlowAlt:
        "radial-gradient(ellipse 74% 54% at 90% 92%, color-mix(in srgb, #f472b6 13%, transparent), transparent 58%)",
    },
  },
  {
    id: "sage",
    family: "calm",
    label: "Sage",
    primary: "#1a221c",
    surface: "#243028",
    accent: "#7d9b76",
    accentAlt: "#a8b89e",
    bgGradient:
      "linear-gradient(168deg, #101612 0%, color-mix(in srgb, #7d9b76 8%, #1c2620) 34%, #222e26 58%, color-mix(in srgb, #a8b89e 6%, #1a221c) 82%, #141a16 100%)",
    surfaceGradient:
      "linear-gradient(155deg, color-mix(in srgb, #7d9b76 7%, rgba(36, 48, 40, 0.96)), color-mix(in srgb, #a8b89e 5%, rgba(28, 36, 32, 0.92)))",
    accentGradient: "linear-gradient(90deg, #7d9b76, #a8b89e)",
    border: "rgba(125, 155, 118, 0.34)",
    textGlow: "0 0 16px rgba(125, 155, 118, 0.22)",
    surfaceShadow:
      "0 4px 24px rgba(125, 155, 118, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
    ambientGlow:
      "radial-gradient(ellipse 85% 55% at 8% 6%, rgba(125, 155, 118, 0.12), transparent 58%)",
    ambientGlowAlt:
      "radial-gradient(ellipse 72% 52% at 92% 94%, rgba(168, 184, 158, 0.1), transparent 60%)",
    swatch: "linear-gradient(135deg, #7d9b76, #a8b89e)",
    light: {
      primary: "#eef4ec",
      surface: "#f7faf6",
      onSurface: "#222820",
      textMuted: "#5c6a58",
      bgGradient:
        "linear-gradient(168deg, #f4f8f2 0%, color-mix(in srgb, #7d9b76 12%, #eaf2e6) 42%, color-mix(in srgb, #a8b89e 9%, #e6eee2) 74%, #dce6d8 100%)",
      surfaceGradient:
        "linear-gradient(155deg, rgba(255, 255, 255, 0.98), color-mix(in srgb, #7d9b76 5%, #f0f6ee))",
      border: "color-mix(in srgb, #7d9b76 26%, #c4d0be)",
      headerBg:
        "linear-gradient(180deg, #fcfefb, color-mix(in srgb, #7d9b76 7%, #eef4ec))",
      inputBg: "rgba(255, 255, 255, 0.92)",
      accentText: "color-mix(in srgb, #5a7a54 68%, #222820)",
      textGlow: "none",
      surfaceShadow: "0 2px 14px color-mix(in srgb, #7d9b76 10%, transparent)",
      ambientGlow:
        "radial-gradient(ellipse 80% 54% at 10% 8%, color-mix(in srgb, #7d9b76 14%, transparent), transparent 62%)",
      ambientGlowAlt:
        "radial-gradient(ellipse 72% 50% at 90% 92%, color-mix(in srgb, #a8b89e 11%, transparent), transparent 58%)",
    },
  },
  {
    id: "dusk",
    family: "calm",
    label: "Dusk",
    primary: "#1c1824",
    surface: "#282236",
    accent: "#9b8ec4",
    accentAlt: "#c4a8b8",
    bgGradient:
      "linear-gradient(168deg, #12101a 0%, color-mix(in srgb, #9b8ec4 9%, #221e2e) 36%, #2a2438 58%, color-mix(in srgb, #c4a8b8 7%, #1e1a26) 82%, #16121e 100%)",
    surfaceGradient:
      "linear-gradient(155deg, color-mix(in srgb, #9b8ec4 8%, rgba(40, 34, 54, 0.96)), color-mix(in srgb, #c4a8b8 5%, rgba(30, 26, 42, 0.92)))",
    accentGradient: "linear-gradient(90deg, #9b8ec4, #c4a8b8)",
    border: "rgba(155, 142, 196, 0.32)",
    textGlow: "0 0 16px rgba(155, 142, 196, 0.22)",
    surfaceShadow:
      "0 4px 24px rgba(155, 142, 196, 0.09), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
    ambientGlow:
      "radial-gradient(ellipse 85% 55% at 8% 6%, rgba(155, 142, 196, 0.13), transparent 58%)",
    ambientGlowAlt:
      "radial-gradient(ellipse 72% 52% at 92% 94%, rgba(196, 168, 184, 0.1), transparent 60%)",
    swatch: "linear-gradient(135deg, #9b8ec4, #c4a8b8)",
    light: {
      primary: "#efecf6",
      surface: "#f8f6fb",
      onSurface: "#242030",
      textMuted: "#6a6278",
      bgGradient:
        "linear-gradient(168deg, #f4f2f8 0%, color-mix(in srgb, #9b8ec4 11%, #ebe8f4) 42%, color-mix(in srgb, #c4a8b8 9%, #f0e8ee) 74%, #e0dae8 100%)",
      surfaceGradient:
        "linear-gradient(155deg, rgba(255, 255, 255, 0.98), color-mix(in srgb, #9b8ec4 5%, #f2f0f6))",
      border: "color-mix(in srgb, #9b8ec4 24%, #ccc6d8)",
      headerBg:
        "linear-gradient(180deg, #fefcff, color-mix(in srgb, #9b8ec4 7%, #efecf6))",
      inputBg: "rgba(255, 255, 255, 0.92)",
      accentText: "color-mix(in srgb, #7c6aad 65%, #242030)",
      textGlow: "none",
      surfaceShadow: "0 2px 14px color-mix(in srgb, #9b8ec4 10%, transparent)",
      ambientGlow:
        "radial-gradient(ellipse 80% 54% at 10% 8%, color-mix(in srgb, #9b8ec4 14%, transparent), transparent 62%)",
      ambientGlowAlt:
        "radial-gradient(ellipse 72% 50% at 90% 92%, color-mix(in srgb, #c4a8b8 11%, transparent), transparent 58%)",
    },
  },
  {
    id: "sand",
    family: "calm",
    label: "Sand",
    primary: "#221e18",
    surface: "#2e2820",
    accent: "#c4a574",
    accentAlt: "#d4b896",
    bgGradient:
      "linear-gradient(168deg, #16120e 0%, color-mix(in srgb, #c4a574 9%, #2a241c) 36%, #322c22 58%, color-mix(in srgb, #d4b896 7%, #221e18) 82%, #1a1612 100%)",
    surfaceGradient:
      "linear-gradient(155deg, color-mix(in srgb, #c4a574 8%, rgba(46, 40, 32, 0.96)), color-mix(in srgb, #d4b896 5%, rgba(36, 30, 24, 0.92)))",
    accentGradient: "linear-gradient(90deg, #c4a574, #d4b896)",
    border: "rgba(196, 165, 116, 0.34)",
    textGlow: "0 0 16px rgba(196, 165, 116, 0.2)",
    surfaceShadow:
      "0 4px 24px rgba(196, 165, 116, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
    ambientGlow:
      "radial-gradient(ellipse 85% 55% at 8% 6%, rgba(196, 165, 116, 0.12), transparent 58%)",
    ambientGlowAlt:
      "radial-gradient(ellipse 72% 52% at 92% 94%, rgba(212, 184, 150, 0.1), transparent 60%)",
    swatch: "linear-gradient(135deg, #c4a574, #d4b896)",
    light: {
      primary: "#f8f2e8",
      surface: "#fdfaf4",
      onSurface: "#2a241c",
      textMuted: "#7a6e5e",
      bgGradient:
        "linear-gradient(168deg, #faf4ea 0%, color-mix(in srgb, #c4a574 12%, #f4ead8) 42%, color-mix(in srgb, #d4b896 10%, #f6eee2) 74%, #e8dcc8 100%)",
      surfaceGradient:
        "linear-gradient(155deg, rgba(255, 255, 255, 0.98), color-mix(in srgb, #c4a574 5%, #faf4ea))",
      border: "color-mix(in srgb, #c4a574 26%, #d8ccb8)",
      headerBg:
        "linear-gradient(180deg, #fffdfa, color-mix(in srgb, #c4a574 7%, #f8f2e8))",
      inputBg: "rgba(255, 255, 255, 0.92)",
      accentText: "color-mix(in srgb, #a67c3a 65%, #2a241c)",
      textGlow: "none",
      surfaceShadow: "0 2px 14px color-mix(in srgb, #c4a574 10%, transparent)",
      ambientGlow:
        "radial-gradient(ellipse 80% 54% at 10% 8%, color-mix(in srgb, #c4a574 14%, transparent), transparent 62%)",
      ambientGlowAlt:
        "radial-gradient(ellipse 72% 50% at 90% 92%, color-mix(in srgb, #d4b896 11%, transparent), transparent 58%)",
    },
  },
  {
    id: "mist",
    family: "calm",
    label: "Mist",
    primary: "#181c22",
    surface: "#242a32",
    accent: "#7a9aad",
    accentAlt: "#9eb4c4",
    bgGradient:
      "linear-gradient(168deg, #10141a 0%, color-mix(in srgb, #7a9aad 9%, #1c222a) 36%, #283038 58%, color-mix(in srgb, #9eb4c4 7%, #1a1e26) 82%, #12161c 100%)",
    surfaceGradient:
      "linear-gradient(155deg, color-mix(in srgb, #7a9aad 8%, rgba(36, 42, 50, 0.96)), color-mix(in srgb, #9eb4c4 5%, rgba(28, 34, 42, 0.92)))",
    accentGradient: "linear-gradient(90deg, #7a9aad, #9eb4c4)",
    border: "rgba(122, 154, 173, 0.32)",
    textGlow: "0 0 16px rgba(122, 154, 173, 0.22)",
    surfaceShadow:
      "0 4px 24px rgba(122, 154, 173, 0.09), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
    ambientGlow:
      "radial-gradient(ellipse 85% 55% at 8% 6%, rgba(122, 154, 173, 0.13), transparent 58%)",
    ambientGlowAlt:
      "radial-gradient(ellipse 72% 52% at 92% 94%, rgba(158, 180, 196, 0.1), transparent 60%)",
    swatch: "linear-gradient(135deg, #7a9aad, #9eb4c4)",
    light: {
      primary: "#eaf0f6",
      surface: "#f4f8fb",
      onSurface: "#1c2430",
      textMuted: "#5a6878",
      bgGradient:
        "linear-gradient(168deg, #f0f6fc 0%, color-mix(in srgb, #7a9aad 11%, #e4eef6) 42%, color-mix(in srgb, #9eb4c4 9%, #e8f0f6) 74%, #d4e0ea 100%)",
      surfaceGradient:
        "linear-gradient(155deg, rgba(255, 255, 255, 0.98), color-mix(in srgb, #7a9aad 5%, #eef4f8))",
      border: "color-mix(in srgb, #7a9aad 24%, #bcc8d4)",
      headerBg:
        "linear-gradient(180deg, #fbfdff, color-mix(in srgb, #7a9aad 7%, #eaf0f6))",
      inputBg: "rgba(255, 255, 255, 0.92)",
      accentText: "color-mix(in srgb, #4a7a94 65%, #1c2430)",
      textGlow: "none",
      surfaceShadow: "0 2px 14px color-mix(in srgb, #7a9aad 10%, transparent)",
      ambientGlow:
        "radial-gradient(ellipse 80% 54% at 10% 8%, color-mix(in srgb, #7a9aad 14%, transparent), transparent 62%)",
      ambientGlowAlt:
        "radial-gradient(ellipse 72% 50% at 90% 92%, color-mix(in srgb, #9eb4c4 11%, transparent), transparent 58%)",
    },
  },
  {
    id: "linen",
    family: "calm",
    label: "Linen",
    primary: "#221e1a",
    surface: "#2c2620",
    accent: "#b8957a",
    accentAlt: "#c9a88e",
    bgGradient:
      "linear-gradient(168deg, #161412 0%, color-mix(in srgb, #b8957a 9%, #2a241e) 36%, #342e26 58%, color-mix(in srgb, #c9a88e 7%, #221e1a) 82%, #1a1614 100%)",
    surfaceGradient:
      "linear-gradient(155deg, color-mix(in srgb, #b8957a 8%, rgba(44, 38, 32, 0.96)), color-mix(in srgb, #c9a88e 5%, rgba(34, 28, 24, 0.92)))",
    accentGradient: "linear-gradient(90deg, #b8957a, #c9a88e)",
    border: "rgba(184, 149, 122, 0.34)",
    textGlow: "0 0 16px rgba(184, 149, 122, 0.2)",
    surfaceShadow:
      "0 4px 24px rgba(184, 149, 122, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
    ambientGlow:
      "radial-gradient(ellipse 85% 55% at 8% 6%, rgba(184, 149, 122, 0.12), transparent 58%)",
    ambientGlowAlt:
      "radial-gradient(ellipse 72% 52% at 92% 94%, rgba(201, 168, 142, 0.1), transparent 60%)",
    swatch: "linear-gradient(135deg, #b8957a, #c9a88e)",
    light: {
      primary: "#f6f0ea",
      surface: "#fcfaf6",
      onSurface: "#2a241e",
      textMuted: "#7a6e62",
      bgGradient:
        "linear-gradient(168deg, #faf4ee 0%, color-mix(in srgb, #b8957a 11%, #f2e8de) 42%, color-mix(in srgb, #c9a88e 9%, #f4ece4) 74%, #e8dcd0 100%)",
      surfaceGradient:
        "linear-gradient(155deg, rgba(255, 255, 255, 0.98), color-mix(in srgb, #b8957a 5%, #f8f2ec))",
      border: "color-mix(in srgb, #b8957a 24%, #d8ccc0)",
      headerBg:
        "linear-gradient(180deg, #fffdfa, color-mix(in srgb, #b8957a 7%, #f6f0ea))",
      inputBg: "rgba(255, 255, 255, 0.92)",
      accentText: "color-mix(in srgb, #9a7048 65%, #2a241e)",
      textGlow: "none",
      surfaceShadow: "0 2px 14px color-mix(in srgb, #b8957a 10%, transparent)",
      ambientGlow:
        "radial-gradient(ellipse 80% 54% at 10% 8%, color-mix(in srgb, #b8957a 14%, transparent), transparent 62%)",
      ambientGlowAlt:
        "radial-gradient(ellipse 72% 50% at 90% 92%, color-mix(in srgb, #c9a88e 11%, transparent), transparent 58%)",
    },
  },
];