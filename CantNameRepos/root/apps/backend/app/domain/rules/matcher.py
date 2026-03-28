from typing import Any


def conditions_match(payload: dict[str, Any], conditions: dict[str, Any]) -> bool:
    for key, expected in conditions.items():
        actual = payload.get(key)
        if actual != expected:
            return False
    return True
