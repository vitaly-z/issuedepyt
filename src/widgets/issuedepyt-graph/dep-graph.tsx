import React, { useEffect, useRef } from 'react';
import { DataSet } from 'vis-data/peer/esm/vis-data';
import { Network } from 'vis-network/standalone/esm/vis-network';
import type {IssueInfo, IssueLink} from './issue-types';
import type { FieldInfo, FieldInfoField } from "../../../@types/field-info";
import { COLOR_PALETTE, ColorPaletteItem } from './colors';

interface DepGraphProps {
  height: string;
  issues: { [id: string]: IssueInfo };
  selectedIssueId: string | null;
  fieldInfo: FieldInfo;
  maxNodeWidth: number | undefined;
  useHierarchicalLayout: boolean;
  useDepthRendering: boolean;
  setSelectedNode: (nodeId: string) => void;
  onOpenNode: (nodeId: string) => void;
}

const FONT_FAMILY = 'system-ui, Arial, sans-serif';
const FONT_FAMILY_MONOSPACE = 'Menlo, "Bitstream Vera Sans Mono", "Ubuntu Mono", Consolas, "Courier New", Courier, monospace';

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
    summary = `<b>${summary}: ${issue.summary}</b>`;
  }
  let lines = [summary];

  let flags = [];
  if (issue?.state) {
    flags.push(issue.state);
  }
  flags.push((issue?.assignee !== undefined && issue.assignee.length > 0) ? "Assigned" : "Unassigned");
  if (flags.length > 0) {
    lines.push(`<code>[${flags.join(", ")}]</code>`);
  }

  return lines.join("\n");
};

const getNodeTooltip = (issue: IssueInfo): string => {
  let lines = [];
  lines.push(`${issue.id}`);
  if (issue?.state) {
    lines.push(`State: ${issue.state}`);
  }
  if (issue?.assignee != undefined && issue.assignee.length > 0) {
    lines.push(`Assignee: ${issue.assignee}`);
  }
  lines.push("Click to select and double-click to open.");

  if (!issue.linksKnown) {
    lines.push("");
    lines.push("Relations not known.");
  }

  return lines.join("\n");
};

const getGraphObjects = (issues: {[key: string]: IssueInfo}, fieldInfo: FieldInfo, useDepthRendering: boolean): {nodes: any[], edges: any[]} => {
  let nodes = Object.values(issues).map((issue: IssueInfo) => {
    const colorEntry = getColor(issue.state, fieldInfo?.stateField)
    const node : {[key: string]: any} = {
      id: issue.id,
      label: getNodeLabel(issue),
      shape: "box",
      title: getNodeTooltip(issue),
    };
    if (useDepthRendering) {
      node.level = issue.depth;
    }
    if (colorEntry) {
      node.font = {color: colorEntry.fg};
      node.color = colorEntry.bg;
    }
    if (issue.depth == 0) {
      node.borderWidth = 2;
      node.borderWidthSelected = 3;
    }
    if (!issue.linksKnown) {
      node.shapeProperties = {
        borderDashes: [5, 5],
      }
    }
    return node;
  });
  let edges = Object.values(issues).flatMap((issue: IssueInfo) => ([...issue.upstreamLinks, ...issue.downstreamLinks].map((link: IssueLink) => ({
    from: issue.id,
    to: link.targetId,
    label: link.direction === "INWARD" ? link.targetToSource : link.sourceToTarget,
    arrows: {
      from: {
        enabled: link.direction == "OUTWARD" && link.type == "Subtask"
      },
    },
  }))));
  // Remove duplicate links from issue if they already existed.
  /*issues[issueID].links = issues[issueID].links.filter((sourceLink: IssueLink) => {
    const target = issues[sourceLink.targetId];
    const targetHasSameLink = -1 !== target.links.findIndex((targetLink: IssueLink) =>
      targetLink.targetId === issueID && targetLink.type === sourceLink.type);
    return !targetHasSameLink;
  });*/


  // Add nodes when links unknown.
  /*
  Object.values(issues)
    .filter((issue: IssueInfo) => !issue.linksKnown)
    .forEach((issue: IssueInfo, index: number) => {
      const nodeColor = COLOR_PALETTE[16];
      const unknownLinksNodeId = `${issue.id}:${index}:unknownlinks`;
      let node : any = {
        id: unknownLinksNodeId,
        label: "?",
        shape: "circle",
        font: {
          color: nodeColor.fg,
        },
        color: nodeColor.bg,
        title: "Max depth reached",
      }
      if (useDepthRendering) {
        node.level = issue.depth + 1;
      }
      nodes.push(node);
      // @ts-ignore
      edges.push({
        from: issue.id,
        to: unknownLinksNodeId,
        arrows: {
          to: {
            enabled: true,
            scaleFactor: 0.5,
            type: "normal",
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
  */
  return {nodes, edges};
};

const DepGraph: React.FunctionComponent<DepGraphProps> = ({ height, issues, selectedIssueId, fieldInfo, maxNodeWidth, useHierarchicalLayout, useDepthRendering, setSelectedNode, onOpenNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      console.log(`Rendering graph with ${Object.keys(issues).length} nodes`);
      const { nodes, edges } = getGraphObjects(issues, fieldInfo, useDepthRendering);
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
          labelHighlightBold: false,
          font: {
            multi: "html",
            size: 12,
            bold: {
              size: 12,
              face: FONT_FAMILY,
            },
            ital: {
              size: 12,
              face: FONT_FAMILY,
            },
            boldital: {
              size: 12,
              face: FONT_FAMILY,
            },
            mono: {
              size: 12,
              face: FONT_FAMILY_MONOSPACE,
            }
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
          },
          arrows: {
            from: {
              enabled: false,
              scaleFactor: 0.7,
              type: "diamond",
            },
            to: {
              enabled: true,
              scaleFactor: 0.7,
              type: "arrow",
            },
          },
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
      const selectedNode = (selectedIssueId != null && (selectedIssueId in issues)) ? issues[selectedIssueId] : Object.values(issues).find((issue) => issue.depth === 0);
      if (selectedNode) {
        network.selectNodes([selectedNode.id]);
        setSelectedNode(selectedNode.id);
      }

      network.on('selectNode', (params) => {
        const nodes = params.nodes;
        if (nodes.length > 0) {
          console.log(`Selecting node: ${nodes[0]}`);
          setSelectedNode(nodes[0]);
        }
      });
      network.on('doubleClick', (params) => {
        const nodes = params.nodes;
        if (nodes.length > 0) {
          console.log(`Opening node: ${nodes[0]}`);
          onOpenNode(nodes[0]);
        }
      });
      network;
    }
  }, [issues, fieldInfo, useDepthRendering, maxNodeWidth, useHierarchicalLayout]);

  return <div ref={containerRef} style={{ height }} />;
};

export default DepGraph;
