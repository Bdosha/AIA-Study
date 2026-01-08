#!/usr/bin/env python3
"""
Скрипт интеграции лабораторных работ по кибернетике.
Копирует файлы из external_labs в static/labkib/ согласно маппингу.

Запуск: python3 scripts/integrate_labkib.py
"""

import os
import shutil
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
EXTERNAL_LABS_DIR = PROJECT_DIR / "external_labs"
STATIC_LABKIB_DIR = PROJECT_DIR / "static" / "labkib"

# Маппинг: (section, lab_id) -> (repo_name, source_path)
LABS_MAPPING = {
    # Моделирование систем
    ('modeling', 'flow_inventory'): {
        'repo': 'FlowInventoryModeling',
        'source': '.',  # корень репозитория
        'files': ['index.html', 'style.css', 'js/']
    },
    ('modeling', 'bio_sync'): {
        'repo': 'KiTS_LABA',
        'source': 'bio_moduls_sync',
        'files': ['index.html', 'styles_test9.css', 'js/']
    },
    
    # Системный анализ
    ('analysis', 'system_analysis'): {
        'repo': 'Lab_Kib_system_analysis',
        'source': '.',
        'files': ['index.html', 'styles.css', 'js/']
    },
    ('analysis', 'stability'): {
        'repo': 'LaboratoryOfCybernetics',
        'source': '.',
        'files': ['index.html', 'css/', 'js/']
    },
    
    # Автоматизация
    ('automation', 'state_machine'): {
        'repo': 'State_machine_and_process_automation',
        'source': '.',
        'files': ['index.html', 'styles.css', 'js/']
    },
    ('automation', 'hierarchical_control'): {
        'repo': 'cybernetics',
        'source': '.',
        'files': ['index.html', 'style.css', 'app.js']
    },
    
    # Распределённые системы
    ('distributed', 'distributed_systems'): {
        'repo': 'CST_MEPhI_distributed_systems',
        'source': '.',
        'files': ['index.html', 'style.css', 'js/']
    },
    
    # Кодирование
    ('coding', 'error_correction'): {
        'repo': 'Laba_Kiba',
        'source': 'Код',
        'files': ['index.html', 'style.css', 'main.js', 'theme.js', 'distance.js', 
                  'hamming.js', 'reedSolomon.js', 'Better_VCR_Regular.ttf', 
                  'bg_dark.png', 'bg_light.png', 'favicon.ico']
    },
}


def copy_item(src: Path, dst: Path):
    """Копирует файл или директорию"""
    if src.is_dir():
        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(src, dst)
        return True
    elif src.is_file():
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        return True
    return False


def integrate_lab(section: str, lab_id: str, config: dict) -> dict:
    """Интегрирует одну лабораторную работу"""
    
    repo_name = config['repo']
    source_subdir = config['source']
    files_list = config['files']
    
    repo_path = EXTERNAL_LABS_DIR / repo_name
    
    if not repo_path.exists():
        return {'status': 'error', 'message': f'Репозиторий {repo_name} не найден'}
    
    source_path = repo_path / source_subdir if source_subdir != '.' else repo_path
    
    if not source_path.exists():
        return {'status': 'error', 'message': f'Путь {source_subdir} не найден в {repo_name}'}
    
    dest_path = STATIC_LABKIB_DIR / section / lab_id
    
    # Создаём целевую директорию
    dest_path.mkdir(parents=True, exist_ok=True)
    
    copied_files = 0
    errors = []
    
    for item in files_list:
        src = source_path / item
        dst = dest_path / item
        
        if src.exists():
            try:
                if copy_item(src, dst):
                    copied_files += 1
            except Exception as e:
                errors.append(f'{item}: {str(e)}')
        else:
            errors.append(f'{item}: не найден')
    
    return {
        'status': 'ok' if copied_files > 0 else 'warning',
        'copied': copied_files,
        'errors': errors,
        'dest': str(dest_path)
    }


def main():
    print("=" * 60)
    print("🔧 ИНТЕГРАЦИЯ ЛАБОРАТОРНЫХ РАБОТ ПО КИБЕРНЕТИКЕ")
    print("=" * 60)
    print()
    
    if not EXTERNAL_LABS_DIR.exists():
        print("❌ Директория external_labs не найдена!")
        print("   Сначала запустите: ./scripts/clone_labkib.sh")
        return
    
    # Очищаем старую директорию (но сохраняем basic_concepts для внутренних лаб)
    if STATIC_LABKIB_DIR.exists():
        for item in STATIC_LABKIB_DIR.iterdir():
            if item.name != 'basic_concepts':
                if item.is_dir():
                    shutil.rmtree(item)
                else:
                    item.unlink()
        print(f"🗑️  Очищена {STATIC_LABKIB_DIR}")
    
    success = 0
    failed = 0
    
    for (section, lab_id), config in LABS_MAPPING.items():
        print(f"\n📦 {section}/{lab_id}")
        print(f"   Источник: {config['repo']}/{config['source']}")
        
        result = integrate_lab(section, lab_id, config)
        
        if result['status'] == 'ok':
            print(f"   ✅ Скопировано файлов: {result['copied']}")
            success += 1
        elif result['status'] == 'warning':
            print(f"   ⚠️  Частично: {result['copied']} файлов")
            if result['errors']:
                for err in result['errors'][:3]:
                    print(f"      - {err}")
            success += 1
        else:
            print(f"   ❌ {result['message']}")
            failed += 1
    
    print()
    print("=" * 60)
    print(f"📊 Итоги: ✅ {success} лаб интегрировано")
    if failed > 0:
        print(f"   ❌ {failed} ошибок")
    print("=" * 60)
    print()
    print(f"📂 Файлы в: {STATIC_LABKIB_DIR}")
    print("🌐 Запустите сервер: python3 manage.py runserver")
    print("📍 Откройте: http://127.0.0.1:8000/labkib/")


if __name__ == "__main__":
    main()

