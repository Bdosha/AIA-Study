import json
import subprocess
import os

from django.shortcuts import render
from django.http import JsonResponse, Http404
from django.views.decorators.csrf import csrf_exempt


# Реестр лабораторных работ по разделам
LABS_REGISTRY = {
    'finite_automata': {
        'title': 'Конечные автоматы и методы управления состояниями',
        'description': 'Симуляторы ДКА, НКА, автоматов Мура и Мили, методы минимизации и преобразования',
        'icon': '🔄',
        'labs': {
            'dfa_simulator': {
                'title': 'Statecraft',
                'description': 'Онлайн-симулятор детерминированных конечных автоматов',
            },
            'smart_automata': {
                'title': 'Умная система автоматов',
                'description': 'Визуальное моделирование и симуляция недетерминированных автоматных систем',
            },
            'nfa_simulator': {
                'title': 'Симулятор НКА',
                'description': 'Недетерминированный конечный автомат',
            },
            'dfa_minimization': {
                'title': 'Минимизация ДКА',
                'description': 'Алгоритмы минимизации детерминированных автоматов',
            },
            'nfa_to_dfa': {
                'title': 'Преобразование НКА в ДКА',
                'description': 'Алгоритм построения детерминированного автомата',
            },
            'moore_machine': {
                'title': 'Симулятор автомата Мура',
                'description': 'Автомат с выходом, зависящим от состояния',
            },
            'mealy_machine': {
                'title': 'Симулятор автомата Мили',
                'description': 'Автомат с выходом, зависящим от перехода',
            },
            'probabilistic_automata': {
                'title': 'Вероятностные автоматы',
                'description': 'Автоматы с вероятностными переходами',
            },
        }
    },
    'cellular_graph': {
        'title': 'Клеточные и графовые вычислительные структуры',
        'description': 'Клеточные автоматы различных типов, турмиты и граф-автоматы',
        'icon': '🧬',
        'labs': {
            'prng_eca': {
                'title': 'ГПСЧ на ЭКлА',
                'description': 'Генератор псевдослучайных последовательностей на элементарных клеточных автоматах',
            },
            'brian_brain': {
                'title': 'Мозг Брайана',
                'description': 'Клеточный автомат с расширенными правилами',
            },
            'codi_automata': {
                'title': 'Клеточные автоматы CoDi',
                'description': 'Специализированные клеточные автоматы',
            },
            'triangular_ca': {
                'title': 'КА на треугольных решётках',
                'description': 'Клеточные автоматы на треугольной сетке',
            },
            'hexagonal_ca': {
                'title': 'Гексагональные КА',
                'description': 'Клеточные автоматы с жизнеподобными правилами на гексагональной сетке',
            },
            'reversible_ca': {
                'title': 'Обратимые КА',
                'description': 'Обратимые клеточные автоматы',
            },
            'turmites': {
                'title': 'Турмиты',
                'description': 'Турмиты и муравьи Лэнгтона',
            },
            'graph_automata': {
                'title': 'Граф-автоматы',
                'description': 'Автоматы на графовых структурах',
            },
            'dynamic_graph': {
                'title': 'Динамические граф-автоматы',
                'description': 'Автоматы на графах с динамической топологией',
            },
            'eca_world': {
                'title': 'ECA World',
                'description': 'Элементарные клеточные автоматы Вольфрама',
            },
            'life_matrix': {
                'title': 'Life Matrix',
                'description': 'Игра «Жизнь» Конвея',
            },
            'wireworld': {
                'title': 'WireWorld',
                'description': 'Клеточный автомат для моделирования электронных схем',
            },
            'ca_simulator': {
                'title': 'Симулятор КА',
                'description': 'Жизнеподобные клеточные автоматы с настраиваемыми правилами',
            },
        }
    },
    'turing_machines': {
        'title': 'Модели и разновидности машин Тьюринга',
        'description': 'Различные модификации и расширения машины Тьюринга',
        'icon': '📼',
        'labs': {
            'multitape_tm': {
                'title': 'Многоленточная МТ',
                'description': 'Машина Тьюринга с несколькими лентами',
            },
            'universal_tm': {
                'title': 'Универсальная МТ',
                'description': 'Универсальный симулятор машины Тьюринга',
            },
            'ram_machine': {
                'title': 'RAM-машина',
                'description': 'Машина с произвольным доступом к памяти',
            },
            'post_machine': {
                'title': 'Машина Поста',
                'description': 'Абстрактная вычислительная машина Поста',
            },
            'quantum_tm': {
                'title': 'Квантовая МТ',
                'description': 'Квантовая машина Тьюринга',
            },
            'nondeterministic_tm': {
                'title': 'Недетерминированная МТ',
                'description': 'Недетерминированная машина Тьюринга',
            },
            'zeno_machine': {
                'title': 'L-системы',
                'description': 'Визуализатор L-систем Линденмайера',
            },
        }
    },
    'formal_systems': {
        'title': 'Алгоритмические и формальные системы вычислений',
        'description': 'Нормальные алгорифмы, рекурсивные функции, сети Петри и другие формальные системы',
        'icon': '📐',
        'labs': {
            'markov_algorithms': {
                'title': 'Алгорифмы Маркова',
                'description': 'Нормальные алгорифмы Маркова',
            },
            'godel_functions': {
                'title': 'Функции Гёделя',
                'description': 'Рекурсивные функции Гёделя',
            },
            'petri_nets': {
                'title': 'Сети Петри',
                'description': 'Моделирование параллельных процессов',
            },
            'billiard_computer': {
                'title': 'Бильярдный компьютер',
                'description': 'Вычисления на основе бильярдной динамики',
            },
            'cyclic_tag_system': {
                'title': 'Циклическая тег-система',
                'description': 'Симулятор циклической тег-системы (CTS)',
            },
        }
    },
    'intelligent_systems': {
        'title': 'Мультиагентные и квантовые интеллектуальные системы',
        'description': 'Нейронные сети, квантовые вычисления, искусственная жизнь',
        'icon': '🧠',
        'labs': {
            'quantum_computing': {
                'title': 'Квантовые вычисления',
                'description': 'Симулятор квантовых вычислений',
            },
            'artificial_life': {
                'title': 'Искусственная жизнь',
                'description': 'Моделирование искусственной жизни',
            },
            'neural_tm': {
                'title': 'Нейронная МТ',
                'description': 'Нейронная машина Тьюринга',
            },
        }
    },
}

# Карточки раздела "Другое"
OTHER_CARDS = [
    {
        'name': 'Визуализация функций',
        'emojy': '📊',
        'description': 'Интерактивные визуализации математических функций и геометрии',
        'url': 'visuphi'
    },
    {
        'name': 'Фазовые портреты ДУ',
        'emojy': '🌀',
        'description': 'Интерактивная визуализация фазовых портретов линейных дифференциальных уравнений',
        'url': 'phase'
    },
    {
        'name': 'Теория игр',
        'emojy': '🎯',
        'description': 'Равновесие Нэша и анализ игр',
        'url': 'nash'
    },
    {
        'name': 'Неантагонистические игры',
        'emojy': '☕',
        'description': 'Анализ неантагонистической игры «Дилемма двух кафе»',
        'url': 'non-antagonistic-games'
    },
    {
        'name': 'Дифференциальные игры',
        'emojy': '⚔️',
        'description': 'Интерактивная лабораторная по дифференциальным играм',
        'url': 'differential-games'
    },
    {
        'name': 'Позиционные игры',
        'emojy': '🎲',
        'description': 'Интерактивная лабораторная по позиционным играм',
        'url': 'positional-games'
    },
    {
        'name': 'Бесконечные игры',
        'emojy': '♾️',
        'description': 'Интерактивная лабораторная по бесконечным играм',
        'url': 'infinite-games'
    },
    {
        'name': 'Задача коммивояжёра',
        'emojy': '🗺️',
        'description': 'Решение задачи коммивояжёра',
        'url': 'komi'
    },
    # {
    #     'name': 'Кибернетика',
    #     'emojy': '🤖',
    #     'description': 'Лабораторные работы по кибернетике',
    #     'url': 'labkib'
    # },
]


# Обёртка для встраивания в единый дизайн
def wrap_view(request, title, iframe_src, parent_title=None, parent_url=None):
    """Универсальная обёртка для iframe"""
    return render(request, 'wrapper.html', {
        'title': title,
        'iframe_src': iframe_src,
        'parent_title': parent_title,
        'parent_url': parent_url,
    })


# ===== ТЕОРИЯ ИГР (Нэш) =====
def nash(request):
    return wrap_view(request, 'Теория игр', '/nash/raw/')


def nash_raw(request):
    return render(request, 'NESH.html')


# ===== НЕАНТАГОНИСТИЧЕСКИЕ ИГРЫ =====
def non_antagonistic_games(request):
    return wrap_view(
        request,
        'Неантагонистические игры',
        '/static/other/game_theory/software/index.html'
    )


# ===== ДИФФЕРЕНЦИАЛЬНЫЕ ИГРЫ =====
def differential_games(request):
    return wrap_view(
        request,
        'Дифференциальные игры',
        '/static/other/differential_games/di-5-differential-games/index.html'
    )


# ===== ПОЗИЦИОННЫЕ ИГРЫ =====
def positional_games(request):
    return wrap_view(
        request,
        'Позиционные игры',
        '/static/other/positional_games/positional-games-main/index.html'
    )


# ===== БЕСКОНЕЧНЫЕ ИГРЫ =====
def infinite_games(request):
    return wrap_view(
        request,
        'Бесконечные игры',
        '/static/other/infinite_games/index.html'
    )


# ===== ГЛАВНАЯ =====
def index(request):
    return render(request, 'index.html', context={"other_cards": OTHER_CARDS})


# ===== ВИЗУАЛИЗАЦИЯ ФУНКЦИЙ =====
def visuphi(request):
    return wrap_view(request, 'Визуализация функций', '/visuphi/raw/')


def visuphi_raw(request):
    return render(request, 'visuphi/visu.html')


def visuphi_topic(request, sub, topic):
    return wrap_view(request, f'Визуализация: {topic}', f'/visuphi/raw/{sub}/{topic}', 
                     parent_title='Визуализация', parent_url='/visuphi/')


def visuphi_topic_raw(request, sub, topic):
    return render(request, f'visuphi/{sub}/{topic}.html')


# ===== ЗАДАЧА КОММИВОЯЖЁРА =====
def komi(request):
    return wrap_view(request, 'Задача коммивояжёра', '/komi/raw/')


@csrf_exempt
def komi_raw(request):
    if request.method == 'GET':
        try:
            return render(request, 'komi.html')
        except Exception as e:
            return JsonResponse({"error": f"Ошибка шаблона: {str(e)}"}, status=500)

    elif request.method == 'POST':
        try:
            if not request.body:
                return JsonResponse({"error": "Пустое тело запроса"}, status=400)

            data = json.loads(request.body.decode('utf-8'))

            if 'matrix' not in data:
                return JsonResponse({"error": "Неверные данные"}, status=400)

            matrix = data['matrix']

            cpp_path = os.path.join(os.getcwd(), "other/komi/komi")
            if not os.path.exists(cpp_path):
                return JsonResponse({"error": "C++ программа не найдена"}, status=500)

            json_path = os.path.join(os.getcwd(), "other/komi/matrix_input.json")
            with open(json_path, "w", encoding='utf-8') as f:
                json.dump(matrix, f, ensure_ascii=False, indent=2)

            result = subprocess.run(
                [cpp_path],
                capture_output=True,
                text=True,
                check=True,
                timeout=30
            )

            output = result.stdout.strip()

            if not output:
                return JsonResponse({"error": "C++ программа не вернула результат"}, status=500)

            parsed_output = json.loads(output)

            return JsonResponse({
                "path": parsed_output.get("path", []),
                "cost": parsed_output.get("cost", 0),
                "full_result": parsed_output
            })

        except json.JSONDecodeError as e:
            return JsonResponse({"error": f"Неверный JSON: {str(e)}"}, status=400)
        except subprocess.TimeoutExpired:
            return JsonResponse({"error": "Превышено время выполнения"}, status=500)
        except subprocess.CalledProcessError as e:
            return JsonResponse({"error": f"Ошибка C++: {e.stderr}"}, status=500)
        except Exception as e:
            return JsonResponse({"error": f"Внутренняя ошибка: {str(e)}"}, status=500)


# ===== КЛЕТОЧНЫЕ АВТОМАТЫ =====
def klindex(request):
    return wrap_view(request, 'Клеточные автоматы', '/cellular/raw/')


def klindex_raw(request):
    return render(request, 'lab_kl/index_raw.html')


def klab(request, lab):
    return wrap_view(request, f'КА: {lab}', f'/cellular/raw/{lab}/', 
                     parent_title='Клеточные автоматы', parent_url='/cellular/')


def klab_raw(request, lab):
    return render(request, f'lab_kl/{lab}.html')


def klsim(request):
    return wrap_view(request, 'Симулятор клеточных автоматов', '/cellular/sim/raw/')


def klsim_raw(request):
    return render(request, 'lab_kl/cellular.html')


# ===== ФАЗОВЫЕ ПОРТРЕТЫ =====
def phase_portrait(request):
    return wrap_view(request, 'Фазовые портреты ДУ', '/phase/raw/')


def phase_portrait_raw(request):
    return render(request, 'custom_labs/phase_portrait_interactive.html')


# ===== КОНЕЧНЫЕ АВТОМАТЫ (DFA) =====
def dfa(request):
    return wrap_view(request, 'Statecraft', '/dfa/raw/')


def dfa_raw(request):
    return render(request, 'automata.html')


# Новые views для лабораторных работ
def labs_index(request):
    """Главная страница со всеми разделами лабораторных работ"""
    sections = []
    for section_id, section_data in LABS_REGISTRY.items():
        sections.append({
            'id': section_id,
            'title': section_data['title'],
            'description': section_data['description'],
            'icon': section_data['icon'],
            'labs_count': len(section_data['labs'])
        })
    return render(request, 'labs/index.html', {'sections': sections})


def labs_section(request, section):
    """Страница раздела со списком лабораторных работ"""
    if section not in LABS_REGISTRY:
        raise Http404("Раздел не найден")
    
    section_data = LABS_REGISTRY[section]
    labs = []
    for lab_id, lab_data in section_data['labs'].items():
        labs.append({
            'id': lab_id,
            'title': lab_data['title'],
            'description': lab_data['description'],
        })
    
    return render(request, 'labs/section.html', {
        'section_id': section,
        'section_title': section_data['title'],
        'section_description': section_data['description'],
        'section_icon': section_data['icon'],
        'labs': labs
    })


def lab_detail(request, section, lab):
    """Страница конкретной лабораторной работы"""
    if section not in LABS_REGISTRY:
        raise Http404("Раздел не найден")
    
    if lab not in LABS_REGISTRY[section]['labs']:
        raise Http404("Лабораторная работа не найдена")
    
    lab_data = LABS_REGISTRY[section]['labs'][lab]

    if section == 'finite_automata' and lab == 'dfa_simulator':
        iframe_src = '/dfa/raw/'
    else:
        iframe_src = f'/static/labs/{section}/{lab}/index.html'
    
    return render(request, 'labs/lab_detail.html', {
        'section_id': section,
        'section_title': LABS_REGISTRY[section]['title'],
        'lab_id': lab,
        'lab_title': lab_data['title'],
        'lab_description': lab_data['description'],
        'iframe_src': iframe_src,
    })


