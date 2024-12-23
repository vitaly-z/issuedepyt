import type {HostAPI} from '../../../@types/globals';

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

const getCustomField = (name: string, fields: Array<{name: string, value: any}>): any => {
  const field = fields.find((field) => field.name === name);
  return field ? field.value : null;
};

async function fetchDepsRecursive(host: HostAPI, issueID: string, depth: number): Promise<any> {
  if (depth == 0) {
    return [];
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
      state: getCustomField("State", issue.customFields)?.name,
      assignee: getCustomField("Assignee", issue.customFields)?.name,
      resolved: issue.resolved,
      relation: link.direction == "INWARD" ? link.linkType.targetToSource : link.linkType.sourceToTarget,
      maxDepthReached: depth == 1,
    }))
  );

  const promises = linksFlat.map((link: any) => fetchDepsRecursive(host, link.id, depth - 1));
  const results = await Promise.all(promises);
  return linksFlat.concat(results.flat());
};

const getNodeColor = (resolved: any, state: string): any => {
  let color = "#d2e5ff";
  if (resolved) {
    color = "#7be141";
  } else if (state === "In Progress" || state === "In Review") {
    color = "#ffff00";
  }

  return color;
};

export async function fetchDeps(host: HostAPI, issueID: string): Promise<any> {
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

  const linksFlat = await fetchDepsRecursive(host, issueID, 10);

  const rootNode = {id: issueID, label: `${issueID}`, shape: "ellipse"};
  const getNodeLabel = (issue: any) => {
    let lines = [
      `${issue.id}: ${issue.summary}`,
      `[${issue.state}]`
    ];
    if (issue?.maxDepthReached) {
      lines.push("<i>Max depth reached!</i>");
    }
    return lines.join("\n");
  };
  const depNodes = linksFlat.map((link: any) => ({
    id: link.id,
    label: getNodeLabel(link),
    font: {multi: "html"},
    color: getNodeColor(link.resolved, link.state)
  }));
  const nodes = [rootNode, ...depNodes];
  const edges = linksFlat.map((link: any) => ({
    to: link.id,
    from: link.sourceId,
    label: link.relation,
    arrows: {
      to: {
        enabled: true,
        scaleFactor: 0.5,
        type: "vee",
      },
      from: {
        enabled: link.relation == "parent for",
        scaleFactor: 0.5,
        type: "diamond",
      },
    }
  }));

  const issues = Object.fromEntries(linksFlat.map((link: any) => [link.id, link]));

  return {nodes, edges, issues};
}