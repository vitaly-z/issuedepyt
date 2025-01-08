import React from 'react';
import Input from '@jetbrains/ring-ui-built/components/input/input';
import Checkbox from '@jetbrains/ring-ui-built/components/checkbox/checkbox';
import {Grid, Row, Col} from '@jetbrains/ring-ui-built/components/grid/grid';

interface SettingsPaneProps {
  maxDepth: number;
  setMaxDepth: (value: number) => void;
  maxNodeWidth: number;
  setMaxNodeWidth: (value: number) => void;
}

const SettingsPane: React.FunctionComponent<SettingsPaneProps> = ({ maxDepth, setMaxDepth, maxNodeWidth, setMaxNodeWidth }) => {
  return (
    <div className="settings">
      <Grid>
        <Row>
          <Input type="number" label="Max depth" value={maxDepth} onChange={(e: any) => setMaxDepth(Number(e.target.value))} />
        </Row>
        <Row>
          <Input type="number" label="Max node width" value={maxNodeWidth} onChange={(e: any) => setMaxNodeWidth(Number(e.target.value))} />
        </Row>
      </Grid> 
    </div>
  );
};

export default SettingsPane;
