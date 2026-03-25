import os
import json
import logging
import time
from confluent_kafka import Consumer, KafkaError



class KafkaLogConsumer:
    def __init__(self, bootstrap_servers: str, topic: str, group_id: str, log: logging.Logger):
        self.bootstrap_servers = bootstrap_servers
        self.topic = topic
        self.group_id = group_id
        self.log = log
        self.log.info(
            f"Consumer started — topic: {self.topic}"
        )
        self.consumer = self._connect()
        
    def _connect(self) -> Consumer:
        while True:
            try:
                config = {
                    "bootstrap.servers": self.bootstrap_servers,
                    "group.id": "calculation",
                    "auto.offset.reset": "earliest" 
                }
                consumer = Consumer(config)
                consumer.subscribe([self.topic])
                self.log.info(f"Subscribed to topic: {self.topic} | group: {self.group_id}")
                return consumer
            except KafkaError as e:
                self.log.warning(f"Kafka connection failed — retrying ({e})")
                time.sleep(5)

    def start(self, func):
        while True:
            msg = self.consumer.poll(1.0)  # מחכה שנייה
            if msg is None:
                continue
            if msg.error():
                print("Consumer error:", msg.error())
                continue
            log = json.loads(msg.value().decode("utf-8"))
            func(log)
            print("Received message:", msg.value().decode('utf-8'))




