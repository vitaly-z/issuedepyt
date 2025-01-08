export interface IssueLink {
  targetId: string;
  targetToSource: string;
  sourceToTarget: string;
  direction: string;
};

export interface IssueInfo {
  id: string;
  summary: string;
  state?: string;
  assignee?: string;
  resolved: boolean;
  depth: number;  // Root node has depth 0.
  links: Array<IssueLink>; 
};
