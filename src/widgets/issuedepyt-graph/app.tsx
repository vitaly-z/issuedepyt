import React, { memo, useCallback, useMemo, useState, useEffect } from "react";
import Button from "@jetbrains/ring-ui-built/components/button/button";
import Group from "@jetbrains/ring-ui-built/components/group/group";
import Checkbox from '@jetbrains/ring-ui-built/components/checkbox/checkbox';
import DropdownMenu from '@jetbrains/ring-ui-built/components/dropdown-menu/dropdown-menu';
import Input from '@jetbrains/ring-ui-built/components/input/input';
import Text from '@jetbrains/ring-ui-built/components/text/text';
import LoaderInline from '@jetbrains/ring-ui-built/components/loader-inline/loader-inline';
import UpdateIcon from "@jetbrains/icons/update";
import type { HostAPI } from "../../../@types/globals";
import type { Settings } from "../../../@types/settings";
import type { FieldInfo } from "../../../@types/field-info";
import { fetchDeps, fetchDepsAndExtend, fetchIssueAndInfo } from "./fetch-deps";
import type { IssueInfo, Relation, Relations, DirectionType } from "./issue-types";
import DepGraph from "./dep-graph";
import IssueInfoCard from "./issue-info-card";

// Register widget in YouTrack. To learn more, see https://www.jetbrains.com/help/youtrack/devportal-apps/apps-host-api.html
const host: HostAPI = await YTApp.register();

const issue = YTApp.entity;
const DEFAULT_MAX_DEPTH = 5;
const DEFAULT_MAX_NODE_WIDTH = 200;
const DEFAULT_USE_HIERARCHICAL_LAYOUT = false;
const DEFAULT_USE_DEPTH_RENDERING = true;

type GRAPH_SIZE_KEY = "tiny" | "small" | "medium" | "large";
type GRAPH_SIZE_ITEM = {
  height: number;
  limits?: {
    maxDepth: number;
    maxCount: number;
  }
};
const GRAPH_SIZE: Record<GRAPH_SIZE_KEY, GRAPH_SIZE_ITEM> = {
  tiny: {
    height: 100,
    limits: {
      maxDepth: 0,
      maxCount: 2,
    }
  },
  small: {
    height: 200,
    limits: {
      maxDepth: 1,
      maxCount: 10,
    }
  },
  medium: {
    height: 400,
    limits: {
      maxDepth: 3,
      maxCount: 20,
    }
  },
  large: {
    height: 700,
  }
};

const getNumIssues = (issueData: { [key: string]: IssueInfo }): number => {
  return Object.keys(issueData).length;
};

const getMaxDepth = (issueData: { [key: string]: IssueInfo }): number => {
  return Object.values(issueData).map(x => x.depth).reduce((acc, val) => Math.max(acc, val), 0);
};

const getGraphSizeKey = (issueData: { [key: string]: IssueInfo }): GRAPH_SIZE_KEY => {
  const count = getNumIssues(issueData);
  const maxDepth = getMaxDepth(issueData);
  const sizeEntry = Object.entries(GRAPH_SIZE).find(([key, value]) => {
    const limits = value?.limits;
    return (limits === undefined) || ((maxDepth <= limits.maxDepth) && (count <= limits.maxCount));
  });
  return sizeEntry ? sizeEntry[0] as GRAPH_SIZE_KEY : "large";
}

const getGraphHeight = (sizeKey: GRAPH_SIZE_KEY): string => {
  return `${GRAPH_SIZE[sizeKey].height}px`;
};

const parseRelationList = (relations: string | undefined): Array<Relation> => {
  if (relations === undefined) {
    return [];
  }
  return relations.split(",").map((relation: string) => {
    const [direction, type] = relation.split(":");
    return {direction: direction.trim().toUpperCase() as DirectionType, type: type.trim()};
  });
};

const getRelations = (settings: Settings): Relations | null => {
  const upstream = parseRelationList(settings?.upstreamRelations);
  const downstream = parseRelationList(settings?.downstreamRelations);
  return {upstream, downstream};
}

const AppComponent: React.FunctionComponent = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [settings, setSettings] = useState<Settings>({});
  const [relations, setRelations] = useState<Relations>({upstream: [], downstream: []});
  const [graphVisible, setGraphVisible] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [maxNodeWidth, setMaxNodeWidth] = useState<number>(DEFAULT_MAX_NODE_WIDTH);
  const [maxDepth, setMaxDepth] = useState<number>(DEFAULT_MAX_DEPTH);
  const [useHierarchicalLayout, setUseHierarchicalLayout] = useState<boolean>(DEFAULT_USE_HIERARCHICAL_LAYOUT);
  const [useDepthRendering, setUseDepthRendering] = useState<boolean>(DEFAULT_USE_DEPTH_RENDERING);
  const [followUpstream, setFollowUpstream] = useState<boolean>(true);
  const [followDownstream, setFollowDownstream] = useState<boolean>(false);
  const [fieldInfo, setFieldInfo] = useState<FieldInfo>({});
  const [issueData, setIssueData] = useState<{ [key: string]: IssueInfo }>({});

  const filterRelations = (relations: Relations, followUp: boolean, followDown: boolean): Relations => ({
    upstream: followUp ? relations.upstream : [],
    downstream: followDown ? relations.downstream : [],
  });

  const refreshData = async () => {
    if (graphVisible) {
      setLoading(true);
      console.log(`Fetching deps for ${issue.id}...`);
      const {"issue": issueInfo, "fieldInfo": fieldInfoData} = await fetchIssueAndInfo(host, issue.id, settings);
      const filteredRelations = filterRelations(relations, followUpstream, followDownstream);
      const issues = await fetchDeps(host, issueInfo, maxDepth, filteredRelations, settings);
      setFieldInfo(fieldInfoData);
      setIssueData(issues);
      setLoading(false);
    } else {
      console.log("Not fetching deps, graph is not visible.");
    }
  };

  const loadIssueDeps = async (issueId: string) => {
    if (graphVisible) {
      console.log(`Fetching deps for ${issueId}...`);
      setLoading(true);
      const filteredRelations = filterRelations(relations, followUpstream, followDownstream);
      const issues = await fetchDepsAndExtend(host, issueId, issueData, maxDepth, filteredRelations, settings);
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
    if (nodeId.endsWith(":unknownlinks")) {
      const parentIssueId = nodeId.split(":")[0];
      loadIssueDeps(parentIssueId);
    } else if (isSelectedNodeAnIssue(nodeId)) {
      if (issueData[nodeId].linksKnown) {
        open(`/issue/${nodeId}`);
      } else {
        loadIssueDeps(nodeId);
      }
    }
  };

  useMemo(() => {
    if ((!graphVisible) && settings?.autoLoadDeps) {
      console.log("Auto loading deps: Showing graph.");
      setGraphVisible(true);
    }
  }, [graphVisible, settings]);

  useEffect(() => {
    host.fetchApp<{settings: Settings}>('backend/settings', {scope: true}).then(resp => {
      const newSettings = resp.settings;
      console.log("Got settings", newSettings);
      setSettings(newSettings);

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
      {!graphVisible && (<div>
        <Button onClick={() => setGraphVisible(value => !value)}>
          Load graph...
        </Button>
        </div>
      )}
      {graphVisible && (
        <div>
          <Group>
            <Button onClick={refreshData} icon={UpdateIcon}>
              Reload
            </Button>
            <DropdownMenu
              anchor={<Button dropdown inline>Options</Button>}
              data={[{
                rgItemType: DropdownMenu.ListProps.Type.TITLE,
                label: "Layout options",
              }, {
                rgItemType: DropdownMenu.ListProps.Type.CUSTOM,
                template: <Checkbox label="Tree layout" checked={useHierarchicalLayout} onChange={(e: any) => setUseHierarchicalLayout(e.target.checked)} />
              }, {
                rgItemType: DropdownMenu.ListProps.Type.CUSTOM,
                template: <Checkbox label="Strict depth layout" checked={useDepthRendering} onChange={(e: any) => setUseDepthRendering(e.target.checked)} />
              }, {
                rgItemType: DropdownMenu.ListProps.Type.CUSTOM,
                template: <Input type="number" label="Max depth" value={maxDepth} onChange={(e: any) => setMaxDepth(Number(e.target.value))} />
              }, {
                rgItemType: DropdownMenu.ListProps.Type.CUSTOM,
                template: <Input type="number" label="Max node width" value={maxNodeWidth} onChange={(e: any) => setMaxNodeWidth(Number(e.target.value))} />
              }, {
                rgItemType: DropdownMenu.ListProps.Type.TITLE,
                label: "Follow direction options",
              }, {
                rgItemType: DropdownMenu.ListProps.Type.CUSTOM,
                template: <Checkbox label="Follow upstream relations" checked={followUpstream} onChange={(e: any) => setFollowUpstream(e.target.checked)} />
              }, {
                rgItemType: DropdownMenu.ListProps.Type.CUSTOM,
                template: <Checkbox label="Follow downstream relations" checked={followDownstream} onChange={(e: any) => setFollowDownstream(e.target.checked)} />
              }]}
            />
            <Text size={Text.Size.S} info>Nodes: {getNumIssues(issueData)}.</Text>
            <Text size={Text.Size.S} info>Depth: {getMaxDepth(issueData)}.</Text>
            {loading && (
              <LoaderInline>
                <Text size={Text.Size.S} info>
                  Loading...
                </Text>
              </LoaderInline>
            )}
          </Group>
          {Object.keys(issueData).length > 0 && (
            <DepGraph
              height={getGraphHeight(getGraphSizeKey(issueData))}
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
        </div>
      )}
    </div>
  );
};

export const App = memo(AppComponent);
