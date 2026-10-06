from django.urls import path
from . import views

urlpatterns = [
    path('plan-trip/', views.PlanTripView.as_view(), name='plan_trip'),
    path('geocode/', views.GeocodeView.as_view(), name='geocode'),
]
