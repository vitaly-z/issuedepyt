import { IssueInfo, IssueLink } from "./issue-types";
import { FilterState } from "../../../@types/filter-state";

export const filterIssues = (filter: FilterState, issues: Record<string, IssueInfo>) => {
  const relations = Object.values(issues).flatMap((issue: IssueInfo) =>
    [
      ...(issue.showUpstream ? issue.upstreamLinks : []),
      ...(issue.showDownstream ? issue.downstreamLinks : []),
    ].map((link: IssueLink) => ({
      from: issue.id,
      to: link.targetId,
    }))
  );
  return Object.fromEntries(
    Object.entries(issues)
      // Apply the filter.
      .filter(([key, issue]) => {
        const state = filter?.state || {};
        const type = filter?.type || {};
        const stateValue = issue?.state;
        const typeValue = issue?.type;
        return (
          (stateValue == undefined || state[stateValue]) &&
          (typeValue == undefined || type[typeValue])
        );
      })
      // Only show issues that's shown in the dependency graph, i.e. that they have a visible relation.
      .filter(
        ([key, issue]) =>
          issue.depth === 0 || relations.some((x) => x.from === issue.id || x.to === issue.id)
      )
  );
};
