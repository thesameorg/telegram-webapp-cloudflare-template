import { useEffect } from "react";
import { useTelegram } from "./utils/telegram";
import Router from "./Router";
import { ToastProvider } from "./hooks/use-toast";
import { AuthProvider } from "./contexts/AuthContext";
import "./index.css";

function App() {
  const { webApp, isWebAppReady } = useTelegram();

  useEffect(() => {
    if (isWebAppReady && webApp) {
      document.body.style.backgroundColor = webApp.backgroundColor;
      document.body.style.color = webApp.themeParams.text_color || "#000000";

      if (webApp.colorScheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [webApp, isWebAppReady]);

  return (
    <AuthProvider>
      <ToastProvider>
        <div className="App min-h-screen">
          <Router />
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
