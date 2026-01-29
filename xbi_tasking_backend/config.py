from typing import Optional

from main_classes.ConfigClass import ConfigClass

_config: Optional[ConfigClass] = None


def load_config(config_file_path: str) -> ConfigClass:
    global _config
    _config = ConfigClass(config_file_path)
    return _config


def get_config() -> ConfigClass:
    if _config is None:
        raise RuntimeError("Config is not initialized. Call load_config() first.")
    return _config
