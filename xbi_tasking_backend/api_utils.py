from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool


def model_to_dict(payload):
    if hasattr(payload, "model_dump"):
        return payload.model_dump(by_alias=True)
    return payload.dict(by_alias=True)


def error_response(status_code, detail, error_code=None, extra=None):
    payload = {"detail": detail}
    if error_code:
        payload["error"] = error_code
    if extra and isinstance(extra, dict):
        payload.update(extra)
    return JSONResponse(status_code=status_code, content=payload)


async def run_blocking(func, *args, **kwargs):
    return await run_in_threadpool(func, *args, **kwargs)
