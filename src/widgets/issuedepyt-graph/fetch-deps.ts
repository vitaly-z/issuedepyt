import type {HostAPI} from '../../../@types/globals';
import type {Settings} from '../../../@types/settings';
import type {FieldInfo, FieldInfoField} from '../../../@types/field-info';
import type {IssueInfo} from './issue-types';

async function fetchIssueInfo(host: HostAPI, issueID: string): Promise<any> {
  const fields = `
    idReadable,summary,resolved,
    customFields(
      name,
      value(name),
      projectCustomField(
        name,
        bundle(
          values(
            name,
            color(id,background,foreground)
          )
        )
      )
    )`.replace(/\s+/g, '');

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
    "issues(idReadable,summary,resolved,customFields(name,value(name)))";

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
  return field;
};

const getCustomFieldValue = (name: string | undefined, fields: Array<{name: string, value: any}>): any => {
  const field = getCustomField(name, fields);
  return field ? field.value : null;
};

async function fetchDepsRecursive(host: HostAPI, issueID: string, depth: number, maxDepth: number, settings: Settings, issues: {[key: string]: IssueInfo}): Promise<any> {
  if (depth == (maxDepth + 1)) {
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
      state: getCustomFieldValue(settings?.stateField, issue.customFields)?.name,
      assignee: getCustomFieldValue(settings?.assigneeField, issue.customFields)?.name,
      resolved: issue.resolved,
      direction: link.direction,
      targetToSource: link.linkType.targetToSource,
      sourceToTarget: link.linkType.sourceToTarget,
      relation: link.direction == "INWARD" ? link.linkType.targetToSource : link.linkType.sourceToTarget,
      depth: depth,
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
      depth: link.depth,
      links: [],
      linksKnown: false,
    };
  }

  // Links are now fetched and known.
  issues[issueID].linksKnown = true;

  const promises = linksToFetch.map((link: any) => fetchDepsRecursive(host, link.id, depth + 1, maxDepth, settings, issues));
  await Promise.all(promises);
  return;
};

export async function fetchIssueAndInfo(host: HostAPI, issueId: string, settings: Settings): Promise<{issue: IssueInfo, fieldInfo: FieldInfo}> {
  const issueInfo = await fetchIssueInfo(host, issueId);

  const stateField = getCustomField(settings?.stateField, issueInfo.customFields);
  let fieldInfo : FieldInfo = {};
  if (stateField != undefined) {
    fieldInfo = {
      stateField: {
        name: stateField.name,
        values: Object.fromEntries(stateField.projectCustomField.bundle.values.map((value: any) => ([
          value.name, {
          colorId: value.color.id,
          background: value.color.background,
          foreground: value.color.foreground,
        }]))),
      }
    };
  }

  const issue : IssueInfo = {
    id: issueInfo.idReadable,
    summary: issueInfo.summary,
    state: getCustomFieldValue(settings?.stateField, issueInfo.customFields)?.name,
    assignee: getCustomFieldValue(settings?.assigneeField, issueInfo.customFields)?.name,
    resolved: issueInfo.resolved,
    depth: 0,
    links: [],
    linksKnown: false,
  }

  return {issue, fieldInfo};
};

export async function fetchDeps(host: HostAPI, issue: IssueInfo, maxDepth: number, settings: Settings): Promise<{[key: string]: IssueInfo}> {
  let issues = {
    [issue.id]: issue,
  }
  await fetchDepsRecursive(host, issue.id, 1, maxDepth, settings, issues);

  return issues;
}

export async function fetchDepsAndExtend(host: HostAPI, issueId: string, issues: {[key: string]: IssueInfo}, maxDepth: number, settings: Settings): Promise<{[key: string]: IssueInfo}> {
  if (!(issueId in issues)) {
    console.log(`Failed to fetch issues for ${issueId}: issue unknown`);
    return issues;
  }

  const issue = issues[issueId];

  const newIssues = Object.assign({}, issues);
  const depsDepth = issue.depth + 1;
  const newMaxDepth = Math.max(maxDepth, depsDepth);
  await fetchDepsRecursive(host, issueId, issue.depth + 1, newMaxDepth, settings, newIssues);

  return newIssues;
}