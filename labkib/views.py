from random import choice
import numpy as np
from sklearn.linear_model import LinearRegression
import matplotlib.pyplot as plt
from sklearn.metrics import mean_absolute_error
from PIL.ImagePalette import random
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render
from random import random, randint, uniform
import os
import json


def get_table_data(data):
    table_data = json.loads(data)

    x = table_data.split('\n')[0].split(',')[1:]
    y = table_data.split('\n')[1].split(',')[1:]
    x = list(map(float, x))
    y = list(map(float, y))
    return x, y


def clear_data():
    folder = 'static/graphics'
    for filename in os.listdir(folder):
        os.remove(os.path.join(folder, filename))


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
    plt.rc('font', size=13)

    plt.plot(x1, y1, color='red', label='Линия регрессии')
    plt.scatter(x_train, y_train, color='blue', label='Данные')

    plt.xlim(min(x) - 5, max(x) + 5)
    plt.ylim(min(y) - 5, max(y) + 5)

    plt.xlabel('Вход')
    plt.ylabel('Выход')
    plt.title('Система')
    plt.legend()
    plt.grid(True)
    file = randint(10000, 1000000)
    plt.savefig(f"static/graphics/{file}.jpg")
    plt.savefig("output1", facecolor='y', bbox_inches="tight",
                pad_inches=0.3, transparent=True)

    y_pred = model.predict(x_train)

    mae = mean_absolute_error(y_train, y_pred)

    return k, b, file, mae


def systems(request: HttpRequest):
    # from django.http import HttpResponseRedirect
    # if not request.COOKIES.get('good'):
    #     return HttpResponseRedirect('/sorry')
    return render(request, 'lab/black_box/boxes.html')


def main_work(request: HttpRequest, system):
    # from django.http import HttpResponseRedirect
    # if not request.COOKIES.get('good'):
    #     return HttpResponseRedirect('/sorry')
    if request.method == 'POST':
        temp = request.POST.get('table_data')
        if temp:
            x,y = get_table_data(temp)
            if not x:
                return HttpResponse('no data')
            k, b, file, mae = get_linear_regression(x, y)
            data = {'k': round(k, 2), 'b': round(b, 2), 'file': f'/static/graphics/{file}.jpg', 'mae': round(mae, 2),
                    'x': x, 'y': y}

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
    text = {'phone': '📱 Мобильный телефон: как быстро разрядится батарея в зависимости от времени разговора?',
            'plant': '🌱 Рост растения: какой будет высота растения в зависимости от полива?',
            'seeds': '🌻 Вес семян: сколько будет весить кучка семян в зависимости от количества семян в ней?',
            'car': '🚗 Скорость автомобиля: с какой скоростью поедет автомобиль в зависимости от силы нажатия на педаль акселерации?',
            'unknown': '❓ Неведомое: что ответит неведомое создание на вопрос?'}

    data = {'system': system, 'kbu': [i / 1.2 for i in kbu[system]], 'slider': slider[system], 'inout': inout[system],
            'text': text[system], 'photo': f'/static/img/{system}.jpg', 'action': f'/systems/{system}/'}
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

    plt.rc('font', size=13)

    plt.scatter(x1, y1, color='red', label='Данные')
    plt.scatter(x0, y0, color='green', label='Вершина')
    plt.scatter(final_x, final_y, color='purple', label='Итог')

    plt.plot(x, y)
    plt.legend()
    plt.grid(True)

    # temp_x = np.array(xes + [round(-b / (2 * a), 2)])
    # plt.xlim(-min(temp_x) - 3, max(temp_x) + 3)
    # plt.title('Система')
    # file = randint(1000, 10000000)
    # plt.savefig(f"feedback/static/graphics/{file}.jpg")

    plt.xlim(-33, 33)
    plt.title('Полный график')
    filee = randint(1000, 10000000)
    plt.savefig(f"static/graphics/{filee}.jpg")
    plt.gcf().clear()

    plt.rc('font', size=13)

    plt.scatter(x0, y0, color='green', label='Вершина')
    plt.scatter(final_x, final_y, color='purple', label='Ваш ответ')
    plt.axvline(x0, color='green')
    plt.axvline(final_x, color='purple')
    plt.plot(x, y)
    plt.legend()
    plt.grid(True)
    plt.xlim(x0 - 2, x0 + 2)
    plt.title('Оптимальные значения')
    file = randint(1000, 10000000)

    plt.axvline(x=x0 - 0.7, color='r', label='Ограничения')
    plt.axvline(x=x0 + 0.7, color='r')
    plt.legend()

    plt.savefig(f"static/graphics/{file}.jpg")

    return x0, round(abs(number - x0), 2), file, filee, cool


def get_fb(request: HttpRequest, system):
    # from django.http import HttpResponseRedirect
    # if not request.COOKIES.get('good'):
    #     return HttpResponseRedirect('/sorry')
    if request.method == 'POST':
        table_data = request.POST.get('table_data')
        a = float(request.POST.get('a').replace(',', '.'))
        b = float(request.POST.get('b').replace(',', '.'))
        c = float(request.POST.get('c').replace(',', '.'))
        number = float(request.POST.get('number').replace(',', '.'))
        if table_data:
            x, y = get_table_data(table_data)
            x0, delta, file, filee, cool = make_parabola(a, b, c, x, number)
            data = {'x0': x0, 'file': f'/static/graphics/{file}.jpg',
                    'filee': f'/static/graphics/{filee}.jpg',
                    'cool': cool,
                    'lens': len(x),
                    'delta': delta,
                    'x': x, 'y': y}

            return render(request, 'lab/feedback/result.html', context=data)
    abc = random_c()

    inout = {
        'gradient': ['точка', 'Производная в точке'],
        'ternary_search': ['точка', 'Значение'],
        'simple': ['точка', 'Расстояние до минимума']
    }
    text = {'gradient': '🦄 С помощью производной вам нужно найти минимум функции с помощью Градиентного спуска',
            'ternary_search': '🔎 Алгоритмы добрались даже сюда. Здесь, ориентируясь по значеням функции нужно найти ее минимум',
            'simple': '📊 Через перебор значений нужно подобраться к минимуму как можно ближе'}

    data = {'system': system,
            'abc': abc,
            'inout': inout[system],
            'text': text[system],
            'action': f'/feedback/{system}/'
            }
    return render(request, f'lab/feedback/feedback.html', context=data)


def feedback(request):
    # from django.http import HttpResponseRedirect
    # if not request.COOKIES.get('good'):
    #     return HttpResponseRedirect('/sorry')
    return render(request, 'lab/feedback/feedbacks.html')


def graphic(v, t, e, b, w, last_t):
    clear_data()
    plt.gcf().clear()
    # create 1000 equally spaced points between -10 and 10
    x = np.linspace(0, max(last_t, 8), 1000)
    x1 = np.array(last_t)
    y1 = v + 2.7 ** (-b * x1) * np.cos(w * x1)
    # calculate the y value for each element of the x vector
    y = v + 2.7 ** (-b * x) * np.cos(w * x)
    fig, ax = plt.subplots()
    ax.plot(x, y)
    ax.scatter(x1, y1, color='purple', label='Найденное минимальное время')
    ax.axhline(y=v - e, color='red', linestyle='--', linewidth=2, label='Допустимое отклонение')
    ax.axhline(y=v + e, color='red', linestyle='--', linewidth=2)

    # Вертикальная линия на уровне x=3
    ax.axvline(x=t, color='green', linestyle=':', linewidth=2, label='Максимальное время')
    ax.legend()
    filee = randint(1000, 10000000)
    plt.savefig(f"static/graphics/{filee}.jpg")
    return filee


def regulation(request):
    # from django.http import HttpResponseRedirect
    # if not request.COOKIES.get('good'):
    #     return HttpResponseRedirect('/sorry')
    return render(request, 'lab/regulation/regulations.html')


def pid(request):
    # from django.http import HttpResponseRedirect
    # if not request.COOKIES.get('good'):
    #     return HttpResponseRedirect('/sorry')
    if request.method == 'POST':
        con = {'v': float(request.POST['v'].replace(',', '.')),
               'b': float(request.POST['b'].replace(',', '.')),
               'w': float(request.POST['w'].replace(',', '.')),
               't': float(request.POST['t'].replace(',', '.')),
               'e': float(request.POST['e'].replace(',', '.'))}

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

    con = {'v': round(uniform(5, 10), 2),
           't': round(uniform(1, 3.5), 2),
           'e': round(uniform(0.1, 0.5), 2),
           'b': round(uniform(0.1, 0.9), 2),
           'w': round(uniform(2, 10), 2)}

    return render(request, 'lab/regulation/regulation.html', context=con)


# Create your views here.

def control(request):
    # from django.http import HttpResponseRedirect
    # if not request.COOKIES.get('good'):
    #     return HttpResponseRedirect('/sorry')
    return render(request, 'lab/control/controls.html')


def get_control(request):
    # from django.http import HttpResponseRedirect
    # if not request.COOKIES.get('good'):
    #     return HttpResponseRedirect('/sorry')
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

        with open(f'static/works/{d}.txt', "w") as f:
            f.write(text)
            f.close()
        con['tx'] = text
        return render(request, 'lab/control/result.html', context=con)

    return render(request, 'lab/control/control.html')


def lab_index(request):
    # if not request.COOKIES.get('good'):
    #     return HttpResponseRedirect('/sorry')
    return render(request, 'lab/index.html')
