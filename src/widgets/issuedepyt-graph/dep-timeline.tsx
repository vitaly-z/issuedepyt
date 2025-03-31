import React, { useEffect, useRef } from "react";
import Button from "@jetbrains/ring-ui-built/components/button/button";
import FullscreenIcon from "@jetbrains/icons/fullscreen";
import SearchIcon from "@jetbrains/icons/search";
import Group from "@jetbrains/ring-ui-built/components/group/group";
import Tooltip from "@jetbrains/ring-ui-built/components/tooltip/tooltip";
import Theme from "@jetbrains/ring-ui-built/components/global/theme";
import { DataSet } from "vis-data/peer/esm/vis-data";
import { Timeline } from "vis-timeline";
import type {
  DateType,
  IdType,
  Timeline as VisTimeline,
  TimelineAnimationOptions,
  TimelineGroup,
  TimelineItem,
  TimelineItemType,
  TimelineOptions,
} from "vis-timeline/types";
import type { IssueInfo, IssueLink } from "./issue-types";
import type { FieldInfo, FieldInfoField } from "../../../@types/field-info";
import { FilterState } from "../../../@types/filter-state";
import { filterIssues } from "./issue-helpers";
import { calcBusinessDays, durationToDays, isPastDate } from "./time-utils";
import { getIssueWork, getIssueStartEnd } from "./issue-helpers";

interface DepTimelineProps {
  issues: { [id: string]: IssueInfo };
  selectedIssueId: string | null;
  fieldInfo: FieldInfo;
  filterState: FilterState;
  maxNodeWidth: number | undefined;
  setSelectedNode: (nodeId: string) => void;
  onOpenNode: (nodeId: string) => void;
}

const FONT_FAMILY = "system-ui, Arial, sans-serif";
const FONT_FAMILY_MONOSPACE =
  'Menlo, "Bitstream Vera Sans Mono", "Ubuntu Mono", Consolas, "Courier New", Courier, monospace';

const getTooltip = (issue: IssueInfo, isOverdue: boolean): string => {
  let lines = [`<b>${issue.idReadable}</b>: ${issue.summary}`];
  const { estimatedDays, scheduledDays, workFactor } = getIssueWork(issue);
  if (issue?.dueDate) {
    const today = new Date();
    if (isOverdue) {
      lines.push(`<i>Overdue!</i>`);
    }
    // Due date was in the past.
    const daysToDueDate = durationToDays(issue.dueDate.getTime()) - durationToDays(today.getTime());
    const maybeS = Math.abs(daysToDueDate) > 1 ? "s" : "";
    if (daysToDueDate < 0) {
      const daysAgo = Math.abs(daysToDueDate);
      lines.push(`Due date was ${daysAgo} day${maybeS} ago on ${issue.dueDate.toDateString()}.`);
    } else {
      // Due date is future.
      lines.push(
        `Due date is in ${daysToDueDate} day${maybeS} on ${issue.dueDate.toDateString()}.`
      );
    }
  }
  if (issue?.startDate) {
    const today = new Date();
    if (today.getTime() > issue.startDate.getTime()) {
      // Start date was in the past.
      const daysAgo = durationToDays(today.getTime()) - durationToDays(issue.startDate.getTime());
      const maybeS = daysAgo > 1 ? "s" : "";
      lines.push(
        `Start date was ${daysAgo} day${maybeS} ago on ${issue.startDate.toDateString()}.`
      );
    } else {
      // Start date is in the future.
      const daysUntil = durationToDays(issue.startDate.getTime()) - durationToDays(today.getTime());
      const maybeS = daysUntil > 1 ? "s" : "";
      lines.push(
        `Start date is in ${daysUntil} day${maybeS} on ${issue.startDate.toDateString()}.`
      );
    }
  }
  if (scheduledDays) {
    lines.push(`Scheduled to ${scheduledDays} business days.`);
  }
  if (issue?.estimation) {
    const maybeEstimatedDays = estimatedDays != undefined ? `(${estimatedDays} days)` : "";
    lines.push(`Estimated to ${[issue.estimation.presentation, maybeEstimatedDays].join(" ")}.`);
    if (workFactor != undefined) {
      lines.push(`A work factor of ${workFactor.toFixed(2)} estimated over planned period.`);
    }
  }

  return lines.join("<br/>");
};

const DepTimeline: React.FunctionComponent<DepTimelineProps> = ({
  issues,
  selectedIssueId,
  fieldInfo,
  filterState,
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
      const visibleIssues = Object.values(filterIssues(filterState, issues))
        // Only show issues with a start or end date.
        .filter((issue) => Object.values(getIssueStartEnd(issue)).filter((x) => !!x).length > 0);
      console.log(`Rendering timeline with ${Object.keys(visibleIssues).length} nodes`);
      const stateColors = fieldInfo?.stateField ? fieldInfo.stateField.values : {};
      const stateStyles = Object.fromEntries(
        Object.entries(stateColors).map(([k, v]) => [
          k,
          `color: ${v.foreground}; background-color: ${v.background};`,
        ])
      );
      const timelineItems: Array<TimelineItem> = visibleIssues.map((issue) => {
        const startSymbol = "⇤"; // "↦".
        const endSymbol = "⇥";
        const periodSymbol = "↹";
        let typeSymbol = `<b>${periodSymbol}</b>`;
        let className = "period";
        const timePeriod = getIssueStartEnd(issue);
        const isOverdue = !issue.resolved && !!timePeriod.end && isPastDate(timePeriod.end as Date);
        const warningSign = isOverdue ? "&nbsp;⚠️" : "";
        const itemPeriodProps: { start: Date; end?: Date; type: TimelineItemType } = {
          start: timePeriod.start as Date,
          type: "range",
        };
        if (timePeriod.start && timePeriod.end) {
          itemPeriodProps.end = timePeriod.end;
        } else if (timePeriod.end) {
          itemPeriodProps.start = timePeriod.end;
          itemPeriodProps.type = "box";
          typeSymbol = `<b>${endSymbol}</b>`;
          className = "end";
        } else if (timePeriod.start) {
          itemPeriodProps.start = timePeriod.start;
          itemPeriodProps.type = "box";
          typeSymbol = `<b>${startSymbol}</b>`;
          className = "start";
        }
        className = isOverdue ? `${className}-overdue` : className;
        const estimate = issue?.estimation ? ` [${issue.estimation.presentation}]` : "";
        const item: TimelineItem = {
          id: issue.id,
          content: `${typeSymbol} ${issue.idReadable}: ${issue.summary}${estimate}${warningSign}`,
          title: getTooltip(issue, isOverdue),
          className,
          style: issue?.state && issue.state in stateStyles ? stateStyles[issue.state] : undefined,
          ...itemPeriodProps,
        };
        return item;
      });
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
      timeline.current.fit({ animation: false });
    }
  }, [issues, filterState]);

  const fitTimeline = () => {
    if (timeline.current) {
      timeline.current.fit({ animation: true });
    }
  };
  const focusSelected = () => {
    if (timeline.current) {
      const selectedId = timeline.current.getSelection();
      if (selectedId.length === 0) {
        return;
      }
      timeline.current.focus(selectedId);
    }
  };

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

  return (
    <div ref={containerRef} className="dep-timeline">
      <div className="dep-timeline-controls">
        <Group>
          <Tooltip title={"Zoom to focus on selected item"} theme={Theme.LIGHT}>
            <Button icon={SearchIcon} onClick={() => focusSelected()} />
          </Tooltip>
          <Tooltip title={"Zoom to fit all items into view"} theme={Theme.LIGHT}>
            <Button icon={FullscreenIcon} onClick={() => fitTimeline()} />
          </Tooltip>
        </Group>
      </div>
    </div>
  );
};

export default DepTimeline;
