import React, { useState } from "react";
import type { IssueInfo, IssueLink } from "./issue-types";
import Island, {
  Header,
  Content,
} from "@jetbrains/ring-ui-built/components/island/island";
import Button from "@jetbrains/ring-ui-built/components/button/button";
import Text from "@jetbrains/ring-ui-built/components/text/text";
import Tag from "@jetbrains/ring-ui-built/components/tag/tag";
import Link from "@jetbrains/ring-ui-built/components/link/link";
import { Grid, Row, Col } from "@jetbrains/ring-ui-built/components/grid/grid";
import Collapse from "@jetbrains/ring-ui-built/components/collapse/collapse";
import CollapseContent from "@jetbrains/ring-ui-built/components/collapse/collapse-content";
import ChevronUpIcon from "@jetbrains/icons/chevron-up";
import ChevronDownIcon from "@jetbrains/icons/chevron-down";

interface IssueInfoCardProps {
  issue: IssueInfo;
}

const IssueInfoCard: React.FunctionComponent<IssueInfoCardProps> = ({
  issue,
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(true);

  const title = issue?.summary ? `${issue.id}: ${issue.summary}` : issue.id;

  console.log(`Showing issue ${issue.id}`);

  const getRelation = (link: IssueLink) =>
    link.direction === "OUTWARD" ? link.sourceToTarget : link.targetToSource;

  let relationComps = [];
  if (!issue.linksKnown) {
    relationComps.push(
      <p>
        <Text size={Text.Size.S} info>
          Relations not loaded.
        </Text>
      </p>
    );
  } else {
    for (const item of [
      ["Upstream", issue.upstreamLinks],
      ["Downstream", issue.downstreamLinks],
    ]) {
      const direction = item[0] as string;
      const links = item[1] as Array<IssueLink>;
      const relations = links
        .map(getRelation)
        .filter((item, i, ar) => ar.indexOf(item) === i)
        .sort();

      for (let relation of relations) {
        let tags = [];
        for (let link of links) {
          const linkRelation = getRelation(link);
          if (linkRelation === relation) {
            tags.push(
              <Tag readOnly>
                <Link href={`/issue/${link.targetId}`}>{link.targetId}</Link>
              </Tag>
            );
          }
        }
        relationComps.push(
          <p>
            <Text size={Text.Size.S} info>{`${relation} (${direction})`}</Text>
            <div children={tags} />
          </p>
        );
      }
    }
  }
  const toggleCollapse = () => setCollapsed(!collapsed);

  const collapseControlText = collapsed ? "Expand" : "Collapse";
  const collapseControlIcon = collapsed ? ChevronDownIcon : ChevronUpIcon;

  return (
    <Island narrow withoutPaddings>
      <Header wrapWithTitle={false} border>
        <Link href={`/issue/${issue.id}`}>{title}</Link>
        <Button
          aria-label={collapseControlText}
          icon={collapseControlIcon}
          onClick={toggleCollapse}
          style={{ float: "right" }}
        >
          {collapseControlText}
        </Button>
      </Header>
      <Collapse collapsed={collapsed}>
        <CollapseContent>
          <Content>
            <Grid>
              <Row>
                <Col xs={3}>
                  {issue?.state != undefined && (
                    <p>
                      <Text size={Text.Size.S} info>
                        State
                      </Text>
                      <div>
                        <Text size={Text.Size.M}>{issue.state}</Text>
                      </div>
                    </p>
                  )}
                  {issue?.assignee != undefined && (
                    <p>
                      <Text size={Text.Size.S} info>
                        Assignee
                      </Text>
                      <div>
                        <Text size={Text.Size.M}>{issue.assignee}</Text>
                      </div>
                    </p>
                  )}
                </Col>
                <Col xs={9}>{relationComps}</Col>
              </Row>
            </Grid>
          </Content>
        </CollapseContent>
      </Collapse>
    </Island>
  );
};

export default IssueInfoCard;
