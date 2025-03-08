export type FilterFieldState = {
  [key: string]: boolean;
};
export type FilterStateKey = "state" | "type";
export type FilterState = {
  state?: FilterFieldState;
  type?: FilterFieldState;
  showOrphans: boolean;
  showWhenLinksUnknown: boolean;
};
