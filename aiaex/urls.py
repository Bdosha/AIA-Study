from labkib import urls
from other import views
from django.urls import path, include
from django.contrib import admin

url_kl = [
    path('', views.klindex),
    path('sim', views.klsim),
    path('<str:lab>/', views.klab),
]

url_other = [
    path('', views.index),
    path('nash/', views.nash),
    path('komi/', views.komi),

    path('visuphi/', views.visuphi),
    path('visuphi/<str:sub>/<str:topic>', views.visuphi_topic),

    path('dfa/', views.dfa),

    path('<str:custom>/', views.custom_lab),
]

urlpatterns = [

    path('admin/', admin.site.urls),
    path('cellular/', include(url_kl)),
    path('labkib/', include(urls.urlpatterns)),
    path('', include(url_other))

]
