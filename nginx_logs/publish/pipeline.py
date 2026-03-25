import os
import time
import logging
from reader import NginxLogReader
from producer import KafkaLogProducer


class NginxKafkaPipeline:
    def __init__(
        self,
        nginxLogReader: NginxLogReader,
        kafkaLogProducer: KafkaLogProducer,
        log: logging.Logger,
    ):
        self.broker = os.getenv("KAFKA_BROKER", "localhost:9092")
        self.topic = os.getenv("KAFKA_TOPIC_NGINX", "nginx-logs")
        self.log_path = os.getenv("NGINX_LOG_PATH", "../nginx/logs/access.log")
        self.interval = int(os.getenv("POLL_INTERVAL_SECS", 5))
        self.offset_file = os.getenv("NGINX_OFFSET_FILE", "nginx_offset.txt")
        self.log = log

        self.reader = nginxLogReader
        self.producer = kafkaLogProducer
        self.total_sent = 0

    def run(self):
        self.log.info(f"Pipeline started — file: {self.log_path} | topic: {self.topic}")

        while True:
            try:
                messages = self.reader.read_new()

                if not messages:
                    self.log.info("no messages") 
                    time.sleep(self.interval)
                    continue
                self.log.info("len messages is %s", len(messages))

                success, failed = self.producer.send_messages(messages)
                self.total_sent += success
                self.log.info(
                    f"Sent: {success} messages, failed: {failed}messages, (total: {self.total_sent})"
                )

            except Exception as e:
                self.log.error(f"Unexpected error: {e}")

            time.sleep(self.interval)
