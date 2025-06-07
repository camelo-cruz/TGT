import { useEffect } from "react";

const ONE_DRIVE_POPUP_URL = "/auth/start";
const TOKEN_KEY = "access_token";

function useOneDriveAuth(
  isConnected: boolean,
  setIsConnected: (v: boolean) => void,
  addLog: (m: string, t?: any) => void
) {
  // on mount: apply stored token
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      setIsConnected(true);
      addLog("Restored OneDrive token", "success");
    }
  }, [setIsConnected, addLog]);

  // listen for popup->storage inject
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY && e.newValue) {
        localStorage.setItem(TOKEN_KEY, e.newValue);
        setIsConnected(true);
        addLog("OneDrive connected!", "success");
        localStorage.removeItem(TOKEN_KEY);  // cleanup
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [setIsConnected, addLog]);

  const connect = () => {
    addLog("Opening OneDrive auth…");
    window.open(ONE_DRIVE_POPUP_URL, "authPopup", "width=600,height=700");
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setIsConnected(false);
    addLog("Logged out of OneDrive", "info");
  };

  const getToken = () => localStorage.getItem(TOKEN_KEY);

  return { connect, logout, getToken };
}
