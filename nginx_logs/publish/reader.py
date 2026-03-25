import os
import json
import logging
from offset import OffsetManager


class NginxLogReader:
    def __init__(
        self, log_path: str, offset_manager: OffsetManager, log: logging.Logger
    ):
        self.log_path = log_path
        self.offset_manager = offset_manager
        self.log = log

    def read_new(self) -> list[dict]:
        
        if not os.path.exists(self.log_path):
            self.log.warning(f"Log file not found: {self.log_path}")
            return []

        offset = self.offset_manager.read()
        file_size = os.path.getsize(self.log_path)

        # log rotation
        if file_size < offset:
            self.log.info("Log rotation detected — resetting offset")
            offset = 0

        if file_size == offset:
            return []

        messages = []
        
        if offset > file_size:
            self.log.warning("Offset larger than file size — resetting")
            return []
    
        with open(self.log_path, "r", encoding="utf-8") as f:
            f.seek(offset)

            for raw_line in f:
                line = raw_line.strip()
                if not line:
                    continue

                try:
                    msg = json.loads(line)
                    messages.append(msg)
                except json.JSONDecodeError:
                    continue

            self.offset_manager.save(f.tell())

        return messages
