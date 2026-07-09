import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  const [amoledMode, setAmoledMode] = useState(() => {
    return localStorage.getItem("amoled") === "true";
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      
      if (amoledMode) {
        document.documentElement.classList.add("amoled");
        localStorage.setItem("amoled", "true");
      } else {
        document.documentElement.classList.remove("amoled");
        localStorage.setItem("amoled", "false");
      }
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.remove("amoled");
      localStorage.setItem("theme", "light");
      localStorage.setItem("amoled", "false");
    }
  }, [darkMode, amoledMode]);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const toggleAmoledMode = () => {
    setAmoledMode(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, amoledMode, toggleAmoledMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
