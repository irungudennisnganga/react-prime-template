import { createSlice } from "@reduxjs/toolkit";

const THEME_KEY = "app_theme";

type ThemeMode = "light" | "dark";

type ThemeState = {
  mode: ThemeMode;
};

const initialState: ThemeState = {
  mode: (localStorage.getItem(THEME_KEY) as ThemeMode) || "light",
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === "light" ? "dark" : "light";
      localStorage.setItem(THEME_KEY, state.mode);
    },

    setTheme: (state, action: { payload: ThemeMode }) => {
      state.mode = action.payload;
      localStorage.setItem(THEME_KEY, state.mode);
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;