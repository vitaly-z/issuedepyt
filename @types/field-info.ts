export type FieldInfoField = {
  name: string;
  values: {
    [key: string]: {
      colorId: string;
      background: string;
      foreground: string;
    }
  }
};

export type FieldInfo = {
  stateField?: FieldInfoField;
};
