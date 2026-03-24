import time
import os


class FileIngestor:
    def __init__(self, producer, file_path, interval):
        self.file_path = file_path
        self.producer = producer
        self.interval = interval
        self.last_position = 0

    def start_monitoring(self):
        print(f"[*] Starting to monitor: {self.file_path}")
        try:
            while True:
                self._read_new_lines()
                time.sleep(self.interval)
        except KeyboardInterrupt:
            print("\n[!] Monitoring stopped by user.")

    def _read_new_lines(self):
        if not os.path.exists(self.file_path):
            print(f"[!] File {self.file_path} not found. Waiting...")
            return

        current_size = os.path.getsize(self.file_path)
        if current_size < self.last_position:
            print("[*] File rotated or truncated. Resetting position to 0.")
            self.last_position = 0

        with open(self.file_path, 'r', encoding='utf-8') as f:
            f.seek(self.last_position)

            lines = f.readlines()
            for line in lines:
                line = line.strip()
                if line:
                    self.producer.send_to_kafka(line)
            self.last_position = f.tell()
        self.producer.finalize()