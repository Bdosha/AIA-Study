from django.db import models




class CustomLabs(models.Model):
    name = models.CharField(max_length=100, unique=True)
    url = models.CharField(max_length=32, unique=True)
    emojy = models.CharField(max_length=10)
    description = models.TextField(blank=True, null=True)

    file = models.FileField(upload_to='aia/templates/custom_labs/', blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Модуль"
        verbose_name_plural = "Модули"