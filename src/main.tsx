import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Service Worker is now auto-registered by vite-plugin-pwa
createRoot(document.getElementById("root")!).render(<App />);

