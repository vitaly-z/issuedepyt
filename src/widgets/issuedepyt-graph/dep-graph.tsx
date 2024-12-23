import React, { useEffect, useRef } from 'react';
import { DataSet } from 'vis-data/peer/esm/vis-data';
import { Network } from 'vis-network/standalone/esm/vis-network';

interface DepGraphProps {
  nodes: { id: number|string, label: string }[];
  edges: { from: number|string, to: number|string, label: string | undefined }[];
  onClick?: (nodeId: number|string) => void;
  setSelectedNode: (nodeId: number|string) => void;
}

const DepGraph: React.FunctionComponent<DepGraphProps> = ({ nodes, edges, onClick, setSelectedNode }) => {
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
      let network = new Network(containerRef.current, data, options);

      network.on('click', (params) => {
        console.log('Clicked network:', params);
        const nodes = params.nodes;
        if (nodes.length > 0) {
          setSelectedNode(nodes[0]);
          if (onClick) {
            onClick(nodes[0]);
          }
        }
      });

      network;
    }
  }, [nodes, edges, onClick, setSelectedNode]);

  return <div ref={containerRef} style={{ height: '500px' }} />;
};

export default DepGraph;
