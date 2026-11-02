#!/usr/bin/env python3
"""`pe rag` — indexação e busca do acervo.

Índice híbrido:
  * **Léxico (sempre)** — SQLite FTS5 com `unicode61 remove_diacritics 2`, ranqueado por BM25
    com pesos por campo, mais um rerank que privilegia cobertura de termos, obras básicas e
    fontes de alta confiabilidade.
  * **Semântico (opcional)** — se `sentence-transformers` estiver instalado, `ingest --embeddings`
    grava vetores e `busca --semantico` funde as duas listas por Reciprocal Rank Fusion.

Cada trecho recuperado carrega obra, autor, página, capítulo e item/questão detectados, para que
a citação possa ser conferida na fonte. Nada é recuperado sem procedência.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import zipfile
from html.parser import HTMLParser
from pathlib import Path

from comum import (
    BANCO,
    EXTRAIDO,
    INDICE,
    METADADOS,
    RAG,
    RAW,
    agora,
    aviso,
    erro,
    ler_frontmatter,
    ok,
    sem_acento,
)

ALVO_CHUNK = 1000
MAX_CHUNK = 1700
SINONIMOS = RAG / "sinonimos.json"
CAMADAS = RAG / "camadas.json"

STOPWORDS = {
    "a", "o", "as", "os", "um", "uma", "uns", "umas", "de", "do", "da", "dos", "das", "em",
    "no", "na", "nos", "nas", "por", "para", "com", "sem", "sob", "sobre", "e", "ou", "mas",
    "que", "se", "ao", "aos", "à", "às", "pelo", "pela", "como", "qual", "quais", "quando",
    "onde", "isso", "isto", "aquilo", "ser", "é", "são", "foi", "era", "ter", "tem", "há",
    "mais", "menos", "muito", "muita", "seu", "sua", "seus", "suas", "meu", "minha", "este",
    "esta", "esse", "essa", "the", "of", "and",
}


# ============================================================== extração de texto


class _Texto(HTMLParser):
    def __init__(self):
        super().__init__()
        self.partes: list[str] = []
        self._ignorar = False

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self._ignorar = True
        if tag in ("p", "br", "div", "h1", "h2", "h3", "h4", "li", "tr"):
            self.partes.append("\n")

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self._ignorar = False

    def handle_data(self, dados):
        if not self._ignorar:
            self.partes.append(dados)

    def texto(self) -> str:
        return "".join(self.partes)


def _html_para_texto(bruto: str) -> str:
    p = _Texto()
    try:
        p.feed(bruto)
    except Exception:
        pass
    return p.texto()


def extrair(caminho: Path) -> str:
    """Devolve o texto do arquivo. Páginas são separadas por form feed (\\f)."""
    ext = caminho.suffix.lower()

    if ext == ".pdf":
        # `pdftotext` (poppler) dá o melhor resultado, mas não existe por padrão no Windows.
        # Sem o binário, chamar subprocess.run levantaria FileNotFoundError e derrubaria o
        # ingest inteiro — por isso a presença é verificada antes, e o pypdf assume quando falta.
        if shutil.which("pdftotext"):
            r = subprocess.run(
                ["pdftotext", "-layout", "-enc", "UTF-8", str(caminho), "-"],
                capture_output=True, text=True,
            )
            if r.returncode == 0 and r.stdout.strip():
                return r.stdout

        try:
            import pypdf  # type: ignore

            leitor = pypdf.PdfReader(str(caminho))
            texto = "\f".join((pag.extract_text() or "") for pag in leitor.pages)
            if texto.strip():
                return texto
        except ImportError:
            aviso(
                f"{caminho.name}: sem pdftotext e sem pypdf. "
                f"Instale um dos dois — veja docs/uso/INSTALACAO.md"
            )
            return ""
        except Exception:
            pass

        aviso(f"não foi possível extrair texto de {caminho.name} (PDF de imagem? use OCR)")
        return ""

    if ext in (".txt", ".md", ".rtf"):
        bruto = caminho.read_text(encoding="utf-8", errors="replace")
        if ext == ".rtf":
            bruto = re.sub(r"\\[a-z]+-?\d* ?|[{}]", "", bruto)
        return bruto

    if ext in (".html", ".htm"):
        return _html_para_texto(caminho.read_text(encoding="utf-8", errors="replace"))

    if ext == ".epub":
        partes = []
        with zipfile.ZipFile(caminho) as z:
            nomes = [n for n in z.namelist() if n.lower().endswith((".xhtml", ".html", ".htm"))]
            for nome in sorted(nomes):
                try:
                    partes.append(_html_para_texto(z.read(nome).decode("utf-8", "replace")))
                except Exception:
                    continue
        return "\f".join(partes)

    if ext == ".docx":
        with zipfile.ZipFile(caminho) as z:
            xml = z.read("word/document.xml").decode("utf-8", "replace")
        xml = re.sub(r"</w:p>", "\n", xml)
        return re.sub(r"<[^>]+>", "", xml)

    if ext == ".odt":
        with zipfile.ZipFile(caminho) as z:
            xml = z.read("content.xml").decode("utf-8", "replace")
        xml = re.sub(r"</text:(p|h)>", "\n", xml)
        return re.sub(r"<[^>]+>", "", xml)

    if ext == ".doc":
        # `.doc` (OLE2) é comum nos repositórios espíritas antigos. Nenhum extrator vem por
        # padrão, então tenta-se o que estiver instalado, em ordem de fidelidade.
        for binario, argumentos in (
            ("antiword", ["antiword", "-m", "UTF-8.txt", str(caminho)]),
            ("catdoc", ["catdoc", "-d", "utf-8", str(caminho)]),
        ):
            if shutil.which(binario):
                r = subprocess.run(argumentos, capture_output=True, text=True)
                if r.returncode == 0 and r.stdout.strip():
                    return r.stdout

        libre = shutil.which("libreoffice") or shutil.which("soffice")
        if libre:
            with tempfile.TemporaryDirectory() as tmp:
                r = subprocess.run(
                    [libre, "--headless", "--convert-to", "txt:Text", "--outdir", tmp,
                     str(caminho)],
                    capture_output=True, text=True,
                )
                convertido = Path(tmp) / f"{caminho.stem}.txt"
                if convertido.is_file():
                    return convertido.read_text(encoding="utf-8", errors="replace")

        aviso(
            f"{caminho.name}: .doc sem extrator. Instale antiword, catdoc ou libreoffice, "
            f"ou converta o arquivo para .docx/.pdf antes de indexar"
        )
        return ""

    return ""


# ============================================================== estrutura e chunking

RE_CAPITULO = re.compile(
    r"^\s*((?:CAP[IÍ]TULO|Cap[ií]tulo|PARTE|Parte|LIVRO|SE[ÇC][ÃA]O|Se[çc][ãa]o|T[IÍ]TULO)"
    r"\s+[IVXLCDM\d]+[^\n]{0,80})$"
)
RE_TITULO_CAIXA = re.compile(r"^\s*([A-ZÀ-Ú][A-ZÀ-Ú0-9 ,;:'\-—–\.]{6,70})\s*$")
RE_ITEM = re.compile(r"^\s*(\d{1,4})\s*[\.\)\-–—]\s+\S")


def _limpar(texto: str) -> str:
    texto = texto.replace("\u00ad", "").replace("\ufeff", "")
    texto = re.sub(r"[ \t]+", " ", texto)
    texto = re.sub(r"(\w)-\n(\w)", r"\1\2", texto)  # hifenização de fim de linha
    texto = re.sub(r"\n{3,}", "\n\n", texto)
    return texto


def _paragrafos(pagina: str) -> list[str]:
    """Parágrafos da página, com os gigantes já partidos em fronteira de frase.

    HTML de artigo e PDF de coluna única às vezes não trazem linha em branco entre parágrafos:
    a página inteira chega como um "parágrafo" só. Sem partir aqui, ele entraria inteiro no
    buffer e produziria um trecho de dezenas de milhares de caracteres — grande demais para
    citar e impreciso na busca, que passaria a devolver a página toda como um resultado.
    """
    saida: list[str] = []
    for bruto in re.split(r"\n\s*\n", pagina):
        bruto = bruto.strip()
        if not bruto:
            continue
        if len(bruto) <= MAX_CHUNK:
            saida.append(bruto)
            continue

        # corta em fim de frase; se uma frase sozinha estourar o teto, corta no limite
        pedaco = ""
        for frase in re.split(r"(?<=[.!?…])\s+", bruto):
            if pedaco and len(pedaco) + len(frase) + 1 > ALVO_CHUNK:
                saida.append(pedaco.strip())
                pedaco = ""
            while len(frase) > MAX_CHUNK:
                saida.append(frase[:MAX_CHUNK].strip())
                frase = frase[MAX_CHUNK:]
            pedaco = f"{pedaco} {frase}".strip()
        if pedaco.strip():
            saida.append(pedaco.strip())
    return saida


def fatiar(texto: str) -> list[dict]:
    """Quebra o texto em trechos com página, capítulo e item detectados."""
    paginas = texto.split("\f")
    trechos: list[dict] = []
    capitulo = ""
    buffer: list[str] = []
    tamanho = 0
    pagina_inicial = 1
    item_atual = ""

    def descarregar():
        nonlocal buffer, tamanho
        conteudo = "\n\n".join(buffer).strip()
        if len(conteudo) >= 120:
            trechos.append(
                {
                    "ord": len(trechos),
                    "pagina": pagina_inicial,
                    "capitulo": capitulo,
                    "item": item_atual,
                    "texto": conteudo,
                }
            )
        buffer = []
        tamanho = 0

    for n_pagina, pagina in enumerate(paginas, start=1):
        for paragrafo in _paragrafos(_limpar(pagina)):
            paragrafo = paragrafo.strip()
            if not paragrafo:
                continue

            primeira = paragrafo.splitlines()[0]
            m_cap = RE_CAPITULO.match(primeira) or (
                RE_TITULO_CAIXA.match(primeira) if len(paragrafo) < 90 else None
            )
            if m_cap:
                descarregar()
                capitulo = " ".join(m_cap.group(1).split())[:90]
                pagina_inicial = n_pagina
                item_atual = ""
                continue

            m_item = RE_ITEM.match(paragrafo)
            if m_item and not buffer:
                item_atual = m_item.group(1)

            if not buffer:
                pagina_inicial = n_pagina

            buffer.append(paragrafo)
            tamanho += len(paragrafo)

            if tamanho >= ALVO_CHUNK or tamanho > MAX_CHUNK:
                sobra = buffer[-1] if len(buffer) > 1 and len(buffer[-1]) < 400 else None
                descarregar()
                if sobra:  # sobreposição de um parágrafo, para não cortar argumento no meio
                    buffer = [sobra]
                    tamanho = len(sobra)
                    pagina_inicial = n_pagina
    descarregar()
    return trechos


# ============================================================== banco

ESQUEMA = """
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS docs (
  id INTEGER PRIMARY KEY,
  arquivo TEXT UNIQUE NOT NULL,
  sha TEXT, obra TEXT, autor TEXT, espirito TEXT, ano TEXT, editora TEXT,
  tipo TEXT, tags TEXT, fonte TEXT, confiabilidade TEXT, idioma TEXT,
  n_trechos INTEGER DEFAULT 0, indexado_em TEXT
);

CREATE TABLE IF NOT EXISTS chunks (
  id INTEGER PRIMARY KEY,
  doc_id INTEGER NOT NULL REFERENCES docs(id) ON DELETE CASCADE,
  ord INTEGER, pagina INTEGER, capitulo TEXT, item TEXT,
  obra TEXT, autor TEXT, texto TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_chunks_doc ON chunks(doc_id);

CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
  texto, capitulo, obra, autor,
  content='chunks', content_rowid='id',
  tokenize="unicode61 remove_diacritics 2"
);

CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON chunks BEGIN
  INSERT INTO chunks_fts(rowid, texto, capitulo, obra, autor)
  VALUES (new.id, new.texto, new.capitulo, new.obra, new.autor);
END;
CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON chunks BEGIN
  INSERT INTO chunks_fts(chunks_fts, rowid, texto, capitulo, obra, autor)
  VALUES ('delete', old.id, old.texto, old.capitulo, old.obra, old.autor);
END;

CREATE TABLE IF NOT EXISTS embeddings (
  chunk_id INTEGER PRIMARY KEY REFERENCES chunks(id) ON DELETE CASCADE,
  modelo TEXT, dim INTEGER, vetor BLOB
);
"""


def conectar() -> sqlite3.Connection:
    INDICE.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(BANCO)
    con.row_factory = sqlite3.Row
    con.executescript(ESQUEMA)
    return con


# ============================================================== ingest


def cmd_ingest(args) -> int:
    fichas = sorted(METADADOS.glob("*.md"))
    if not fichas:
        print("nenhuma ficha em biblioteca/metadata/. Use biblioteca/metadata/ ...")
        return 0

    con = conectar()
    novos = atualizados = pulados = 0
    total_trechos = 0

    for ficha in fichas:
        meta, _ = ler_frontmatter(ficha)
        arquivo = RAW / str(meta.get("arquivo", ""))
        if not arquivo.is_file():
            aviso(f"ficha sem arquivo: {ficha.name} → {meta.get('arquivo')}")
            continue

        existente = con.execute("SELECT id, sha FROM docs WHERE arquivo=?", (arquivo.name,)).fetchone()
        if existente and existente["sha"] == meta.get("sha") and not args.forcar:
            pulados += 1
            continue

        print(f"extraindo {arquivo.name} ...", flush=True)
        texto = extrair(arquivo)
        if not texto.strip():
            aviso(f"sem texto extraível: {arquivo.name}")
            continue

        cache = EXTRAIDO / f"{arquivo.stem}.txt"
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_text(texto, encoding="utf-8")

        trechos = fatiar(texto)
        if not trechos:
            aviso(f"nenhum trecho utilizável em {arquivo.name}")
            continue

        tags = meta.get("tags") or []
        campos = (
            meta.get("sha", ""), meta.get("obra", ""), meta.get("autor", ""),
            meta.get("espirito", ""), str(meta.get("ano", "")), meta.get("editora", ""),
            meta.get("tipo", ""), ",".join(tags) if isinstance(tags, list) else str(tags),
            meta.get("fonte", ""), meta.get("confiabilidade", "media"),
            meta.get("idioma", "pt-BR"), len(trechos), agora(),
        )
        if existente:
            con.execute("DELETE FROM chunks WHERE doc_id=?", (existente["id"],))
            con.execute(
                "UPDATE docs SET sha=?,obra=?,autor=?,espirito=?,ano=?,editora=?,tipo=?,tags=?,"
                "fonte=?,confiabilidade=?,idioma=?,n_trechos=?,indexado_em=? WHERE id=?",
                (*campos, existente["id"]),
            )
            doc_id = existente["id"]
            atualizados += 1
        else:
            cur = con.execute(
                "INSERT INTO docs (arquivo,sha,obra,autor,espirito,ano,editora,tipo,tags,fonte,"
                "confiabilidade,idioma,n_trechos,indexado_em) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (arquivo.name, *campos),
            )
            doc_id = cur.lastrowid
            novos += 1

        con.executemany(
            "INSERT INTO chunks (doc_id,ord,pagina,capitulo,item,obra,autor,texto) "
            "VALUES (?,?,?,?,?,?,?,?)",
            [
                (doc_id, t["ord"], t["pagina"], t["capitulo"], t["item"],
                 meta.get("obra", ""), meta.get("autor", ""), t["texto"])
                for t in trechos
            ],
        )
        total_trechos += len(trechos)
        con.commit()
        print(f"  {len(trechos)} trechos indexados")

    con.execute("INSERT INTO chunks_fts(chunks_fts) VALUES('optimize')")
    con.commit()

    if args.embeddings:
        _gerar_embeddings(con, refazer=args.forcar)

    ok(f"ingest: {novos} nova(s), {atualizados} atualizada(s), {pulados} sem mudança "
       f"— {total_trechos} trechos")
    con.close()
    return 0


def _modelo_embeddings():
    try:
        from sentence_transformers import SentenceTransformer  # type: ignore
    except ImportError:
        aviso("sentence-transformers não instalado — busca semântica indisponível.\n"
              "  Instale com: pip install sentence-transformers   (opcional; o BM25 funciona sem ele)")
        return None, None
    nome = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    return SentenceTransformer(nome), nome


def _gerar_embeddings(con: sqlite3.Connection, refazer: bool = False) -> None:
    modelo, nome = _modelo_embeddings()
    if modelo is None:
        return
    import numpy as np  # type: ignore

    if refazer:
        con.execute("DELETE FROM embeddings")
    faltantes = con.execute(
        "SELECT c.id, c.texto FROM chunks c LEFT JOIN embeddings e ON e.chunk_id=c.id "
        "WHERE e.chunk_id IS NULL"
    ).fetchall()
    if not faltantes:
        return
    print(f"gerando embeddings para {len(faltantes)} trechos ...")
    lote = 64
    for i in range(0, len(faltantes), lote):
        pedaco = faltantes[i : i + lote]
        vetores = modelo.encode([r["texto"] for r in pedaco], normalize_embeddings=True)
        con.executemany(
            "INSERT OR REPLACE INTO embeddings (chunk_id,modelo,dim,vetor) VALUES (?,?,?,?)",
            [
                (r["id"], nome, len(v), np.asarray(v, dtype="float32").tobytes())
                for r, v in zip(pedaco, vetores)
            ],
        )
        con.commit()
        print(f"  {min(i + lote, len(faltantes))}/{len(faltantes)}", end="\r", flush=True)
    print()


# ============================================================== busca


def _sinonimos() -> dict:
    if SINONIMOS.exists():
        try:
            return json.loads(SINONIMOS.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            aviso("rag/sinonimos.json inválido — expansão desligada")
    return {}


def _termos(consulta: str) -> list[str]:
    brutos = re.findall(r"[\wÀ-ÿ]+", consulta.lower())
    return [t for t in brutos if len(t) > 2 and t not in STOPWORDS]


def montar_query(consulta: str, expandir: bool = True, modo: str = "or") -> tuple[str, list[str]]:
    """Converte linguagem natural em expressão FTS5 e devolve os termos usados no rerank."""
    consulta = consulta.strip()
    if any(op in consulta for op in (" AND ", " OR ", " NOT ", "NEAR(")) or consulta.startswith('"'):
        return consulta, _termos(consulta)

    termos = _termos(consulta)
    if not termos:
        erro("consulta vazia após remover palavras vazias")

    grupos: list[str] = []
    dicionario = _sinonimos() if expandir else {}
    for termo in termos:
        variantes = {termo}
        chave = sem_acento(termo)
        for k, vs in dicionario.items():
            if sem_acento(k) == chave or chave in [sem_acento(v) for v in vs]:
                variantes.update([k, *vs])
        alternativas = [f'"{v}"*' if len(v) > 5 else f'"{v}"' for v in sorted(variantes)]
        grupos.append("(" + " OR ".join(alternativas) + ")")

    juncao = " AND " if modo == "and" else " OR "
    return juncao.join(grupos), termos


def _rerank(linhas: list[sqlite3.Row], termos: list[str]) -> list[tuple[float, sqlite3.Row]]:
    ranqueados = []
    chaves = [sem_acento(t) for t in termos]
    for linha in linhas:
        base = -float(linha["rank"])  # bm25 do SQLite: mais negativo = melhor
        corpo = sem_acento(linha["texto"].lower())
        cobertura = sum(1 for c in chaves if c in corpo) / max(len(chaves), 1)
        pontos = base + cobertura * 3.0
        tags = (linha["tags"] or "").split(",")
        if "basica" in tags or "codificacao" in tags:
            pontos += 1.5
        if (linha["confiabilidade"] or "") == "alta":
            pontos += 0.8
        elif (linha["confiabilidade"] or "") == "baixa":
            pontos -= 1.0
        ranqueados.append((pontos, linha))
    ranqueados.sort(key=lambda p: p[0], reverse=True)
    return ranqueados


def referencia(linha) -> str:
    partes = [linha["obra"] or "obra desconhecida"]
    if linha["capitulo"]:
        partes.append(linha["capitulo"])
    if linha["item"]:
        partes.append(f"item/questão {linha['item']}")
    if linha["pagina"]:
        partes.append(f"p. {linha['pagina']} do arquivo")
    return " — ".join(partes)


def _busca_semantica(con, consulta: str, limite: int) -> list[int]:
    tem = con.execute("SELECT COUNT(*) c FROM embeddings").fetchone()["c"]
    if not tem:
        aviso("nenhum embedding no índice — rode: python3 scripts/rag.py ingest --embeddings")
        return []
    modelo, _ = _modelo_embeddings()
    if modelo is None:
        return []
    import numpy as np  # type: ignore

    alvo = np.asarray(modelo.encode([consulta], normalize_embeddings=True)[0], dtype="float32")
    ids, matriz = [], []
    for linha in con.execute("SELECT chunk_id, vetor FROM embeddings"):
        ids.append(linha["chunk_id"])
        matriz.append(np.frombuffer(linha["vetor"], dtype="float32"))
    similaridades = np.asarray(matriz) @ alvo
    melhores = np.argsort(-similaridades)[: limite * 3]
    return [ids[i] for i in melhores]


def cmd_busca(args) -> int:
    if not BANCO.exists():
        erro("índice inexistente. Rode: python3 scripts/rag.py ingest")
    con = conectar()

    query, termos = montar_query(args.consulta, expandir=not args.sem_expansao, modo=args.modo)

    sql = [
        "SELECT c.id, c.texto, c.pagina, c.capitulo, c.item, c.obra, c.autor,",
        "       d.espirito, d.ano, d.editora, d.tags, d.confiabilidade, d.arquivo,",
        "       bm25(chunks_fts, 8.0, 2.0, 3.0, 2.0) AS rank,",
        "       snippet(chunks_fts, 0, '«', '»', ' … ', 24) AS trecho",
        "FROM chunks_fts",
        "JOIN chunks c ON c.id = chunks_fts.rowid",
        "JOIN docs d ON d.id = c.doc_id",
        "WHERE chunks_fts MATCH ?",
    ]
    params: list = [query]
    if args.autor:
        sql.append("AND (lower(c.autor) LIKE ? OR lower(d.espirito) LIKE ?)")
        params += [f"%{args.autor.lower()}%"] * 2
    if args.obra:
        sql.append("AND lower(c.obra) LIKE ?")
        params.append(f"%{args.obra.lower()}%")
    if args.tag:
        sql.append("AND ',' || d.tags || ',' LIKE ?")
        params.append(f"%,{args.tag},%")
    sql.append("ORDER BY rank LIMIT ?")
    params.append(args.limite * 6)

    try:
        linhas = con.execute("\n".join(sql), params).fetchall()
    except sqlite3.OperationalError as exc:
        erro(f"consulta FTS inválida ({exc}). Query gerada: {query}")

    ranqueados = _rerank(linhas, termos)

    if args.semantico:
        ids_sem = _busca_semantica(con, args.consulta, args.limite)
        if ids_sem:
            posicao_lex = {linha["id"]: i for i, (_, linha) in enumerate(ranqueados)}
            posicao_sem = {cid: i for i, cid in enumerate(ids_sem)}
            por_id = {linha["id"]: linha for _, linha in ranqueados}
            faltantes = [i for i in ids_sem if i not in por_id][: args.limite * 2]
            if faltantes:
                marcadores = ",".join("?" * len(faltantes))
                extras = con.execute(
                    "SELECT c.id, c.texto, c.pagina, c.capitulo, c.item, c.obra, c.autor,"
                    " d.espirito, d.ano, d.editora, d.tags, d.confiabilidade, d.arquivo,"
                    " 0.0 AS rank, substr(c.texto,1,300) AS trecho"
                    f" FROM chunks c JOIN docs d ON d.id=c.doc_id WHERE c.id IN ({marcadores})",
                    faltantes,
                ).fetchall()
                por_id.update({e["id"]: e for e in extras})
            # Reciprocal Rank Fusion (k=60), padrão da literatura de busca híbrida
            fundidos = []
            for cid, linha in por_id.items():
                s = 1 / (60 + posicao_lex.get(cid, 500)) + 1 / (60 + posicao_sem.get(cid, 500))
                fundidos.append((s, linha))
            fundidos.sort(key=lambda p: p[0], reverse=True)
            ranqueados = fundidos

    resultados = ranqueados[: args.limite]

    if args.json:
        print(json.dumps(
            [
                {
                    "pontuacao": round(p, 4),
                    "obra": l["obra"], "autor": l["autor"], "espirito": l["espirito"],
                    "ano": l["ano"], "editora": l["editora"],
                    "capitulo": l["capitulo"], "item": l["item"], "pagina": l["pagina"],
                    "referencia": referencia(l), "arquivo": l["arquivo"],
                    "confiabilidade": l["confiabilidade"],
                    "texto": l["texto"],
                }
                for p, l in resultados
            ],
            ensure_ascii=False, indent=2,
        ))
        con.close()
        return 0

    if not resultados:
        print(f"nenhum resultado para: {args.consulta}")
        print(f"\033[90mquery FTS: {query}\033[0m")
        print("dicas: tente termos mais gerais, ou --modo or, ou verifique python3 scripts/rag.py stats")
        con.close()
        return 1

    print(f"\n{len(resultados)} trecho(s) para \033[1m{args.consulta}\033[0m\n")
    for i, (pontos, l) in enumerate(resultados, 1):
        print(f"\033[96m[{i}]\033[0m \033[1m{referencia(l)}\033[0m")
        autoria = l["autor"] or "?"
        if l["espirito"]:
            autoria += f" / espírito {l['espirito']}"
        print(f"\033[90m    {autoria} · confiabilidade {l['confiabilidade']} · "
              f"score {pontos:.2f} · {l['arquivo']}\033[0m")
        corpo = l["texto"] if args.completo else (l["trecho"] or l["texto"][:400])
        for linha in corpo.strip().splitlines():
            print(f"    {linha}")
        print()
    print("\033[90mConfira o trecho na fonte antes de citar. Página é a do arquivo, "
          "não necessariamente a da edição impressa.\033[0m\n")
    con.close()
    return 0


# ============================================================== busca cruzada por camadas


def carregar_camadas() -> list[dict]:
    """Lê `rag/camadas.json` — o mapa de famílias de fonte que a busca cruzada precisa visitar."""
    if not CAMADAS.exists():
        erro(f"{CAMADAS.relative_to(RAG.parent)} não encontrado — restaure-o do repositório")
    try:
        dados = json.loads(CAMADAS.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        erro(f"rag/camadas.json inválido: {exc}")
    camadas = dados.get("camadas") if isinstance(dados, dict) else dados
    if not camadas:
        erro("rag/camadas.json sem camadas")
    return camadas


def _condicoes_camada(camada: dict) -> tuple[list[str], list]:
    """Traduz o seletor da camada em condições SQL sobre `docs`.

    Pertencimento (`tags_qualquer`, `obra_como`, `exige_espirito`) combina por OU;
    filtros (`autor_como`, `tags_nenhuma`) se aplicam por E.
    """
    sel = camada.get("seletor", {})
    cond: list[str] = []
    params: list = []

    pertence: list[str] = []
    for tag in sel.get("tags_qualquer", []):
        pertence.append("',' || COALESCE(d.tags,'') || ',' LIKE ?")
        params.append(f"%,{tag},%")
    for obra in sel.get("obra_como", []) if isinstance(sel.get("obra_como"), list) else \
            ([sel["obra_como"]] if sel.get("obra_como") else []):
        pertence.append("lower(d.obra) LIKE ?")
        params.append(f"%{obra.lower()}%")
    if sel.get("exige_espirito"):
        pertence.append("(d.espirito IS NOT NULL AND TRIM(d.espirito) <> '')")
    if pertence:
        cond.append("(" + " OR ".join(pertence) + ")")

    if sel.get("autor_como"):
        cond.append("(lower(COALESCE(d.autor,'')) LIKE ? OR lower(COALESCE(d.espirito,'')) LIKE ?)")
        params += [f"%{sel['autor_como'].lower()}%"] * 2
    for tag in sel.get("tags_nenhuma", []):
        cond.append("',' || COALESCE(d.tags,'') || ',' NOT LIKE ?")
        params.append(f"%,{tag},%")

    return cond, params


def _obras_da_camada(con: sqlite3.Connection, camada: dict) -> list[str]:
    cond, params = _condicoes_camada(camada)
    sql = "SELECT DISTINCT d.obra FROM docs d"
    if cond:
        sql += " WHERE " + " AND ".join(cond)
    sql += " ORDER BY d.obra"
    return [linha["obra"] or "?" for linha in con.execute(sql, params)]


_SQL_TRECHOS = (
    "SELECT c.id, c.texto, c.pagina, c.capitulo, c.item, c.obra, c.autor,"
    " d.espirito, d.ano, d.editora, d.tags, d.confiabilidade, d.arquivo,"
    " bm25(chunks_fts, 8.0, 2.0, 3.0, 2.0) AS rank,"
    " snippet(chunks_fts, 0, '«', '»', ' … ', 24) AS trecho"
    " FROM chunks_fts"
    " JOIN chunks c ON c.id = chunks_fts.rowid"
    " JOIN docs d ON d.id = c.doc_id"
    " WHERE chunks_fts MATCH ?"
)


RUIDO_CAPITULO = ("indice", "sumario", "indice geral", "indice analitico", "catalogo")


def _e_ruido(linha) -> bool:
    """Índice, sumário e catálogo editorial casam muitos termos e não sustentam citação."""
    capitulo = sem_acento((linha["capitulo"] or "").lower())
    if any(capitulo.startswith(r) or r in capitulo for r in RUIDO_CAPITULO):
        return True
    texto = linha["texto"] or ""
    # linha de índice é curta e cheia de números de página: alta densidade de dígitos
    digitos = sum(1 for c in texto if c.isdigit())
    return len(texto) > 200 and digitos / len(texto) > 0.12


def _buscar_camada(
    con: sqlite3.Connection,
    consultas: list[str],
    camada: dict,
    limite: int,
    modo: str,
    expandir: bool,
    por_obra: int = 0,
) -> list[dict]:
    """Roda cada consulta dentro da camada e devolve os achados deduplicados por trecho."""
    cond, params_camada = _condicoes_camada(camada)
    extra = (" AND " + " AND ".join(cond)) if cond else ""
    por_id: dict[int, dict] = {}

    for consulta in consultas:
        query, termos = montar_query(consulta, expandir=expandir, modo=modo)
        sql = _SQL_TRECHOS + extra + " ORDER BY rank LIMIT ?"
        try:
            linhas = con.execute(sql, [query, *params_camada, limite * 6]).fetchall()
        except sqlite3.OperationalError as exc:
            aviso(f"consulta inválida em {camada['nome']} ({exc}): {query}")
            continue
        candidatos = [(p, l) for p, l in _rerank(linhas, termos) if not _e_ruido(l)]
        for pontos, linha in candidatos[: limite * (8 if por_obra else 1)]:
            atual = por_id.get(linha["id"])
            if atual is None or pontos > atual["pontuacao"]:
                por_id[linha["id"]] = {
                    "pontuacao": pontos,
                    "consulta": consulta,
                    "obra": linha["obra"],
                    "autor": linha["autor"],
                    "espirito": linha["espirito"],
                    "referencia": referencia(linha),
                    "arquivo": linha["arquivo"],
                    "confiabilidade": linha["confiabilidade"],
                    "trecho": (linha["trecho"] or linha["texto"][:400]),
                    "texto": linha["texto"],
                }
            elif consulta not in atual["consulta"]:
                atual["consulta"] += f"; {consulta}"

    achados = sorted(por_id.values(), key=lambda a: a["pontuacao"], reverse=True)
    if por_obra:
        # coleção (Revista Espírita, por exemplo): varredura volume a volume, não top-N geral
        vistos: dict[str, int] = {}
        selecionados = []
        for achado in achados:
            obra = achado["obra"] or "?"
            if vistos.get(obra, 0) >= por_obra:
                continue
            vistos[obra] = vistos.get(obra, 0) + 1
            selecionados.append(achado)
        return selecionados
    return achados[:limite]


def _situacao(obras: list[str], achados: list[dict]) -> str:
    if not obras:
        return "lacuna-acervo"
    return "achado" if achados else "vazio"


ROTULO_SITUACAO = {
    "achado": "achado",
    "vazio": "vazio no acervo",
    "lacuna-acervo": "LACUNA DE ACERVO",
}


def cmd_cruzar(args) -> int:
    if not BANCO.exists():
        erro("índice inexistente. Rode: python3 scripts/rag.py ingest")
    con = conectar()

    todas = carregar_camadas()
    pedidas = [c.strip() for c in (args.camada or [])]
    if pedidas:
        conhecidas = {c["nome"] for c in todas}
        for nome in pedidas:
            if nome not in conhecidas:
                erro(f"camada desconhecida: {nome}. Veja python3 scripts/rag.py camadas")
        camadas = [c for c in todas if c["nome"] in pedidas]
    else:
        camadas = todas

    elevadas = {c.strip() for c in (args.essencial or [])}
    consultas = [args.tema, *(args.variante or [])]

    relatorio = []
    for camada in camadas:
        obras = _obras_da_camada(con, camada)
        por_obra = args.por_obra if camada.get("por_obra") else 0
        achados = _buscar_camada(
            con, consultas, camada, args.limite, args.modo, not args.sem_expansao, por_obra
        )
        obras_com_achado = sorted({a["obra"] for a in achados})
        relatorio.append({
            "camada": camada["nome"],
            "titulo": camada.get("titulo", camada["nome"]),
            "essencial": bool(camada.get("essencial")) or camada["nome"] in elevadas,
            "por_obra": bool(camada.get("por_obra")),
            "vocabulario": camada.get("vocabulario", []),
            "obras_no_acervo": obras,
            "obras_com_achado": obras_com_achado,
            "obras_sem_achado": [o for o in obras if o not in obras_com_achado],
            "situacao": _situacao(obras, achados),
            "achados": achados,
        })

    pendencias = [r for r in relatorio if r["essencial"] and r["situacao"] != "achado"]

    if args.json:
        print(json.dumps(
            {"tema": args.tema, "consultas": consultas, "camadas": relatorio,
             "pendencias": [r["camada"] for r in pendencias]},
            ensure_ascii=False, indent=2,
        ))
        con.close()
        return 0

    if args.markdown:
        _imprimir_markdown(args, relatorio, pendencias, consultas)
    else:
        _imprimir_terminal(args, relatorio, pendencias, consultas)
    con.close()
    return 0


def _imprimir_markdown(args, relatorio, pendencias, consultas) -> None:
    print(f"### Cobertura da busca cruzada — “{args.tema}”\n")
    print(f"Consultas: {'; '.join(consultas)}\n")
    print("| Camada | Obras no acervo | Com achado | Melhor referência | Situação |")
    print("|---|---|---|---|---|")
    for r in relatorio:
        melhor = r["achados"][0]["referencia"] if r["achados"] else "—"
        marca = "**" if r["essencial"] and r["situacao"] != "achado" else ""
        print(f"| {r['titulo']} | {len(r['obras_no_acervo'])} | {len(r['obras_com_achado'])} "
              f"| {melhor} | {marca}{ROTULO_SITUACAO[r['situacao']]}{marca} |")

    for r in relatorio:
        if not r["achados"]:
            continue
        print(f"\n#### {r['titulo']}\n")
        for a in r["achados"]:
            autoria = a["autor"] or "?"
            if a["espirito"]:
                autoria += f" / espírito {a['espirito']}"
            corpo = a["texto"] if args.completo else a["trecho"]
            print(f"- **{a['referencia']}** — {autoria}  ")
            print(f"  {' '.join(corpo.split())}  ")
            print(f"  <sub>consulta: `{a['consulta']}` · arquivo: `{a['arquivo']}`</sub>")
        if r["por_obra"] and r["obras_sem_achado"]:
            print(f"\n  Sem achado nesta camada: {', '.join(r['obras_sem_achado'])}.")

    if pendencias:
        print("\n#### Pendências de curadoria\n")
        for r in pendencias:
            if r["situacao"] == "lacuna-acervo":
                print(f"- `[LACUNA DE ACERVO: {r['titulo']}]` — nenhuma obra desta camada está "
                      "indexada; a camada não pôde ser consultada.")
            else:
                termos = ", ".join(r["vocabulario"][:4])
                print(f"- `[VERIFICAR: {r['titulo']} sem achado]` — "
                      f"{len(r['obras_no_acervo'])} obra(s) consultada(s). "
                      f"Segunda passada sugerida com: {termos}.")


def _imprimir_terminal(args, relatorio, pendencias, consultas) -> None:
    print(f"\n\033[1mBusca cruzada\033[0m — {args.tema}")
    print(f"\033[90mconsultas: {'; '.join(consultas)}\033[0m\n")
    for r in relatorio:
        cor = {"achado": "92", "vazio": "93", "lacuna-acervo": "91"}[r["situacao"]]
        selo = "essencial" if r["essencial"] else "informativa"
        print(f"\033[{cor}m●\033[0m \033[1m{r['titulo']}\033[0m "
              f"\033[90m[{selo}] {len(r['obras_no_acervo'])} obra(s) no acervo, "
              f"{len(r['obras_com_achado'])} com achado — {ROTULO_SITUACAO[r['situacao']]}\033[0m")
        for a in r["achados"]:
            print(f"    \033[96m·\033[0m {a['referencia']}")
            corpo = a["texto"] if args.completo else a["trecho"]
            print(f"      \033[90m{' '.join(corpo.split())[:220]}\033[0m")
        if r["situacao"] == "vazio" and r["vocabulario"]:
            print(f"    \033[90mtente também: {', '.join(r['vocabulario'][:5])}\033[0m")
        if r["por_obra"] and r["obras_sem_achado"]:
            print(f"    \033[90msem achado: {', '.join(r['obras_sem_achado'])}\033[0m")
        print()

    if pendencias:
        print("\033[1mPendências\033[0m")
        for r in pendencias:
            motivo = ("nenhuma obra indexada — peça curadoria"
                      if r["situacao"] == "lacuna-acervo" else "consultada sem achado")
            print(f"  \033[91m!\033[0m {r['titulo']}: {motivo}")
        print("\n\033[90mCamada essencial sem achado é resultado a declarar no dossiê, "
              "não omissão a esconder.\033[0m")
    print()


def cmd_camadas(args) -> int:
    con = conectar() if BANCO.exists() else None
    print("\n\033[1mCamadas de fonte da busca cruzada\033[0m  (rag/camadas.json)\n")
    for camada in carregar_camadas():
        obras = _obras_da_camada(con, camada) if con else []
        selo = "essencial" if camada.get("essencial") else "informativa"
        estado = f"{len(obras)} obra(s)" if obras else "\033[91mvazia\033[0m"
        print(f"  \033[1m{camada['nome']:<24}\033[0m {estado:<24} \033[90m{selo}\033[0m")
        print(f"  \033[90m{camada.get('titulo','')}\033[0m")
        if args.obras and obras:
            for obra in obras:
                print(f"      · {obra}")
        print()
    if con:
        con.close()
    return 0


# ============================================================== stats


def cmd_stats(args) -> int:
    if not BANCO.exists():
        print("índice inexistente. Rode: python3 scripts/rag.py ingest")
        return 0
    con = conectar()
    docs = con.execute("SELECT COUNT(*) c FROM docs").fetchone()["c"]
    trechos = con.execute("SELECT COUNT(*) c FROM chunks").fetchone()["c"]
    vetores = con.execute("SELECT COUNT(*) c FROM embeddings").fetchone()["c"]
    caracteres = con.execute("SELECT COALESCE(SUM(LENGTH(texto)),0) s FROM chunks").fetchone()["s"]

    print(f"\n\033[1mÍndice do acervo\033[0m  ({BANCO.relative_to(RAG.parent)})")
    print(f"  obras indexadas : {docs}")
    print(f"  trechos         : {trechos}")
    print(f"  caracteres      : {caracteres:,}".replace(",", "."))
    print(f"  embeddings      : {vetores}" + ("" if vetores else "  (busca semântica desligada)"))

    print("\n\033[1mPor autor\033[0m")
    for linha in con.execute(
        "SELECT autor, COUNT(*) obras, SUM(n_trechos) t FROM docs GROUP BY autor ORDER BY t DESC"
    ):
        print(f"  {linha['autor'] or '?':<38} {linha['obras']:>3} obra(s)  {linha['t'] or 0:>6} trechos")

    print("\n\033[1mObras\033[0m")
    for linha in con.execute("SELECT obra, autor, n_trechos FROM docs ORDER BY obra"):
        print(f"  {linha['obra'][:52]:<54} {linha['n_trechos']:>6} trechos")
    print()
    con.close()
    return 0


# ============================================================== CLI


def main(argv: list[str]) -> int:
    p = argparse.ArgumentParser(prog="pe rag", description="Indexação e busca do acervo")
    sub = p.add_subparsers(dest="cmd", required=True)

    i = sub.add_parser("ingest", help="extrai e indexa o que mudou no acervo")
    i.add_argument("--forcar", action="store_true", help="reindexa tudo, ignorando o sha")
    i.add_argument("--embeddings", action="store_true", help="gera vetores para busca semântica")
    i.set_defaults(func=cmd_ingest)

    b = sub.add_parser("busca", help="consulta o acervo")
    b.add_argument("consulta")
    b.add_argument("--limite", type=int, default=8)
    b.add_argument("--autor", help="filtra por autor ou espírito autor")
    b.add_argument("--obra")
    b.add_argument("--tag")
    b.add_argument("--modo", choices=["or", "and"], default="or")
    b.add_argument("--completo", action="store_true", help="mostra o trecho inteiro")
    b.add_argument("--semantico", action="store_true", help="funde busca léxica e vetorial (RRF)")
    b.add_argument("--sem-expansao", action="store_true", help="não expande sinônimos")
    b.add_argument("--json", action="store_true", help="saída estruturada, para agentes")
    b.set_defaults(func=cmd_busca)

    c = sub.add_parser("cruzar", help="busca cruzada por camadas de fonte")
    c.add_argument("tema", help="tema ou trecho central da palestra")
    c.add_argument("--variante", action="append",
                   help="consulta adicional rodada em todas as camadas (repetível)")
    c.add_argument("--camada", action="append",
                   help="restringe a estas camadas (repetível); padrão: todas")
    c.add_argument("--essencial", action="append",
                   help="eleva a camada a essencial neste tema (repetível)")
    c.add_argument("--limite", type=int, default=4, help="achados por camada")
    c.add_argument("--por-obra", type=int, default=1, dest="por_obra",
                   help="em coleções (Revista Espírita), achados por volume")
    c.add_argument("--modo", choices=["or", "and"], default="or")
    c.add_argument("--completo", action="store_true", help="mostra o trecho inteiro")
    c.add_argument("--sem-expansao", action="store_true", help="não expande sinônimos")
    c.add_argument("--markdown", action="store_true", help="tabela pronta para o dossiê")
    c.add_argument("--json", action="store_true", help="saída estruturada, para agentes")
    c.set_defaults(func=cmd_cruzar)

    m = sub.add_parser("camadas", help="inventário das camadas de fonte")
    m.add_argument("--obras", action="store_true", help="lista as obras de cada camada")
    m.set_defaults(func=cmd_camadas)

    s = sub.add_parser("stats", help="estado do índice")
    s.set_defaults(func=cmd_stats)

    args = p.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
