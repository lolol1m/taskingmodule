def build_in_clause(values):
    """
    Build placeholders for SQL IN (...) and return (placeholders, tuple(values)).
    Returns (None, ()) if values is empty.
    """
    items = list(values or [])
    if not items:
        return None, ()
    placeholders = ",".join(["%s"] * len(items))
    return placeholders, tuple(items)
