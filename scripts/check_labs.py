#!/usr/bin/env python3
"""Проверка всех лабораторных работ на наличие JS файлов"""

import os
import re
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
STATIC_LABS = PROJECT_DIR / "static" / "labs"

def check_lab(lab_dir: Path):
    """Проверяет одну лабу на наличие всех JS файлов"""
    index_html = lab_dir / "index.html"
    
    if not index_html.exists():
        return {"status": "error", "message": "index.html не найден"}
    
    try:
        content = index_html.read_text(encoding='utf-8', errors='ignore')
    except Exception as e:
        return {"status": "error", "message": str(e)}
    
    # Ищем все ссылки на JS файлы
    js_refs = re.findall(r'(?:src|href)=["\']([^"\']*\.js)["\']', content, re.IGNORECASE)
    
    # Также ищем CSS
    css_refs = re.findall(r'(?:src|href)=["\']([^"\']*\.css)["\']', content, re.IGNORECASE)
    
    missing_js = []
    found_js = []
    missing_css = []
    found_css = []
    
    for js_ref in js_refs:
        # Пропускаем внешние ссылки (CDN)
        if js_ref.startswith('http') or js_ref.startswith('//'):
            continue
        
        # Убираем начальный / или ./
        js_path = js_ref.lstrip('./').lstrip('/')
        
        full_path = lab_dir / js_path
        
        if full_path.exists():
            found_js.append(js_ref)
        else:
            missing_js.append(js_ref)
    
    for css_ref in css_refs:
        if css_ref.startswith('http') or css_ref.startswith('//'):
            continue
        
        css_path = css_ref.lstrip('./').lstrip('/')
        full_path = lab_dir / css_path
        
        if full_path.exists():
            found_css.append(css_ref)
        else:
            missing_css.append(css_ref)
    
    return {
        "status": "ok" if not missing_js and not missing_css else "warning",
        "found_js": found_js,
        "missing_js": missing_js,
        "found_css": found_css,
        "missing_css": missing_css
    }


def main():
    print("=" * 70)
    print("ПРОВЕРКА ВСЕХ ЛАБОРАТОРНЫХ РАБОТ")
    print("=" * 70)
    
    if not STATIC_LABS.exists():
        print(f"❌ Директория {STATIC_LABS} не найдена!")
        return
    
    problems = []
    ok_count = 0
    
    for section in sorted(STATIC_LABS.iterdir()):
        if not section.is_dir():
            continue
        
        print(f"\n📁 {section.name}")
        
        for lab in sorted(section.iterdir()):
            if not lab.is_dir():
                continue
            
            result = check_lab(lab)
            
            if result["status"] == "error":
                print(f"  ❌ {lab.name}: {result['message']}")
                problems.append((section.name, lab.name, result))
            elif result.get("missing_js") or result.get("missing_css"):
                missing_count = len(result.get("missing_js", [])) + len(result.get("missing_css", []))
                found_count = len(result.get("found_js", [])) + len(result.get("found_css", []))
                print(f"  ⚠️  {lab.name}: {found_count} найдено, {missing_count} отсутствует")
                for m in result.get("missing_js", []):
                    print(f"      ❌ JS: {m}")
                for m in result.get("missing_css", []):
                    print(f"      ❌ CSS: {m}")
                problems.append((section.name, lab.name, result))
            else:
                found_count = len(result.get("found_js", [])) + len(result.get("found_css", []))
                print(f"  ✅ {lab.name}: {found_count} файлов")
                ok_count += 1
    
    print("\n" + "=" * 70)
    print(f"ИТОГО: ✅ {ok_count} ОК, ⚠️ {len(problems)} с проблемами")
    print("=" * 70)
    
    if problems:
        print("\n📋 ПРОБЛЕМНЫЕ ЛАБЫ:")
        for section, lab, result in problems:
            print(f"\n  {section}/{lab}:")
            for m in result.get("missing_js", []):
                print(f"    - {m}")
            for m in result.get("missing_css", []):
                print(f"    - {m}")


if __name__ == "__main__":
    main()

