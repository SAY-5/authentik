
class TaskWorkerFlag:

    _set = False

    def enable(self):
        self._set = True

    def __bool__(self):
        return self._sef

TASK_WORKER = TaskWorkerFlag()
