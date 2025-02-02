import type { HostAPI } from "../../../@types/globals";
import type { Settings } from "../../../@types/settings";
import type { FieldInfo, FieldInfoField } from "../../../@types/field-info";
import type { IssueInfo, IssueLink, Relation, Relations } from "./issue-types";

export type FollowDirection = "upstream" | "downstream";
export type FollowDirections = Array<FollowDirection>;

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
    )`.replace(/\s+/g, "");

  const issue = await host.fetchYouTrack(`issues/${issueID}`, {
    query: {
      fields,
    },
  });

  return issue;
}

async function fetchIssueLinks(host: HostAPI, issueID: string): Promise<any> {
  const linkFields =
    "id,direction," +
    "linkType(name,sourceToTarget,targetToSource,directed,aggregation)," +
    "issues(idReadable,summary,resolved,customFields(name,value(name)))";

  const issue = await host.fetchYouTrack(`issues/${issueID}/links`, {
    query: {
      fields: linkFields,
    },
  });

  return issue;
}

const getCustomField = (
  name: string | undefined,
  fields: Array<{ name: string; value: any }>
): any => {
  if (name === undefined) {
    return null;
  }
  const field = fields.find((field) => field.name === name);
  return field;
};

const getCustomFieldValue = (
  name: string | undefined,
  fields: Array<{ name: string; value: any }>
): any => {
  const field = getCustomField(name, fields);
  return field ? field.value : null;
};

async function fetchDepsRecursive(
  host: HostAPI,
  issueID: string,
  depth: number,
  maxDepth: number,
  relations: Relations,
  followDirs: FollowDirections,
  settings: Settings,
  issues: { [key: string]: IssueInfo }
): Promise<any> {
  if (depth == maxDepth + 1) {
    return;
  }

  const links = await fetchIssueLinks(host, issueID);
  const issue = issues[issueID];
  const prevIssueUpstreamLinks = [...issue.upstreamLinks];
  const prevIssueDownstreamLinks = [...issue.downstreamLinks];

  /*
  For a directed relation:

    +--------+                       +--------+
    | source |---------------------->| target |
    +--------+                       +--------+
         <inward name>       <outward name>

  The source ticket relates to the target as: source --"inward name"---> target.
  The target ticket relates to the source as: target --"outward name"--> source.

  Examples:
  Source ---subtask-of--> Target
  Target ---parent-for--> Source

  Source ---depends-on-------> Target
  Target ---is-required-for--> Source

  */
  const followLinks = [...relations.upstream, ...relations.downstream];
  const linksToFollow = links.filter((link: any) => {
    return followLinks.some(
      (relation) =>
        link.direction === relation.direction &&
        link.linkType.name.toLowerCase() === relation.type.toLowerCase()
    );
  });

  const linksFlat = linksToFollow.flatMap((link: any) =>
    link.issues.map((issue: any) => ({
      id: issue.idReadable,
      sourceId: issueID,
      summary: issue.summary,
      state: getCustomFieldValue(settings?.stateField, issue.customFields)?.name,
      assignee: getCustomFieldValue(settings?.assigneeField, issue.customFields)?.name,
      dueDate: getCustomFieldValue(settings?.dueDateField, issue.customFields),
      resolved: issue.resolved,
      direction: link.direction,
      linkType: link.linkType.name,
      targetToSource: link.linkType.targetToSource,
      sourceToTarget: link.linkType.sourceToTarget,
      relation:
        link.direction == "INWARD" ? link.linkType.targetToSource : link.linkType.sourceToTarget,
      depth: depth,
    }))
  );
  for (const link of linksFlat) {
    const isUpstream = relations.upstream.some(
      (relation) =>
        link.direction === relation.direction &&
        link.linkType.toLowerCase() === relation.type.toLowerCase()
    );
    const linksList = isUpstream ? issue.upstreamLinks : issue.downstreamLinks;
    const linkExist = linksList.some(
      (x) => link.id === x.targetId && link.direction === x.direction && link.linkType === x.type
    );
    if (linkExist) {
      continue;
    }
    linksList.push({
      targetId: link.id,
      type: link.linkType,
      direction: link.direction,
      targetToSource: link.targetToSource,
      sourceToTarget: link.sourceToTarget,
    });
  }

  for (const link of linksFlat) {
    const isUpstream = relations.upstream.some(
      (relation) =>
        link.direction === relation.direction &&
        link.linkType.toLowerCase() === relation.type.toLowerCase()
    );

    if (!(link.id in issues)) {
      issues[link.id] = {
        id: link.id,
        summary: link.summary,
        state: link.state,
        assignee: link.assignee,
        dueDate: link.dueDate ? new Date(link.dueDate) : null,
        resolved: link.resolved,
        depth: link.depth,
        upstreamLinks: [],
        downstreamLinks: [],
        linksKnown: false,
        showUpstream: false,
        showDownstream: false,
      };
    }

    // Invert link and inject that in target issue if not already present.
    const mirroredLink: IssueLink = {
      targetId: issue.id,
      type: link.linkType,
      direction: link.direction === "INWARD" ? "OUTWARD" : "INWARD",
      targetToSource: link.targetToSource,
      sourceToTarget: link.sourceToTarget,
    };

    const targetIssue = issues[link.id];
    const mirroredLinksList = isUpstream ? targetIssue.downstreamLinks : targetIssue.upstreamLinks;
    const mirroredLinkExist = mirroredLinksList.some(
      (x) =>
        mirroredLink.targetId === x.targetId &&
        mirroredLink.direction === x.direction &&
        mirroredLink.type === x.type
    );
    if (!mirroredLinkExist) {
      mirroredLinksList.push(mirroredLink);
    }
  }

  issue.linksKnown = true;
  if (followDirs.includes("upstream")) {
    issue.showUpstream = true;
  }
  if (followDirs.includes("downstream")) {
    issue.showDownstream = true;
  }

  const isSameLink = (a: IssueLink, b: IssueLink) =>
    a.targetId === b.targetId && a.direction === b.direction && a.type === b.type;
  const idsToFetch: Array<string> = [];
  if (followDirs.includes("upstream")) {
    const newLinks = issue.upstreamLinks.filter(
      (link: IssueLink) => !prevIssueUpstreamLinks.some((x) => isSameLink(x, link))
    );
    idsToFetch.push(...newLinks.map((link: IssueLink) => link.targetId));
  }
  if (followDirs.includes("downstream")) {
    const newLinks = issue.downstreamLinks.filter(
      (link: IssueLink) => !prevIssueDownstreamLinks.some((x) => isSameLink(x, link))
    );
    idsToFetch.push(...newLinks.map((link: IssueLink) => link.targetId));
  }
  const promises = idsToFetch.map((id: string) =>
    fetchDepsRecursive(host, id, depth + 1, maxDepth, relations, followDirs, settings, issues)
  );
  await Promise.all(promises);
  return;
}

export async function fetchIssueAndInfo(
  host: HostAPI,
  issueId: string,
  settings: Settings
): Promise<{ issue: IssueInfo; fieldInfo: FieldInfo }> {
  const issueInfo = await fetchIssueInfo(host, issueId);

  const stateField = getCustomField(settings?.stateField, issueInfo.customFields);
  let fieldInfo: FieldInfo = {};
  if (stateField != undefined) {
    fieldInfo = {
      stateField: {
        name: stateField.name,
        values: Object.fromEntries(
          stateField.projectCustomField.bundle.values.map((value: any) => [
            value.name,
            {
              colorId: value.color.id,
              background: value.color.background,
              foreground: value.color.foreground,
            },
          ])
        ),
      },
    };
  }

  const dueDateValue = getCustomFieldValue(settings?.dueDateField, issueInfo.customFields);
  const issue: IssueInfo = {
    id: issueInfo.idReadable,
    summary: issueInfo.summary,
    state: getCustomFieldValue(settings?.stateField, issueInfo.customFields)?.name,
    assignee: getCustomFieldValue(settings?.assigneeField, issueInfo.customFields)?.name,
    dueDate: dueDateValue ? new Date(dueDateValue) : null,
    resolved: issueInfo.resolved,
    depth: 0,
    upstreamLinks: [],
    downstreamLinks: [],
    linksKnown: false,
    showDownstream: false,
    showUpstream: false,
  };

  return { issue, fieldInfo };
}

export async function fetchDeps(
  host: HostAPI,
  issue: IssueInfo,
  maxDepth: number,
  relations: Relations,
  followDirs: FollowDirections,
  settings: Settings
): Promise<{ [key: string]: IssueInfo }> {
  let issues = {
    [issue.id]: issue,
  };
  await fetchDepsRecursive(host, issue.id, 1, maxDepth, relations, followDirs, settings, issues);

  return issues;
}

export async function fetchDepsAndExtend(
  host: HostAPI,
  issueId: string,
  issues: { [key: string]: IssueInfo },
  maxDepth: number,
  relations: Relations,
  followDirs: FollowDirections,
  settings: Settings
): Promise<{ [key: string]: IssueInfo }> {
  if (!(issueId in issues)) {
    console.log(`Failed to fetch issues for ${issueId}: issue unknown`);
    return issues;
  }

  const issue = issues[issueId];

  const newIssues = Object.assign({}, issues);
  const depsDepth = issue.depth + 1;
  const newMaxDepth = Math.max(maxDepth, depsDepth);
  await fetchDepsRecursive(
    host,
    issueId,
    issue.depth + 1,
    newMaxDepth,
    relations,
    followDirs,
    settings,
    newIssues
  );

  return newIssues;
}
