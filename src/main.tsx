import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <>
    <Toaster position="top-center" expand={true} richColors closeButton />
    <App />
  </>
);
