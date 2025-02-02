export type Settings = {
  stateField?: string;
  assigneeField?: string;
  dueDateField?: string;
  upstreamRelations?: string;
  downstreamRelations?: string;
  autoLoadDeps?: boolean;
  useHierarchicalLayout?: boolean;
  maxRecursionDepth?: number;
};
