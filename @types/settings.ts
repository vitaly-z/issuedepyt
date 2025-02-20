export type Settings = {
  typeField?: string;
  stateField?: string;
  assigneeField?: string;
  startDateField?: string;
  dueDateField?: string;
  upstreamRelations?: string;
  downstreamRelations?: string;
  autoLoadDeps?: boolean;
  useHierarchicalLayout?: boolean;
  maxRecursionDepth?: number;
};
