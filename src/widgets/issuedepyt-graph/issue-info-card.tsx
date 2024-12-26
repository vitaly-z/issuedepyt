import React, { useRef } from 'react';
import type {IssueInfo, IssueLink} from './issue-types';
import Island, {Header, Content} from '@jetbrains/ring-ui-built/components/island/island';
import List from '@jetbrains/ring-ui-built/components/list/list';
import { ListDataItem } from '@jetbrains/ring-ui-built/components/list/consts';

interface IssueInfoCardProps {
  issue: IssueInfo;
}

const IssueInfoCard: React.FunctionComponent<IssueInfoCardProps> = ({ issue }) => {
  let listData: ListDataItem[] = [];
  const addItem = (label: string, details?: string) => {
    listData.push({
      rgItemType: 2,
      key: listData.length,
      label,
      details,
    });
  };
  const addLinkItem = (label: string, url: string) => {
    listData.push({
      rgItemType: 2,
      key: listData.length,
      label,
      url,
    });
  };
  const addTitle = (title: string) => {
    listData.push({
      rgItemType: 5,
      key: listData.length,
      label: title,
    });
  };
  const title = issue?.summary ? `${issue.id}: ${issue.summary}` : issue.id;
  if (issue?.state != undefined) {
    addItem("State", issue.state);
  }
  if (issue?.assignee != undefined) {
    addItem("Assignee", issue.assignee);
  }

  const getRelation = (link: IssueLink) => (link.direction === "OUTWARD" ? link.sourceToTarget : link.targetToSource);

  const relations = issue.links
    .map(getRelation)
    .filter((item, i, ar) => ar.indexOf(item) === i)
    .sort();
  for (let relation of relations) {
    addTitle(relation);
    for (let link of issue.links) {
      const linkRelation = getRelation(link);
      if (linkRelation === relation) {
        addLinkItem(link.targetId, `/issue/${link.targetId}`);
      }
    }
  }
  return (
    <Island narrow>
      <Header border>{title}</Header>
      <Content>
        <List compact data={listData} />
      </Content>
    </Island>
  );
};

export default IssueInfoCard;
