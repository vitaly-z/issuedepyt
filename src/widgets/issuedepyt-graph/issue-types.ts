export type DirectionType = "INWARD" | "OUTWARD";
export type LinkType = string;

export interface Relation {
  direction: DirectionType;
  type: LinkType;
}

export interface CustomField {
  name: string;
  value: any;
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

export interface IssuePeriod {
  presentation: string;
  minutes: number;
}

export interface IssueInfo {
  id: string;
  summary: string;
  type?: string;
  state?: string;
  assignee?: string;
  startDate: Date | null;
  dueDate: Date | null;
  estimation: IssuePeriod | null;
  resolved: boolean;
  depth: number; // Root node has depth 0.
  upstreamLinks: Array<IssueLink>;
  downstreamLinks: Array<IssueLink>;
  linksKnown: boolean;
  showUpstream: boolean;
  showDownstream: boolean;
  extraFields: Array<CustomField>;
}
