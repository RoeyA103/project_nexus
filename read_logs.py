import json

LOG_FILE = 'logs.ndjson'

def read_logs():
    """קרא את כל הלוגים מהקובץ"""
    logs = []
    with open(LOG_FILE, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                logs.append(json.loads(line))
    return logs

def read_logs_live():
    """קרא לוגים חדשים בזמן אמת (tail -f)"""
    with open(LOG_FILE, 'r', encoding='utf-8') as f:
        f.seek(0, 2)  # קפוץ לסוף הקובץ
        print("ממתין ללוגים חדשים...")
        while True:
            line = f.readline()
            if line:
                log = json.loads(line.strip())
                yield log

# דוגמת שימוש
if __name__ == '__main__':
    logs = read_logs()
    print(f"סה״כ {len(logs)} לוגים")
    
    # סנן רק מתקפות
    attacks = [l for l in logs if l['level'] == 'critical']
    print(f"מתקפות: {len(attacks)}")
    
    for log in attacks:
        print(f"[{log['timestamp']}] {log['ip']} → {log['message']}")
