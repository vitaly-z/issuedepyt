import type {HostAPI} from '../../../@types/globals';
import type {Settings} from '../../../@types/settings';
import type {IssueInfo} from './issue-types';

interface FetchDepsIssue {
  id: string;
}

async function fetchIssueInfo(host: HostAPI, issueID: string): Promise<any> {
  const fields = "id,summary,resolved,customFields(name,value(name))"

  const issue = await host.fetchYouTrack(`issues/${issueID}`, {
    query: {
      fields
    }
  });

  return issue;
}

async function fetchIssueLinks(host: HostAPI, issueID: string): Promise<any> {
  const linkFields = "id,direction," +
    "linkType(name,sourceToTarget,targetToSource,directed,aggregation)," +
    "issues(id,idReadable,summary,resolved,customFields(name,value(name)))";

  const issue = await host.fetchYouTrack(`issues/${issueID}/links`, {
    query: {
      fields: linkFields
    }
  });

  return issue;
}

const LINK_DEPENDS_ON = ["INWARD", "Depend"];
const LINK_SUBTASK = ["OUTWARD", "Subtask"];

const getCustomField = (name: string | undefined, fields: Array<{name: string, value: any}>): any => {
  if (name === undefined) {
    return null;
  }
  const field = fields.find((field) => field.name === name);
  return field ? field.value : null;
};

async function fetchDepsRecursive(host: HostAPI, issueID: string, depth: number, settings: Settings, issues: {[key: string]: IssueInfo}): Promise<any> {
  if (depth == 0) {
    return;
  }

  const links = await fetchIssueLinks(host, issueID);

  const followLinks = [
    LINK_DEPENDS_ON,
    LINK_SUBTASK,
  ];

  const linksToFollow = links.filter((link: any) => {
    return followLinks.some(([direction, type]) => 
      link.direction === direction && link.linkType.name === type
    );
  });

  const linksFlat = linksToFollow.flatMap((link: any) => 
    link.issues.map((issue: any) => ({
      id: issue.idReadable,
      sourceId: issueID,
      summary: issue.summary,
      state: getCustomField(settings?.stateField, issue.customFields)?.name,
      assignee: getCustomField(settings?.assigneeField, issue.customFields)?.name,
      resolved: issue.resolved,
      direction: link.direction,
      targetToSource: link.linkType.targetToSource,
      sourceToTarget: link.linkType.sourceToTarget,
      relation: link.direction == "INWARD" ? link.linkType.targetToSource : link.linkType.sourceToTarget,
      maxDepthReached: depth == 1,
    }))
  );

  for (let link of linksFlat) {
    issues[issueID].links.push({
      targetId: link.id,
      targetToSource: link.targetToSource,
      sourceToTarget: link.sourceToTarget,
      direction: link.direction,
    });
  }

  const linksToFetch = linksFlat.filter((link: any) => !(link.id in issues));

  for (let link of linksFlat) {
    if (link.id in issues) {
      continue;
    }

    issues[link.id] = {
      id: link.id,
      summary: link.summary,
      state: link.state,
      assignee: link.assignee,
      resolved: link.resolved,
      maxDepthReached: link.maxDepthReached,
      isRoot: false,
      links: [],
    };
  }


  const promises = linksToFetch.map((link: any) => fetchDepsRecursive(host, link.id, depth - 1, settings, issues));
  await Promise.all(promises);
  return;
};


export async function fetchDeps(host: HostAPI, issue: FetchDepsIssue, maxDepth: number, settings: Settings): Promise<any> {
  const issueInfo = await fetchIssueInfo(host, issue.id);
  let issues = {
    [issue.id]: {
      id: issue.id,
      summary: issueInfo.summary,
      state: getCustomField(settings?.stateField, issueInfo.customFields)?.name,
      assignee: getCustomField(settings?.assigneeField, issueInfo.customFields)?.name,
      resolved: issueInfo.resolved,
      maxDepthReached: false,
      isRoot: true,
      links: [],
    }
  }
  await fetchDepsRecursive(host, issue.id, maxDepth, settings, issues);

  return issues;
}