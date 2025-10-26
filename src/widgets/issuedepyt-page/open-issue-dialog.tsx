import React, { useState, useEffect } from "react";
import Dialog from "@jetbrains/ring-ui-built/components/dialog/dialog";
import { Header, Content } from "@jetbrains/ring-ui-built/components/island/island";
import Panel from "@jetbrains/ring-ui-built/components/panel/panel";
import Input from "@jetbrains/ring-ui-built/components/input/input";
import List, { ListDataItem } from "@jetbrains/ring-ui-built/components/list/list";
import Button from "@jetbrains/ring-ui-built/components/button/button";
import { host } from "../global/ytApp";

type Issue = { id: string; idReadable: string; summary: string };

interface OpenIssueDialogProps {
  onClose: () => void;
  onSelect: (issueId: string) => void;
}

const OpenIssueDialog: React.FC<OpenIssueDialogProps> = ({ onClose, onSelect }) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Issue[]>([]);
  const [listItems, setListItems] = useState<ListDataItem<{ issue: Issue }>[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);

  const searchIssues = async (term: string, limit: number = 50) => {
    setSearchLoading(true);
    try {
      term = term.trim();
      const encodedQuery = encodeURIComponent(term);
      const resp = await host.fetchYouTrack<Issue[]>(
        `issues?fields=id,idReadable,summary&%24top=${limit}&%24skip=0&query=${encodedQuery}`
      );
      setSearchResults(resp);
    } catch (e) {
      console.log("Search error", e);
      setSearchResults([]);
    }
    setSearchLoading(false);
  };

  useEffect(() => {
    const items: ListDataItem<{ issue: Issue }>[] = searchResults.map((issue) => ({
      issue: issue,
      label: `${issue.idReadable}: ${issue.summary}`,
      rgItemType: 2,
    }));
    setListItems(items);
  }, [searchResults]);

  useEffect(() => {
    if (searchQuery.length > 3) {
      searchIssues(searchQuery);
    } else if (searchResults.length > 0) {
      setSearchResults([]);
    }
  }, [searchQuery]);

  return (
    <Dialog
      show={true}
      onCloseClick={onClose}
      showCloseButton={true}
      closeButtonInside={true}
      label={"Open Issue"}
      trapFocus
    >
      <Header>Open Issue</Header>
      <Content>
        <div className="open-issue-search">
          <Input
            placeholder="Search for issue..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIssue(null);
            }}
            autoFocus
          />
        </div>
        <div className="open-issue-list">
          <List
            data={listItems}
            activeIndex={listItems.findIndex((x) => x.issue.id === selectedIssue?.id)}
            onSelect={(item: ListDataItem<{ issue: Issue }>) => setSelectedIssue(item.issue)}
            activateSingleItem={true}
          />
        </div>
      </Content>
      <Panel>
        <Button
          onClick={() => {
            if (selectedIssue) {
              onSelect(selectedIssue.idReadable);
            }
          }}
          disabled={!selectedIssue}
          primary
        >
          Select issue
        </Button>
        <Button onClick={onClose} danger>
          Cancel
        </Button>
      </Panel>
    </Dialog>
  );
};

export default OpenIssueDialog;
