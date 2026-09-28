#!/usr/bin/env python3
"""Coleta páginas públicas para uma pesquisa reproduzível, sem sobrecarregar o host."""

from __future__ import annotations

import argparse
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def fetch(url: str, timeout: float) -> dict[str, object]:
    started = time.monotonic()
    request = Request(url, headers={"User-Agent": "cceak-public-research/1.0"})
    try:
        with urlopen(request, timeout=timeout) as response:
            raw = response.read(1_000_000)
            text = raw.decode(response.headers.get_content_charset() or "utf-8", errors="replace")
            return {"url": url, "status": response.status, "content_type": response.headers.get_content_type(), "body": text, "elapsed_ms": round((time.monotonic() - started) * 1000)}
    except (HTTPError, URLError, TimeoutError, UnicodeError) as error:
        return {"url": url, "error": str(error), "elapsed_ms": round((time.monotonic() - started) * 1000)}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--workers", type=int, default=4, help="requisições simultâneas; padrão: 4")
    parser.add_argument("--timeout", type=float, default=20.0)
    args = parser.parse_args()
    if not 1 <= args.workers <= 16:
        parser.error("--workers deve estar entre 1 e 16")
    urls = [line.strip() for line in args.input.read_text(encoding="utf-8").splitlines() if line.strip() and not line.lstrip().startswith("#")]
    with ThreadPoolExecutor(max_workers=args.workers, thread_name_prefix="cceak-fetch") as pool:
        futures = {pool.submit(fetch, url, args.timeout): url for url in urls}
        results = [future.result() for future in as_completed(futures)]
    results.sort(key=lambda item: str(item["url"]))
    args.output.write_text(json.dumps({"generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "results": results}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(results)} fonte(s) processada(s); saída: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
