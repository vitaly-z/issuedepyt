import React, { useEffect, useRef } from "react";
import { DataSet } from "vis-data/peer/esm/vis-data";
import { Graph2d } from "vis-timeline";
import type {
  DateType,
  IdType,
  Graph2d as VisGraph2d,
  TimelineItem,
  TimelineItemType,
  Graph2dOptions,
} from "vis-timeline/types";
import type { IssueInfo, IssueLink, IssuePeriod } from "./issue-types";
import type { FieldInfo, FieldInfoField } from "../../../@types/field-info";
import { durationToDays, isPastDate } from "./time-utils";
import { ColorPaletteItem } from "./colors";
import { drawPoint } from "vis-network/declarations/DOMutil";

interface Graph2dItemLabel {
  content: string;
  xOffset?: number;
  yOffset?: number;
  className?: string;
}

interface Graph2dItem {
  id: IdType;
  x: Date;
  y: number | string;
  group?: IdType;
  end?: Date;
  label?: Graph2dItemLabel;
}

interface Graph2dGroup {
  id: IdType;
  content: string;
  className?: string;
  style?: any;
  visible?: boolean;
  options?: any;
}

interface DepEstimationGraphProps {
  issues: { [id: string]: IssueInfo };
  selectedIssueId: string | null;
  fieldInfo: FieldInfo;
  maxNodeWidth: number | undefined;
  setSelectedNode: (nodeId: string) => void;
  onOpenNode: (nodeId: string) => void;
}

const WORK_HOURS_PER_DAY = 8;
const WORK_DAYS_PER_WEEK = 5;

const estimationToDays = (estimation: IssuePeriod): number => {
  if (estimation?.minutes) {
    return estimation.minutes / (60 * WORK_HOURS_PER_DAY);
  }
  return 0;
};

const FONT_FAMILY = "system-ui, Arial, sans-serif";
const FONT_FAMILY_MONOSPACE =
  'Menlo, "Bitstream Vera Sans Mono", "Ubuntu Mono", Consolas, "Courier New", Courier, monospace';

const DepEstimationGraph: React.FunctionComponent<DepEstimationGraphProps> = ({
  issues,
  selectedIssueId,
  fieldInfo,
  maxNodeWidth,
  setSelectedNode,
  onOpenNode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const timeline = useRef<VisGraph2d>(null);
  const items = useRef<DataSet<Graph2dItem>>(new DataSet());
  const groups = useRef<DataSet<Graph2dGroup>>(new DataSet());

  useEffect(() => {
    if (containerRef.current && items.current && groups.current) {
      const options: Graph2dOptions = {
        width: "100%",
        style: "bar",
        barChart: { sideBySide: true, align: "center" },
        stack: true,
        drawPoints: false,
        orientation: "top",
        autoResize: true,
      };
      // @ts-ignore
      timeline.current = new Graph2d(containerRef.current, items.current, groups.current, options);
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
    if (timeline.current && items.current && groups.current) {
      console.log(`Rendering estimation graph with ${Object.keys(issues).length} nodes`);
      const relations = Object.values(issues).flatMap((issue: IssueInfo) =>
        [
          ...(issue.showUpstream ? issue.upstreamLinks : []),
          ...(issue.showDownstream ? issue.downstreamLinks : []),
        ].map((link: IssueLink) => ({
          from: issue.id,
          to: link.targetId,
        }))
      );

      const datedIssues = Object.values(issues).filter((x) => x?.startDate || x?.dueDate);
      const firstStartDate = datedIssues.reduce(
        (acc, x) => (x.startDate && x.startDate < acc ? x.startDate : acc),
        new Date()
      );
      const firstDueDate = datedIssues.reduce(
        (acc, x) => (x.dueDate && x.dueDate < acc ? x.dueDate : acc),
        new Date()
      );
      const lastStartDate = datedIssues.reduce(
        (acc, x) => (x.startDate && x.startDate > acc ? x.startDate : acc),
        new Date()
      );
      const lastDueDate = datedIssues.reduce(
        (acc, x) => (x.dueDate && x.dueDate > acc ? x.dueDate : acc),
        new Date()
      );
      timeline.current.setOptions({
        start: firstStartDate < firstDueDate ? firstStartDate : firstDueDate,
        end: lastDueDate > lastStartDate ? lastDueDate : lastStartDate,
      });

      const visibleIssues = Object.values(issues)
        // Only show issues with an estimation, a start and an end.
        .filter((x) => x?.estimation && x?.startDate && x?.dueDate)
        // Only show issues that's shown in the dependency graph, i.e. that they have a visible relation.
        .filter(
          (issue: IssueInfo) =>
            issue.depth === 0 || relations.some((x) => x.from === issue.id || x.to === issue.id)
        );
      const stateColors = fieldInfo?.stateField ? fieldInfo.stateField.values : {};
      const stateStyles = Object.fromEntries(
        Object.entries(stateColors).map(([k, v]) => [
          k,
          `color: ${v.foreground}; background-color: ${v.background}`,
        ])
      );
      console.log(`Rendering ${visibleIssues.length} issues`, visibleIssues);
      const timelineItems: Array<Graph2dItem> = visibleIssues.flatMap((issue) => {
        const days = estimationToDays(issue.estimation as IssuePeriod);
        if (days === 0) {
          return [];
        }
        const dates: Array<Date> = [];
        let extraDays = 0;
        for (let i = 0; i < days + extraDays; i++) {
          const date = new Date(issue.startDate as Date);
          date.setDate(date.getDate() + i);
          dates.push(date);

          // Insert additional days if weekends in dates period.
          if (date.getDay() === 0 || date.getDay() === 6) {
            extraDays++;
          }
        }
        const items: Array<Graph2dItem> = dates.map((date, idx) => ({
          id: `${issue.id}-${idx}`,
          group: issue.id,
          x: date,
          y: 1,
        }));
        return items;
      });
      {
        const currentIds = items.current.getIds();
        const idsToRemove = currentIds.filter((id) => !timelineItems.some((x) => x.id === id));
        const itemsToAdd = timelineItems.filter((x) => !currentIds.includes(x.id));
        const itemsToUpdate = timelineItems
          .filter((x) => currentIds.includes(x.id))
          .filter((x) => {
            const currentItem = items.current.get(x.id);
            return (
              currentItem != undefined &&
              (currentItem.x !== x.x || currentItem.y !== x.y || currentItem.end !== x.end)
            );
          });
        items.current.remove(idsToRemove);
        items.current.add(itemsToAdd);
        items.current.updateOnly(itemsToUpdate);
        // @ts-ignore
        timeline.current.setItems(items.current);
      }

      const timelineGroups: Array<Graph2dGroup> = visibleIssues.map((issue) => {
        //const state = issue.state || "";
        //const stateStyle = stateStyles[state] || "";
        return {
          id: issue.id,
          content: issue.summary,
          // style: stateStyle,
        };
      });
      {
        const currentIds = groups.current.getIds();
        const idsToRemove = currentIds.filter((id) => !timelineGroups.some((x) => x.id === id));
        const itemsToAdd = timelineGroups.filter((x) => !currentIds.includes(x.id));
        const itemsToUpdate = timelineGroups
          .filter((x) => currentIds.includes(x.id))
          .filter((x) => {
            const currentItem = groups.current.get(x.id);
            return (
              currentItem != undefined &&
              (currentItem.id !== x.id || currentItem.content !== x.content)
            );
          });
        groups.current.remove(idsToRemove);
        groups.current.add(itemsToAdd);
        groups.current.updateOnly(itemsToUpdate);
        // @ts-ignore
        timeline.current.setGroups(groups.current);
      }
      //timeline.current.fit();
    }
  }, [issues]);

  useEffect(() => {
    if (timeline.current) {
      if (selectedIssueId) {
        console.log(`Estimation graph: Selecting issue ${selectedIssueId}`);
        // timeline.current.setSelection(selectedIssueId);
      } else {
        // timeline.current.setSelection([]);
      }
    }
  }, [selectedIssueId]);

  return <div ref={containerRef} className="dep-estimation-graph" />;
};

export default DepEstimationGraph;
