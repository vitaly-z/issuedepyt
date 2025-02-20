import React from "react";
import DropdownMenu from "@jetbrains/ring-ui-built/components/dropdown-menu/dropdown-menu";
import Input from "@jetbrains/ring-ui-built/components/input/input";
import Button from "@jetbrains/ring-ui-built/components/button/button";
import Checkbox from "@jetbrains/ring-ui-built/components/checkbox/checkbox";
import MoreOptionsIcon from "@jetbrains/icons/more-options";
import Tooltip from "@jetbrains/ring-ui-built/components/tooltip/tooltip";
import Theme from "@jetbrains/ring-ui-built/components/global/theme";

interface OptionsDropdownMenuProps {
  maxDepth: number;
  maxNodeWidth: number | undefined;
  useHierarchicalLayout: boolean;
  useDepthRendering: boolean;
  followUpstream: boolean;
  followDownstream: boolean;
  setMaxDepth: (value: number) => void;
  setMaxNodeWidth: (value: number) => void;
  setUseHierarchicalLayout: (value: boolean) => void;
  setUseDepthRendering: (value: boolean) => void;
  setFollowUpstream: (value: boolean) => void;
  setFollowDownstream: (value: boolean) => void;
  onExportRelations: () => void;
}

const OptionsDropdownMenu: React.FunctionComponent<OptionsDropdownMenuProps> = ({
  maxDepth,
  maxNodeWidth,
  useHierarchicalLayout,
  useDepthRendering,
  followUpstream,
  followDownstream,
  setMaxDepth,
  setMaxNodeWidth,
  setUseHierarchicalLayout,
  setUseDepthRendering,
  setFollowUpstream,
  setFollowDownstream,
  onExportRelations,
}) => {
  return (
    <DropdownMenu
      anchor={
        <Tooltip title="Show more" theme={Theme.LIGHT}>
          <Button inline icon={MoreOptionsIcon} />
        </Tooltip>
      }
      data={[
        {
          rgItemType: DropdownMenu.ListProps.Type.TITLE,
          label: "Layout",
        },
        {
          rgItemType: DropdownMenu.ListProps.Type.CUSTOM,
          template: (
            <Checkbox
              label="Tree layout"
              checked={useHierarchicalLayout}
              onChange={(e: any) => setUseHierarchicalLayout(e.target.checked)}
            />
          ),
        },
        {
          rgItemType: DropdownMenu.ListProps.Type.CUSTOM,
          template: (
            <Checkbox
              label="Strict depth layout"
              checked={useDepthRendering}
              onChange={(e: any) => setUseDepthRendering(e.target.checked)}
            />
          ),
        },
        {
          rgItemType: DropdownMenu.ListProps.Type.CUSTOM,
          template: (
            <Input
              type="number"
              label="Max depth"
              value={maxDepth}
              onChange={(e: any) => setMaxDepth(Number(e.target.value))}
            />
          ),
        },
        {
          rgItemType: DropdownMenu.ListProps.Type.CUSTOM,
          template: (
            <Input
              type="number"
              label="Max node width"
              value={maxNodeWidth}
              onChange={(e: any) => setMaxNodeWidth(Number(e.target.value))}
            />
          ),
        },
        {
          rgItemType: DropdownMenu.ListProps.Type.TITLE,
          label: "Follow direction",
        },
        {
          rgItemType: DropdownMenu.ListProps.Type.CUSTOM,
          template: (
            <Checkbox
              label="Follow upstream relations"
              checked={followUpstream}
              onChange={(e: any) => setFollowUpstream(e.target.checked)}
            />
          ),
        },
        {
          rgItemType: DropdownMenu.ListProps.Type.CUSTOM,
          template: (
            <Checkbox
              label="Follow downstream relations"
              checked={followDownstream}
              onChange={(e: any) => setFollowDownstream(e.target.checked)}
            />
          ),
        },
        {
          rgItemType: DropdownMenu.ListProps.Type.TITLE,
          label: "Export",
        },
        {
          rgItemType: DropdownMenu.ListProps.Type.CUSTOM,
          template: (
            <Button inline onClick={() => onExportRelations()}>
              Export relations
            </Button>
          ),
        },
      ]}
    />
  );
};

export default OptionsDropdownMenu;
