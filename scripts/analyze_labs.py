#!/usr/bin/env python3
"""
Скрипт для анализа структуры клонированных лабораторных работ.
Определяет тип проекта и файлы для интеграции.

Запуск: python3 scripts/analyze_labs.py
"""

import os
import json
from pathlib import Path
from collections import defaultdict

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
EXTERNAL_LABS_DIR = PROJECT_DIR / "external_labs"
TEMPLATES_DIR = PROJECT_DIR / "aiaex" / "templates" / "labs"
STATIC_DIR = PROJECT_DIR / "static" / "labs"


def detect_project_type(repo_path: Path) -> dict:
    """Определяет тип проекта по файлам"""
    
    result = {
        "type": "unknown",
        "framework": None,
        "entry_points": [],
        "static_files": {"js": [], "css": [], "assets": []},
        "has_backend": False,
        "notes": []
    }
    
    files = list(repo_path.rglob("*"))
    file_names = [f.name for f in files if f.is_file()]
    
    # Определяем фреймворк/тип
    if "package.json" in file_names:
        pkg_path = repo_path / "package.json"
        if pkg_path.exists():
            try:
                pkg = json.loads(pkg_path.read_text())
                deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
                
                if "react" in deps:
                    result["type"] = "react"
                    result["framework"] = "React"
                elif "vue" in deps:
                    result["type"] = "vue"
                    result["framework"] = "Vue"
                elif "svelte" in deps:
                    result["type"] = "svelte"
                    result["framework"] = "Svelte"
                else:
                    result["type"] = "node"
                    result["framework"] = "Node.js"
                    
                result["notes"].append("Требуется npm install && npm run build")
            except:
                pass
    
    if "requirements.txt" in file_names or "app.py" in file_names or "main.py" in file_names:
        result["has_backend"] = True
        
        if "app.py" in file_names:
            result["notes"].append("Flask приложение - нужна адаптация")
        if "main.py" in file_names:
            result["notes"].append("Python backend - нужна адаптация")
    
    # Ищем HTML файлы
    html_files = [f for f in files if f.suffix == ".html" and f.is_file()]
    for html in html_files:
        rel_path = html.relative_to(repo_path)
        # Пропускаем node_modules и подобное
        if "node_modules" in str(rel_path) or ".git" in str(rel_path):
            continue
        result["entry_points"].append(str(rel_path))
    
    # Приоритет для index.html
    result["entry_points"].sort(key=lambda x: (
        0 if x == "index.html" else
        1 if "index.html" in x else
        2 if "main.html" in x else
        3
    ))
    
    # Ищем JS файлы
    for f in files:
        if not f.is_file():
            continue
        rel_path = str(f.relative_to(repo_path))
        if "node_modules" in rel_path or ".git" in rel_path:
            continue
            
        if f.suffix == ".js":
            result["static_files"]["js"].append(rel_path)
        elif f.suffix == ".css":
            result["static_files"]["css"].append(rel_path)
        elif f.suffix in [".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico"]:
            result["static_files"]["assets"].append(rel_path)
    
    # Определяем тип если ещё не определён
    if result["type"] == "unknown":
        if html_files and not result["has_backend"]:
            result["type"] = "static_html"
            result["framework"] = "Plain HTML/JS/CSS"
        elif result["has_backend"]:
            result["type"] = "python_app"
            result["framework"] = "Python"
    
    return result


def analyze_all_repos():
    """Анализирует все клонированные репозитории"""
    
    if not EXTERNAL_LABS_DIR.exists():
        print("❌ Директория external_labs не найдена!")
        print("   Сначала запустите: ./scripts/clone_labs.sh")
        return
    
    repos = [d for d in EXTERNAL_LABS_DIR.iterdir() if d.is_dir() and not d.name.startswith(".")]
    
    if not repos:
        print("❌ Репозитории не найдены!")
        return
    
    print("=" * 60)
    print("📊 АНАЛИЗ ЛАБОРАТОРНЫХ РАБОТ")
    print("=" * 60)
    print()
    
    summary = defaultdict(list)
    report = []
    
    for repo_path in sorted(repos):
        metadata_file = repo_path / ".lab_metadata"
        
        # Читаем метаданные если есть
        metadata = {}
        if metadata_file.exists():
            for line in metadata_file.read_text().strip().split("\n"):
                if "=" in line:
                    key, value = line.split("=", 1)
                    metadata[key] = value
        
        analysis = detect_project_type(repo_path)
        
        section = metadata.get("SECTION", "unknown")
        lab_id = metadata.get("LAB_ID", repo_path.name)
        name = metadata.get("NAME", repo_path.name)
        
        summary[analysis["type"]].append(name)
        
        print(f"📦 {name}")
        print(f"   📁 {repo_path.name}")
        print(f"   🏷️  Раздел: {section}/{lab_id}")
        print(f"   🔧 Тип: {analysis['framework'] or analysis['type']}")
        
        if analysis["entry_points"]:
            print(f"   📄 Entry: {analysis['entry_points'][0]}")
        
        if analysis["notes"]:
            for note in analysis["notes"]:
                print(f"   ⚠️  {note}")
        
        js_count = len(analysis["static_files"]["js"])
        css_count = len(analysis["static_files"]["css"])
        print(f"   📊 Файлы: {len(analysis['entry_points'])} HTML, {js_count} JS, {css_count} CSS")
        
        # Определяем сложность интеграции
        if analysis["type"] == "static_html" and not analysis["has_backend"]:
            complexity = "🟢 Простая"
        elif analysis["type"] in ["react", "vue", "svelte"]:
            complexity = "🟡 Средняя (требуется сборка)"
        else:
            complexity = "🔴 Сложная (требуется адаптация)"
        
        print(f"   🎯 Интеграция: {complexity}")
        print()
        
        report.append({
            "name": name,
            "repo": repo_path.name,
            "section": section,
            "lab_id": lab_id,
            "analysis": analysis
        })
    
    # Сохраняем отчёт
    report_path = SCRIPT_DIR / "labs_analysis_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    print("=" * 60)
    print("📈 СВОДКА ПО ТИПАМ:")
    print("=" * 60)
    for proj_type, labs in summary.items():
        print(f"\n{proj_type}: {len(labs)} лаб")
        for lab in labs:
            print(f"   - {lab}")
    
    print()
    print(f"📝 Детальный отчёт сохранён: {report_path}")
    print()
    print("=" * 60)
    print("📋 РЕКОМЕНДАЦИИ ПО ИНТЕГРАЦИИ:")
    print("=" * 60)
    print("""
🟢 static_html - Простая интеграция:
   1. Скопировать HTML в templates/labs/{section}/{lab}/
   2. Скопировать JS/CSS в static/labs/{section}/{lab}/
   3. Обновить пути к статике в HTML

🟡 react/vue/node - Средняя сложность:
   1. cd external_labs/{repo} && npm install && npm run build
   2. Скопировать содержимое dist/ или build/
   3. Адаптировать пути

🔴 python_app - Требуется адаптация:
   1. Изучить структуру приложения
   2. Извлечь фронтенд-часть
   3. Возможно интегрировать как iframe или переписать
""")


if __name__ == "__main__":
    analyze_all_repos()

