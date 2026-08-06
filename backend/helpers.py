
import os
import re
import json
from datetime import datetime, timezone

from config import LOG_DIR

_LATEX_SPECIAL = {
    "&": r"\&",
    "%": r"\%",
    "$": r"\$",
    "#": r"\#",
    "_": r"\_",
    "~": r"\textasciitilde{}",
    "^": r"\textasciicircum{}",
}

def sanitise_latex(text: str) -> str:
    return re.sub(
        r"[&%$#_~^]",
        lambda m: _LATEX_SPECIAL.get(m.group(), m.group()),
        str(text),
    )

def sanitise_dict(obj):
    if isinstance(obj, str):  return sanitise_latex(obj)
    if isinstance(obj, list): return [sanitise_dict(i) for i in obj]
    if isinstance(obj, dict): return {k: sanitise_dict(v) for k, v in obj.items()}
    return obj

def write_log(record: dict, prefix: str = "session") -> None:
    date_str  = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    log_path  = os.path.join(LOG_DIR, f"{prefix}_{date_str}.jsonl")
    with open(log_path, "a") as f:
        f.write(json.dumps(record) + "\n")
