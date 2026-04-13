import pytz

datetime_format = "%Y-%m-%d, %H:%M:%S"
SGT = pytz.timezone('Asia/Singapore')


def to_sgt(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = pytz.utc.localize(dt)
    return dt.astimezone(SGT)


def format_sgt(dt):
    if dt is None:
        return ''
    return to_sgt(dt).strftime(datetime_format)