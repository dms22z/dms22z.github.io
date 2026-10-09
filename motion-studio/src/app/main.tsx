import React from "react";
import ReactDOM from "react-dom/client";
import { createTheme, MantineProvider, type MantineColorsTuple } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/notifications/styles.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/800.css";
import "./styles.css";
import { App } from "./App";

const vert: MantineColorsTuple = [
  "#ecfdf3", "#d1fadf", "#a6f4c5", "#6ce9a6", "#32d583",
  "#22c55e", "#16a34a", "#15803d", "#166534", "#14532d",
];

const theme = createTheme({
  primaryColor: "dark",
  colors: { vert },
  fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif",
  headings: { fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif", fontWeight: "800" },
  defaultRadius: "md",
  black: "#0A0A0A",
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider theme={theme} forceColorScheme="light">
      <Notifications position="bottom-right" />
      <App />
    </MantineProvider>
  </React.StrictMode>,
);
