import logging, time
from elasticsearch import Elasticsearch, helpers, ConnectionError as ESConnectionError


class ElasticsearchClient:
    def __init__(self, host: str, index: str, log: logging.Logger):
        self.host = host
        self.index = index
        self.mapping = {
            "mappings": {
                "properties": {
                    "timestamp": {"type": "date"},
                    "ip": {"type": "ip"},
                    "method": {"type": "keyword"},
                    "path": {"type": "keyword"},
                    "status": {"type": "integer"},
                    "bytes_sent": {"type": "integer"},
                    "user_agent": {
                        "type": "text",
                        "fields": {"keyword": {"type": "keyword"}},
                    },
                    "referer": {"type": "keyword"},
                    "source": {"type": "keyword"},
                }
            }
        }
        self.log = log
        self.es = self._connect()
        self._ensure_index()

    def _connect(self) -> Elasticsearch:
        while True:
            try:
                es = Elasticsearch(self.host)
                es.info()
                self.log.info(f"Connected to Elasticsearch: {self.host}")
                return es
            except ESConnectionError as e:
                self.log.warning(f"Elasticsearch unavailable — retrying ({e})")
                time.sleep(5)

    def _ensure_index(self):
        if not self.es.indices.exists(index=self.index):
            self.es.indices.create(index=self.index, body=self.mapping)
            self.log.info(f"Created index: {self.index}")
        else:
            self.log.info(f"Index already exists: {self.index}")
