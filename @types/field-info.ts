export type FieldInfoField = {
  name: string;
  values: {
    [key: string]: {
      archived: boolean;
      colorId: string;
      background: string;
      foreground: string;
    };
  };
};

export type FieldInfoKey = "stateField" | "typeField";
export type FieldInfo = {
  stateField?: FieldInfoField;
  typeField?: FieldInfoField;
};
