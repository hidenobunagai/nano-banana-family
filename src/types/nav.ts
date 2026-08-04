import { Palette, UserCircle } from "lucide-react";

export type NavMode = "freestyle" | "icon";

export const NAV_ITEMS = [
  { id: "freestyle", label: "自由生成", icon: Palette },
  { id: "icon", label: "アイコン", icon: UserCircle },
] as const;
