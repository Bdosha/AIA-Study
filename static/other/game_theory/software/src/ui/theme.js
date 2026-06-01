(() => {
const STORAGE_KEY = "gtlab-theme";

class ThemeController {
  constructor(toggleButton, badgeElement = null) {
    this.toggleButton = toggleButton;
    this.badgeElement = badgeElement;
  }

  init() {
    const initialTheme = this.getSavedTheme() || "dark";
    this.applyTheme(initialTheme);

    this.toggleButton?.addEventListener("click", () => {
      const nextTheme = document.documentElement.getAttribute("data-theme") === "dark"
        ? "light"
        : "dark";
      this.applyTheme(nextTheme);
      this.saveTheme(nextTheme);
    });
  }

  applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "dark");

    if (this.toggleButton) {
      this.toggleButton.setAttribute("aria-pressed", String(theme === "light"));
      const label = theme === "light" ? "Светлая" : "Тёмная";
      this.toggleButton.title = `${label} тема`;
    }

    if (this.badgeElement) {
      this.badgeElement.textContent = theme === "light" ? "Светлая тема" : "Тёмная тема";
    }
  }

  getSavedTheme() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  saveTheme(theme) {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      // ignore
    }
  }
}

window.GTLabThemeController = ThemeController;
})();
