import React, {memo, useCallback} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import List from '@jetbrains/ring-ui-built/components/list/list';
import checkmarkIcon from '@jetbrains/icons/checkmark';
import type {HostAPI} from '../../../@types/globals';
import { fetchDeps } from './fetch-deps';
import DepGraph from './dep-graph';
// Register widget in YouTrack. To learn more, see https://www.jetbrains.com/help/youtrack/devportal-apps/apps-host-api.html
const host = await YTApp.register();

const issueID = YTApp.entity.id;

const {nodes, edges} = await fetchDeps(host, issueID);

const AppComponent: React.FunctionComponent = () => {

  return (
    <div className="widget">
      <DepGraph nodes={nodes} edges={edges} />
    </div>
  );
};

export const App = memo(AppComponent);
