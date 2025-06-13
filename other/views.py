import json
import subprocess
import os
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt


# Create your views here.
def nash(request):
    return render(request, 'NESH.html')


def index(request):
    return render(request, 'index.html')


def visuphi(request):
    return render(request, 'visuphi/visu.html')


def visuphi_topic(request, sub, topic):
    return render(request, f'visuphi/{sub}/{topic}.html')


@csrf_exempt
def komi(request):
    # logger.info(f"Получен {request.method} запрос")

    if request.method == 'GET':
        try:
            return render(request, 'komi.html')
        except Exception as e:
            # logger.error(f"Ошибка рендера шаблона: {e}")
            return JsonResponse({"error": f"Ошибка шаблона: {str(e)}"}, status=500)

    elif request.method == 'POST':
        try:
            # logger.info("Обрабатываем POST запрос")

            # Проверяем тело запроса
            if not request.body:
                return JsonResponse({"error": "Пустое тело запроса"}, status=400)

            # logger.info(f"Тело запроса: {request.body}")

            data = json.loads(request.body.decode('utf-8'))
            # logger.info(f"Распарсенные данные: {data}")

            if 'matrix' not in data:
                return JsonResponse({"error": "Неверные данные"}, status=400)

            matrix = data['matrix']
            # logger.info(f"Получена матрица: {matrix}")

            # Проверяем наличие C++ программы
            cpp_path = os.path.join(os.getcwd(), "other/komi/komi")
            if not os.path.exists(cpp_path):
                # logger.error(f"C++ программа не найдена по пути: {cpp_path}")
                return JsonResponse({"error": "C++ программа не найдена"}, status=500)

            # Сохраняем матрицу
            json_path = os.path.join(os.getcwd(), "other/komi/matrix_input.json")
            with open(json_path, "w", encoding='utf-8') as f:
                json.dump(matrix, f, ensure_ascii=False, indent=2)
            # logger.info(f"Матрица сохранена в {json_path}")

            # Запускаем C++ программу
            result = subprocess.run(
                [cpp_path],
                capture_output=True,
                text=True,
                check=True,
                timeout=30
            )

            output = result.stdout.strip()
            # logger.info(f"Ответ от C++: {output}")

            if not output:
                return JsonResponse({"error": "C++ программа не вернула результат"}, status=500)

            # Парсим JSON ответ
            parsed_output = json.loads(output)
            # logger.info(f"Распарсенный ответ: {parsed_output}")

            return JsonResponse({
                "path": parsed_output.get("path", []),
                "cost": parsed_output.get("cost", 0),
                "full_result": parsed_output
            })

        except json.JSONDecodeError as e:
            # logger.error(f"Ошибка JSON: {e}")
            return JsonResponse({"error": f"Неверный JSON: {str(e)}"}, status=400)
        except subprocess.TimeoutExpired:
            # logger.error("Таймаут C++ программы")
            return JsonResponse({"error": "Превышено время выполнения"}, status=500)
        except subprocess.CalledProcessError as e:
            # logger.error(f"Ошибка C++: {e}, stderr: {e.stderr}")
            return JsonResponse({"error": f"Ошибка C++: {e.stderr}"}, status=500)
        except Exception as e:
            # logger.error(f"Неожиданная ошибка: {e}")
            return JsonResponse({"error": f"Внутренняя ошибка: {str(e)}"}, status=500)


def klindex(request):
    return render(request, 'lab_kl/index.html')


def klab(request, lab):
    return render(request, f'lab_kl/{lab}.html')


def klsim(request):
    return render(request, 'lab_kl/cellular.html')