import React, { useRef, useState } from "react";
import DropdownMenu from "@jetbrains/ring-ui-built/components/dropdown-menu/dropdown-menu";
import Input from "@jetbrains/ring-ui-built/components/input/input";
import Button from "@jetbrains/ring-ui-built/components/button/button";
import SearchIcon from "@jetbrains/icons/search";
import CloseIcon from "@jetbrains/icons/close";
import NestedMenuItem from "./nested-menu-item";
import type { IssueInfo } from "./issue-types";
import type { FieldInfo, FieldInfoKey } from "../../../@types/field-info";

interface SearchDropdownMenuProps {
  fieldInfo: FieldInfo;
  issueData: { [key: string]: IssueInfo };
  setHighlightedNodes: (value: Array<string> | null) => void;
}

const SearchDropdownMenu: React.FunctionComponent<SearchDropdownMenuProps> = ({
  fieldInfo,
  issueData,
  setHighlightedNodes,
}) => {
  const [open, setOpen] = useState<boolean>(false);

  const popupIcon = open ? CloseIcon : SearchIcon;

  const findNodes = (
    filterFunc: (issue: IssueInfo) => boolean,
    issueData: { [key: string]: IssueInfo }
  ) => {
    return Object.values(issueData)
      .filter(filterFunc)
      .map((x) => x.id);
  };

  const items = [];
  items.push({
    rgItemType: DropdownMenu.ListProps.Type.CUSTOM,
    template: (
      <Button
        onClick={(e: any) => {
          setHighlightedNodes(null);
        }}
      >
        Clear
      </Button>
    ),
  });
  items.push({
    rgItemType: DropdownMenu.ListProps.Type.CUSTOM,
    template: (
      <Input
        type="search"
        label="Highlight text matches"
        onChange={(e: any) =>
          setHighlightedNodes(
            findNodes((x: IssueInfo) => {
              const content = `${x.idReadable} ${x.summary}`;
              return content.toLowerCase().includes(e.target.value.toLowerCase());
            }, issueData)
          )
        }
      />
    ),
  });
  const fields: Array<["type" | "state", FieldInfoKey]> = [
    ["type", "typeField"],
    ["state", "stateField"],
  ];
  for (const [fieldName, fieldInfoKey] of fields) {
    if (fieldInfo?.[fieldInfoKey]) {
      const field = fieldInfo[fieldInfoKey];
      const submenuItems = [];
      for (const [valueName, valueProps] of Object.entries(field.values)) {
        if (valueProps.archived) {
          continue;
        }
        submenuItems.push({
          rgItemType: DropdownMenu.ListProps.Type.CUSTOM,
          template: (
            <Button
              inline
              onClick={(e: any) =>
                setHighlightedNodes(
                  findNodes((x: IssueInfo) => x[fieldName] === valueName, issueData)
                )
              }
            >
              Highlight {valueName}
            </Button>
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
  const searches: Array<[string, (issue: IssueInfo) => boolean]> = [
    ["Highlight assigned", (x: IssueInfo) => x.assignee != null],
    ["Highlight unassigned", (x: IssueInfo) => x.assignee == null],
    ["Highlight resolved", (x: IssueInfo) => x.resolved],
    ["Highlight unresolved", (x: IssueInfo) => !x.resolved],
    ["Highlight with start date", (x: IssueInfo) => !!x.startDate],
    ["Highlight no start date", (x: IssueInfo) => !x.startDate],
    ["Highlight with due date", (x: IssueInfo) => !!x.dueDate],
    ["Highlight no due date", (x: IssueInfo) => !x.dueDate],
    ["Highlight estimated", (x: IssueInfo) => !!x.estimation],
    ["Highlight non-estimated", (x: IssueInfo) => !x.estimation],
  ];
  items.push(
    ...searches.map(([label, filterFunc]) => ({
      rgItemType: DropdownMenu.ListProps.Type.CUSTOM,
      template: (
        <Button inline onClick={(e: any) => setHighlightedNodes(findNodes(filterFunc, issueData))}>
          {label}
        </Button>
      ),
    }))
  );

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

export default SearchDropdownMenu;
