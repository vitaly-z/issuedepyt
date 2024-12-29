import React from 'react';
import Input from '@jetbrains/ring-ui-built/components/input/input';
import Checkbox from '@jetbrains/ring-ui-built/components/checkbox/checkbox';
import {Grid, Row, Col} from '@jetbrains/ring-ui-built/components/grid/grid';

interface SettingsPaneProps {
  maxDepth: number;
  setMaxDepth: (value: number) => void;
  maxNodeWidth: number;
  setMaxNodeWidth: (value: number) => void;
  useHierarchicalLayout: boolean;
  setUseHierarchicalLayout: (value: boolean) => void;
}

const SettingsPane: React.FunctionComponent<SettingsPaneProps> = ({ maxDepth, setMaxDepth, maxNodeWidth, setMaxNodeWidth, useHierarchicalLayout, setUseHierarchicalLayout }) => {
  return (
    <div className="settings">
      <Grid>
        <Row>
          <Input type="number" label="Max depth" value={maxDepth} onChange={(e: any) => setMaxDepth(Number(e.target.value))} />
        </Row>
        <Row>
          <Input type="number" label="Max node width" value={maxNodeWidth} onChange={(e: any) => setMaxNodeWidth(Number(e.target.value))} />
        </Row>
        <Row>
          <Checkbox label="Use hierarchical layout" checked={useHierarchicalLayout} onChange={(e: any) => setUseHierarchicalLayout(e.target.checked)} />
        </Row>
      </Grid> 
    </div>
  );
};

export default SettingsPane;
