import React, { useRef, useState } from "react";
import DropdownMenu, {
  DropdownMenuProps,
} from "@jetbrains/ring-ui-built/components/dropdown-menu/dropdown-menu";
import { Directions } from "@jetbrains/ring-ui-built/components/popup/popup.consts";
import Button from "@jetbrains/ring-ui-built/components/button/button";
import Checkbox from "@jetbrains/ring-ui-built/components/checkbox/checkbox";
import Icon from "@jetbrains/ring-ui-built/components/icon/icon";
import Group from "@jetbrains/ring-ui-built/components/group/group";
import { ListDataItem } from "@jetbrains/ring-ui-built/components/list/consts";
import FilterIcon from "@jetbrains/icons/filter";
import CloseIcon from "@jetbrains/icons/close";
import ChevronRightIcon from "@jetbrains/icons/chevron-right";
import type { FieldInfo, FieldInfoKey } from "../../../@types/field-info";
import type { FilterState, FilterStateKey } from "../../../@types/filter-state";

interface FilterDropdownMenuProps {
  fieldInfo: FieldInfo;
  filterState: FilterState;
  setFilterState: (value: FilterState) => void;
}

interface NestedMenuProps {
  title: string;
  data?: ListDataItem[];
  children?: React.ReactNode;
}

export const createFilterState = (fieldInfo: FieldInfo): FilterState => {
  const filterState: FilterState = {
    showOrphans: false,
    showWhenLinksUnknown: true,
  };
  const fields: Array<FilterStateKey> = ["type", "state"];
  for (const fieldName of fields) {
    const fieldInfoKey: FieldInfoKey = `${fieldName}Field`;
    filterState[fieldName] = {};
    if (fieldInfoKey in fieldInfo) {
      const values = fieldInfo[fieldInfoKey]?.values || {};
      for (const [valueName, valueProps] of Object.entries(values)) {
        filterState[fieldName][valueName] = !valueProps.archived;
      }
    }
  }
  return filterState;
};

const NestedMenuItem = (props: NestedMenuProps) => {
  const anchor: DropdownMenuProps["anchor"] = ({ active }, ariaProps = {}) => (
    <Group
      role="menu"
      className="nested-menu-item"
      {...{
        "aria-expanded": active,
        "aria-label": props.title,
      }}
      {...ariaProps}
    >
      <span className="nested-menu-title">{props.title}</span>
      <Icon glyph={ChevronRightIcon} className="chevron-icon" />
    </Group>
  );
  const dropdownProps: DropdownMenuProps = {
    hoverMode: true,
    hoverShowTimeOut: 50,
    hoverHideTimeOut: 100,
    anchor,
  };
  const menuProps: DropdownMenuProps["menuProps"] = {
    directions: [
      Directions.RIGHT_BOTTOM,
      Directions.LEFT_BOTTOM,
      Directions.RIGHT_TOP,
      Directions.LEFT_TOP,
    ],
    left: 20,
    top: -12,
    minWidth: 150,
    ["data-test"]: "nested-menu",
    hidden: false,
    activateFirstItem: false,
  };
  if (props.data) {
    // dropdown menu has automatic support for aria-navigation
    return <DropdownMenu {...dropdownProps} data={props.data} menuProps={menuProps} />;
  }
  return <DropdownMenu {...dropdownProps} menuProps={menuProps} />;
};

const FilterDropdownMenu: React.FunctionComponent<FilterDropdownMenuProps> = ({
  fieldInfo,
  filterState,
  setFilterState,
}) => {
  const [open, setOpen] = useState<boolean>(false);

  const popupIcon = open ? CloseIcon : FilterIcon;

  const items = [];
  items.push({
    rgItemType: DropdownMenu.ListProps.Type.TITLE,
    label: "Filter on field",
  });
  const fields: Array<FilterStateKey> = ["type", "state"];
  for (const fieldName of fields) {
    const fieldInfoKey: FieldInfoKey = `${fieldName}Field`;
    if (fieldInfo?.[fieldInfoKey] && filterState?.[fieldName]) {
      const field = fieldInfo[fieldInfoKey];
      const submenuItems = [];
      for (const [valueName, valueProps] of Object.entries(field.values)) {
        if (valueProps.archived) {
          continue;
        }
        submenuItems.push({
          rgItemType: DropdownMenu.ListProps.Type.CUSTOM,
          template: (
            <Checkbox
              label={`Show ${valueName}`}
              checked={filterState?.[fieldName][valueName]}
              onChange={(e: any) => {
                const newState: FilterState = { ...filterState };
                const fieldStateInfo = newState?.[fieldName] || {};
                fieldStateInfo[valueName] = e.target.checked;
                setFilterState(newState);
              }}
            />
          ),
        });
      }
      items.push({
        rgItemType: DropdownMenu.ListProps.Type.CUSTOM,
        template: (
          <button className="nested-menu-button" onClick={(e) => e.stopPropagation()}>
            <NestedMenuItem title={field.name} data={submenuItems} />
          </button>
        ),
      });
    }
  }
  items.push({
    rgItemType: DropdownMenu.ListProps.Type.TITLE,
    label: "Other filters",
  });
  items.push({
    rgItemType: DropdownMenu.ListProps.Type.CUSTOM,
    template: (
      <Checkbox
        label={"Show orphan nodes"}
        checked={filterState.showOrphans}
        onChange={(e: any) => {
          const newState: FilterState = { ...filterState };
          newState.showOrphans = e.target.checked;
          setFilterState(newState);
        }}
      />
    ),
  });
  items.push({
    rgItemType: DropdownMenu.ListProps.Type.CUSTOM,
    template: (
      <Checkbox
        label={"Show nodes with unknown relations"}
        checked={filterState.showWhenLinksUnknown}
        onChange={(e: any) => {
          const newState: FilterState = { ...filterState };
          newState.showWhenLinksUnknown = e.target.checked;
          setFilterState(newState);
        }}
      />
    ),
  });

  return (
    <DropdownMenu
      onShow={() => setOpen(true)}
      onHide={() => setOpen(false)}
      menuProps={{
        closeOnSelect: false,
      }}
      anchor={<Button inline icon={popupIcon} />}
      data={items}
    />
  );
};

export default FilterDropdownMenu;
