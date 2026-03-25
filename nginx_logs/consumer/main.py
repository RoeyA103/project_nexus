import logging, os
from pipeline import NginxConsumerPipeline
from elastic_client import ElasticsearchClient
from consumer import KafkaLogConsumer
from elastic_indexer import ElasticsearchIndexer
from batch_processor import BatchProcessor

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [CONSUMER] %(levelname)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger(__name__)

bootstrap_servers = os.getenv("BOOTSTRAP_SERVERS", "localhost:9092")
topic = os.getenv("KAFKA_TOPIC_NGINX", "nginx-logs")
group_id = "nginx-logs-group"
es_host = os.getenv("ES_HOST", "http://localhost:9200")
es_index = "nginx-logs"
batch_size = int(os.getenv("ES_BATCH_SIZE", 50))

es_client = ElasticsearchClient(host=es_host, index=es_index, log=log)
consumer = KafkaLogConsumer(bootstrap_servers, topic, group_id, log=log)
indexer = ElasticsearchIndexer(es_client.es, es_index, log=log)
batch = BatchProcessor(batch_size, log=log)


if __name__ == "__main__":
    pipeline = NginxConsumerPipeline(
        log=log, es_client=es_client, consumer=consumer, indexer=indexer, batch=batch
    )
    pipeline.run()
