/*
 * Класс UIController — связывает интерфейс с логикой приложения.
 * Настраивает слушатели событий для кнопок и полей ввода.
 */
export class UIController {
  /*
   * @param {Object} params — набор обработчиков и элементов
   */
  constructor({
    linkerObj,
    onStart,
    onReset,
    onFill,
    onChangeParams,
    onToggleTheme,
  }) {
    // Привязка кнопок к действиям
    if (linkerObj.start) linkerObj.start.addEventListener("click", onStart);
    if (linkerObj.reset) linkerObj.reset.addEventListener("click", onReset);
    if (linkerObj.fill) linkerObj.fill.addEventListener("click", onFill);

    // Обработка изменений параметров модели
    ["rule", "size", "pattern"].forEach((id) => {
      if (linkerObj[id]) linkerObj[id].addEventListener("change", onChangeParams);
    });

    // Переключатель темы
    if (linkerObj.theme) linkerObj.theme.addEventListener("click", onToggleTheme);
  }
}
