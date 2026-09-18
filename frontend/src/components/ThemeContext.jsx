import React, {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
} from "react";

/* eslint-disable react-refresh/only-export-components -- context and hook are intentionally colocated */

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem("darkMode") === "true";
    } catch {
      return false;
    }
  });

  useLayoutEffect(() => {
    try {
      localStorage.setItem("darkMode", String(darkMode));
    } catch {
      // The selected theme still works when storage is unavailable.
    }
    const root = document.documentElement;
    root.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((current) => !current);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
