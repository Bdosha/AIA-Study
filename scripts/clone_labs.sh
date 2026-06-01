#!/bin/bash

# Скрипт для клонирования лабораторных работ из GitVerse
# 
# Запуск: ./scripts/clone_labs.sh
#
# Для приватных репозиториев SSH ключ должен быть добавлен в GitVerse

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
EXTERNAL_LABS_DIR="$PROJECT_DIR/external_labs"

mkdir -p "$EXTERNAL_LABS_DIR"
cd "$EXTERNAL_LABS_DIR"

echo "=== Клонирование лабораторных работ из GitVerse ==="
echo "Директория: $EXTERNAL_LABS_DIR"
echo ""

# Список репозиториев (формат: repo|section|lab_id|название)
REPOS=(
    # Конечные автоматы
    "GorSerGitVerse/DM3_Automaton_System|finite_automata|smart_automata|Умная система автоматов"
    "mynill/NFA-simulator|finite_automata|nfa_simulator|Симулятор НКА"
    "nik_yak/Minimization_of_deterministic_finite_state_machines|finite_automata|dfa_minimization|Минимизация ДКА"
    "kemarrik/NFA_to_DFA|finite_automata|nfa_to_dfa|НКА в ДКА"
    "pavka2006/Moore_machine_lab|finite_automata|moore_machine|Автомат Мура"
    "vechnoilive/DM3_Mealy_simulator|finite_automata|mealy_machine|Автомат Мили"
    "annabasalyga/Probabilistic_automaton|finite_automata|probabilistic_automata|Вероятностные автоматы"
    
    # Клеточные и графовые
    "vla9ick/Lab_Auto_Pseudorandomness|cellular_graph|prng_eca|ГПСЧ на ЭКлА"
    "rotnite/brian_brain|cellular_graph|brian_brain|Мозг Брайана"
    "FoxErLis/Laba_DM-3|cellular_graph|codi_automata|КА CoDi"
    "FlynnTaggart075/cellular_automaton_on_triangular_lattices|cellular_graph|triangular_ca|КА на треугольниках"
    "VoidSetup/DM-3-hexagonal-life-like-cellular-automata|cellular_graph|hexagonal_ca|Гексагональные КА"
    "lulema/Simulation_of_reversible_cellular_automata|cellular_graph|reversible_ca|Обратимые КА"
    "winkey86/Turmites_and_Langtons_ants|cellular_graph|turmites|Турмиты"
    "alexware/graph-automata|cellular_graph|graph_automata|Граф-автоматы"
    "expertdaniil/graph-automata-simulator|cellular_graph|dynamic_graph|Динамические граф-автоматы"
    
    # Машины Тьюринга
    "bbluebberry/Multitape_Turing_machine|turing_machines|multitape_tm|Многоленточная МТ"
    "CodeByKate/UniversalTuringMachineSimulator|turing_machines|universal_tm|Универсальная МТ"
    "efedorovskaa67/RAM|turing_machines|ram_machine|RAM-машина"
    "LevoniaSolo/ThePostMachine|turing_machines|post_machine|Машина Поста"
    "Valeria14/KvantMachineTuring|turing_machines|quantum_tm|Квантовая МТ"
    "lollyk-pollyk/Non-deterministic_Turing_machine|turing_machines|nondeterministic_tm|Недетерминированная МТ"
    "ivan-yakovl/Automats_Lab_1|turing_machines|zeno_machine|Машина Зенона"
    
    # Формальные системы
    "Grishiset/MarkovsAlgorythms|formal_systems|markov_algorithms|Алгорифмы Маркова"
    "Kolyan4ikBasalyga/Recursive_Godel_functions|formal_systems|godel_functions|Функции Гёделя"
    "slavatlsn/PetNet|formal_systems|petri_nets|Сети Петри"
    "SMoorphic/billiard-computer|formal_systems|billiard_computer|Бильярдный компьютер"
    
    # Интеллектуальные системы
    "German229/Quantum_simulator|intelligent_systems|quantum_computing|Квантовые вычисления"
    "Mihiil/Artificial_life|intelligent_systems|artificial_life|Искусственная жизнь"
    "ulupapi/Neural_Turing_Machine|intelligent_systems|neural_tm|Нейронная МТ"
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
        if [ ! -f "$repo_name/.lab_metadata" ]; then
            cat > "$repo_name/.lab_metadata" << EOF
SECTION=$section
LAB_ID=$lab_id
NAME=$name
REPO=$repo
EOF
        fi
        
        ((SUCCESS++))
        continue
    fi
    
    echo "   ⬇️  Клонирование..."
    
    if clone_repo "$repo"; then
        echo "   ✅ Успешно!"
        ((SUCCESS++))
        
        cat > "$repo_name/.lab_metadata" << EOF
SECTION=$section
LAB_ID=$lab_id
NAME=$name
REPO=$repo
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
echo "🔧 Следующий шаг: python3 scripts/analyze_labs.py"
