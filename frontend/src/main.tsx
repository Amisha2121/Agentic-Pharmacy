
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  
  // Import debug utility for development
  import './app/utils/debugAuth';

  createRoot(document.getElementById("root")!).render(<App />);
  