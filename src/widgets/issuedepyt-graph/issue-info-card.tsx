import React from 'react';
import type {IssueInfo, IssueLink} from './issue-types';
import Island, {Header, Content} from '@jetbrains/ring-ui-built/components/island/island';
import List from '@jetbrains/ring-ui-built/components/list/list';
import Link from '@jetbrains/ring-ui-built/components/link/link';
import {Grid, Row, Col} from '@jetbrains/ring-ui-built/components/grid/grid';
import { ListDataItem } from '@jetbrains/ring-ui-built/components/list/consts';

interface IssueInfoCardProps {
  issue: IssueInfo;
}

const IssueInfoCard: React.FunctionComponent<IssueInfoCardProps> = ({ issue }) => {
  let propsListItems: ListDataItem[] = [];
  let depsListItems: ListDataItem[] = [];
  const addItem = (listData: ListDataItem[], label: string, details?: string) => {
    listData.push({
      rgItemType: 2,
      key: listData.length,
      label,
      details,
    });
  };
  const addLinkItem = (listData: ListDataItem[], label: string, url: string) => {
    listData.push({
      rgItemType: 2,
      key: listData.length,
      label,
      url,
    });
  };
  const addTitle = (listData: ListDataItem[], title: string) => {
    listData.push({
      rgItemType: 5,
      key: listData.length,
      label: title,
    });
  };
  const title = issue?.summary ? `${issue.id}: ${issue.summary}` : issue.id;
  if (issue?.state != undefined) {
    addItem(propsListItems, "State", issue.state);
  }
  if (issue?.assignee != undefined) {
    addItem(propsListItems, "Assignee", issue.assignee);
  }

  const getRelation = (link: IssueLink) => (link.direction === "OUTWARD" ? link.sourceToTarget : link.targetToSource);

  const relations = issue.links
    .map(getRelation)
    .filter((item, i, ar) => ar.indexOf(item) === i)
    .sort();
  for (let relation of relations) {
    addTitle(depsListItems, relation);
    for (let link of issue.links) {
      const linkRelation = getRelation(link);
      if (linkRelation === relation) {
        addLinkItem(depsListItems, link.targetId, `/issue/${link.targetId}`);
      }
    }
  }
  return (
    <Island>
      <Header>
        <Link href={`/issue/${issue.id}`}>{title}</Link>
      </Header>
      <Content>
        <Grid>
          <Row>
            <Col xs={6}>
              <List compact data={propsListItems} />
            </Col>
            <Col xs={6}>
              <List compact data={depsListItems} />
            </Col>
          </Row>
        </Grid>
      </Content>
    </Island>
  );
};

export default IssueInfoCard;
