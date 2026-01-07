#!/bin/bash

# Упрощённый скрипт интеграции для static HTML проектов
# Для сложных проектов (React/Vue/Python) требуется ручная работа
#
# Запуск: ./scripts/integrate_labs.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
EXTERNAL_LABS_DIR="$PROJECT_DIR/external_labs"
TEMPLATES_DIR="$PROJECT_DIR/aiaex/templates/labs"
STATIC_DIR="$PROJECT_DIR/static/labs"

echo "=== Интеграция лабораторных работ ==="
echo ""

if [ ! -d "$EXTERNAL_LABS_DIR" ]; then
    echo "❌ Директория external_labs не найдена!"
    echo "   Сначала запустите: ./scripts/clone_labs.sh"
    exit 1
fi

# Сначала анализируем
echo "📊 Запуск анализа..."
python3 "$SCRIPT_DIR/analyze_labs.py"
echo ""

echo "========================================"
echo "🔧 ИНТЕГРАЦИЯ СТАТИЧЕСКИХ ПРОЕКТОВ"
echo "========================================"
echo ""

INTEGRATED=0
SKIPPED=0

for repo_dir in "$EXTERNAL_LABS_DIR"/*/; do
    repo_name=$(basename "$repo_dir")
    metadata_file="$repo_dir/.lab_metadata"
    
    if [ ! -f "$metadata_file" ]; then
        echo "⏭️  Пропускаем $repo_name (нет метаданных)"
        ((SKIPPED++))
        continue
    fi
    
    # Читаем метаданные
    source "$metadata_file"
    
    # Проверяем что это статический проект
    if [ -f "$repo_dir/package.json" ]; then
        echo "⏭️  $NAME - Node.js проект (требуется сборка)"
        ((SKIPPED++))
        continue
    fi
    
    if [ -f "$repo_dir/requirements.txt" ] || [ -f "$repo_dir/app.py" ]; then
        echo "⏭️  $NAME - Python проект (требуется адаптация)"
        ((SKIPPED++))
        continue
    fi
    
    # Ищем index.html
    main_html=""
    for candidate in "index.html" "public/index.html" "src/index.html"; do
        if [ -f "$repo_dir/$candidate" ]; then
            main_html="$repo_dir/$candidate"
            break
        fi
    done
    
    if [ -z "$main_html" ]; then
        # Ищем любой HTML в корне
        main_html=$(find "$repo_dir" -maxdepth 1 -name "*.html" -type f | head -1)
    fi
    
    if [ -z "$main_html" ]; then
        echo "⏭️  $NAME - HTML не найден"
        ((SKIPPED++))
        continue
    fi
    
    echo "📦 Интеграция: $NAME"
    
    # Создаём директории
    template_dest="$TEMPLATES_DIR/$SECTION/$LAB_ID"
    static_dest="$STATIC_DIR/$SECTION/$LAB_ID"
    
    mkdir -p "$template_dest"
    mkdir -p "$static_dest"
    
    # Копируем HTML как есть (без обёртки Django - для iframe)
    cp "$main_html" "$template_dest/original.html"
    
    # Копируем все JS и CSS файлы
    find "$repo_dir" -maxdepth 2 \( -name "*.js" -o -name "*.css" \) -type f | while read file; do
        # Пропускаем node_modules
        if [[ "$file" == *"node_modules"* ]]; then
            continue
        fi
        cp "$file" "$static_dest/" 2>/dev/null || true
    done
    
    # Создаём Django шаблон с iframe
    cat > "$template_dest/index.html" << 'DJANGO_TEMPLATE'
{% extends "labs/lab_base.html" %}
{% load static %}

{% block lab_styles %}
<style>
    .lab-iframe-container {
        width: 100%;
        height: 85vh;
        border-radius: 12px;
        overflow: hidden;
        background: #fff;
    }
    .lab-iframe-container iframe {
        width: 100%;
        height: 100%;
        border: none;
    }
    .lab-direct-link {
        display: inline-block;
        margin-bottom: 1rem;
        color: var(--accent-light);
        text-decoration: none;
    }
    .lab-direct-link:hover {
        text-decoration: underline;
    }
</style>
{% endblock %}

{% block lab_content %}
<a href="original.html" target="_blank" class="lab-direct-link">
    Открыть в новой вкладке ↗
</a>
<div class="lab-iframe-container">
    <iframe src="original.html" title="Лабораторная работа"></iframe>
</div>
{% endblock %}
DJANGO_TEMPLATE

    echo "   ✅ Скопировано"
    ((INTEGRATED++))
done

echo ""
echo "========================================"
echo "📊 Итоги:"
echo "   ✅ Интегрировано: $INTEGRATED"
echo "   ⏭️  Пропущено: $SKIPPED"
echo "========================================"
echo ""
echo "📝 Для пропущенных проектов требуется ручная интеграция:"
echo "   1. Node.js: npm install && npm run build, затем скопировать dist/"
echo "   2. Python: извлечь HTML/JS часть вручную"
echo ""
echo "🌐 Запустите сервер: python3 manage.py runserver"
