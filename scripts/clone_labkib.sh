#!/bin/bash

# Скрипт для клонирования лабораторных работ по кибернетике из GitVerse
# 
# Запуск: ./scripts/clone_labkib.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
EXTERNAL_LABS_DIR="$PROJECT_DIR/external_labs"

mkdir -p "$EXTERNAL_LABS_DIR"
cd "$EXTERNAL_LABS_DIR"

echo "=== Клонирование лабораторных работ по кибернетике из GitVerse ==="
echo "Директория: $EXTERNAL_LABS_DIR"
echo ""

# Список репозиториев (формат: repo|section|lab_id|название)
REPOS=(
    # Основные понятия кибернетики
    "PetrLebedev/KiTS_LABA|basic_concepts|kits_laba|KiTS LABA"
    
    # Моделирование систем
    "softingartence/FlowInventoryModeling|modeling|flow_inventory|Моделирование потоков и запасов"
    
    # Автоматизация процессов
    "IastrebovVladimir/State_machine_and_process_automation|automation|state_machine|Конечные автоматы и автоматизация"
    
    # Основы кибернетики
    "iyizqqa/cybernetics|basic_concepts|cybernetics_basics|Основы кибернетики"
    
    # Лабораторные работы
    "vibecoder/Laba_Kiba|basic_concepts|laba_kiba|Лаба Киба"
    
    # Системный анализ
    "nfsxw/Lab_Kib_system_analysis|analysis|system_analysis|Системный анализ"
    
    # Лаборатория кибернетики
    "jabaclaw4/LaboratoryOfCybernetics|basic_concepts|lab_cybernetics|Лаборатория кибернетики"
    
    # Распределённые системы
    "a-romash/CST_MEPhI_distributed_systems|distributed|distributed_systems|Распределённые системы"
)

SUCCESS=0
FAILED=0
FAILED_REPOS=""

clone_repo() {
    local repo="$1"
    local repo_name=$(basename "$repo")
    
    # Удаляем если частично склонирован
    rm -rf "$repo_name"
    
    # Пробуем SSH
    if git clone "ssh://git@gitverse.ru:2222/$repo" 2>/dev/null; then
        return 0
    fi
    
    # Пробуем HTTPS без авторизации
    if GIT_TERMINAL_PROMPT=0 git clone "https://gitverse.ru/$repo.git" 2>/dev/null; then
        return 0
    fi
    
    return 1
}

for entry in "${REPOS[@]}"; do
    IFS='|' read -r repo section lab_id name <<< "$entry"
    
    repo_name=$(basename "$repo")
    
    echo "----------------------------------------"
    echo "📦 $name"
    echo "   Репозиторий: $repo"
    echo "   Раздел: $section / $lab_id"
    
    if [ -d "$repo_name" ] && [ -d "$repo_name/.git" ]; then
        echo "   ⏭️  Уже существует, пропускаем..."
        
        # Создаём метаданные если нет
        if [ ! -f "$repo_name/.labkib_metadata" ]; then
            cat > "$repo_name/.labkib_metadata" << EOF
SECTION=$section
LAB_ID=$lab_id
NAME=$name
REPO=$repo
MODULE=labkib
EOF
        fi
        
        ((SUCCESS++))
        continue
    fi
    
    echo "   ⬇️  Клонирование..."
    
    if clone_repo "$repo"; then
        echo "   ✅ Успешно!"
        ((SUCCESS++))
        
        cat > "$repo_name/.labkib_metadata" << EOF
SECTION=$section
LAB_ID=$lab_id
NAME=$name
REPO=$repo
MODULE=labkib
EOF
    else
        echo "   ❌ Не удалось"
        ((FAILED++))
        FAILED_REPOS="$FAILED_REPOS\n   - $name: https://gitverse.ru/$repo"
    fi
done

echo ""
echo "========================================"
echo "📊 Итоги:"
echo "   ✅ Успешно: $SUCCESS"
echo "   ❌ Ошибки: $FAILED"
echo "========================================"

if [ $FAILED -gt 0 ]; then
    echo ""
    echo "⚠️  Не удалось клонировать:"
    echo -e "$FAILED_REPOS"
    echo ""
    echo "Склонируйте вручную проблемные репозитории:"
    echo "   cd external_labs"
    echo "   git clone https://gitverse.ru/USER/REPO.git"
    echo "   (введите логин/пароль GitVerse)"
fi

echo ""
echo "📁 Репозитории: $EXTERNAL_LABS_DIR"
echo ""
echo "🔧 Следующий шаг: python3 scripts/analyze_labkib.py"

