import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent / 'backend'
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eld.settings')

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
