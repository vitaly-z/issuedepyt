import React, { memo, useMemo, useState, useEffect } from "react";
import Button from "@jetbrains/ring-ui-built/components/button/button";
import { Grid, Row, Col } from "@jetbrains/ring-ui-built/components/grid/grid";
import Text from "@jetbrains/ring-ui-built/components/text/text";
import Toggle from "@jetbrains/ring-ui-built/components/toggle/toggle";
import { Size as ToggleSize } from "@jetbrains/ring-ui-built/components/toggle/toggle";
import { host } from "../global/ytApp";
import type { Settings } from "../../../@types/settings";
import type {
  IssueInfo,
  IssueLink,
  Relation,
  Relations,
  DirectionType,
} from "../depgraph/issue-types";
import IssueDeps from "../depgraph/issue-deps";

const AppComponent: React.FunctionComponent = () => {
  const [issueId, setIssueId] = useState<string | null>("SAN-3");
  const [settings, setSettings] = useState<Settings>({});
  const [graphVisible, setGraphVisible] = useState<boolean>(false);
  const [followUpstream, setFollowUpstream] = useState<boolean>(true);
  const [followDownstream, setFollowDownstream] = useState<boolean>(false);

  useMemo(() => {
    if (!graphVisible && settings?.autoLoadDeps) {
      console.log("Auto loading deps: Showing graph.");
      setGraphVisible(true);
    }
  }, [graphVisible, settings, issueId]);

  useEffect(() => {
    console.log("Fetching context...");
    host
      .fetchApp<{ issueId: string; settings: Settings }>("global-backend/context", { scope: false })
      .then((resp) => {
        const newSettings = resp.settings;
        console.log("Got settings", newSettings);
        setSettings(newSettings);
        console.log("Context issue ID: ", resp.issueId);
        if (resp.issueId) {
          setIssueId(resp.issueId);
          setGraphVisible(true);
        }
      });
  }, [host]);

  return (
    <div className="widget">
      {!graphVisible && (
        <div>
          <Grid>
            <Row start={"xs"} middle={"xs"}>
              <Col>
                <Button onClick={() => setGraphVisible((value) => !value)}>Load graph...</Button>
              </Col>
              <Col>
                <Grid>
                  <Row start={"xs"} middle={"xs"}>
                    <Toggle
                      size={ToggleSize.Size14}
                      checked={followUpstream}
                      onChange={(e: any) => setFollowUpstream(e.target.checked)}
                    >
                      Follow upstream (find issues that this issue depends on).
                    </Toggle>
                  </Row>
                  <Row start={"xs"} middle={"xs"}>
                    <Toggle
                      size={ToggleSize.Size14}
                      checked={followDownstream}
                      onChange={(e: any) => setFollowDownstream(e.target.checked)}
                    >
                      Follow downstream (find issues that depends on this issue).
                    </Toggle>
                  </Row>
                </Grid>
              </Col>
            </Row>
          </Grid>
        </div>
      )}
      {graphVisible && issueId && (
        <div>
          <div className="dep-page-current-issue">
            <Text size={Text.Size.M}>{issueId} dependencies</Text>
          </div>
          <IssueDeps
            issueId={issueId}
            settings={settings}
            followUpstream={followUpstream}
            followDownstream={followDownstream}
            setFollowUpstream={setFollowUpstream}
            setFollowDownstream={setFollowDownstream}
          />
        </div>
      )}
    </div>
  );
};

export const App = memo(AppComponent);
