

class OffsetManager:
    def __init__(self, offset_file: str):
        self.offset_file = offset_file

    def read(self) -> int:
        try:
            with open(self.offset_file) as f:
                return int(f.read().strip())
        except Exception:
            return 0

    def save(self, pos: int) -> None:
        with open(self.offset_file, "w") as f:
            f.write(str(pos))


