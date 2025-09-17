import React, { createContext, useContext, useEffect, useState } from "react";

interface ThemeContextType {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<"light" | "dark">(localStorage.getItem("theme") as "light" | "dark" || "light");

  useEffect(() => {
    localStorage.setItem("theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.style.backgroundColor = "#000";
      document.documentElement.style.color = "#fff";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.backgroundColor = "#fff";
      document.documentElement.style.color = "#000";
    }
  }, [theme]);

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
