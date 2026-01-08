"""
URL-маршруты для модуля кибернетики.

Упрощённая структура:
- /labkib/ - главная страница со всеми лабами
- /labkib/{lab}/ - страница конкретной лабораторной работы
- /labkib/legacy/... - старые URL для совместимости (внутренние лабы с бэкендом)
"""

from django.urls import path, include
from labkib import views


# Legacy URLs (старые лабораторные работы с бэкендом)
legacy_black_box_url = [
    path('', views.systems),
    path('<str:system>/', views.main_work),
]

legacy_feedback_url = [
    path('', views.feedback),
    path('<str:system>/', views.get_fb),
]

legacy_regulation_url = [
    path('', views.regulation),
    path('PID/', views.pid),
]

legacy_control_url = [
    path('', views.control),
    path('track/', views.get_control),
]

legacy_patterns = [
    path('systems/', include(legacy_black_box_url)),
    path('feedback/', include(legacy_feedback_url)),
    path('regulation/', include(legacy_regulation_url)),
    path('control/', include(legacy_control_url)),
]


# Основные URL
urlpatterns = [
    # Главная страница модуля
    path('', views.labkib_index, name='labkib_index'),
    
    # Legacy URL для обратной совместимости
    path('legacy/', include(legacy_patterns)),
    
    # Страница конкретной лабораторной работы
    path('<str:lab>/', views.labkib_detail, name='labkib_detail'),
]
