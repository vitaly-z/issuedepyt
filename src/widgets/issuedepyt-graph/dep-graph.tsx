import React, { useEffect, useRef } from 'react';
import { DataSet } from 'vis-data/peer/esm/vis-data';
import { Network } from 'vis-network/standalone/esm/vis-network';
import type {IssueInfo, IssueLink} from './issue-types';

interface DepGraphProps {
  issues: { [id: string]: IssueInfo };
  onClick?: (nodeId: string) => void;
  setSelectedNode: (nodeId: string) => void;
}

const getNodeColor = (resolved: any, state?: string): any => {
  let color = "#d2e5ff";
  if (resolved) {
    color = "#7be141";
  } else if (state === "In Progress" || state === "In Review") {
    color = "#ffff00";
  }

  return color;
};

const getNodeLabel = (issue: IssueInfo) => {
  let lines = [
    (issue?.summary) ? `${issue.id}: ${issue.summary}` : issue.id,
  ];
  if (issue?.state) {
    lines.push(`[${issue.state}]`);
  }
  if (issue?.maxDepthReached) {
    lines.push("<i>Max depth reached!</i>");
  }
  return lines.join("\n");
};

const getNodes = (issues: {[key: string]: IssueInfo}): any[] => {
  return Object.values(issues).map((issue: IssueInfo) => ({
    id: issue.id,
    label: getNodeLabel(issue),
    font: {multi: "html"},
    color: getNodeColor(issue.resolved, issue.state),
    shape: (issue.isRoot) ? "ellipse" : "box",
  }));
};

const getEdges = (issues: {[key: string]: IssueInfo}): any[] => {
  return Object.values(issues).flatMap((issue: IssueInfo) => (issue.links.map((link: IssueLink) => ({
    to: link.targetId,
    from: issue.id,
    label: link.direction === "INWARD" ? link.targetToSource : link.sourceToTarget,
    arrows: {
      to: {
        enabled: true,
        scaleFactor: 0.5,
        type: "vee",
      },
      from: {
        enabled: link.targetToSource == "parent for",
        scaleFactor: 0.5,
        type: "diamond",
      },
    }
  }))));
};

const DepGraph: React.FunctionComponent<DepGraphProps> = ({ issues, onClick, setSelectedNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const nodes = getNodes(issues);
      const edges = getEdges(issues);
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
  }, [issues, onClick, setSelectedNode]);

  return <div ref={containerRef} style={{ height: '500px' }} />;
};

export default DepGraph;
