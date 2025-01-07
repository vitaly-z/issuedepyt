import React, { useEffect, useRef } from 'react';
import { DataSet } from 'vis-data/peer/esm/vis-data';
import { Network } from 'vis-network/standalone/esm/vis-network';
import type {IssueInfo, IssueLink} from './issue-types';
import type { FieldInfo, FieldInfoField } from "../../../@types/field-info";
import { COLOR_PALETTE, ColorPaletteItem } from './colors';

interface DepGraphProps {
  issues: { [id: string]: IssueInfo };
  fieldInfo: FieldInfo;
  maxNodeWidth: number | undefined;
  useHierarchicalLayout: boolean;
  setSelectedNode: (nodeId: string) => void;
}

const getColor = (state: string | undefined, stateFieldInfo: FieldInfoField | undefined): ColorPaletteItem | undefined => {
  if (stateFieldInfo && state) {
    const stateKey = Object.keys(stateFieldInfo.values).find(x => x.toLowerCase() === state.toLowerCase());
    const colorEntry = stateKey != undefined ? stateFieldInfo.values[stateKey] : undefined;
    if (colorEntry) {
      return {
        bg: colorEntry.background,
        fg: colorEntry.foreground,
      };
    }
  }

  return undefined;
};

const getNodeLabel = (issue: IssueInfo): string => {
  let summary = "" + issue.id;
  if (issue?.summary) {
    summary = `${summary}: ${issue.summary}`;
  }
  let lines = [summary];

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

const getGraphObjects = (issues: {[key: string]: IssueInfo}, fieldInfo: FieldInfo): {nodes: any[], edges: any[]} => {
  let nodes = Object.values(issues).map((issue: IssueInfo) => {
    const colorEntry = getColor(issue.state, fieldInfo?.stateField)
    const node : {[key: string]: any} = {
      id: issue.id,
      label: getNodeLabel(issue),
      shape: "box",
    };
    if (colorEntry) {
      node.font = {color: colorEntry.fg};
      node.color = colorEntry.bg;
    }
    if (issue.isRoot) {
      node.borderWidth = 2;
      node.borderWidthSelected = 3;
    }
    return node;
  });
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
        font: {
          color: nodeColor.fg,
        },
        color: nodeColor.bg,
        shape: "circle",
        // @ts-ignore
        title: "Max depth reached",
      });
      edges.push({
        from: issue.id,
        to: unknownId,
        // @ts-ignore
        length: 0.3,
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

const DepGraph: React.FunctionComponent<DepGraphProps> = ({ issues, fieldInfo, maxNodeWidth, useHierarchicalLayout, setSelectedNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const { nodes, edges } = getGraphObjects(issues, fieldInfo);
      const nodesDataSet = new DataSet(nodes);
      // @ts-ignore
      const edgesDataSet = new DataSet(edges);

      const data = { nodes: nodesDataSet, edges: edgesDataSet };
      const options = {
        physics: {
          stabilization: true,
          barnesHut: {
            avoidOverlap: 0.5,
          },
          forceAtlas2Based: {
            avoidOverlap: 0.5,
          },
          hierarchicalRepulsion: {
            avoidOverlap: 1,
          },
          solver: 'barnesHut',
        },
        autoResize: true,
        nodes: {
          shape: "box",
          font: {
            size: 12,
          },
          widthConstraint: {
            maximum: maxNodeWidth,
          }
        },
        edges: {
          smooth: true,
          width: 0.5,
          font: {
            align: 'middle',
            size: 10,
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
        layout: {
          improvedLayout: true,
          hierarchical: {
            enabled: useHierarchicalLayout,
            direction: 'UD',
            sortMethod: 'hubsize',
          }
        }
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
        }
      });

      network;
    }
  }, [issues, setSelectedNode]);

  return <div ref={containerRef} style={{ height: '500px' }} />;
};

export default DepGraph;
