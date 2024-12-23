import React, { useEffect, useRef } from 'react';
import { DataSet } from 'vis-data/peer/esm/vis-data';
import { Network } from 'vis-network/standalone/esm/vis-network';

interface DepGraphProps {
  nodes: { id: number|string, label: string }[];
  edges: { from: number|string, to: number|string, label: string | undefined }[];
}

const DepGraph: React.FunctionComponent<DepGraphProps> = ({ nodes, edges }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const nodesDataSet = new DataSet(nodes);
      // @ts-ignore
      const edgesDataSet = new DataSet(edges);

      const data = { nodes: nodesDataSet, edges: edgesDataSet };
      const options = {
        physics: {
          stabilization: false,
        },
        autoResize: false,
        nodes: {
          shape: "box",
        },
        edges: {
          smooth: true,
          width: 0.5,
          font: {
            align: 'middle',
          },
          color: {
            color: '#848484',
            highlight: '#848484',
            hover: '#848484',
            opacity: 1,
          }
        },
        /*
        layout: {
          hierarchical: {
            direction: 'UD',
            sortMethod: 'directed',
          }
        }
        */
      };

      // @ts-ignore
      new Network(containerRef.current, data, options);
    }
  }, [nodes, edges]);

  return <div ref={containerRef} style={{ height: '500px' }} />;
};

export default DepGraph;
