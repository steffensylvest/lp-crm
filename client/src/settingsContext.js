import React from "react";

export const SettingsContext = React.createContext({
  settings: {},
  mode: "dark",
  setSettings: () => {},
});

export const useSettings = () => React.useContext(SettingsContext);
