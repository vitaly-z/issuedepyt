import React, { useEffect, useRef } from "react";
import { DataSet } from "vis-data/peer/esm/vis-data";
import { Network } from "vis-network/standalone/esm/vis-network";
import type { IssueInfo, IssueLink } from "./issue-types";
import type { FieldInfo, FieldInfoField } from "../../../@types/field-info";
import { ColorPaletteItem, Color, hexToRgb, rgbToHex } from "./colors";

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

const FONT_FAMILY = "system-ui, Arial, sans-serif";
const FONT_FAMILY_MONOSPACE =
  'Menlo, "Bitstream Vera Sans Mono", "Ubuntu Mono", Consolas, "Courier New", Courier, monospace';

const getColor = (
  state: string | undefined,
  stateFieldInfo: FieldInfoField | undefined
): ColorPaletteItem | undefined => {
  if (stateFieldInfo && state) {
    const stateKey = Object.keys(stateFieldInfo.values).find(
      (x) => x.toLowerCase() === state.toLowerCase()
    );
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

const getSelectedColor = (colorEntry: ColorPaletteItem): ColorPaletteItem => {
  // Check if bright or dark color by checking the intensity of the foreground color.
  const fgRgb = hexToRgb(colorEntry.fg);
  const bgRgb = hexToRgb(colorEntry.bg);
  if (fgRgb == undefined || bgRgb == undefined) {
    return colorEntry;
  }
  const fgIntensity = fgRgb.reduce((acc, x) => acc + x, 0) / 3;
  const adjustment = fgIntensity > 128 ? 0.05 : -0.05;
  const background = bgRgb.map((x) => Math.min(255, Math.max(0, Math.round(x + x * adjustment))));
  return {
    bg: rgbToHex(background),
    fg: colorEntry.fg,
  };
};

const getNodeLabel = (issue: IssueInfo): string => {
  let lines = [];
  if (issue?.type) {
    lines.push(`<i><< ${issue.type} >></i>`);
  }

  let summary = "" + issue.id;
  if (issue?.summary) {
    summary = `<b>${summary}: ${issue.summary}</b>`;
  }
  lines.push(summary);

  let flags = [];
  if (issue?.state) {
    flags.push(issue.state);
  }
  flags.push(
    issue?.assignee !== undefined && issue.assignee.length > 0 ? "Assigned" : "Unassigned"
  );
  if (issue?.dueDate) {
    flags.push("Due Date");
  }
  if (flags.length > 0) {
    lines.push(`<code>[${flags.join(", ")}]</code>`);
  }

  return lines.join("\n");
};

const getNodeTooltip = (issue: IssueInfo): string => {
  let lines = [];
  lines.push(`${issue.id}`);
  if (issue?.type) {
    lines.push(`Type: ${issue.type}`);
  }
  if (issue?.state) {
    lines.push(`State: ${issue.state}`);
  }
  if (issue?.assignee != undefined && issue.assignee.length > 0) {
    lines.push(`Assignee: ${issue.assignee}`);
  }
  if (issue?.dueDate) {
    lines.push(`Due date: ${issue.dueDate.toDateString()}`);
  }
  lines.push("Click to select and double-click to open.");

  if (!issue.linksKnown) {
    lines.push("");
    lines.push("Relations not known.");
  }

  return lines.join("\n");
};

const getGraphObjects = (
  issues: { [key: string]: IssueInfo },
  fieldInfo: FieldInfo,
  useDepthRendering: boolean
): { nodes: any[]; edges: any[] } => {
  let edges = Object.values(issues).flatMap((issue: IssueInfo) =>
    [
      ...(issue.showUpstream ? issue.upstreamLinks : []),
      ...(issue.showDownstream ? issue.downstreamLinks : []),
    ].map((link: IssueLink) => ({
      from: issue.id,
      to: link.targetId,
      label: link.direction === "INWARD" ? link.targetToSource : link.sourceToTarget,
      arrows: {
        from: {
          enabled: link.direction == "OUTWARD" && link.type == "Subtask",
        },
      },
    }))
  );
  let nodes = Object.values(issues)
    // Filter stray nodes without any edges.
    .filter(
      (issue: IssueInfo) =>
        issue.depth === 0 || edges.some((edge) => edge.from === issue.id || edge.to === issue.id)
    )
    // Transform issues to graph nodes.
    .map((issue: IssueInfo) => {
      const colorEntry = getColor(issue.state, fieldInfo?.stateField);
      const node: { [key: string]: any } = {
        id: issue.id,
        label: getNodeLabel(issue),
        shape: "box",
        title: getNodeTooltip(issue),
      };
      if (useDepthRendering) {
        node.level = issue.depth;
      }
      if (colorEntry) {
        node.font = { color: colorEntry.fg };
        node.color = {
          background: colorEntry.bg,
          highlight: {
            background: colorEntry.bg, // getSelectedColor(colorEntry).bg,
          },
        };
      }
      if (issue.depth == 0) {
        node.borderWidth = 2;
        node.borderWidthSelected = 3;
      }
      if (!issue.linksKnown) {
        node.shapeProperties = {
          borderDashes: [5, 5],
        };
      }
      return node;
    });
  // Remove duplicate links from issue if they already existed.
  /*issues[issueID].links = issues[issueID].links.filter((sourceLink: IssueLink) => {
    const target = issues[sourceLink.targetId];
    const targetHasSameLink = -1 !== target.links.findIndex((targetLink: IssueLink) =>
      targetLink.targetId === issueID && targetLink.type === sourceLink.type);
    return !targetHasSameLink;
  });*/

  return { nodes, edges };
};

const DepGraph: React.FunctionComponent<DepGraphProps> = ({
  height,
  issues,
  selectedIssueId,
  fieldInfo,
  maxNodeWidth,
  useHierarchicalLayout,
  useDepthRendering,
  setSelectedNode,
  onOpenNode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const network = useRef(null);
  const data = useRef({ nodes: new DataSet(), edges: new DataSet() });

  useEffect(() => {
    if (containerRef.current && data.current) {
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
          solver: "barnesHut",
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
            },
          },
          color: {
            border: Color.SecondaryColor,
            highlight: {
              border: Color.TextColor,
            },
          },
          widthConstraint: {
            maximum: maxNodeWidth,
          },
        },
        edges: {
          smooth: true,
          width: 0.5,
          font: {
            align: "middle",
            size: 10,
          },
          color: {
            color: Color.LinkColor,
            highlight: Color.LinkHoverColor,
            hover: Color.LinkColor,
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
            direction: "UD",
            sortMethod: "hubsize",
          },
        },
      };

      // @ts-ignore
      let newNetwork = new Network(containerRef.current, data.current, options);

      newNetwork.on("selectNode", (params) => {
        const nodes = params.nodes;
        if (nodes.length > 0) {
          console.log(`Selecting node: ${nodes[0]}`);
          setSelectedNode(nodes[0]);
        }
      });
      newNetwork.on("doubleClick", (params) => {
        const nodes = params.nodes;
        if (nodes.length > 0) {
          console.log(`Opening node: ${nodes[0]}`);
          onOpenNode(nodes[0]);
        }
      });
      // @ts-ignore
      network.current = newNetwork;
    }
  }, [maxNodeWidth, useHierarchicalLayout]);

  useEffect(() => {
    if (network.current && data.current) {
      console.log(`Rendering graph with ${Object.keys(issues).length} nodes`);
      const { nodes, edges } = getGraphObjects(issues, fieldInfo, useDepthRendering);
      data.current.nodes.clear();
      data.current.nodes.add(nodes);
      data.current.edges.clear();
      data.current.edges.add(edges);
      const selectedNode =
        selectedIssueId != null && selectedIssueId in issues
          ? issues[selectedIssueId]
          : Object.values(issues).find((issue) => issue.depth === 0);
      if (selectedNode) {
        // @ts-ignore
        network.current.selectNodes([selectedNode.id]);
      }
      // @ts-ignore
      network.current.setData(data.current);
    }
  }, [issues, fieldInfo, useDepthRendering]);

  useEffect(() => {
    if (network.current && data.current) {
      const selectedNode =
        selectedIssueId != null && selectedIssueId in issues
          ? issues[selectedIssueId]
          : Object.values(issues).find((issue) => issue.depth === 0);
      if (selectedNode) {
        console.log(`Graph: Selecting issue ${selectedNode.id}`);
        // @ts-ignore
        network.current.selectNodes([selectedNode.id]);
      } else {
        // @ts-ignore
        network.current.selectNodes([]);
      }
    }
  }, [selectedIssueId]);

  return <div ref={containerRef} className="dep-graph" style={{ height }} />;
};

export default DepGraph;
