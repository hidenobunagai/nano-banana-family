import { BookOpen, Palette, UserCircle } from "lucide-react";

export type NavMode = "freestyle" | "icon" | "story";

export const NAV_ITEMS = [
  { id: "freestyle", label: "自由生成", icon: Palette },
  { id: "icon", label: "アイコン", icon: UserCircle },
  { id: "story", label: "ストーリー", icon: BookOpen },
] as const;
