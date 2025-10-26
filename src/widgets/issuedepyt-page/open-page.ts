import { Settings } from "../../../@types/settings";
import { host } from "../global/ytApp";

export const storeContext = async (issueId: string, settings: Settings) => {
  // Update backend context.
  await host.fetchApp<{ issueId: string }>("backend/storeContext", {
    scope: true,
    method: "POST",
    body: { issueId: issueId, settings: settings },
  });
};

export const openGraphPage = async (issueId: string, settings: Settings) => {
  // Update backend context and transfer to app page which will fetch context.
  await storeContext(issueId, settings);

  // Transfer to app page.
  open("/app/issuedepyt/page");
};
