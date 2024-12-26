import React, { useRef } from 'react';
import type {IssueInfo, IssueLink} from './issue-types';
import Island, {Header, Content} from '@jetbrains/ring-ui-built/components/island/island';
import List from '@jetbrains/ring-ui-built/components/list/list';

interface IssueInfoCardProps {
  issue: IssueInfo;
}

const IssueInfoCard: React.FunctionComponent<IssueInfoCardProps> = ({ issue }) => {

  const props = ["state", "assignee"
  
  ]

  let listData = [];
  listData.push({
    rgItemType: 5,
    key: listData.length,
    label: "Properties",
  });
  listData.push({
    rgItemType: 2,
    key: listData.length,
    label: "State",
    details: issue.state,
  });
  listData.push({
    rgItemType: 2,
    key: listData.length,
    label: "Assignee",
    details: issue.assignee,
  });
  const links = issue.links;
  const relations = issue.links
    .filter(link => link.direction === "OUTWARD")
    .map(link => link.sourceToTarget)
    .filter((item, i, ar) => ar.indexOf(item) === i)
    .sort();
  for (let relation of relations) {
    listData.push({
      rgItemType: 5,
      key: listData.length,
      label: relation,
    });
    for (let link of links) {
      if (link.sourceToTarget === relation) {
        listData.push({
          rgItemType: 2,
          key: listData.length,
          label: link.targetId,
        });
      }
    }
  }
  return (
    <Island>
      <Header>{issue.id}: {issue.summary}</Header>
      <Content>
        <List data={listData} />
      </Content>
    </Island>
  );
};

export default IssueInfoCard;
