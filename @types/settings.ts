export type Settings = {
  stateField?: string;
  assigneeField?: string;
  upstreamRelations?: string;
  downstreamRelations?: string;
  autoLoadDeps?: boolean;
  useHierarchicalLayout?: boolean;
  maxRecursionDepth?: number;
};
