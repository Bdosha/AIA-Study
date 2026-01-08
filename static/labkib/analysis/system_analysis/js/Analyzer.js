class Analyzer {
  constructor(system) {
    this.system = system;
  }

  computeStability() {
    const totalLinks = this.system.links.length;
    const totalSubsystems = this.system.subsystems.length;

    const linkRatio = this.system.initialLinksCount > 0 ? totalLinks / this.system.initialLinksCount : 0;
    const subsystemRatio = this.system.initialSubsystemsCount > 0 ? totalSubsystems / this.system.initialSubsystemsCount : 0;

    return Math.round(100 * linkRatio * subsystemRatio);
  }

  findCriticalNodes() {
    const subsystemIdToConnections = new Map();
    this.system.links.forEach(link => {
      if (!subsystemIdToConnections.has(link.from)) {
        subsystemIdToConnections.set(link.from, []);
      }
      if (!subsystemIdToConnections.has(link.to)) {
        subsystemIdToConnections.set(link.to, []);
      }
      subsystemIdToConnections.get(link.from).push(link);
      subsystemIdToConnections.get(link.to).push(link);
    });

    let maxLostLinks = 0;
    const critical = [];

    for (const subsystem of this.system.subsystems) {
      const connections = subsystemIdToConnections.get(subsystem.id) || [];
      const lostCount = connections.length;

      if (lostCount > maxLostLinks) {
        maxLostLinks = lostCount;
        critical.length = 0;
        critical.push(subsystem.id);
      } else if (lostCount === maxLostLinks) {
        critical.push(subsystem.id);
      }
    }

    return critical;
  }

  generateSWOT() {
    const swot = {
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: []
    };

    if (this.system.links.length > 0) {
      swot.strengths.push("Есть связи между оставшимися подсистемами");
    }
    const autonomousSubsystems = this.system.subsystems.filter(s => this.system.getConnections(s.id).length === 0);
    if (autonomousSubsystems.length > 0) {
      swot.strengths.push(`Есть автономные подсистемы: ${autonomousSubsystems.map(s => s.name || s.id).join(', ')}`);
    }

    const criticalNodes = this.findCriticalNodes();
    if (criticalNodes.length > 0) {
      swot.weaknesses.push(`Зависимость от критичных узлов: ${criticalNodes.map(id => {
        const sub = this.system.subsystems.find(s => s.id === id);
        return sub ? (sub.name || sub.id) : id;
      }).join(', ')}`);
    }
    const noFeedbackSubsystems = this.system.subsystems.filter(s => !s.feedback);
    if (noFeedbackSubsystems.length > 0) {
      swot.weaknesses.push("Нет обратной связи в некоторых подсистемах");
    }

    if (this.system.name.includes("Пассивный")) {
      swot.opportunities.push("Пассивность позволяет безопасно изучать");
    }
    if (this.system.areAllCriticalNodesDisabled()) {
      swot.opportunities.push("Все критичные узлы отключены");
    }

    if (this.system.name.includes("Агрессивный")) {
      swot.threats.push("Агрессивная реакция");
    }
    if (this.system.stability < 50) {
      swot.threats.push("Низкая устойчивость");
    }
    const isolatedCount = this.system.subsystems.filter(s => this.system.getConnections(s.id).length === 0).length;
    if (isolatedCount > this.system.subsystems.length * 0.5) {
      swot.threats.push("Много изолированных подсистем");
    }

    return swot;
  }

  generateRecommendations() {
    const recommendations = [];
    const criticalNodes = this.findCriticalNodes();
    const allCriticalDisabled = this.system.areAllCriticalNodesDisabled();

    // Приоритет №1: Защита критичных узлов
    if (criticalNodes.length > 0) {
      recommendations.push(`Не повреждать критичные узлы: ${criticalNodes.map(id => {
        const sub = this.system.subsystems.find(s => s.id === id);
        return sub ? (sub.name || sub.id) : id;
      }).join(', ')}.`);
    }

    // Если все критичные узлы уже отключены, объект безопасен для изоляции
    if (allCriticalDisabled) {
        recommendations.push("Объект может быть безопасно изолирован.");
        return recommendations;
    }

    // Если критичные узлы на месте, можно давать остальные рекомендации
    if (this.system.name.includes("Агрессивный")) {
      recommendations.push("Соблюдать дистанцию не менее 10 км.");
    }

    if (this.system.links.length > 0) {
      recommendations.push("Можно изучать отдельные подсистемы.");
    }

    return recommendations;
  }
}