import logging, os
from pipeline import NginxKafkaPipeline
from offset import OffsetManager
from reader import NginxLogReader
from producer import KafkaLogProducer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [PRODUCER] %(levelname)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
my_log = logging.getLogger(__name__)


bootstrap_servers = os.getenv("BOOTSTRAP_SERVERS", "localhost:9092")
topic = os.getenv("KAFKA_TOPIC_NGINX", "nginx-logs")
log_path = os.getenv("NGINX_LOG_PATH")
interval = int(os.getenv("POLL_INTERVAL_SECS", 5))
offset_file = os.getenv("NGINX_OFFSET_FILE", "nginx_offset.txt")


offset = OffsetManager(offset_file=offset_file)
reader = NginxLogReader(log_path=log_path, offset_manager=offset, log=my_log)
producer = KafkaLogProducer(bootstrap_servers=bootstrap_servers, topic=topic, log=my_log)


if __name__ == "__main__":
    pipeline = NginxKafkaPipeline(
        nginxLogReader=reader, kafkaLogProducer=producer, log=my_log
    )
    pipeline.run()
