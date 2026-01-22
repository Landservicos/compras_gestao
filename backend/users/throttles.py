from rest_framework.throttling import AnonRateThrottle

class CheckTenantThrottle(AnonRateThrottle):
    rate = '5/min' # Permite apenas 5 tentativas por minuto por IP

class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'
    rate = '5/min'
