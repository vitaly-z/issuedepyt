export interface IssueLink {
  targetId: string;
  targetToSource: string;
  sourceToTarget: string;
  direction: string;
};
export interface IssueInfo {
  id: string;
  summary?: string;
  state?: string;
  assignee?: string;
  resolved?: boolean;
  maxDepthReached: boolean;
  isRoot: boolean;
  links: Array<IssueLink>; 
};
