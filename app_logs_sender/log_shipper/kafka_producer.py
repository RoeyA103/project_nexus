import json
from confluent_kafka import Producer


class JSONLogProducer:
    def __init__(self, bootstrap_servers, topic):
        self.topic = topic
        self.producer = Producer({'bootstrap.servers': bootstrap_servers,'queue.buffering.max.ms': 100})

    def _delivery_report(self, err, msg):
        if err is not None:
            print(f"Message delivery failed: {err}")
        else:
            print(f"Message delivered to {msg.topic()} [{msg.partition()}]")

    def send_to_kafka(self, message):
        try:
            json_data = json.loads(message)
            message = json.dumps(json_data).encode('utf-8')
            print(f"[-->] Sending to Kafka: {message[:50]}...")
            self.producer.produce(
                self.topic,
                value=message,
                callback=self._delivery_report
            )
            print("data send")
            self.producer.poll(0)

        except json.JSONDecodeError:
            print(f"[!] Invalid JSON skipped: {message[:50]}...")

    def finalize(self):
        print("[*] Ensuring all messages are sent...")
        self.producer.flush()