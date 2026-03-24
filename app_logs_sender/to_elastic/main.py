import os

from consumer import LogConsumer
from elastic_menage import ElasticService


elastic = ElasticService(os.getenv("ELASTICSEARCH_HOSTS","http://elasticsearch:9200"),os.getenv("INDEX_NAME", "project_logs"))
consumer = LogConsumer(os.getenv("BOOTSTRAP_SERVERS","kafka:9092"),os.getenv("TOPIC_NAME","logs"),os.getenv("GROUP_ID","logs_group"),elastic)

if __name__ == "__main__":
    consumer.start_listening()