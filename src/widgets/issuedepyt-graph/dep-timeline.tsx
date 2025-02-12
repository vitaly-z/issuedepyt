import React, { useEffect, useRef } from "react";
import { DataSet } from "vis-data/peer/esm/vis-data";
import { Timeline } from "vis-timeline";
import type {
  DateType,
  IdType,
  Timeline as VisTimeline,
  TimelineAnimationOptions,
  TimelineGroup,
  TimelineItem,
  TimelineOptions,
} from "vis-timeline/types";
import type { IssueInfo, IssueLink } from "./issue-types";
import type { FieldInfo, FieldInfoField } from "../../../@types/field-info";
import { ColorPaletteItem } from "./colors";

interface DepTimelineProps {
  issues: { [id: string]: IssueInfo };
  selectedIssueId: string | null;
  fieldInfo: FieldInfo;
  maxNodeWidth: number | undefined;
  setSelectedNode: (nodeId: string) => void;
  onOpenNode: (nodeId: string) => void;
}

const FONT_FAMILY = "system-ui, Arial, sans-serif";
const FONT_FAMILY_MONOSPACE =
  'Menlo, "Bitstream Vera Sans Mono", "Ubuntu Mono", Consolas, "Courier New", Courier, monospace';

const DepTimeline: React.FunctionComponent<DepTimelineProps> = ({
  issues,
  selectedIssueId,
  fieldInfo,
  maxNodeWidth,
  setSelectedNode,
  onOpenNode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const timeline = useRef<VisTimeline>(null);
  const items = useRef<DataSet<TimelineItem>>(new DataSet());

  useEffect(() => {
    if (containerRef.current && items.current) {
      const options = {
        width: "100%",
        autoResize: true,
      };
      // @ts-ignore
      timeline.current = new Timeline(containerRef.current, items.current, options);
      timeline.current.on("select", (props) => {
        const selectedItems = props.items;
        if (selectedItems != undefined && selectedItems.length > 0) {
          setSelectedNode(selectedItems[0]);
        }
      });
      timeline.current.on("doubleClick", (props) => {
        const clickedItem = props?.item;
        if (clickedItem != undefined) {
          onOpenNode(clickedItem);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (timeline.current && items.current) {
      console.log(`Rendering timeline with ${Object.keys(issues).length} nodes`);
      const relations = Object.values(issues).flatMap((issue: IssueInfo) =>
        [
          ...(issue.showUpstream ? issue.upstreamLinks : []),
          ...(issue.showDownstream ? issue.downstreamLinks : []),
        ].map((link: IssueLink) => ({
          from: issue.id,
          to: link.targetId,
        }))
      );
      const visibleIssues = Object.values(issues)
        // Only show issues with a due date.
        .filter((x) => x?.dueDate)
        // Only show issues that's shown in the dependency graph, i.e. that they have a visible relation.
        .filter(
          (issue: IssueInfo) =>
            issue.depth === 0 || relations.some((x) => x.from === issue.id || x.to === issue.id)
        );
      const stateColors = fieldInfo?.stateField ? fieldInfo.stateField.values : {};
      const stateStyles = Object.fromEntries(Object.entries(stateColors).map(([k, v]) => [k,
        `color: ${v.foreground}; background-color: ${v.background}`,
      ]));
      const timelineItems: Array<TimelineItem> = visibleIssues.map(
        (issue) =>
          ({
            id: issue.id,
            content: `${issue.id}: ${issue.summary}`,
            start: issue.dueDate,
            type: "box",
            style: issue?.state && issue.state in stateStyles ? stateStyles[issue.state] : undefined,
          } as TimelineItem)
      );
      const currentIds = items.current.getIds();
      const idsToRemove = currentIds.filter((id) => !timelineItems.some((x) => x.id === id));
      const itemsToAdd = timelineItems.filter((x) => !currentIds.includes(x.id));
      const itemsToUpdate = timelineItems
        .filter((x) => currentIds.includes(x.id))
        .filter((x) => {
          const currentItem = items.current.get(x.id);
          return (
            currentItem != undefined &&
            (currentItem.content !== x.content || currentItem.start !== x.start)
          );
        });
      items.current.remove(idsToRemove);
      items.current.add(itemsToAdd);
      items.current.updateOnly(itemsToUpdate);
      // @ts-ignore
      timeline.current.setItems(items.current);
      timeline.current.fit();
    }
  }, [issues]);

  useEffect(() => {
    if (timeline.current) {
      if (selectedIssueId) {
        console.log(`Timeline: Selecting issue ${selectedIssueId}`);
        timeline.current.setSelection(selectedIssueId);
      } else {
        timeline.current.setSelection([]);
      }
    }
  }, [selectedIssueId]);

  return <div ref={containerRef} className="dep-timeline" />;
};

export default DepTimeline;
