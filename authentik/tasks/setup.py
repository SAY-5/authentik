from authentik.tasks import TASK_WORKER

TASK_WORKER.enable()

from authentik.root.setup import setup  # noqa: E402

setup()

import django  # noqa: E402

django.setup()
