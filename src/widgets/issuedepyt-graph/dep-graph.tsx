import React, { useEffect, useRef } from 'react';
import { DataSet } from 'vis-data/peer/esm/vis-data';
import { Network } from 'vis-network/standalone/esm/vis-network';
import type {IssueInfo, IssueLink} from './issue-types';
import { COLOR_PALETTE, ColorPaletteItem } from './colors';

interface DepGraphProps {
  issues: { [id: string]: IssueInfo };
  onClick?: (nodeId: string) => void;
  setSelectedNode: (nodeId: string) => void;
}

const NODE_TITLE_MAX_LENGTH = 50;
const STARTED_STATES = ["in progress", "in review"];

const getColor = (resolved: any, state: string | undefined, isRoot: boolean): ColorPaletteItem => {
  const notStartedColor = isRoot ? COLOR_PALETTE[25] : COLOR_PALETTE[29];
  const doneColor = isRoot ? COLOR_PALETTE[10] : COLOR_PALETTE[3];
  const startedColor = isRoot ? COLOR_PALETTE[18] : COLOR_PALETTE[13];

  let color = notStartedColor;
  if (resolved) {
    color = doneColor;
  } else if (state && STARTED_STATES.includes(state.toLowerCase())) {
    color = startedColor;
  }

  return color;
};

const getNodeColor = (resolved: any, state: string | undefined, isRoot: boolean): string => {
  return getColor(resolved, state, isRoot).bg;
};

const getTextColor = (resolved: any, state: string | undefined, isRoot: boolean): string => {
  return getColor(resolved, state, isRoot).fg;
};

const splitLines = (text: string, maxLength: number): string[] => {
  let lines = [];
  if (text.length > maxLength) {
    let words = text.split(' ');
    let currentLine = '';
    words.forEach(word => {
      if ((currentLine + word).length <= maxLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    });
    if (currentLine) {
      lines.push(currentLine);
    }
  } else {
    lines.push(text);
  }
  return lines;
}

const getNodeLabel = (issue: IssueInfo): string => {
  const summary = (issue?.summary && !issue.isRoot) ? `${issue.id}: ${issue.summary}` : issue.id;
  let lines = [...splitLines(summary, NODE_TITLE_MAX_LENGTH)];

  let flags = [];
  if (issue?.state) {
    flags.push(issue.state);
  }
  flags.push((issue?.assignee !== undefined && issue.assignee.length > 0) ? "Assigned" : "Unassigned");
  if (flags.length > 0) {
    lines.push(`[${flags.join(", ")}]`);
  }
  return lines.join("\n");
};

const getGraphObjects = (issues: {[key: string]: IssueInfo}): {nodes: any[], edges: any[]} => {
  let nodes = Object.values(issues).map((issue: IssueInfo) => ({
    id: issue.id,
    label: getNodeLabel(issue),
    font: {color: getTextColor(issue.resolved, issue.state, issue.isRoot)},
    color: getNodeColor(issue.resolved, issue.state, issue.isRoot),
    shape: "box",
  }));
  let edges = Object.values(issues).flatMap((issue: IssueInfo) => (issue.links.map((link: IssueLink) => ({
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
        enabled: link.sourceToTarget == "parent for",
        scaleFactor: 0.5,
        type: "diamond",
      },
    },
    dashes: false,
  }))));

  // Add nodes when maxdepth reached.
  Object.values(issues)
    .filter((issue: IssueInfo) => issue.maxDepthReached)
    .forEach((issue: IssueInfo, index: number) => {
      let nodeColor = COLOR_PALETTE[16];
      const unknownId = `${issue.id}-${index}`;
      nodes.push({
        id: unknownId,
        label: "?",
        font: {color: nodeColor.fg},
        color: nodeColor.bg,
        shape: "circle",
        // @ts-ignore
        title: "Max depth reached",
      });
      edges.push({
        from: issue.id,
        to: unknownId,
        label: "",
        arrows: {
          to: {
            enabled: true,
            scaleFactor: 0.5,
            type: "vee",
          },
          from: {
            enabled: false,
            scaleFactor: 0.5,
            type: "diamond",
          },
        },
        dashes: true,
      });
    });
  return {nodes, edges};
};

const DepGraph: React.FunctionComponent<DepGraphProps> = ({ issues, onClick, setSelectedNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const { nodes, edges } = getGraphObjects(issues);
      const nodesDataSet = new DataSet(nodes);
      // @ts-ignore
      const edgesDataSet = new DataSet(edges);

      const data = { nodes: nodesDataSet, edges: edgesDataSet };
      const options = {
        physics: {
          stabilization: true,
          barnesHut: {
            avoidOverlap: 0.2,
          },
          hierarchicalRepulsion: {
            avoidOverlap: 1,
          },
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
        interaction: {
          navigationButtons: true,
        },
        /*
        layout: {
          hierarchical: {
            direction: 'UD',
            sortMethod: 'hubsize',
          }
        }
        */
      };

      // @ts-ignore
      let network = new Network(containerRef.current, data, options);
      const rootNode = Object.values(issues).find((issue) => issue.isRoot);
      if (rootNode) {
        network.selectNodes([rootNode.id]);
        setSelectedNode(rootNode.id);
      }

      network.on('click', (params) => {
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
