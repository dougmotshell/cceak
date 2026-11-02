"""Utilitários compartilhados pelos subcomandos do `pe`.

Sem dependências externas: só biblioteca padrão do Python.
"""

from __future__ import annotations

import datetime as _dt
import os
import re
import sys
import unicodedata
import urllib.parse
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent

TICKETS = RAIZ / "tickets"
PALESTRAS = RAIZ / "palestras"
BIBLIOTECA = RAIZ / "biblioteca"
# Fontes autoradas continuam em docs/uso; biblioteca/metadata descreve o que indexar.
RAW = RAIZ / "docs" / "uso"
EXTRAIDO = BIBLIOTECA / "extraido"
METADADOS = BIBLIOTECA / "metadata"
RAG = RAIZ / "rag"
INDICE = RAG / "index"
BANCO = INDICE / "acervo.db"
AGENTES = RAIZ / ".claude" / "agents"
TEMPLATES = RAIZ / "templates"
MEMORIA = RAIZ / "memory"
SAIDA = RAIZ / "saida"

# Ordem canônica do devloop. Mover um ticket de pasta é mudar seu estado.
# A ordem só governa a exibição; quais estados um ticket pode visitar depende do TIPO dele.
ESTADOS = [
    "novo",
    "triagem",
    "acervo",
    "pesquisa",
    "sintese",
    "producao",
    "desenho",
    "implementacao",
    "revisao",
    "aprovado",
    "arquivado",
]

# Famílias de trabalho. Cada uma tem prefixo de ID próprio e a sua trilha de estados.
#
# Por que trilhas separadas: "acervo", "pesquisa", "sintese" e "producao" descrevem a produção de
# uma palestra e não significam nada para um trabalho de desenvolvimento do estúdio. Reusar a
# mesma pasta com outro sentido foi o que deixou o PE-0001 — que é trabalho de acervo — parecendo
# uma palestra na listagem. Cada nome de pasta diz uma coisa só.
#
# Por que prefixos separados: o identificador passa a dizer a natureza do trabalho onde ele é
# lido, sem abrir o arquivo — no nome do arquivo, no commit e na conversa.
TIPOS: dict[str, dict] = {
    "palestra": {
        "prefixo": "PE",
        "rotulo": "palestra",
        "modelo": "palestra.md",
        "trilha": ["novo", "triagem", "acervo", "pesquisa", "sintese", "producao",
                   "revisao", "aprovado", "arquivado"],
    },
    "projeto": {
        "prefixo": "DEV",
        "rotulo": "projeto",
        "modelo": "projeto.md",
        "trilha": ["novo", "triagem", "desenho", "implementacao", "revisao",
                   "aprovado", "arquivado"],
    },
    "agente": {
        "prefixo": "AG",
        "rotulo": "agente",
        "modelo": "agente.md",
        "trilha": ["novo", "triagem", "implementacao", "revisao", "aprovado", "arquivado"],
    },
    "acervo": {
        "prefixo": "AC",
        "rotulo": "acervo",
        "modelo": "acervo.md",
        "trilha": ["novo", "triagem", "acervo", "revisao", "aprovado", "arquivado"],
    },
}

# Prefixos herdados: identificador nunca se reescreve, nem se reaproveita. Tickets abertos antes
# dos prefixos por família ficam com o `PE-` que têm — inclusive os que não são palestra. O tipo
# no frontmatter continua sendo a verdade sobre a natureza do trabalho.
PREFIXOS = {dados["prefixo"]: nome for nome, dados in TIPOS.items()}


def tipo_de(meta: dict) -> str:
    """Tipo declarado no ticket, com `palestra` como padrão para ticket antigo sem o campo."""
    tipo = str(meta.get("tipo", "") or "").strip().lower()
    return tipo if tipo in TIPOS else "palestra"


def trilha_de(tipo: str) -> list[str]:
    return TIPOS.get(tipo, TIPOS["palestra"])["trilha"]


# --------------------------------------------------------------------------- texto


def slug(texto: str, limite: int = 60) -> str:
    """Converte um título em kebab-case sem acentos, seguro para nome de arquivo."""
    normal = unicodedata.normalize("NFKD", texto)
    ascii_ = "".join(c for c in normal if not unicodedata.combining(c))
    ascii_ = ascii_.lower()
    ascii_ = re.sub(r"[^a-z0-9]+", "-", ascii_).strip("-")
    return ascii_[:limite].strip("-") or "sem-titulo"


def sem_acento(texto: str) -> str:
    normal = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in normal if not unicodedata.combining(c))


# Parâmetros de rastreamento que não mudam o recurso apontado — removidos para que a mesma
# página chegada por caminhos diferentes seja reconhecida como uma só.
_PARAMS_RASTREIO = re.compile(r"^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$|ref$|source$)")


def normalizar_url(url: str) -> str:
    """Forma canônica de uma URL, para deduplicação no acervo e na fila de garimpo."""
    partes = urllib.parse.urlsplit(url.strip())
    consulta = [
        (k, v)
        for k, v in urllib.parse.parse_qsl(partes.query, keep_blank_values=True)
        if not _PARAMS_RASTREIO.match(k.lower())
    ]
    caminho = re.sub(r"/{2,}", "/", partes.path) or "/"
    if caminho != "/" and caminho.endswith("/"):
        caminho = caminho.rstrip("/")
    host = partes.netloc.lower()
    host = host.removeprefix("www.")
    # http e https contam como o mesmo recurso: o que importa é não baixar duas vezes.
    return urllib.parse.urlunsplit(
        ("https", host, caminho, urllib.parse.urlencode(consulta), "")
    )


def hoje() -> str:
    return _dt.date.today().isoformat()


def agora() -> str:
    return _dt.datetime.now().strftime("%Y-%m-%d %H:%M")


# --------------------------------------------------------------------------- frontmatter

_ESCALAR = re.compile(r"^([A-Za-z_][\w-]*):\s*(.*)$")
_ITEM = re.compile(r"^\s*-\s+(.*)$")


def _valor(bruto: str):
    bruto = bruto.strip()
    if not bruto:
        return ""
    if bruto.startswith("[") and bruto.endswith("]"):
        interno = bruto[1:-1].strip()
        if not interno:
            return []
        return [p.strip().strip("\"'") for p in interno.split(",")]
    if len(bruto) >= 2 and bruto[0] == bruto[-1] and bruto[0] in "\"'":
        return bruto[1:-1]
    return bruto


def ler_frontmatter(caminho: Path) -> tuple[dict, str]:
    """Devolve (metadados, corpo). Suporta escalares, listas inline e listas em bloco.

    O corte é feito na primeira linha `---` **isolada** após a abertura — separadores de slide
    no corpo do documento não são confundidos com o fechamento do frontmatter.
    """
    texto = caminho.read_text(encoding="utf-8")
    linhas = texto.splitlines(keepends=True)
    if not linhas or linhas[0].strip() != "---":
        return {}, texto

    fim = next((i for i, l in enumerate(linhas[1:], start=1) if l.strip() == "---"), None)
    if fim is None:
        return {}, texto
    cabecalho = "".join(linhas[1:fim])
    corpo = "".join(linhas[fim + 1 :]).lstrip("\n")

    meta: dict = {}
    chave_atual = None
    for linha in cabecalho.splitlines():
        if not linha.strip() or linha.lstrip().startswith("#"):
            continue
        m_item = _ITEM.match(linha)
        if m_item and chave_atual:
            meta.setdefault(chave_atual, [])
            if not isinstance(meta[chave_atual], list):
                meta[chave_atual] = []
            meta[chave_atual].append(_valor(m_item.group(1)))
            continue
        m_esc = _ESCALAR.match(linha)
        if m_esc:
            chave_atual = m_esc.group(1)
            valor = _valor(m_esc.group(2))
            meta[chave_atual] = valor if valor != "" else ""
    return meta, corpo


def _serializa(valor) -> str:
    if isinstance(valor, list):
        return "[" + ", ".join(str(v) for v in valor) + "]"
    return str(valor)


def escrever_frontmatter(caminho: Path, meta: dict, corpo: str) -> None:
    linhas = ["---"]
    for chave, valor in meta.items():
        linhas.append(f"{chave}: {_serializa(valor)}")
    linhas.append("---")
    linhas.append("")
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text("\n".join(linhas) + corpo.lstrip("\n"), encoding="utf-8")


def atualizar_meta(caminho: Path, **campos) -> dict:
    meta, corpo = ler_frontmatter(caminho)
    meta.update({k: v for k, v in campos.items() if v is not None})
    escrever_frontmatter(caminho, meta, corpo)
    return meta


# --------------------------------------------------------------------------- tickets


def tickets_todos() -> list[Path]:
    achados: list[Path] = []
    for estado in ESTADOS:
        pasta = TICKETS / estado
        if pasta.is_dir():
            # Qualquer prefixo de família (PE-, DEV-, AG-, AC-), não só PE-.
            achados.extend(sorted(p for p in pasta.glob("*.md")
                                  if identificador_de(p) is not None))
    return achados


def identificador_de(caminho: Path) -> tuple[str, int] | None:
    """(prefixo, número) do nome do arquivo, ou None se não seguir a convenção."""
    m = re.match(r"([A-Z]+)-(\d+)", caminho.stem.upper())
    return (m.group(1), int(m.group(2))) if m else None


def achar_ticket(identificador: str) -> Path:
    """Localiza um ticket por identificador. Aceita `DEV-0003`, `dev-3` e `3`.

    Só dígitos é ambíguo desde que existe mais de uma família (`PE-0001` e `DEV-0001` podem
    coexistir): nesse caso, exige o prefixo em vez de escolher um por conta.
    """
    ident = identificador.upper().strip()

    m = re.fullmatch(r"([A-Z]+)-?(\d+)", ident)
    if m and m.group(1) in PREFIXOS:
        ident = f"{m.group(1)}-{int(m.group(2)):04d}"
    elif ident.isdigit():
        numero = int(ident)
        achados = []
        for caminho in tickets_todos():
            par = identificador_de(caminho)
            if par and par[1] == numero:
                achados.append((caminho, f"{par[0]}-{par[1]:04d}"))
        if len(achados) > 1:
            nomes = ", ".join(sorted(nome for _, nome in achados))
            raise SystemExit(
                f"erro: '{identificador}' é ambíguo — existe em mais de uma família: {nomes}.\n"
                f"       Informe o prefixo, por exemplo: {sorted(n for _, n in achados)[0]}"
            )
        if achados:
            return achados[0][0]

    for caminho in tickets_todos():
        if caminho.stem.upper().startswith(ident):
            return caminho
    raise SystemExit(f"erro: ticket '{identificador}' não encontrado em tickets/")


def proximo_id(tipo: str = "palestra") -> str:
    """Próximo identificador da família de `tipo`. Cada prefixo tem sua própria sequência."""
    prefixo = TIPOS.get(tipo, TIPOS["palestra"])["prefixo"]
    maior = 0
    for caminho in tickets_todos():
        m = re.match(rf"{prefixo}-(\d+)", caminho.stem)
        if m:
            maior = max(maior, int(m.group(1)))
    return f"{prefixo}-{maior + 1:04d}"


def estado_do(caminho: Path) -> str:
    return caminho.parent.name


# --------------------------------------------------------------------------- saída
#
# Portabilidade: o console do Windows só interpreta sequências ANSI depois que o modo de terminal
# virtual é habilitado, e o console legado usa uma página de código que não comporta "✓". Aqui a
# cor é desligada quando a saída não é um terminal (pipe, arquivo, CI) e o símbolo cai para ASCII
# quando o encoding não o suporta. Nada disso muda o comportamento em Linux e macOS.


_ANSI = re.compile(r"\x1b\[[0-9;]*m")


class _FiltroAnsi:
    """Envolve um stream removendo sequências de cor. Usado quando a saída não é terminal."""

    def __init__(self, alvo):
        self._alvo = alvo

    def write(self, texto: str) -> int:
        return self._alvo.write(_ANSI.sub("", texto))

    def __getattr__(self, nome):
        return getattr(self._alvo, nome)


def _preparar_saida() -> bool:
    """Ajusta encoding e cor do console. Devolve se cor pode ser usada.

    No Windows o console legado usa uma página de código que não comporta "✓" nem acentuação
    plena, e só interpreta ANSI depois que o terminal virtual é habilitado. Fora dele, o único
    ajuste é desligar a cor quando a saída vai para pipe, arquivo ou CI.
    """
    if os.name == "nt":
        for fluxo in (sys.stdout, sys.stderr):
            try:
                fluxo.reconfigure(encoding="utf-8", errors="replace")
            except Exception:
                pass

    if not sys.stdout.isatty():
        sys.stdout = _FiltroAnsi(sys.stdout)
        sys.stderr = _FiltroAnsi(sys.stderr)
        return False

    if os.name != "nt" or os.environ.get("WT_SESSION") or os.environ.get("TERM"):
        return True

    try:  # Windows 10+: ENABLE_VIRTUAL_TERMINAL_PROCESSING
        import ctypes

        kernel32 = ctypes.windll.kernel32
        modo = ctypes.c_uint32()
        manipulador = kernel32.GetStdHandle(-11)
        if not kernel32.GetConsoleMode(manipulador, ctypes.byref(modo)):
            raise OSError
        if kernel32.SetConsoleMode(manipulador, modo.value | 0x0004):
            return True
    except Exception:
        pass

    sys.stdout = _FiltroAnsi(sys.stdout)
    sys.stderr = _FiltroAnsi(sys.stderr)
    return False


COR = _preparar_saida()


def _suporta(simbolo: str) -> bool:
    try:
        simbolo.encode(sys.stdout.encoding or "utf-8")
        return True
    except (UnicodeEncodeError, LookupError):
        return False


CHECK = "✓" if _suporta("✓") else "OK"
SETA = "▸" if _suporta("▸") else ">"


def _c(codigo: str) -> str:
    return codigo if COR else ""


CORES = {
    "novo": _c("\033[97m"),
    "triagem": _c("\033[95m"),
    "acervo": _c("\033[94m"),
    "pesquisa": _c("\033[96m"),
    "sintese": _c("\033[93m"),
    "producao": _c("\033[33m"),
    "desenho": _c("\033[95m"),
    "implementacao": _c("\033[36m"),
    "revisao": _c("\033[91m"),
    "aprovado": _c("\033[92m"),
    "arquivado": _c("\033[90m"),
}
RESET = _c("\033[0m")
NEGRITO = _c("\033[1m")


def colorir(texto: str, estado: str) -> str:
    return f"{CORES.get(estado, '')}{texto}{RESET}"


def aviso(msg: str) -> None:
    print(f"{_c(chr(27) + '[93m')}! {msg}{RESET}")


def erro(msg: str) -> None:
    raise SystemExit(f"{_c(chr(27) + '[91m')}erro: {msg}{RESET}")


def ok(msg: str) -> None:
    print(f"{_c(chr(27) + '[92m')}{CHECK}{RESET} {msg}")
