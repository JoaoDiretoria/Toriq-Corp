import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Suprimir warnings do React Router e logs do Cloudflare Turnstile em produção
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args) => {
  const message = args[0]?.toString() || '';
  if (
    message.includes('React Router Future Flag Warning') ||
    message.includes('v7_startTransition') ||
    message.includes('v7_relativeSplatPath')
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

console.error = (...args) => {
  const message = args[0]?.toString() || '';
  if (
    message.includes('Cloudflare Turnstile') ||
    message.includes('Permissions-Policy') ||
    message.includes('browsing-topics') ||
    message.includes('interest-cohort')
  ) {
    return;
  }
  originalError.apply(console, args);
};

createRoot(document.getElementById("root")!).render(<App />);
