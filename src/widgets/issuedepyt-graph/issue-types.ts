export type DirectionType = "INWARD" | "OUTWARD";
export type LinkType = string;

export interface Relation {
  direction: DirectionType;
  type: LinkType;
}

export interface Relations {
  upstream: Array<Relation>;
  downstream: Array<Relation>;
}

export interface IssueLink {
  targetId: string;
  type: LinkType;
  direction: DirectionType;
  targetToSource: string;
  sourceToTarget: string;
}

export interface IssueInfo {
  id: string;
  summary: string;
  state?: string;
  assignee?: string;
  resolved: boolean;
  depth: number; // Root node has depth 0.
  upstreamLinks: Array<IssueLink>;
  downstreamLinks: Array<IssueLink>;
  linksKnown: boolean;
}
