from labkib import urls
from other import views
from django.urls import path, include

# Клеточные автоматы (с обёрткой и raw)
url_kl = [
    path('', views.klindex),
    path('raw/', views.klindex_raw),
    path('sim/', views.klsim),
    path('sim/raw/', views.klsim_raw),
    path('<str:lab>/', views.klab),
    path('raw/<str:lab>/', views.klab_raw),
]

# Маршруты для ДМ-3: Автоматы
labs_patterns = [
    path('', views.labs_index),
    path('<str:section>/', views.labs_section),
    path('<str:section>/<str:lab>/', views.lab_detail),
]

# Основные маршруты (с обёрткой и raw)
url_other = [
    path('', views.index),
    
    # Теория игр
    path('nash/', views.nash),
    path('nash/raw/', views.nash_raw),
    
    # Задача коммивояжёра
    path('komi/', views.komi),
    path('komi/raw/', views.komi_raw),
    
    # Визуализация функций
    path('visuphi/', views.visuphi),
    path('visuphi/raw/', views.visuphi_raw),
    path('visuphi/<str:sub>/<str:topic>', views.visuphi_topic),
    path('visuphi/raw/<str:sub>/<str:topic>', views.visuphi_topic_raw),
    
    # Конечные автоматы (DFA)
    path('dfa/', views.dfa),
    path('dfa/raw/', views.dfa_raw),
    
    # Фазовые портреты
    path('phase/', views.phase_portrait),
    path('phase/raw/', views.phase_portrait_raw),
]

urlpatterns = [
    path('labs/', include(labs_patterns)),
    path('cellular/', include(url_kl)),
    path('labkib/', include(urls.urlpatterns)),
    path('', include(url_other))
]
