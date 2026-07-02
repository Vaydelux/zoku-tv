import { 
  Swords, 
  Compass, 
  Film, 
  Smile, 
  ShieldAlert, 
  FileText, 
  Heart, 
  Users, 
  Sparkles, 
  Scroll, 
  Ghost, 
  Music, 
  Search, 
  Telescope, 
  Tv, 
  Eye, 
  AlertTriangle, 
  Rocket, 
  Newspaper, 
  MessageSquare,
  Mountain,
  HelpCircle,
  LucideIcon
} from "lucide-react";

export interface GenreDatabaseEntry {
  id: number;
  name: string;
  icon: LucideIcon;
}

export const GENRE_DATABASE: Record<number, GenreDatabaseEntry> = {
  28: { id: 28, name: "Action", icon: Swords },
  12: { id: 12, name: "Adventure", icon: Compass },
  16: { id: 16, name: "Animation", icon: Film },
  35: { id: 35, name: "Comedy", icon: Smile },
  80: { id: 80, name: "Crime", icon: ShieldAlert },
  99: { id: 99, name: "Documentary", icon: FileText },
  18: { id: 18, name: "Drama", icon: Heart },
  10751: { id: 10751, name: "Family", icon: Users },
  14: { id: 14, name: "Fantasy", icon: Sparkles },
  36: { id: 36, name: "History", icon: Scroll },
  27: { id: 27, name: "Horror", icon: Ghost },
  10402: { id: 10402, name: "Music", icon: Music },
  9648: { id: 9648, name: "Mystery", icon: Search },
  10749: { id: 10749, name: "Romance", icon: Heart },
  878: { id: 878, name: "Science Fiction", icon: Telescope },
  10770: { id: 10770, name: "TV Movie", icon: Tv },
  53: { id: 53, name: "Thriller", icon: Eye },
  10752: { id: 10752, name: "War", icon: Swords },
  37: { id: 37, name: "Western", icon: Mountain },
  10759: { id: 10759, name: "Action & Adventure", icon: Swords },
  10762: { id: 10762, name: "Kids", icon: Smile },
  10763: { id: 10763, name: "News", icon: Newspaper },
  10764: { id: 10764, name: "Reality", icon: Tv },
  10765: { id: 10765, name: "Sci-Fi & Fantasy", icon: Telescope },
  10766: { id: 10766, name: "Soap", icon: Heart },
  10767: { id: 10767, name: "Talk", icon: MessageSquare },
  10768: { id: 10768, name: "War & Politics", icon: ShieldAlert }
};

export const GENRE_ICON_MAP: Record<number, LucideIcon> = Object.entries(GENRE_DATABASE).reduce(
  (acc, [id, val]) => {
    acc[Number(id)] = val.icon;
    return acc;
  },
  {} as Record<number, LucideIcon>
);

export function getGenreIcon(genreId: number): LucideIcon {
  return GENRE_DATABASE[genreId]?.icon || Film;
}
