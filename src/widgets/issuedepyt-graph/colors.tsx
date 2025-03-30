/* Colors from https://github.com/JetBrains/ring-ui/blob/master/src/global/variables.css */
export enum Color {
  /* Element */
  LineColor = "#dfe1e5",
  BordersColor = "#d3d5db",
  IconColor = "#6C707E",
  IconWhiteColor = "#FFFFFF",
  IconSecondaryColor = "#6C707E",
  BorderDisabledColor = "#ebecf0",
  BorderSelectedDisabledColor = "#c9ccd6",
  BorderDisabledActiveColor = "#abd5f6",
  IconDisabledColor = "#A8ADBD",
  BorderHoverColor = "#a0bdf8",
  BorderHoverSuccessColor = "#C5E5CC",
  BorderHoverErrorColor = "#FAD4D8",
  IconHoverColor = "#5a5d6b",
  MainColor = "#3574f0",
  ActionLinkColor = "#2E55A3",
  MainHoverColor = "#3369d6",
  MainSuccessColor = "#208A3C",
  MainSuccessHoverColor = "#1F8039",
  MainErrorColor = "#CC3645",
  MainErrorHoverColor = "#BC303E",
  IconErrorColor = "#CC3645",
  IconWarningColor = "#A46704",
  IconSuccessColor = "#1F7536",
  IconHighlightColor = "#FFAF0F",
  IconHighlightHoverColor = "#DF9303",
  PaleControlColor = "#C2D6FC",
  PopupBorderColor = "#dfe1e5",
  PopupShadowColor = "rgba(0, 28, 54, 0.1)",
  PopupSecondaryShadowColor = "rgba(0, 28, 54, 0.04)",
  MessageShadowColor = "rgba(0, 28, 54, 0.3)",
  PinnedShadowColor = "#6C707E",
  ButtonDangerHoverColor = "#DB3B4B",
  ButtonPrimaryBorderColor = "#2E55A3",

  /* Text */
  SearchColor = "#709CF5",
  HintColor = "#2E55A3",
  LinkColor = "#2E55A3",
  LinkHoverColor = "#223C72",
  ErrorColor = "#CC3645",
  WarningColor = "#A46704",
  SuccessColor = "#1F7536",
  TextColor = "#27282E",
  ActiveTextColor = "#27282E",
  WhiteTextColor = "#FFFFFF",
  HeadingColor = "#27282E",
  SecondaryColor = "#6C707E",
  DisabledColor = "#A8ADBD",

  /* Background */
  ContentBackgroundColor = "#FFFFFF",
  PopupBackgroundColor = "#FFFFFF",
  SidebarBackgroundColor = "#F7F8FA",
  SecondaryBackgroundColor = "#F7F8FA",
  SelectedBackgroundColor = "#D4E2FF",
  HoverBackgroundColor = "#EDF3FF",
  NavigationBackgroundColor = "#FFFFFF",
  TagBackgroundColor = "#EBECF0",
  TagHoverBackgroundColor = "#D3D5DB",
  RemovedBackgroundColor = "#FAD4D8",
  WarningBackgroundColor = "#FFF1D1",
  HighlightBackgroundColor = "#FFF1D1",
  AddedBackgroundColor = "#C5E5CC",
  DisabledBackgroundColor = "#F7F8FA",
  DisabledSelectedBackgroundColor = "#EBECF0",
  ButtonDangerActiveColor = "#FAD4D8",
  ButtonPrimaryBackgroundColor = "#3574F0",
  RemovedSubtleBackgroundColor = "#FFF7F7",
  WarningSubtleBackgroundColor = "#FFFAEB",
  HighlightSubtleBackgroundColor = "#FFF6DE",
  AddedSubtleBackgroundColor = "#F2FCF3",
}

export interface ColorPaletteItem {
  fg: string;
  bg: string;
}

/* Colors from https://www.jetbrains.com/help/youtrack/devportal/Color-Indices.html */
export const COLOR_PALETTE: ColorPaletteItem[] = [
  /* 0 */ { fg: "#444", bg: "#fff" },
  /* 1 */ { fg: "#fff", bg: "#8d5100" },
  /* 2 */ { fg: "#fff", bg: "#ce6700" },
  /* 3 */ { fg: "#fff", bg: "#409600" },
  /* 4 */ { fg: "#fff", bg: "#0070e4" },
  /* 5 */ { fg: "#fff", bg: "#900052" },
  /* 6 */ { fg: "#fff", bg: "#0050a1" },
  /* 7 */ { fg: "#fff", bg: "#2f9890" },
  /* 8 */ { fg: "#fff", bg: "#8e1600" },
  /* 9 */ { fg: "#fff", bg: "#dc0083" },
  /* 10 */ { fg: "#fff", bg: "#7dbd36" },
  /* 11 */ { fg: "#fff", bg: "#ff7123" },
  /* 12 */ { fg: "#fff", bg: "#ff7bc3" },
  /* 13 */ { fg: "#444", bg: "#fed74a" },
  /* 14 */ { fg: "#444", bg: "#b7e281" },
  /* 15 */ { fg: "#45818e", bg: "#d8f7f3" },
  /* 16 */ { fg: "#888", bg: "#e6e6e6" },
  /* 17 */ { fg: "#4da400", bg: "#e6f6cf" },
  /* 18 */ { fg: "#b45f06", bg: "#ffee9c" },
  /* 19 */ { fg: "#444", bg: "#ffc8ea" },
  /* 20 */ { fg: "#fff", bg: "#e30000" },
  /* 21 */ { fg: "#3d85c6", bg: "#e0f1fb" },
  /* 22 */ { fg: "#dc5766", bg: "#fce5f1" },
  /* 23 */ { fg: "#b45f06", bg: "#f7e9c1" },
  /* 24 */ { fg: "#444", bg: "#92e1d5" },
  /* 25 */ { fg: "#444", bg: "#a6e0fc" },
  /* 26 */ { fg: "#444", bg: "#e0c378" },
  /* 27 */ { fg: "#444", bg: "#bababa" },
  /* 28 */ { fg: "#fff", bg: "#25beb2" },
  /* 29 */ { fg: "#fff", bg: "#42a3df" },
  /* 30 */ { fg: "#fff", bg: "#878787" },
  /* 31 */ { fg: "#fff", bg: "#4d4d4d" },
  /* 32 */ { fg: "#fff", bg: "#246512" },
  /* 33 */ { fg: "#fff", bg: "#00665e" },
  /* 34 */ { fg: "#fff", bg: "#553000" },
  /* 35 */ { fg: "#fff", bg: "#1a1a1a" },
];

export const hexToRgb = (color: string): [number, number, number] | undefined => {
  const hexColor = color.trim().replace("#", "");
  if (hexColor.length === 6) {
    const r = parseInt(hexColor.substring(0, 2), 16);
    const g = parseInt(hexColor.substring(2, 4), 16);
    const b = parseInt(hexColor.substring(4), 16);
    return [r, g, b];
  } else if (hexColor.length === 3) {
    const r = parseInt(hexColor.substring(0, 1), 16) * 16;
    const g = parseInt(hexColor.substring(1, 2), 16) * 16;
    const b = parseInt(hexColor.substring(2), 16) * 16;
    return [r, g, b];
  }
  return undefined;
};

export const rgbToHex = (rgb: Array<number>): string => {
  return "#" + rgb.map((x) => x.toString(16).padStart(2, "0")).join("");
};
