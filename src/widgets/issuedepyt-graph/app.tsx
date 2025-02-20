import React, { memo, useMemo, useState, useEffect } from "react";
import Button from "@jetbrains/ring-ui-built/components/button/button";
import Group from "@jetbrains/ring-ui-built/components/group/group";
import Checkbox from "@jetbrains/ring-ui-built/components/checkbox/checkbox";
import Text from "@jetbrains/ring-ui-built/components/text/text";
import Toggle from "@jetbrains/ring-ui-built/components/toggle/toggle";
import { Size as ToggleSize } from "@jetbrains/ring-ui-built/components/toggle/toggle";
import LoaderInline from "@jetbrains/ring-ui-built/components/loader-inline/loader-inline";
import UpdateIcon from "@jetbrains/icons/update";
import DownloadIcon from "@jetbrains/icons/download";
import type { HostAPI } from "../../../@types/globals";
import type { Settings } from "../../../@types/settings";
import type { FieldInfo } from "../../../@types/field-info";
import { fetchDeps, fetchDepsAndExtend, fetchIssueAndInfo } from "./fetch-deps";
import type { FollowDirection, FollowDirections } from "./fetch-deps";
import type { IssueInfo, IssueLink, Relation, Relations, DirectionType } from "./issue-types";
import DepGraph from "./dep-graph";
import DepTimeline from "./dep-timeline";
import IssueInfoCard from "./issue-info-card";
import OptionsDropdownMenu from "./options-dropdown-menu";
import VerticalSizeControl from "./vertical-size-control";

// Register widget in YouTrack. To learn more, see https://www.jetbrains.com/help/youtrack/devportal-apps/apps-host-api.html
const host: HostAPI = await YTApp.register();

const issue = YTApp.entity;
const DEFAULT_MAX_DEPTH = 6;
const DEFAULT_MAX_NODE_WIDTH = 200;
const DEFAULT_USE_HIERARCHICAL_LAYOUT = false;
const DEFAULT_USE_DEPTH_RENDERING = true;

type GRAPH_SIZE_ITEM = {
  height: number;
  limits?: {
    maxDepth: number;
    maxCount: number;
  };
};
const GRAPH_SIZE: Array<GRAPH_SIZE_ITEM> = [
  {
    height: 100,
    limits: {
      maxDepth: 0,
      maxCount: 2,
    },
  },
  {
    height: 200,
    limits: {
      maxDepth: 1,
      maxCount: 10,
    },
  },
  {
    height: 400,
    limits: {
      maxDepth: 3,
      maxCount: 20,
    },
  },
  {
    height: 700,
  },
];

const getNumIssues = (issueData: { [key: string]: IssueInfo }): number => {
  return Object.keys(issueData).length;
};

const getMaxDepth = (issueData: { [key: string]: IssueInfo }): number => {
  return Object.values(issueData)
    .map((x) => x.depth)
    .reduce((acc, val) => Math.max(acc, val), 0);
};

const calcGraphSizeFromIssues = (issueData: { [key: string]: IssueInfo }): number => {
  const count = getNumIssues(issueData);
  const maxDepth = getMaxDepth(issueData);
  const sizeEntry = GRAPH_SIZE.find((value) => {
    const limits = value?.limits;
    return limits === undefined || (maxDepth <= limits.maxDepth && count <= limits.maxCount);
  });
  return sizeEntry ? sizeEntry.height : 400;
};

const parseRelationList = (relations: string | undefined): Array<Relation> => {
  if (relations === undefined) {
    return [];
  }
  return relations.split(",").map((relation: string) => {
    const [direction, type] = relation.split(":");
    return {
      direction: direction.trim().toUpperCase() as DirectionType,
      type: type.trim(),
    };
  });
};

const getRelations = (settings: Settings): Relations | null => {
  const upstream = parseRelationList(settings?.upstreamRelations);
  const downstream = parseRelationList(settings?.downstreamRelations);
  return { upstream, downstream };
};

const exportRelations = (issue_id: string, issues: { [key: string]: IssueInfo }): void => {
  const cols = [
    "id",
    "type",
    "state",
    "summary",
    "assignee",
    "dueDate",
    "resolved",
    "depth",
    "relTargetId",
    "relType",
    "relName",
    "relDirectionType",
  ];
  const createIssueRows = (issue: IssueInfo): string[] => {
    const rows = [];
    const issueCols = (issue: IssueInfo, link: IssueLink, direction: string): string => {
      return [
        issue.id,
        issue?.type ? issue.type : "",
        issue?.state ? issue.state : "",
        issue?.summary ? issue.summary : "",
        issue?.assignee ? issue.assignee : "",
        issue.dueDate ? issue.dueDate.toISOString() : "",
        !!issue.resolved,
        issue.depth,
        link.targetId,
        link.type,
        link.direction === "INWARD" ? link.targetToSource : link.sourceToTarget,
        direction,
      ].join(",");
    };
    if (issue.linksKnown) {
      rows.push(
        ...issue.upstreamLinks.map((link: IssueLink) => issueCols(issue, link, "upstream"))
      );
      rows.push(
        ...issue.downstreamLinks.map((link: IssueLink) => issueCols(issue, link, "downstream"))
      );
    } else {
      rows.push(
        issueCols(
          issue,
          // Empty link.
          { targetId: "", type: "", direction: "INWARD", targetToSource: "", sourceToTarget: "" },
          ""
        )
      );
    }
    return rows;
  };
  // Sort in depth order.
  const sortedIssues = Object.values(issues).sort(
    (a: IssueInfo, b: IssueInfo) => a.depth - b.depth
  );
  const rows = [cols.join(",")];
  rows.push(...sortedIssues.flatMap(createIssueRows));

  // Create a blob and download it.
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const fileURL = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = fileURL;
  downloadLink.download = `${issue_id.toLowerCase().replace("-", "")}_export.csv`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  // Free up resources.
  URL.revokeObjectURL(fileURL);
};

const AppComponent: React.FunctionComponent = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [settings, setSettings] = useState<Settings>({});
  const [relations, setRelations] = useState<Relations>({
    upstream: [],
    downstream: [],
  });
  const [graphVisible, setGraphVisible] = useState<boolean>(false);
  const [timelineVisible, setTimelineVisible] = useState<boolean>(false);
  const [graphHeight, setGraphHeight] = useState<number>(400);
  const [selectedNode, setSelectedNode] = useState<string | null>(issue.id);
  const [maxNodeWidth, setMaxNodeWidth] = useState<number>(DEFAULT_MAX_NODE_WIDTH);
  const [maxDepth, setMaxDepth] = useState<number>(DEFAULT_MAX_DEPTH);
  const [useHierarchicalLayout, setUseHierarchicalLayout] = useState<boolean>(
    DEFAULT_USE_HIERARCHICAL_LAYOUT
  );
  const [useDepthRendering, setUseDepthRendering] = useState<boolean>(DEFAULT_USE_DEPTH_RENDERING);
  const [followUpstream, setFollowUpstream] = useState<boolean>(true);
  const [followDownstream, setFollowDownstream] = useState<boolean>(false);
  const [fieldInfo, setFieldInfo] = useState<FieldInfo>({});
  const [issueData, setIssueData] = useState<{ [key: string]: IssueInfo }>({});

  const filterRelations = (
    relations: Relations,
    followUp: boolean,
    followDown: boolean
  ): Relations => ({
    upstream: followUp ? relations.upstream : [],
    downstream: followDown ? relations.downstream : [],
  });

  const refreshData = async () => {
    if (graphVisible) {
      setLoading(true);
      console.log(`Fetching deps for ${issue.id}...`);
      const { issue: issueInfo, fieldInfo: fieldInfoData } = await fetchIssueAndInfo(
        host,
        issue.id,
        settings
      );
      const followDirs: FollowDirections = [];
      if (followUpstream) {
        followDirs.push("upstream");
      }
      if (followDownstream) {
        followDirs.push("downstream");
      }
      const issues = await fetchDeps(host, issueInfo, maxDepth, relations, followDirs, settings);
      setFieldInfo(fieldInfoData);
      setGraphHeight(calcGraphSizeFromIssues(issues));
      setIssueData(issues);
      setLoading(false);
    } else {
      console.log("Not fetching deps, graph is not visible.");
    }
  };

  const loadIssueDeps = async (issueId: string, direction: FollowDirection | null = null) => {
    if (graphVisible) {
      console.log(`Fetching deps for ${issueId}...`);
      setLoading(true);
      const followDirs: FollowDirections = [];
      if (direction === "upstream" || followUpstream) {
        followDirs.push("upstream");
      }
      if (direction === "downstream" || followDownstream) {
        followDirs.push("downstream");
      }
      const issues = await fetchDepsAndExtend(
        host,
        issueId,
        issueData,
        maxDepth,
        relations,
        followDirs,
        settings
      );
      setIssueData(issues);
      setLoading(false);
    }
  };

  const isSelectedNodeAnIssue = (nodeId: string | null): boolean => {
    if (nodeId === null) {
      return false;
    }
    return nodeId in issueData;
  };

  const openNode = (nodeId: string) => {
    if (isSelectedNodeAnIssue(nodeId)) {
      open(`/issue/${nodeId}`);
    }
  };

  useMemo(() => {
    if (!graphVisible && settings?.autoLoadDeps) {
      console.log("Auto loading deps: Showing graph.");
      setGraphVisible(true);
    }
  }, [graphVisible, settings]);

  useEffect(() => {
    host.fetchApp<{ settings: Settings }>("backend/settings", { scope: true }).then((resp) => {
      const newSettings = resp.settings;
      console.log("Got settings", newSettings);
      setSettings(newSettings);
      if (newSettings?.maxRecursionDepth != undefined) {
        setMaxDepth(newSettings.maxRecursionDepth);
      }

      const newRelations = getRelations(newSettings);
      if (newRelations) {
        setRelations(newRelations);
      }

      if (newSettings?.useHierarchicalLayout != undefined) {
        setUseHierarchicalLayout(newSettings.useHierarchicalLayout);
      }
    });
  }, [host]);

  useEffect(() => {
    refreshData();
  }, [host, issue, graphVisible, maxDepth, relations, settings]);

  return (
    <div className="widget">
      {!graphVisible && (
        <div>
          <Button onClick={() => setGraphVisible((value) => !value)}>Load graph...</Button>
        </div>
      )}
      {graphVisible && (
        <div>
          <div className="dep-toolbar">
            {loading && (
              <LoaderInline>
                <Text size={Text.Size.S} info>
                  Loading...
                </Text>
              </LoaderInline>
            )}
            {selectedNode !== null && selectedNode in issueData && (
              <Group>
                <Button href={`/issue/${selectedNode}`}>Open {selectedNode}</Button>
                <span className="extra-margin-left">
                  <Group>
                    <Checkbox
                      label="Show upstream"
                      checked={issueData[selectedNode].showUpstream}
                      onChange={(e: any) =>
                        setIssueData((issues) => {
                          if (selectedNode in issues) {
                            const updatedIssues = { ...issues };
                            updatedIssues[selectedNode] = {
                              ...updatedIssues[selectedNode],
                              showUpstream: e.target.checked,
                            };
                            return updatedIssues;
                          }
                          return issues;
                        })
                      }
                    />
                    <Checkbox
                      label="Show downstream"
                      checked={issueData[selectedNode].showDownstream}
                      onChange={(e: any) =>
                        setIssueData((issues) => {
                          if (selectedNode in issues) {
                            const updatedIssues = { ...issues };
                            updatedIssues[selectedNode] = {
                              ...updatedIssues[selectedNode],
                              showDownstream: e.target.checked,
                            };
                            return updatedIssues;
                          }
                          return issues;
                        })
                      }
                    />
                  </Group>
                </span>
                {!issueData[selectedNode].linksKnown && (
                  <span className="extra-margin-left">
                    <Group>
                      <Button onClick={() => loadIssueDeps(selectedNode)} icon={DownloadIcon}>
                        Load relations
                      </Button>
                    </Group>
                  </span>
                )}
              </Group>
            )}
            <span className="dep-toolbar-right">
              <Group>
                {!loading && (
                  <span className="extra-margin-right">
                    <Group>
                      <Text size={Text.Size.S} info>
                        Nodes: {getNumIssues(issueData)}.
                      </Text>
                      <Text size={Text.Size.S} info>
                        Depth: {getMaxDepth(issueData)}.
                      </Text>
                    </Group>
                  </span>
                )}
                <Button onClick={refreshData} icon={UpdateIcon}>
                  Reload
                </Button>
                <span
                  title={
                    !settings?.dueDateField
                      ? "No due date field configured for project!"
                      : undefined
                  }
                >
                  <Toggle
                    size={ToggleSize.Size14}
                    checked={timelineVisible}
                    onChange={(e: any) => setTimelineVisible(e.target.checked)}
                    disabled={!settings?.dueDateField}
                  >
                    Show timeline
                  </Toggle>
                </span>
                <OptionsDropdownMenu
                  maxDepth={maxDepth}
                  maxNodeWidth={maxNodeWidth}
                  useHierarchicalLayout={useHierarchicalLayout}
                  useDepthRendering={useDepthRendering}
                  followUpstream={followUpstream}
                  followDownstream={followDownstream}
                  setMaxDepth={setMaxDepth}
                  setMaxNodeWidth={setMaxNodeWidth}
                  setUseHierarchicalLayout={setUseHierarchicalLayout}
                  setUseDepthRendering={setUseDepthRendering}
                  setFollowUpstream={setFollowUpstream}
                  setFollowDownstream={setFollowDownstream}
                  onExportRelations={() => exportRelations(issue.id, issueData)}
                />
              </Group>
            </span>
          </div>
          {timelineVisible && Object.keys(issueData).length > 0 && (
            <DepTimeline
              issues={issueData}
              selectedIssueId={selectedNode}
              fieldInfo={fieldInfo}
              maxNodeWidth={maxNodeWidth}
              setSelectedNode={setSelectedNode}
              onOpenNode={openNode}
            />
          )}
          {Object.keys(issueData).length > 0 && (
            <DepGraph
              height={`${graphHeight}px`}
              issues={issueData}
              selectedIssueId={selectedNode}
              fieldInfo={fieldInfo}
              maxNodeWidth={maxNodeWidth}
              useHierarchicalLayout={useHierarchicalLayout}
              useDepthRendering={useDepthRendering}
              setSelectedNode={setSelectedNode}
              onOpenNode={openNode}
            />
          )}
          {selectedNode !== null && isSelectedNodeAnIssue(selectedNode) && (
            <IssueInfoCard issue={issueData[selectedNode]} />
          )}
          <VerticalSizeControl
            minValue={100}
            maxValue={1000}
            value={graphHeight}
            increment={100}
            onChange={setGraphHeight}
          />
        </div>
      )}
    </div>
  );
};

export const App = memo(AppComponent);
