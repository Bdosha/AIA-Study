from django.urls import path, include
from labkib import views


black_box_url = [
    path('', views.systems),
    path('<str:system>/', views.main_work),

]

feedback_url = [
    path('', views.feedback),
    path('<str:system>/', views.get_fb),
]

regulation_url = [
    path('', views.regulation),
    path('PID/', views.pid),
]

control_url = [
    path('', views.control),
    path('track/', views.get_control),
]

urlpatterns=[
    path('', views.lab_index),
    path('systems/', include(black_box_url)),
    path('feedback/', include(feedback_url)),
    path('regulation/', include(regulation_url)),
    path('control/', include(control_url)),
]