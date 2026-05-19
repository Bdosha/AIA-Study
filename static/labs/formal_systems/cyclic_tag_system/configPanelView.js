/**
 * @fileoverview Управляет панелью конфигурации (левая колонка).
 * Отвечает за чтение и применение настроек, а также за управление элементами формы.
 */
export default class ConfigPanelView {
    /**
     * @param {Object} domElements - Словарь с DOM-элементами панели конфигурации.
     */
    constructor(domElements) {
        this.dom = domElements;
    }

    /**
     * Собирает текущую конфигурацию из полей формы.
     * @returns {{initialString: string, productions: string[]}} Конфигурация.
     */
    getFormConfig() {
        const productions = [];
        this.dom.productionRulesContainer.querySelectorAll('.production-rule').forEach(ruleEl => {
            const output = ruleEl.querySelector('.rule-output')?.value || '';
            productions.push(output);
        });
        return {
            initialString: this.dom.initialString.value,
            productions,
        };
    }

    /**
     * Применяет объект конфигурации к полям формы.
     * @param {{initialString: string, productions: string[]}} config Объект конфигурации.
     */
    applyConfigToForm(config) {
        this.dom.initialString.value = config.initialString;
        this.dom.productionRulesContainer.innerHTML = '';
        config.productions.forEach(prod => {
            this.addProductionRuleRow(prod);
        });
    }
    
    /**
     * Обновляет текст в блоке описания пресета.
     * @param {string} text - Текст для отображения.
     */
    updatePresetDescription(text) {
        this.dom.presetDescription.textContent = text;
    }

    /**
     * Создает и добавляет новую строку для правила продукции в UI.
     * @param {string} [output=''] Продукция для нового правила.
     */
    addProductionRuleRow(output = '') {
        const ruleDiv = document.createElement('div');
        ruleDiv.className = 'production-rule';

        const outputInput = document.createElement('input');
        outputInput.type = 'text';
        outputInput.className = 'rule-output';
        outputInput.placeholder = 'Продукция (н-р, 011)';
        outputInput.value = output;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-rule-btn';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.ariaLabel = 'Удалить правило';
        deleteBtn.onclick = () => ruleDiv.remove();

        ruleDiv.append(outputInput, deleteBtn);
        this.dom.productionRulesContainer.append(ruleDiv);
    }
    
    /**
     * Блокирует или разблокирует все элементы управления на панели конфигурации.
     * @param {boolean} isDisabled - `true` для блокировки, `false` для разблокировки.
     */
    setDisabledState(isDisabled) {
        this.dom.presets.disabled = isDisabled;
        this.dom.initialString.disabled = isDisabled;
        // Кнопки для удаления правил также должны блокироваться
        this.dom.productionRulesContainer.querySelectorAll('input, button').forEach(i => i.disabled = isDisabled);
        this.dom.addRuleBtn.disabled = isDisabled;
        this.dom.importBtn.disabled = isDisabled;
        this.dom.exportBtn.disabled = isDisabled;
    }
}