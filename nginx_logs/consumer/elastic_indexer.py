import logging
from elasticsearch import Elasticsearch, helpers, ConnectionError as ESConnectionError


class ElasticsearchIndexer:
    def __init__(self, es: Elasticsearch, index: str, log: logging.Logger):
        self.es = es
        self.index = index
        self.log = log
        
    def bulk_index(self, documents: list[dict]) -> int:
        if not documents:
            return 0
        self.log.info("vvvvvvv2")

        actions = [{"_index": self.index, "_source": doc} for doc in documents]
        success, errors = helpers.bulk(self.es, actions, raise_on_error=False)

        if errors:
            self.log.warning(f"{len(errors)} documents failed to index")

        return success

