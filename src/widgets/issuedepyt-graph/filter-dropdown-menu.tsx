import React, { useRef, useState } from "react";
import DropdownMenu from "@jetbrains/ring-ui-built/components/dropdown-menu/dropdown-menu";
import Button from "@jetbrains/ring-ui-built/components/button/button";
import Checkbox from "@jetbrains/ring-ui-built/components/checkbox/checkbox";
import FilterIcon from "@jetbrains/icons/filter";
import CloseIcon from "@jetbrains/icons/close";
import type { FieldInfo, FieldInfoKey } from "../../../@types/field-info";
import type { FilterState, FilterStateKey } from "../../../@types/filter-state";

interface FilterDropdownMenuProps {
  fieldInfo: FieldInfo;
  filterState: FilterState;
  setFilterState: (value: FilterState) => void;
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

const FilterDropdownMenu: React.FunctionComponent<FilterDropdownMenuProps> = ({
  fieldInfo,
  filterState,
  setFilterState,
}) => {
  const [open, setOpen] = useState<boolean>(false);

  const popupIcon = open ? CloseIcon : FilterIcon;

  const items = [];
  const fields: Array<FilterStateKey> = ["type", "state"];
  for (const fieldName of fields) {
    const fieldInfoKey: FieldInfoKey = `${fieldName}Field`;
    if (fieldInfo?.[fieldInfoKey] && filterState?.[fieldName]) {
      const field = fieldInfo[fieldInfoKey];
      items.push({
        rgItemType: DropdownMenu.ListProps.Type.TITLE,
        label: `Filter on field ${field.name}`,
      });
      for (const [valueName, valueProps] of Object.entries(field.values)) {
        if (valueProps.archived) {
          continue;
        }
        items.push({
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
