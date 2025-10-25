// To learn more, see https://www.jetbrains.com/help/youtrack/devportal-apps/apps-reference-http-handlers.html

exports.httpHandler = {
  endpoints: [
    {
      method: "GET",
      path: "context",
      scope: "global",
      permissions: ["READ_ISSUE", "READ_PROJECT"],
      handle: function handle(ctx) {
        const issueId = ctx.globalStorage.extensionProperties.issueId;
        const props = ctx.globalStorage.extensionProperties;
        const settings = {
          // Load project settings from stored context.
          typeField: props.typeField,
          stateField:  props.stateField,
          sprintsField: props.sprintsField,
          assigneeField: props.assigneeField,
          startDateField: props.startDateField,
          dueDateField: props.dueDateField,
          estimationField: props.estimationField,
          extraCustomFields: props.extraCustomFields,
          upstreamRelations: props.upstreamRelations,
          downstreamRelations: props.downstreamRelations,
          // Global settings are available in ctx.settings.
          autoLoadDeps: ctx.settings.autoLoadDeps,
          useHierarchicalLayout: ctx.settings.useHierarchicalLayout,
          maxRecursionDepth: ctx.settings.maxRecursionDepth,
        }
        ctx.response.json({ issueId: issueId, settings: settings });
      },
    },
    {
      method: "POST",
      path: "storeContext",
      scope: "global",
      handle: function handle(ctx) {
        const body = JSON.parse(ctx.request.body);
        const settings = body.settings;
        ctx.globalStorage.extensionProperties.issueId = body.issueId;
        ctx.globalStorage.extensionProperties.typeField = settings.typeField;
        ctx.globalStorage.extensionProperties.stateField = settings.stateField;
        ctx.globalStorage.extensionProperties.sprintsField = settings.sprintsField;
        ctx.globalStorage.extensionProperties.assigneeField = settings.assigneeField;
        ctx.globalStorage.extensionProperties.startDateField = settings.startDateField;
        ctx.globalStorage.extensionProperties.dueDateField = settings.dueDateField;
        ctx.globalStorage.extensionProperties.estimationField = settings.estimationField;
        ctx.globalStorage.extensionProperties.extraCustomFields = settings.extraCustomFields;
        ctx.globalStorage.extensionProperties.upstreamRelations = settings.upstreamRelations;
        ctx.globalStorage.extensionProperties.downstreamRelations = settings.downstreamRelations;
        ctx.response.json({ issueId: body.issueId });
      },
    },
  ],
};
