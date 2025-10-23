import React, { useEffect, useRef } from "react";
import { DataSet } from "vis-data/peer/esm/vis-data.mjs";
import { Network } from "vis-network/peer/esm/vis-network.mjs";
import type { IssueInfo, IssueLink } from "./issue-types";
import type { FieldInfo, FieldInfoField } from "../../../@types/field-info";
import type { FilterState } from "../../../@types/filter-state";
import { filterIssues } from "./issue-helpers";
import { ColorPaletteItem, Color, hexToRgb, rgbToHex } from "./colors";

interface DepGraphProps {
  height: string;
  issues: { [id: string]: IssueInfo };
  selectedIssueId: string | null;
  highlightedIssueIds: string[] | null;
  fieldInfo: FieldInfo;
  filterState: FilterState;
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

  let summary = "" + issue.idReadable;
  if (issue?.summary) {
    summary = `<b>${summary}: ${issue.summary}</b>`;
  }
  lines.push(summary);

  let flags = [];
  if (issue?.state) {
    flags.push(issue.state);
  }
  if (issue.hasOwnProperty("assignee")) {
    flags.push(issue?.assignee ? "Assigned" : "Unassigned");
  }
  if (issue?.sprints) {
    flags.push(issue.sprints.length > 0 ? "Planned" : "Unplanned");
  }
  if (flags.length > 0) {
    lines.push(flags.join(", "));
  }

  return lines.join("\n");
};

const getNodeTooltip = (issue: IssueInfo): string => {
  let lines = [];
  lines.push(issue.idReadable);
  if (issue?.type) {
    lines.push(`Type: ${issue.type}`);
  }
  if (issue?.state) {
    lines.push(`State: ${issue.state}`);
  }
  if (issue?.assignee != undefined && issue.assignee.length > 0) {
    lines.push(`Assignee: ${issue.assignee}`);
  }
  if (issue?.sprints) {
    lines.push(
      "Sprints: " +
        (issue.sprints.length > 0 ? issue.sprints.map((x) => x.name).join(", ") : "Unplanned")
    );
  }
  if (issue?.startDate) {
    lines.push(`Start date: ${issue.startDate.toDateString()}`);
  }
  if (issue?.dueDate) {
    lines.push(`Due date: ${issue.dueDate.toDateString()}`);
  }
  if (issue?.estimation) {
    lines.push(`Estimation: ${issue.estimation.presentation}`);
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
  const linkInfo = {};
  const linksAndEdges = Object.values(issues).flatMap((issue: IssueInfo) =>
    [
      ...(issue.showUpstream ? issue.upstreamLinks : []),
      ...(issue.showDownstream ? issue.downstreamLinks : []),
    ].map((link: IssueLink) => {
      const label =
        link.direction === "OUTWARD" || link.direction === "BOTH"
          ? link.sourceToTarget
          : link.targetToSource;
      return {
        direction: link.direction,
        type: link.type,
        edge: {
          from: issue.id,
          to: link.targetId,
          label,
          title: label,
          arrows: {
            from: {
              enabled: link.direction == "OUTWARD" && link.type == "Subtask",
            },
            to: {
              enabled: link.direction !== "BOTH",
            },
          },
        },
      };
    })
  );

  // Filter out duplicate edges.
  let edges = [];
  const unDirectedEdgesAdded: { [key: string]: boolean } = {};
  for (const { direction, type, edge } of linksAndEdges) {
    // Include all directed edges.
    if (direction !== "BOTH") {
      edges.push(edge);
      continue;
    }

    // If non-directed, check if already added.
    const reverseEdgeKey = `${type}-${edge.to}-${edge.from}`;

    if (reverseEdgeKey in unDirectedEdgesAdded) {
      continue;
    }

    // Add and mark as added.
    edges.push(edge);
    const edgeKey = `${type}-${edge.from}-${edge.to}`;
    unDirectedEdgesAdded[edgeKey] = true;
  }

  let nodes = Object.values(issues)
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
      if (!issue.linksKnown) {
        node.shapeProperties = {
          borderDashes: [5, 5],
        };
      }
      return node;
    });
  /*
  issues[issueID].links = issues[issueID].links.filter((sourceLink: IssueLink) => {
    const target = issues[sourceLink.targetId];
    const targetHasSameLink =
      -1 !==
      target.links.findIndex(
        (targetLink: IssueLink) =>
          targetLink.targetId === issueID && targetLink.type === sourceLink.type
      );
    return !targetHasSameLink;
  });
*/
  return { nodes, edges };
};

const DepGraph: React.FunctionComponent<DepGraphProps> = ({
  height,
  issues,
  selectedIssueId,
  highlightedIssueIds,
  fieldInfo,
  filterState,
  maxNodeWidth,
  useHierarchicalLayout,
  useDepthRendering,
  setSelectedNode,
  onOpenNode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const network = useRef(null);
  const data = useRef({ nodes: new DataSet(), edges: new DataSet() });

  const updateSelectedNodes = (selectedId: string | null, highlightedIds: Array<string> | null) => {
    if (!network.current || !data.current) {
      return;
    }
    const selectedIds = [];
    let selectEdges = false;
    if (highlightedIds !== null) {
      selectedIds.push(...highlightedIds);
    } else if (selectedId != null) {
      selectEdges = true;
      selectedIds.push(selectedId);
    }
    const availableSelectedIds = selectedIds.filter((id) => data.current.nodes.get(id) !== null);
    if (availableSelectedIds.length > 0) {
      console.log(`Graph: Selecting issues ${availableSelectedIds.join(", ")}`);
      // @ts-ignore
      network.current.selectNodes(availableSelectedIds, selectEdges);
    } else {
      // @ts-ignore
      network.current.selectNodes([]);
    }
  };

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
          chosen: {
            node: (values: any, id: string, selected: boolean, hovering: boolean) => {
              if (selected) {
                values.shadow = true;
                values.shadowColor = Color.MessageShadowColor;
                values.borderWidth = 2;
                values.borderColor = Color.TextColor;
              }
            },
          },
          color: {
            border: Color.SecondaryColor,
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
      const visibleIssues = filterIssues(filterState, issues);
      console.log(`Rendering graph with ${Object.keys(visibleIssues).length} nodes`);
      const { nodes, edges } = getGraphObjects(visibleIssues, fieldInfo, useDepthRendering);
      data.current.nodes.clear();
      data.current.nodes.add(nodes);
      data.current.edges.clear();
      data.current.edges.add(edges);
      // @ts-ignore
      network.current.setData(data.current);
      updateSelectedNodes(selectedIssueId, highlightedIssueIds);
    }
  }, [issues, fieldInfo, filterState, useDepthRendering]);

  useEffect(() => {
    updateSelectedNodes(selectedIssueId, highlightedIssueIds);
  }, [selectedIssueId, highlightedIssueIds]);

  return <div ref={containerRef} className="dep-graph" style={{ height }} />;
};

export default DepGraph;
