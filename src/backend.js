// To learn more, see https://www.jetbrains.com/help/youtrack/devportal-apps/apps-reference-http-handlers.html

exports.httpHandler = {
  endpoints: [
    {
      method: "GET",
      path: "settings",
      scope: "issue", // For unkown reasons ctx.settings isn't populated for the "global" scope.
      handle: function handle(ctx) {
        ctx.response.json({ settings: ctx.settings });
      },
    },
  ],
};
