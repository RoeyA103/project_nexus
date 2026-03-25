import logging, time
from elastic_client import ElasticsearchClient
from consumer import KafkaLogConsumer
from elastic_indexer import ElasticsearchIndexer
from batch_processor import BatchProcessor


class NginxConsumerPipeline:
    def __init__(
        self,
        log: logging.Logger,
        es_client: ElasticsearchClient,
        consumer: KafkaLogConsumer,
        indexer: ElasticsearchIndexer,
        batch : BatchProcessor
    ):
        self.log = log
        self.es_client = es_client
        self.consumer = consumer
        self.indexer = indexer
        self.batch = batch
        self.start_time = time.time()

        self.total_indexed = 0
        
    def handle_log(self, log : dict):
        self.batch.add(log)

        if self.batch.is_full() or time.time() - self.start_time >= 5:
            self.start_time = time.time()
            docs = self.batch.flush()
            n = self.indexer.bulk_index(docs)
            self.total_indexed += n
            self.log.info(
                f"Indexed {n} documents | total: {self.total_indexed}"
            )
    def run(self):
        self.consumer.start(self.handle_log)


