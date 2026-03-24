from elasticsearch import Elasticsearch

class ElasticService:
    def __init__(self, host, index_name):
        self.es = Elasticsearch(host)
        self.index_name = index_name
        self._create_index_with_mapping()

    def _create_index_with_mapping(self):
        mapping = {
            "mappings": {
                "properties": {
                    "timestamp": {"type": "date"},
                    "event": {"type": "keyword"},
                    "user": {"type": "keyword"},
                    "status": {"type": "keyword"},
                    "ip": {"type": "ip"},
                    "details": {
                        "properties": {
                            "product_id": {"type": "integer"},
                            "product_name": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
                            "price": {"type": "float"},
                            "category": {"type": "keyword"},
                            "sort_by": {"type": "keyword"}
                        }
                    }
                }
            }
        }

        if not self.es.indices.exists(index=self.index_name):
            self.es.indices.create(index=self.index_name, body=mapping)
            print(f"[*] Index '{self.index_name}' created successfully.")
        else:
            print(f"[*] Index '{self.index_name}' already exists.")

    def index_log(self, log_data):
        try:
            response = self.es.index(index=self.index_name, document=log_data)
            return response['_id']
        except Exception as e:
            print(f"[!] Elastic Search Index Error: {e}")
            return None