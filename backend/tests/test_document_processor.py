from app.services import document_processor


class _Result:
    data = [{"id": "row-1"}]


class _Table:
    def __init__(self, calls, name):
        self.calls = calls
        self.name = name

    def insert(self, payload):
        self.calls.append(("insert", self.name, payload))
        return self

    def update(self, payload):
        self.calls.append(("update", self.name, payload))
        return self

    def eq(self, column, value):
        self.calls.append(("eq", self.name, column, value))
        return self

    def execute(self):
        return _Result()


class _Db:
    def __init__(self):
        self.calls = []

    def table(self, name):
        return _Table(self.calls, name)


def test_parse_markdown_strips_markup_to_plain_text():
    pages = document_processor.parse_markdown(b"# Title\n\nHello **team**")

    assert pages == [("Title\nHello team", 1)]


def test_process_csv_stores_table_chunks_and_marks_document_ready(monkeypatch):
    db = _Db()
    csv_content = b"name,score\nA,10\nB,20\n"

    monkeypatch.setattr(document_processor, "get_supabase", lambda: db)
    monkeypatch.setattr(
        document_processor,
        "embed_chunks",
        lambda chunks: [[0.1, 0.2, 0.3] for _ in chunks],
    )

    document_processor.process_document("doc-1", "csv", csv_content)

    inserted_tables = [
        call[2]
        for call in db.calls
        if call[0] == "insert" and call[1] == "csv_tables"
    ]
    inserted_chunks = [
        call[2]
        for call in db.calls
        if call[0] == "insert" and call[1] == "document_chunks"
    ]

    assert inserted_tables[0]["document_id"] == "doc-1"
    assert inserted_tables[0]["row_count"] == 2
    assert [column["name"] for column in inserted_tables[0]["columns"]] == ["name", "score"]
    assert inserted_chunks[0][0]["document_id"] == "doc-1"
    assert ("update", "documents", {"status": "ready"}) in db.calls
