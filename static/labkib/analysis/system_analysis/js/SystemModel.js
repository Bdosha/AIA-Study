/**
 * Класс для представления неизвестного космического объекта как системы подсистем.
 */
class SystemModel {
  /**
   * Создаёт экземпляр системы на основе конфигурации.
   * @param {Object} config — объект конфигурации с полями name, subsystems, links, criticalNodes
   */
  constructor(config) {
    this.name = config.name;
    this.subsystems = [...config.subsystems];
    this.links = [...config.links];
    this.initialSubsystemsCount = this.subsystems.length;
    this.initialLinksCount = this.links.length;
    this.stability = 100;
    this.criticalNodes = [...config.criticalNodes];
    this.disabledCriticalNodes = [];
    this.initialFeedbackSubsystemsCount = this.subsystems.filter(s => s.feedback).length;
  }

  /**
   * Возвращает параметры подсистемы по её ID.
   * @param {string} id — уникальный идентификатор подсистемы
   * @returns {Object|null}
   */
  getSubsystem(id) {
    return this.subsystems.find(s => s.id === id) || null;
  }

  /**
   * Возвращает все связи, связанные с подсистемой (входящие и исходящие).
   * @param {string} id
   * @returns {Array}
   */
  getConnections(id) {
    return this.links.filter(link => link.from === id || link.to === id);
  }

  /**
   * Имитирует отказ подсистемы: удаляет её и все связанные связи,
   * пересчитывает устойчивость с учётом обратной связи и критичности.
   * @param {string} id
   * @returns {Object} {newStability, lostConnections, isolatedSubsystems}
   */
  simulateFailure(id) {
    const failed = this.getSubsystem(id);
    if (!failed) return null;

    const wasCritical = this.criticalNodes.includes(id);

    // Удаляем подсистему и её связи
    this.subsystems = this.subsystems.filter(s => s.id !== id);
    const linksBeforeRemoval = this.links.length;
    this.links = this.links.filter(link => link.from !== id && link.to !== id);
    const lostFromThisStep = linksBeforeRemoval - this.links.length;

    if (wasCritical) {
      this.disabledCriticalNodes.push(id);
    }

    // Расчёт устойчивости
    const currentSubsystemsCount = this.subsystems.length;
    const currentLinksCount = this.links.length;
    const currentFeedbackSubsystemsCount = this.subsystems.filter(s => s.feedback).length;
    const currentCriticalNodesCount = this.criticalNodes.filter(id => this.subsystems.some(s => s.id === id)).length;

    if (currentSubsystemsCount === 0) {
      this.stability = 0;
      return { newStability: 0, lostConnections: lostFromThisStep, isolatedSubsystems: [id] };
    }

    const linkRatio = this.initialLinksCount > 0 ? currentLinksCount / this.initialLinksCount : 0;
    const subsystemRatio = this.initialSubsystemsCount > 0 ? currentSubsystemsCount / this.initialSubsystemsCount : 0;
    const feedbackPreservationRatio = this.initialFeedbackSubsystemsCount > 0 ? currentFeedbackSubsystemsCount / this.initialFeedbackSubsystemsCount : 0;
    const criticalPreservationRatio = this.criticalNodes.length > 0 ? currentCriticalNodesCount / this.criticalNodes.length : 0;

    // Устойчивость = среднее арифметическое нормализованных коэффициентов
    const stabilityScore = (linkRatio + subsystemRatio + feedbackPreservationRatio + criticalPreservationRatio) / 4;
    this.stability = Math.max(0, Math.min(100, Math.round(100 * stabilityScore)));

    // Поиск изолированных подсистем
    const connectedIds = new Set();
    this.links.forEach(link => {
      connectedIds.add(link.from);
      connectedIds.add(link.to);
    });
    const isolated = this.subsystems.filter(s => !connectedIds.has(s.id));

    return {
      newStability: this.stability,
      lostConnections: lostFromThisStep,
      isolatedSubsystems: isolated.map(s => s.id)
    };
  }

  /**
   * Проверяет, все ли критичные узлы отключены.
   * @returns {boolean}
   */
  areAllCriticalNodesDisabled() {
    return this.disabledCriticalNodes.length === this.criticalNodes.length;
  }

  /**
   * Восстанавливает исходное состояние системы (для сброса сценария).
   * @param {Object} fullConfig
   */
  reset(fullConfig) {
    this.subsystems = [...fullConfig.subsystems];
    this.links = [...fullConfig.links];
    this.stability = 100;
    this.disabledCriticalNodes = [];
    this.initialFeedbackSubsystemsCount = this.subsystems.filter(s => s.feedback).length;
  }
}