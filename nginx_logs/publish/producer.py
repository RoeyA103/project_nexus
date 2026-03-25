import json
import time
import logging
from confluent_kafka import Producer, KafkaError



class KafkaLogProducer:
    def __init__(self, bootstrap_servers: str, topic: str, log: logging.Logger):
        self.bootstrap_servers = bootstrap_servers
        self.topic = topic
        self.log = log
        self.producer = self._connect()

    def _connect(self) -> Producer:
        while True:
            try:
                producer = Producer({"bootstrap.servers": self.bootstrap_servers})
                self.log.info(f"Connected to Kafka bootstrap_servers: {self.bootstrap_servers}")
                return producer
            except KafkaError as e:
                self.log.warning(f"Kafka connection failed — retrying ({e})")
                time.sleep(5)
                
    def send_messages(self, messages):
        success = 0
        failed = 0

        def delivery_report(err, msg):
            nonlocal success, failed
            if err is not None:
                failed += 1
                self.log.error(f"Delivery failed: {err}")
            else:
                success += 1

        for msg in messages:
            try:
                self.producer.produce(
                    topic=self.topic, value=json.dumps(msg), callback=delivery_report
                )
            except BufferError as e:
                self.log.error("error: %s",e)

            self.producer.poll(0)


        self.log.info(f"Sent: {success}, Failed: {failed}")
        return success, failed
    
    
    
    
    