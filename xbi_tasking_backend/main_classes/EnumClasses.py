from enum import Enum

class ValueEnum(Enum):
    @classmethod
    def from_value(cls, value):
        try:
            return cls(value)
        except ValueError:
            return None

class ParadeStateStatus(ValueEnum):
    PRESENT = "At Work (In Unit)"
    ABSENT = "Duty Off"
    OTHERS = "Others"