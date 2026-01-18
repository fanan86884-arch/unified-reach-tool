import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerAppServiceWorker } from "./utils/registerServiceWorker";

registerAppServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);

