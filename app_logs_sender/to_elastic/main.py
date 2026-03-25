import os

from consumer import LogConsumer
from elastic_menage import ElasticService


elastic = ElasticService(os.getenv("ELASTICSEARCH_HOSTS","http://elasticsearch:9200"),os.getenv("INDEX_NAME", "project_logs"))
consumer = LogConsumer(bootstrap_servers=os.getenv("BOOTSTRAP_SERVERS","kafka:9092"),topic=os.getenv("TOPIC_NAME","logs"),
                       group_id=os.getenv("GROUP_ID","logs"),elastic_service=elastic)

if __name__ == "__main__":
    consumer.start_listening()