import React, { memo, useCallback, useMemo, useState, useEffect } from "react";
import Button from "@jetbrains/ring-ui-built/components/button/button";
import { Tabs, Tab, CustomItem } from "@jetbrains/ring-ui-built/components/tabs/tabs";
import Theme, { ThemeProvider } from "@jetbrains/ring-ui-built/components/global/theme";
import LoaderInline from '@jetbrains/ring-ui-built/components/loader-inline/loader-inline';
import updateIcon from "@jetbrains/icons/update";
import type { HostAPI } from "../../../@types/globals";
import type { Settings } from "../../../@types/settings";
import { fetchDeps } from "./fetch-deps";
import type { IssueInfo } from "./issue-types";
import DepGraph from "./dep-graph";
import IssueInfoCard from "./issue-info-card";
import SettingsPane from "./settings-pane";

// Register widget in YouTrack. To learn more, see https://www.jetbrains.com/help/youtrack/devportal-apps/apps-host-api.html
const host: HostAPI = await YTApp.register();

const issue = YTApp.entity;
const DEFAULT_MAX_DEPTH = 10;
const DEFAULT_MAX_NODE_WIDTH = 200;
const DEFAULT_USE_HIERARCHICAL_LAYOUT = false;

const AppComponent: React.FunctionComponent = () => {
  const [settings, setSettings] = useState<Settings>({});
  const [graphVisible, setGraphVisible] = useState<boolean>(false);
  const [selectedTab, setSelectedTab] = useState<string>("main");
  const [selectedNode, setSelectedNode] = useState<number | string | null>(null);
  const [maxNodeWidth, setMaxNodeWidth] = useState<number>(DEFAULT_MAX_NODE_WIDTH);
  const [maxDepth, setMaxDepth] = useState<number>(DEFAULT_MAX_DEPTH);
  const [useHierarchicalLayout, setUseHierarchicalLayout] = useState<boolean>(
    DEFAULT_USE_HIERARCHICAL_LAYOUT
  );
  const [issueData, setIssueData] = useState<{ [key: string]: IssueInfo }>({});

  const refreshData = async () => {
    if (graphVisible) {
      console.log(`Fetching deps for ${issue.id}...`);
      const issues = await fetchDeps(host, issue, maxDepth, settings);
      setIssueData(issues);
    } else {
      console.log("Not fetching deps, graph is not visible.");
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
    });
  }, [host]);

  useEffect(() => {
    refreshData();
  }, [host, issue, graphVisible, maxDepth, settings]);

  return (
    <div className="widget">
      <ThemeProvider theme={Theme.AUTO}>
        {!graphVisible && (
          <Button onClick={() => setGraphVisible(value => !value)}>
            Load graph...
          </Button>
        )}
        {graphVisible && (
          <Tabs selected={selectedTab} onSelect={setSelectedTab}>
            <Tab id="main" title="Graph">
              {Object.keys(issueData).length == 0 && (
                <LoaderInline />
              )}
              {Object.keys(issueData).length > 0 && (
                <DepGraph
                  issues={issueData}
                  maxNodeWidth={maxNodeWidth}
                  useHierarchicalLayout={useHierarchicalLayout}
                  setSelectedNode={setSelectedNode}
                />
              )}
              {graphVisible && selectedNode !== null && selectedNode in issueData && (
                <IssueInfoCard issue={issueData[selectedNode]} />
              )}
            </Tab>
            <Tab id="settings" title="Settings">
              <SettingsPane
                maxDepth={maxDepth}
                setMaxDepth={setMaxDepth}
                maxNodeWidth={maxNodeWidth}
                setMaxNodeWidth={setMaxNodeWidth}
                useHierarchicalLayout={useHierarchicalLayout}
                setUseHierarchicalLayout={setUseHierarchicalLayout}
              />
            </Tab>
            <CustomItem>
              <Button onClick={refreshData} icon={updateIcon}>
                Refresh
              </Button>
            </CustomItem>
          </Tabs>
        )}
      </ThemeProvider>
    </div>
  );
};

export const App = memo(AppComponent);
