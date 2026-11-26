import { create } from "zustand";

export interface RailFilterOption {
  id: string;
  label: string;
}

export type RailSortMode =
  | "popularity"
  | "newest"
  | "ratings"
  | "most_watched";

export interface RailFilterState {
  activeFilter: string;
  filterOptions: RailFilterOption[];
  railSort: RailSortMode;
  setActiveFilter: (filterId: string) => void;
  setFilterOptions: (options: RailFilterOption[]) => void;
  setRailSort: (sort: RailSortMode) => void;
}

export const useRailFilterStore = create<RailFilterState>((set) => ({
  activeFilter: "all",
  filterOptions: [],
  railSort: "popularity",
  setActiveFilter: (filterId: string) => set({ activeFilter: filterId }),
  setFilterOptions: (options: RailFilterOption[]) => set({ filterOptions: options }),
  setRailSort: (sort: RailSortMode) => set({ railSort: sort }),
}));
