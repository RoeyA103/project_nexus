import json
from confluent_kafka import Consumer, KafkaError


class LogConsumer:
    def __init__(self, bootstrap_servers, topic,group_id ,elastic_service):
        self.consumer = self.consumer = Consumer({'bootstrap.servers':bootstrap_servers,
                                  'group.id': group_id,
                                  'auto.offset.reset':'earliest'})
        self.consumer.subscribe([topic])
        self.elastic_service = elastic_service

    def start_listening(self):
        print(f"[*] Started listening for logs on Kafka...")
        try:
            while True:
                msg = self.consumer.poll(1.0)

                if msg is None:
                    print("no data")
                    continue
                if msg.error():
                    if msg.error().code() == KafkaError._PARTITION_EOF:
                        continue
                    else:
                        print(f"[!] Kafka error: {msg.error()}")
                        break

                self._handle_message(msg)

        except KeyboardInterrupt:
            print("\n[!] Consumer stopped by user.")
        finally:
            self.consumer.close()

    def _handle_message(self, msg):
        try:
            raw_value = msg.value().decode('utf-8')
            log_data = json.loads(raw_value)

            print(log_data)

            doc_id = self.elastic_service.index_log(log_data)

            if doc_id:
                print(f"[+] Log processed: {log_data.get('event', 'unknown')} | ES_ID: {doc_id}")

        except Exception as e:
            print(f"[!] Error processing message: {e}")

