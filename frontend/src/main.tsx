import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import AuthGate from "./app/auth/AuthGate";
import "./styles/index.css";
createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem><AuthGate /></ThemeProvider>
);
