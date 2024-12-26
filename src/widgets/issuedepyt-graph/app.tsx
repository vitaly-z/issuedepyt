import React, {memo, useCallback, useState, useEffect} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import ButtonToolbar from '@jetbrains/ring-ui-built/components/button-toolbar/button-toolbar';
import Input from '@jetbrains/ring-ui-built/components/input/input';
import Theme, {ThemeProvider} from '@jetbrains/ring-ui-built/components/global/theme';
import updateIcon from '@jetbrains/icons/update';
import type {HostAPI} from '../../../@types/globals';
import { fetchDeps, } from './fetch-deps';
import type {IssueInfo} from './issue-types';
import DepGraph from './dep-graph';
import IssueInfoCard from './issue-info-card';
// Register widget in YouTrack. To learn more, see https://www.jetbrains.com/help/youtrack/devportal-apps/apps-host-api.html
const host = await YTApp.register();

const issue = YTApp.entity;
const DEFAULT_MAX_DEPTH = 10;

const AppComponent: React.FunctionComponent = () => {
  const [selectedNode, setSelectedNode] = useState<number|string|null>(null);
  const [maxDepth, setMaxDepth] = useState<number>(DEFAULT_MAX_DEPTH);
  const [issueData, setIssueData] = useState<{[key: string]: IssueInfo}>({});

  const refreshData = useCallback(async () => {
    const issues = await fetchDeps(host, issue, maxDepth);
    setIssueData(issues);
  }, [maxDepth]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <div className="widget">
      <ThemeProvider theme={Theme.AUTO}>
        <ButtonToolbar>
          <Button onClick={refreshData} icon={updateIcon}>Refresh</Button>
          {(selectedNode !== null) && (selectedNode != issue.id) && selectedNode in issueData && (
            <Button href={`/issue/${selectedNode}`}>Open {selectedNode}</Button>
          )}
        </ButtonToolbar>
        {Object.keys(issueData).length > 0 && (
          <DepGraph issues={issueData} setSelectedNode={setSelectedNode} />
        )}
        {selectedNode !== null && selectedNode in issueData && (
          <IssueInfoCard issue={issueData[selectedNode]} />
        )}
        <Input type="number" label="Max depth" value={maxDepth} onChange={(e) => setMaxDepth(Number(e.target.value))} />
      </ThemeProvider>
    </div>
  );
};

export const App = memo(AppComponent);
