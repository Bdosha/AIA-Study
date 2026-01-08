"""
Лабораторные работы по кибернетике и теории систем.

Структура упрощена - все лабы в одном списке:
- /labkib/ - главная страница со всеми лабами
- /labkib/{lab}/ - страница конкретной лабы (iframe)
"""

import json
import os
from pathlib import Path
from random import choice, random, randint, uniform

import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error
import matplotlib.pyplot as plt

from django.conf import settings
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render
from django.http import Http404


# =============================================================================
# РЕЕСТР ЛАБОРАТОРНЫХ РАБОТ ПО КИБЕРНЕТИКЕ (плоский список)
# =============================================================================

LABKIB_REGISTRY = {
    # Основные понятия кибернетики (внутренние с бэкендом)
    'black_box': {
        'title': 'Чёрный ящик',
        'description': 'Идентификация системы по входным и выходным данным',
        'icon': '🔲',
        'type': 'internal',
    },
    'feedback': {
        'title': 'Обратная связь',
        'description': 'Поиск оптимума функции методами градиентного спуска',
        'icon': '🔄',
        'type': 'internal',
    },
    'regulation': {
        'title': 'Регулирование',
        'description': 'Настройка PID-регулятора для стабилизации системы',
        'icon': '🎛️',
        'type': 'internal',
    },
    'control': {
        'title': 'Управление',
        'description': 'Подбор траектории космического корабля',
        'icon': '🚀',
        'type': 'internal',
    },
    
    # Моделирование систем
    'flow_inventory': {
        'title': 'Потоки и запасы',
        'description': 'Моделирование потоков и запасов ресурсов в системах жизнеобеспечения',
        'icon': '📊',
        'type': 'static',
        'path': 'modeling/flow_inventory',
    },
    'bio_sync': {
        'title': 'Синхронизация биоритмов',
        'description': 'Исследование эмерджентности через модель Курамото',
        'icon': '🧬',
        'type': 'static',
        'path': 'modeling/bio_sync',
    },
    
    # Системный анализ
    'system_analysis': {
        'title': 'Системный анализ',
        'description': 'SWOT-анализ и исследование структуры системы на графе',
        'icon': '🔬',
        'type': 'static',
        'path': 'analysis/system_analysis',
    },
    'stability': {
        'title': 'Устойчивость к помехам',
        'description': 'Анализ устойчивости бортовых систем к космическим шумам',
        'icon': '📡',
        'type': 'static',
        'path': 'analysis/stability',
    },
    
    # Автоматизация
    'state_machine': {
        'title': 'Машина состояний',
        'description': 'Построение и анализ детерминированного конечного автомата',
        'icon': '⚙️',
        'type': 'static',
        'path': 'automation/state_machine',
    },
    'hierarchical_control': {
        'title': 'Иерархическое управление',
        'description': 'Симулятор распределённой сети контроллеров',
        'icon': '🤖',
        'type': 'static',
        'path': 'automation/hierarchical_control',
    },
    
    # Распределённые системы
    'distributed_systems': {
        'title': 'Сетевые системы',
        'description': 'Визуализация методов маршрутизации в распределённых системах',
        'icon': '🌐',
        'type': 'static',
        'path': 'distributed/distributed_systems',
    },
    
    # Кодирование
    'error_correction': {
        'title': 'Коды исправления ошибок',
        'description': 'Код Хэмминга и код Рида-Соломона для защиты данных',
        'icon': '🔐',
        'type': 'static',
        'path': 'coding/error_correction',
    },
}


# =============================================================================
# VIEWS ДЛЯ НОВОГО ДИЗАЙНА
# =============================================================================

def labkib_index(request: HttpRequest):
    """Главная страница модуля кибернетики со всеми лабами"""
    labs = []
    for lab_id, lab_data in LABKIB_REGISTRY.items():
        labs.append({
            'id': lab_id,
            'title': lab_data['title'],
            'description': lab_data['description'],
            'icon': lab_data['icon'],
        })
    return render(request, 'labkib/index.html', {'labs': labs})


def labkib_detail(request: HttpRequest, lab: str):
    """Страница конкретной лабораторной работы"""
    if lab not in LABKIB_REGISTRY:
        raise Http404("Лабораторная работа не найдена")
    
    lab_data = LABKIB_REGISTRY[lab]
    
    # Для внутренних лаб (с бэкендом) - перенаправляем на старые URL
    if lab_data.get('type') == 'internal':
        internal_urls = {
            'black_box': '/labkib/legacy/systems/',
            'feedback': '/labkib/legacy/feedback/',
            'regulation': '/labkib/legacy/regulation/',
            'control': '/labkib/legacy/control/',
        }
        iframe_src = internal_urls.get(lab, f'/static/labkib/{lab}/index.html')
    else:
        # Статические лабы загружаются из static
        path = lab_data.get('path', lab)
        iframe_src = f'/static/labkib/{path}/index.html'
    
    return render(request, 'labkib/lab_detail.html', {
        'lab_id': lab,
        'lab_title': lab_data['title'],
        'lab_description': lab_data['description'],
        'lab_icon': lab_data['icon'],
        'iframe_src': iframe_src,
    })


# =============================================================================
# LEGACY VIEWS (старые лабораторные работы с бэкендом)
# =============================================================================

def get_table_data(data):
    table_data = json.loads(data)
    x = table_data.split('\n')[0].split(',')[1:]
    y = table_data.split('\n')[1].split(',')[1:]
    x = list(map(float, x))
    y = list(map(float, y))
    return x, y


def clear_data():
    folder = settings.BASE_DIR / "static" / "graphics"
    if folder.exists():
        for filename in os.listdir(folder):
            os.remove(folder / filename)


def get_linear_regression(x, y):
    plt.gcf().clear()
    clear_data()
    x_train = np.array(x).reshape(-1, 1)
    y_train = np.array(y).reshape(-1, 1)

    model = LinearRegression()
    model.fit(x_train, y_train)

    k, b = float(model.coef_[0][0]), float(model.intercept_[0])

    x1 = np.array([-1000] + x + [1000])
    y1 = x1 * k + b
    
    # Dark theme styling
    plt.style.use('dark_background')
    fig, ax = plt.subplots(facecolor='#0f0f14')
    ax.set_facecolor('#0f0f14')
    
    plt.rc('font', size=13)
    plt.rcParams['text.color'] = '#f4f4f5'
    plt.rcParams['axes.labelcolor'] = '#a1a1aa'
    plt.rcParams['xtick.color'] = '#71717a'
    plt.rcParams['ytick.color'] = '#71717a'
    plt.rcParams['axes.edgecolor'] = '#71717a'
    plt.rcParams['axes.facecolor'] = '#0f0f14'

    plt.plot(x1, y1, color='#00d4ff', label='Линия регрессии', linewidth=2)
    plt.scatter(x_train, y_train, color='#a855f7', label='Данные', s=60, alpha=0.8)

    plt.xlim(min(x) - 5, max(x) + 5)
    plt.ylim(min(y) - 5, max(y) + 5)

    plt.xlabel('Вход', color='#a1a1aa')
    plt.ylabel('Выход', color='#a1a1aa')
    plt.title('Система', color='#f4f4f5')
    plt.legend(framealpha=0.2, facecolor='#16161f', edgecolor='#71717a')
    plt.grid(True, alpha=0.2, color='#71717a')
    file = randint(10000, 1000000)
    
    graphics_dir = settings.BASE_DIR / "static" / "graphics"
    os.makedirs(graphics_dir, mode=0o755, exist_ok=True)
    plt.savefig(graphics_dir / f"{file}.jpg", facecolor='#0f0f14', edgecolor='none', dpi=100, bbox_inches='tight')

    y_pred = model.predict(x_train)
    mae = mean_absolute_error(y_train, y_pred)

    return k, b, file, mae


def systems(request: HttpRequest):
    """Выбор системы для чёрного ящика"""
    context = {
        'page_icon': '🔲',
        'page_title': 'Изучение природы чёрного ящика',
        'page_description': 'Проведите эксперименты и выявите скрытые закономерности внутри системы',
        'anime_image': 'img/black_boxes.png',
        'options': [
            {
                'tag': 'Биология',
                'tag_color': 'green',
                'icon': '🌱',
                'title': 'Рост растения',
                'description': 'Какой будет высота растения в зависимости от объёма полива?',
                'url': '/labkib/legacy/systems/plant/',
                'image': 'img/plant.jpg',
                'action_text': 'Исследовать',
            },
            {
                'tag': 'Электроника',
                'tag_color': 'blue',
                'icon': '📱',
                'title': 'Разряд телефона',
                'description': 'Как быстро разрядится батарея в зависимости от времени разговора?',
                'url': '/labkib/legacy/systems/phone/',
                'image': 'img/phone.jpg',
                'action_text': 'Исследовать',
            },
            {
                'tag': 'Механика',
                'tag_color': 'red',
                'icon': '🚗',
                'title': 'Скорость автомобиля',
                'description': 'Какая скорость будет у автомобиля при нажатии на педаль газа?',
                'url': '/labkib/legacy/systems/car/',
                'image': 'img/car.jpg',
                'action_text': 'Исследовать',
            },
            {
                'tag': 'Физика',
                'tag_color': 'amber',
                'icon': '🌻',
                'title': 'Вес семян',
                'description': 'Сколько будет весить кучка семян в зависимости от их количества?',
                'url': '/labkib/legacy/systems/seeds/',
                'image': 'img/seeds.jpg',
                'action_text': 'Исследовать',
            },
            {
                'tag': 'Загадка',
                'tag_color': 'purple',
                'icon': '❓',
                'title': 'Неведомое создание',
                'description': 'Что ответит неведомое создание на ваш вопрос? Раскройте тайну неизвестной системы.',
                'url': '/labkib/legacy/systems/unknown/',
                'image': 'img/unknown.jpg',
                'action_text': 'Исследовать тайну',
                'featured': True,
            },
        ],
    }
    return render(request, 'lab/selection.html', context)


def main_work(request: HttpRequest, system):
    """Работа с конкретной системой чёрного ящика"""
    if request.method == 'POST':
        temp = request.POST.get('table_data')
        if temp:
            x, y = get_table_data(temp)
            if not x:
                return HttpResponse('no data')
            k, b, file, mae = get_linear_regression(x, y)
            data = {
                'k': round(k, 2), 
                'b': round(b, 2), 
                'file': f'/static/graphics/{file}.jpg', 
                'mae': round(mae, 2),
                'x': x, 
                'y': y
            }
            return render(request, 'lab/black_box/result.html', context=data)
    
    kbu = {
        'phone': [-random() * 1.5 - 0.5, random() * 20 + 5, random() * 5 + 1],
        'plant': [random() * 2 + 1, random() * 10 + 5, random() * 3 + 1],
        'seeds': [random() * 2 + 1, random() * 10 + 5, random() * 3 + 1],
        'car': [random() * 10 + 5, random() * 5, random() * 15 + 5],
        'unknown': [choice([-1, 1]) * random() * 10, random() * 50, random() * 30]
    }
    slider = {
        'phone': ['0', '60', '1', '30'],
        'plant': ['0', '100', '1', '50'],
        'seeds': ['0', '100', '1', '50'],
        'car': ['0', '10', '0.1', '5'],
        'unknown': ['-100', '100', '1', '0']
    }
    inout = {
        'phone': ['время разговора', 'оставшийся уровень заряда'],
        'plant': ['объём воды', 'высота растения'],
        'seeds': ['количество семян', 'вес кучки'],
        'car': ['число', 'число'],
        'unknown': ['значение', 'результат']
    }
    text = {
        'phone': '📱 Мобильный телефон: как быстро разрядится батарея в зависимости от времени разговора?',
        'plant': '🌱 Рост растения: какой будет высота растения в зависимости от полива?',
        'seeds': '🌻 Вес семян: сколько будет весить кучка семян в зависимости от количества семян в ней?',
        'car': '🚗 Скорость автомобиля: с какой скоростью поедет автомобиль в зависимости от силы нажатия на педаль акселерации?',
        'unknown': '❓ Неведомое: что ответит неведомое создание на вопрос?'
    }

    data = {
        'system': system, 
        'kbu': [i / 1.2 for i in kbu[system]], 
        'slider': slider[system], 
        'inout': inout[system],
        'text': text[system], 
        'photo': f'/static/img/{system}.jpg', 
        'action': f'/labkib/legacy/systems/{system}/'
    }
    return render(request, f'lab/black_box/black_box.html', context=data)


def random_c():
    a = round(uniform(1, 7), 1)
    b = round(uniform(-20, 20), 1)
    c = round(uniform(-10, 10), 1)

    if abs(-b / (2 * a)) > 28 or abs(-b / (2 * a)) < 5:
        return random_c()

    return a, b, c


def make_parabola(a, b, c, xes, number):
    clear_data()
    plt.gcf().clear()
    cool = True
    if abs(round(-b / (2 * a), 2) - number) > 0.7:
        cool = False
    x = np.linspace(-30, 30, 1000)
    y = a * (x ** 2) + b * x + c

    x1 = np.array(xes)
    y1 = a * x1 ** 2 + b * x1 + c

    x0 = np.array(round(-b / (2 * a), 2))
    y0 = a * (x0 ** 2) + b * x0 + c

    final_x = np.array([number])
    final_y = a * (final_x ** 2) + b * final_x + c

    # Dark theme styling
    plt.style.use('dark_background')
    plt.rc('font', size=13)
    plt.rcParams['text.color'] = '#f4f4f5'
    plt.rcParams['axes.labelcolor'] = '#a1a1aa'
    plt.rcParams['xtick.color'] = '#71717a'
    plt.rcParams['ytick.color'] = '#71717a'
    plt.rcParams['axes.edgecolor'] = '#71717a'
    plt.rcParams['axes.facecolor'] = '#0f0f14'

    fig, ax = plt.subplots(facecolor='#0f0f14')
    ax.set_facecolor('#0f0f14')

    plt.scatter(x1, y1, color='#f87171', label='Данные', s=60, alpha=0.8)
    plt.scatter(x0, y0, color='#34d399', label='Вершина', s=100, zorder=5)
    plt.scatter(final_x, final_y, color='#c084fc', label='Итог', s=100, zorder=5)

    plt.plot(x, y, color='#00d4ff', linewidth=2)
    plt.legend(framealpha=0.2, facecolor='#16161f', edgecolor='#71717a')
    plt.grid(True, alpha=0.2, color='#71717a')

    plt.xlim(-33, 33)
    plt.title('Полный график', color='#f4f4f5')
    
    graphics_dir = settings.BASE_DIR / "static" / "graphics"
    os.makedirs(graphics_dir, mode=0o755, exist_ok=True)
    filee = randint(1000, 10000000)
    plt.savefig(graphics_dir / f"{filee}.jpg", facecolor='#0f0f14', edgecolor='none', dpi=100, bbox_inches='tight')
    plt.gcf().clear()

    # Second plot
    fig, ax = plt.subplots(facecolor='#0f0f14')
    ax.set_facecolor('#0f0f14')

    plt.scatter(x0, y0, color='#34d399', label='Вершина', s=100, zorder=5)
    plt.scatter(final_x, final_y, color='#c084fc', label='Ваш ответ', s=100, zorder=5)
    plt.axvline(x0, color='#34d399', linewidth=2, linestyle='--', alpha=0.7)
    plt.axvline(final_x, color='#c084fc', linewidth=2, linestyle='--', alpha=0.7)
    plt.plot(x, y, color='#00d4ff', linewidth=2)
    plt.legend(framealpha=0.2, facecolor='#16161f', edgecolor='#71717a')
    plt.grid(True, alpha=0.2, color='#71717a')
    plt.xlim(x0 - 2, x0 + 2)
    plt.title('Оптимальные значения', color='#f4f4f5')
    file = randint(1000, 10000000)

    plt.axvline(x=x0 - 0.7, color='#f87171', label='Ограничения', linewidth=2, linestyle=':', alpha=0.7)
    plt.axvline(x=x0 + 0.7, color='#f87171', linewidth=2, linestyle=':', alpha=0.7)
    plt.legend(framealpha=0.2, facecolor='#16161f', edgecolor='#71717a')

    graphics_dir = settings.BASE_DIR / "static" / "graphics"
    plt.savefig(graphics_dir / f"{file}.jpg", facecolor='#0f0f14', edgecolor='none', dpi=100, bbox_inches='tight')

    return x0, round(abs(number - x0), 2), file, filee, cool


def get_fb(request: HttpRequest, system):
    """Работа с обратной связью"""
    if request.method == 'POST':
        table_data = request.POST.get('table_data')
        a = float(request.POST.get('a').replace(',', '.'))
        b = float(request.POST.get('b').replace(',', '.'))
        c = float(request.POST.get('c').replace(',', '.'))
        number = float(request.POST.get('number').replace(',', '.'))
        if table_data:
            x, y = get_table_data(table_data)
            x0, delta, file, filee, cool = make_parabola(a, b, c, x, number)
            data = {
                'x0': x0, 
                'file': f'/static/graphics/{file}.jpg',
                'filee': f'/static/graphics/{filee}.jpg',
                'cool': cool,
                'lens': len(x),
                'delta': delta,
                'x': x, 
                'y': y
            }
            return render(request, 'lab/feedback/result.html', context=data)
    
    abc = random_c()

    inout = {
        'gradient': ['точка', 'Производная в точке'],
        'ternary_search': ['точка', 'Значение'],
        'simple': ['точка', 'Расстояние до минимума']
    }
    text = {
        'gradient': '🦄 С помощью производной вам нужно найти минимум функции с помощью Градиентного спуска',
        'ternary_search': '🔎 Алгоритмы добрались даже сюда. Здесь, ориентируясь по значеням функции нужно найти ее минимум',
        'simple': '📊 Через перебор значений нужно подобраться к минимуму как можно ближе'
    }

    data = {
        'system': system,
        'abc': abc,
        'inout': inout[system],
        'text': text[system],
        'action': f'/labkib/legacy/feedback/{system}/'
    }
    return render(request, f'lab/feedback/feedback.html', context=data)


def feedback(request):
    """Выбор метода для обратной связи"""
    context = {
        'page_icon': '🔄',
        'page_title': 'Капитан, срочно стабилизируй температуру двигателя!',
        'page_description': 'Выбери алгоритм для поиска оптимума. У тебя будет всего 10 попыток, чтобы выровнять показатели',
        'alert_text': '⚠️ Критическая ситуация — времени мало!',
        'alert_color': 'red',
        'anime_image': 'img/feedbacks'
                       '.png',
        'options': [
            {
                'tag': 'Алгоритм',
                'tag_color': 'green',
                'icon': '🔎',
                'title': 'Тернарный поиск',
                'description': 'Поиск минимума путём деления отрезка на три части и сравнения значений функции',
                'url': '/labkib/legacy/feedback/ternary_search/',
                'image_url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/GoldenSectionSearch.png/800px-GoldenSectionSearch.png',
                'action_text': 'Применить метод',
            },
            {
                'tag': 'Базовый',
                'tag_color': 'cyan',
                'icon': '📊',
                'title': 'Перебор значений',
                'description': 'Поиск вершины через анализ расстояний до минимума функции',
                'url': '/labkib/legacy/feedback/simple/',
                'image_url': 'https://dspncdn.com/a1/media/originals/da/1d/4c/da1d4c7e38b426eca93a6c2e60398a06.jpg',
                'action_text': 'Применить метод',
            },
            {
                'tag': 'Машинное обучение',
                'tag_color': 'rose',
                'icon': '🦄',
                'title': 'Градиентный спуск',
                'description': 'Мощный метод оптимизации через производную функции. Основа современного машинного и глубокого обучения.',
                'url': '/labkib/legacy/feedback/gradient/',
                'image_url': 'https://www.researchgate.net/profile/Matteo-Roffilli/publication/242416179/figure/fig9/AS:669404463394819@1536609869080/A-bowl-shaped-function-to-be-minimized_Q320.jpg',
                'action_text': 'Применить метод',
                'featured': True,
            },
        ],
    }
    return render(request, 'lab/selection.html', context)


def graphic(v, t, e, b, w, last_t):
    clear_data()
    plt.gcf().clear()
    x = np.linspace(0, max(last_t, 8), 1000)
    x1 = np.array(last_t)
    y1 = v + 2.7 ** (-b * x1) * np.cos(w * x1)
    y = v + 2.7 ** (-b * x) * np.cos(w * x)
    
    # Dark theme styling
    plt.style.use('dark_background')
    plt.rcParams['text.color'] = '#f4f4f5'
    plt.rcParams['axes.labelcolor'] = '#a1a1aa'
    plt.rcParams['xtick.color'] = '#71717a'
    plt.rcParams['ytick.color'] = '#71717a'
    plt.rcParams['axes.edgecolor'] = '#71717a'
    plt.rcParams['axes.facecolor'] = '#0f0f14'
    
    fig, ax = plt.subplots(facecolor='#0f0f14')
    ax.set_facecolor('#0f0f14')
    ax.plot(x, y, color='#00d4ff', linewidth=2)
    ax.scatter(x1, y1, color='#c084fc', label='Найденное минимальное время', s=100, zorder=5)
    ax.axhline(y=v - e, color='#f87171', linestyle='--', linewidth=2, label='Допустимое отклонение', alpha=0.7)
    ax.axhline(y=v + e, color='#f87171', linestyle='--', linewidth=2, alpha=0.7)
    ax.axvline(x=t, color='#34d399', linestyle=':', linewidth=2, label='Максимальное время', alpha=0.7)
    ax.legend(framealpha=0.2, facecolor='#16161f', edgecolor='#71717a')
    ax.grid(True, alpha=0.2, color='#71717a')
    
    graphics_dir = settings.BASE_DIR / "static" / "graphics"
    os.makedirs(graphics_dir, mode=0o755, exist_ok=True)
    filee = randint(1000, 10000000)
    plt.savefig(graphics_dir / f"{filee}.jpg", facecolor='#0f0f14', edgecolor='none', dpi=100, bbox_inches='tight')
    return filee


def regulation(request):
    """Выбор регулятора"""
    context = {
        'page_icon': '🎛️',
        'page_title': 'Перегрев сказался на работе двигателя',
        'page_description': 'Настройки PID-регулятора слетели. Без него мы не сможем продолжить полёт. Настрой регулятор!',
        'alert_text': '⚠️ Требуется калибровка системы',
        'alert_color': 'amber',
        'show_pid_formula': True,
        'anime_image': 'img/reg_anime.png',
        'options': [
            {
                'tag': 'Теория управления',
                'tag_color': 'blue',
                'icon': '🎛️',
                'title': 'PID-регулятор',
                'description': 'Устройство в управляющем контуре с обратной связью. Комбинирует пропорциональный, интегральный и дифференциальный компоненты для оптимального управления.',
                'url': '/labkib/legacy/regulation/PID/',
                'image': 'img/pidd.png',
                'action_text': 'Настроить регулятор',
                'featured': True,
            },
        ],
    }
    return render(request, 'lab/selection.html', context)


def pid(request):
    """Работа с PID-регулятором"""
    if request.method == 'POST':
        con = {
            'v': float(request.POST['v'].replace(',', '.')),
            'b': float(request.POST['b'].replace(',', '.')),
            'w': float(request.POST['w'].replace(',', '.')),
            't': float(request.POST['t'].replace(',', '.')),
            'e': float(request.POST['e'].replace(',', '.'))
        }

        table_data = request.POST.get('table_data')
        table_data = [i.split(',')[1:] for i in table_data[1:-1].split('\\n')]
        con['table'] = table_data
        con['tryes'] = len(con['table'][0])

        arr = [i[-1].replace(',', '.') for i in table_data[1:]]

        if arr[-1] == 'Слишком долго':
            arr[-1] = '8'
        arr = [float(i) for i in arr]

        con['arr'] = arr
        filee = graphic(con['v'], con['t'], con['e'], con['b'], con['w'], arr[-1])
        con['filee'] = f'/static/graphics/{filee}.jpg'
        return render(request, 'lab/regulation/result.html', con)

    con = {
        'v': round(uniform(5, 10), 2),
        't': round(uniform(1, 3.5), 2),
        'e': round(uniform(0.1, 0.5), 2),
        'b': round(uniform(0.1, 0.9), 2),
        'w': round(uniform(2, 10), 2)
    }

    return render(request, 'lab/regulation/regulation.html', context=con)


def control(request):
    """Выбор типа управления"""
    context = {
        'page_icon': '🚀',
        'page_title': 'На пути плотный пояс астероидов!',
        'page_description': 'Подбери идеальную траекторию, чтобы хватило топлива и удалось эвакуировать как можно больше исследовательских станций!',
        'alert_text': '☄️ Экстренная ситуация — действуй быстро!',
        'alert_color': 'red',
        'anime_image': 'img/panic.jpg',
        'options': [
            {
                'tag': 'Оптимизация',
                'tag_color': 'cyan',
                'icon': '📉',
                'title': 'Подбор траектории',
                'description': 'С помощью интерактивной карты подбери самую удачную траекторию полёта. Топливо ограничено, и в разных зонах оно тратится с разной скоростью.',
                'url': '/labkib/legacy/control/track/',
                'image': 'img/map.jpg',
                'action_text': 'Начать миссию',
                'featured': True,
            },
        ],
    }
    return render(request, 'lab/selection.html', context)


def get_control(request):
    """Работа с управлением траекторией"""
    if request.method == 'POST':
        table_data = request.POST.get('table_data')
        table_data = [i.split(',')[1:] for i in table_data[1:-1].split('\\n')]
        con = {'fio': request.POST.get('text'), 'table': table_data}
        mx = 0
        fio = request.POST.get('text')
        fio = fio.split()
        if len(fio) <= 1:
            return HttpResponse('Введите корректное ФИО')
        try:
            fio = fio[1][0] + '. ' + fio[2][0] + '. ' + fio[0]
        except IndexError:
            fio = fio[1][0] + '. ' + fio[0]
        for i in range(5):
            if int(table_data[5][i]) >= mx:
                con['tr'] = table_data[0][i]
                con['x1'] = int(table_data[1][i])
                con['x2'] = int(table_data[2][i])
                con['sv'] = int(table_data[3][i])
                con['fuel'] = int(table_data[4][i])
                con['mx'] = int(table_data[5][i])
                mx = con['mx']
        
        d = randint(1, 10000)
        text = f'''документ(ГОСТ-7-32-2017)
        --

        титульный-лист()
        вышестоящая - Министерство высшего образования Российской Федерации
        организация - Национальный исследовательский ядерный университет "МИФИ"
        сокращенное - НИЯУ МИФИ

        вид-документа - Лабораторная работа №22
        тема - Изучение управления в кибернетике
        руководитель - Старший преподаватель кафедры 22 «Кибернетика» НИЯУ МИФИ
        руководитель-фио - Р.В. Душкин
        руководитель-темы - Студент группы Б24-507
        руководитель-темы-фио - {fio}
        город - Москва
        год - 2024
        --

        содержание()


        + Введение
        ++ Цель работы
        Изучить понятие "управления" в кибернетике и подобрать оптимальный маршрут космического корабля.
        ++ Задачи
        )) Изучить понятия, которые будут использованы в ходе лабораторной работы.
        )) Найти наилучшие точки X1 и Х2 для построения траектории полета корабля.

        + Основные используемые термины
        ++ Обратная связь
        */Управление/* —  это совокупность менеджмента и организации в сфере кибернетики.
        рисунок(управление, 15) Управление


        + Ход работы
        ++ Выбор изучаемой системы
        Для выполнения лабораторной работы была использована специальная платформа.

        рисунок(Скрин) Интерфейс лабораторной
        рисунок(интерфейс, 18) Интерфейс выбранной системы

        ++ Ввод входных данных
        В интерфейсе платформы был доступен ввод двух значений. Входного и выходного положения корабля. Задачей было потратить наименьшее количество топлива и посетить наибольшее количество синих зон.



        рисунок(измерения, 18) Траектория полета

        ++  Получение результатов
        Наилучший результат полета, после использования 5 доступных попыток, составил {con['mx']} очков. Координаты входа и выхода - {con['x1']} {con['x2']} соответственно. В итоге было посещено {con['sv']} исследовательских станций, а запас топлива после полета составил {con['fuel']} единиц.


        рисунок(результат, 18) Итог лабораторной работы

        + Заключение
        Вывод: в ходе лабораторной работы было изучено понятие "управление" в области кибернетики. После использования 5 доступных попыток наилучший результат составил {con['mx']} очков.'''

        works_dir = settings.BASE_DIR / "static" / "works"
        os.makedirs(works_dir, mode=0o755, exist_ok=True)
        with open(works_dir / f"{d}.txt", "w") as f:
            f.write(text)
            f.close()
        con['tx'] = text
        return render(request, 'lab/control/result.html', context=con)

    return render(request, 'lab/control/control.html')


# Старая главная страница (для совместимости)
def lab_index(request):
    """Редирект на новую главную страницу"""
    from django.shortcuts import redirect
    return redirect('/labkib/')
