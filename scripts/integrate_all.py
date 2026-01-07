#!/usr/bin/env python3
"""
Скрипт интеграции лабораторных работ в проект Django.
Копирует ВСЕ файлы лабы в static/labs/, сохраняя структуру.
"""

import os
import shutil
import json
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
EXTERNAL_LABS_DIR = PROJECT_DIR / "external_labs"
STATIC_LABS_DIR = PROJECT_DIR / "static" / "labs"

# Файлы и папки, которые не нужно копировать
EXCLUDE_PATTERNS = {
    '.git', '.gitignore', '.github', 'node_modules', '__pycache__',
    '.DS_Store', 'Thumbs.db', '.idea', '.vscode', '*.pyc',
    'package-lock.json', 'yarn.lock', '.lab_metadata',
    '*.pdf', '*.zip', '*.rar', '*.7z', '*.tar.gz'
}


def should_exclude(path: Path) -> bool:
    """Проверяет, нужно ли исключить файл/папку"""
    name = path.name
    
    for pattern in EXCLUDE_PATTERNS:
        if pattern.startswith('*'):
            if name.endswith(pattern[1:]):
                return True
        elif name == pattern:
            return True
    
    return False


def find_entry_html(repo_path: Path) -> Path | None:
    """Находит главный HTML файл"""
    
    # Приоритетный поиск
    candidates = [
        repo_path / "index.html",
        repo_path / "public" / "index.html",
        repo_path / "src" / "index.html",
        repo_path / "dist" / "index.html",
    ]
    
    for candidate in candidates:
        if candidate.exists():
            return candidate
    
    # Ищем index.html в поддиректориях (глубина 2)
    for html in repo_path.glob("*/index.html"):
        if not should_exclude(html) and not should_exclude(html.parent):
            return html
    
    for html in repo_path.glob("*/*/index.html"):
        if not should_exclude(html):
            return html
    
    # Любой HTML файл
    for html in repo_path.glob("*.html"):
        if not should_exclude(html):
            return html
    
    for html in repo_path.glob("*/*.html"):
        if not should_exclude(html) and not should_exclude(html.parent):
            return html
    
    return None


def copy_directory(src_dir: Path, dest_dir: Path) -> dict:
    """Копирует всю директорию, исключая ненужные файлы"""
    
    stats = {"files": 0, "dirs": 0, "skipped": 0}
    
    if dest_dir.exists():
        shutil.rmtree(dest_dir)
    
    dest_dir.mkdir(parents=True, exist_ok=True)
    
    for item in src_dir.rglob("*"):
        # Проверяем, не нужно ли исключить
        if should_exclude(item):
            stats["skipped"] += 1
            continue
        
        # Проверяем родительские папки
        skip = False
        for parent in item.relative_to(src_dir).parents:
            if should_exclude(Path(parent.name)):
                skip = True
                break
        if skip:
            stats["skipped"] += 1
            continue
        
        rel_path = item.relative_to(src_dir)
        dest_path = dest_dir / rel_path
        
        if item.is_dir():
            dest_path.mkdir(parents=True, exist_ok=True)
            stats["dirs"] += 1
        else:
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, dest_path)
            stats["files"] += 1
    
    return stats


def integrate_lab(repo_path: Path, section: str, lab_id: str, name: str) -> dict:
    """Интегрирует одну лабораторную работу"""
    
    entry_html = find_entry_html(repo_path)
    
    if not entry_html:
        return {"status": "error", "message": "HTML не найден"}
    
    # Определяем базовую директорию (где лежит index.html)
    base_dir = entry_html.parent
    
    # Целевая директория в static
    static_dest = STATIC_LABS_DIR / section / lab_id
    
    # Копируем всю директорию с entry point
    stats = copy_directory(base_dir, static_dest)
    
    # Если entry HTML не называется index.html - переименовываем
    entry_name = entry_html.name
    if entry_name != "index.html":
        src_file = static_dest / entry_name
        dst_file = static_dest / "index.html"
        if src_file.exists():
            # Если index.html уже есть - не перезаписываем
            if not dst_file.exists():
                shutil.move(src_file, dst_file)
    
    return {
        "status": "ok",
        "entry": str(entry_html.relative_to(repo_path)),
        "files": stats["files"],
        "dirs": stats["dirs"]
    }


def main():
    print("=" * 60)
    print("🔧 ИНТЕГРАЦИЯ ЛАБОРАТОРНЫХ РАБОТ")
    print("=" * 60)
    print()
    
    if not EXTERNAL_LABS_DIR.exists():
        print("❌ Директория external_labs не найдена!")
        return
    
    # Читаем отчёт анализа
    report_path = SCRIPT_DIR / "labs_analysis_report.json"
    if report_path.exists():
        with open(report_path, encoding="utf-8") as f:
            report = json.load(f)
    else:
        print("⚠️  Отчёт анализа не найден, запустите analyze_labs.py")
        return
    
    # Очищаем старую директорию
    if STATIC_LABS_DIR.exists():
        print(f"🗑️  Очистка {STATIC_LABS_DIR}...")
        shutil.rmtree(STATIC_LABS_DIR)
    
    success = 0
    failed = 0
    total_files = 0
    
    for lab in report:
        repo_name = lab["repo"]
        section = lab["section"]
        lab_id = lab["lab_id"]
        name = lab["name"]
        
        repo_path = EXTERNAL_LABS_DIR / repo_name
        
        if not repo_path.exists():
            print(f"⏭️  {name} - репозиторий не найден")
            failed += 1
            continue
        
        print(f"📦 {name}")
        print(f"   Раздел: {section}/{lab_id}")
        
        result = integrate_lab(repo_path, section, lab_id, name)
        
        if result["status"] == "ok":
            print(f"   ✅ Entry: {result['entry']}")
            print(f"   📊 Файлов: {result['files']}, Папок: {result['dirs']}")
            success += 1
            total_files += result["files"]
        else:
            print(f"   ❌ {result['message']}")
            failed += 1
        
        print()
    
    print("=" * 60)
    print(f"📊 Итоги: ✅ {success} лаб, 📁 {total_files} файлов")
    if failed > 0:
        print(f"   ❌ {failed} ошибок")
    print("=" * 60)
    print()
    print(f"📂 Файлы в: {STATIC_LABS_DIR}")
    print("🌐 Запустите сервер: python3 manage.py runserver")
    print("📍 Откройте: http://127.0.0.1:8000/labs/")


if __name__ == "__main__":
    main()
