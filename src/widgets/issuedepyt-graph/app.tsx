import React, {memo, useCallback, useState, useEffect} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import ButtonToolbar from '@jetbrains/ring-ui-built/components/button-toolbar/button-toolbar';
import Theme, {ThemeProvider} from '@jetbrains/ring-ui-built/components/global/theme';
import Island, {Header, Content} from '@jetbrains/ring-ui-built/components/island/island';
import updateIcon from '@jetbrains/icons/update';
import type {HostAPI} from '../../../@types/globals';
import { fetchDeps } from './fetch-deps';
import DepGraph from './dep-graph';
// Register widget in YouTrack. To learn more, see https://www.jetbrains.com/help/youtrack/devportal-apps/apps-host-api.html
const host = await YTApp.register();

const issueID = YTApp.entity.id;

const AppComponent: React.FunctionComponent = () => {
  const [selectedNode, setSelectedNode] = useState<number|string|null>(null);
  const [graphData, setGraphData] = useState<{nodes: any[], edges: any[], issues: any}>({nodes: [], edges: [], issues: {}});

  const refreshData = useCallback(async () => {
    const {nodes, edges, issues} = await fetchDeps(host, issueID);
    setGraphData({nodes, edges, issues});
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <div className="widget">
      <ThemeProvider theme={Theme.AUTO}>
        <ButtonToolbar>
          <Button onClick={refreshData} icon={updateIcon}>Refresh</Button>
          {selectedNode !== null && selectedNode in graphData.issues && (
            <Button primary href={`/issue/${selectedNode}`}>Open {selectedNode}</Button>
          )}
        </ButtonToolbar>
        {graphData.nodes.length > 0 && (
          <DepGraph nodes={graphData.nodes} edges={graphData.edges} setSelectedNode={setSelectedNode} />
        )}
        {selectedNode !== null && selectedNode in graphData.issues && (
          <Island>
            <Header>{selectedNode}: {graphData.issues[selectedNode].summary}</Header>
            <Content>
              <Button primary href={`/issue/${selectedNode}`}>Open</Button>
              <pre>
                {JSON.stringify(graphData.issues[selectedNode], null, 2)}
              </pre>
            </Content>
          </Island>
        )}
      </ThemeProvider>
    </div>
  );
};

export const App = memo(AppComponent);
