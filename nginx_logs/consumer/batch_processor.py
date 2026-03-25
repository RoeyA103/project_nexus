import logging


class BatchProcessor:
    def __init__(self, batch_size: int, log: logging.Logger):
        self.batch_size = batch_size
        self.batch = []
        self.log = log

    def add(self, item: dict):
        self.batch.append(item)

    def is_full(self) -> bool:
        return len(self.batch) >= self.batch_size 

    def flush(self) -> list[dict]:
        data = self.batch[:]
        self.batch.clear()
        return data

    def has_items(self) -> bool:
        return len(self.batch) > 0

