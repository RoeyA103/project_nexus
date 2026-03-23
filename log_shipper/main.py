from kafka_producer import JSONLogProducer
from read_from_json import FileIngestor
import os


producer = JSONLogProducer(os.getenv("BOOTSTRAP_SERVERS","kafka:9092"),os.getenv("TOPIC_NAME","logs"))
file_ingestor = FileIngestor(producer,os.getenv("FILE_PATH","logs.ndjson"),interval=5)


if __name__ == "__main__":
    file_ingestor.start_monitoring()