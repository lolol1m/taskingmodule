from typing import Optional

from main_classes.ConfigClass import ConfigClass

_config: Optional[ConfigClass] = None


def load_config(config_file_path: str = "", env_mode: bool = False) -> ConfigClass:
    global _config
    if not config_file_path:
        print("Warning: config_file_path not set, this should only be done if env_mode is True", f"env_mode: {env_mode}")
        if not env_mode:
            raise RuntimeError("Missing config file path. Set env_mode=True to read environment variables")
    if env_mode:
        _config = ConfigClass()
    else:
        _config = ConfigClass(config_file_path)
    return _config


def get_config() -> ConfigClass:
    if _config is None:
        raise RuntimeError("Config is not initialized. Call load_config() first.")
    return _config
