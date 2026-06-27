import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Bookmark,
  Crown,
  Home,
  MessageCircle,
  PenSquare,
  Search,
  Shield,
  Trophy,
  User,
  Users,
  Tags,
  Gamepad2,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  matchPrefix?: boolean;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/feed", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/create", label: "Post", icon: PenSquare },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profile", label: "Profile", icon: User },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/topics", label: "Topics", icon: Tags },
  { href: "/chats", label: "Messages", icon: MessageCircle },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/chess", label: "Chess", icon: Gamepad2 },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/saved", label: "Saved", icon: Bookmark },
];

export const MOD_NAV: NavItem[] = [
  { href: "/mod", label: "Mod Tools", icon: Shield },
];

export const FOUNDER_NAV: NavItem[] = [
  { href: "/founder", label: "Founder", icon: Crown },
];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/feed") return pathname === "/feed" || pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}