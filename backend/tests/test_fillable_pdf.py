"""Non-editable PDFs, scans and photos of forms become fillable PDFs; form data can be read back out."""
import base64
import io
import os
import shutil
import secrets
import tempfile

import pytest

os.environ.setdefault("DATABASE_URL", f"sqlite:///{os.path.join(tempfile.gettempdir(), 'meldra_connector_endpoints.db')}")
fitz = pytest.importorskip("fitz")
main = pytest.importorskip("app.main", reason="full backend dependencies not installed")
from fastapi.testclient import TestClient  # noqa: E402

from app.database import SessionLocal, User  # noqa: E402
from app.services.fillable_pdf import FillableError, extract_form_data, make_fillable_pdf  # noqa: E402

main.init_db()
HAS_OCR = shutil.which("tesseract") is not None


def _form_pdf() -> bytes:
    """A typical hospital/insurance form: underlined blanks, typed blanks, check boxes, a table, a box."""
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    W, H = A4
    c.setFont("Helvetica-Bold", 16)
    c.drawString(60, H - 60, "CITY HOSPITAL - PATIENT REGISTRATION FORM")
    c.line(60, H - 68, W - 60, H - 68)
    c.setFont("Helvetica", 11)
    y = H - 110
    c.drawString(60, y, "Patient Name:")
    c.line(145, y - 2, 400, y - 2)
    y -= 32
    c.drawString(60, y, "Address:")
    c.line(115, y - 2, W - 60, y - 2)
    y -= 32
    c.drawString(60, y, "Phone: ____________________     Email: ________________________")
    y -= 32
    c.drawString(60, y, "Insurance Policy No:")
    y -= 40
    c.drawString(60, y, "Gender:")
    for i, lab in enumerate(["Male", "Female", "Other"]):
        x = 120 + i * 90
        c.rect(x, y - 2, 10, 10)
        c.drawString(x + 16, y, lab)
    y -= 50
    for i, r in enumerate(["Name", "Relationship"]):
        top = y - i * 24
        c.rect(60, top - 24, 150, 24)
        c.rect(210, top - 24, W - 270, 24)
        c.drawString(66, top - 17, r)
    y -= 100
    c.drawString(60, y, "Known allergies / medical history:")
    c.rect(60, y - 90, W - 120, 80)
    y -= 150
    c.line(60, y, 250, y)
    c.drawString(60, y - 14, "Patient Signature")
    c.save()
    return buf.getvalue()


EXPECTED_TEXT = {"Patient Name", "Address", "Phone", "Email", "Insurance Policy No", "Name", "Relationship",
                 "Known allergies / medical history", "Patient Signature"}
EXPECTED_BOXES = {"Male", "Female", "Other"}


def _labels(report, kind):
    return {f["label"] for f in report["field_list"] if (f["type"] == "checkbox") == (kind == "checkbox")}


def test_digital_form_gets_a_field_on_every_blank_and_nowhere_else():
    pdf, report = make_fillable_pdf(_form_pdf(), "form.pdf")
    assert _labels(report, "text") == EXPECTED_TEXT  # not the title or its underline
    assert _labels(report, "checkbox") == EXPECTED_BOXES
    doc = fitz.open(stream=pdf, filetype="pdf")
    widgets = list(doc[0].widgets())
    assert len(widgets) == len(EXPECTED_TEXT) + len(EXPECTED_BOXES)
    assert any(w.field_flags & fitz.PDF_TX_FIELD_IS_MULTILINE for w in widgets)  # the history box
    # Fields never cover printed text (typed blanks such as "______" are where fields belong).
    words = [w for w in doc[0].get_text("words") if not set(w[4]) <= set("_.")]
    for w in widgets:
        for x0, y0, x1, y1, *_ in words:
            inter = w.rect & fitz.Rect(x0, y0, x1, y1)
            assert inter.is_empty or inter.get_area() < 0.25 * fitz.Rect(x0, y0, x1, y1).get_area()


def test_edit_restrictions_are_removed_but_open_passwords_are_refused():
    src = fitz.open(stream=_form_pdf(), filetype="pdf")
    locked = src.tobytes(encryption=fitz.PDF_ENCRYPT_AES_256, owner_pw="owner-secret", user_pw="", permissions=fitz.PDF_PERM_PRINT)
    pdf, report = make_fillable_pdf(locked, "locked.pdf")
    out = fitz.open(stream=pdf, filetype="pdf")
    assert not out.is_encrypted and report["fields"] == len(EXPECTED_TEXT)

    with_password = src.tobytes(encryption=fitz.PDF_ENCRYPT_AES_256, owner_pw="o-secret", user_pw="u-secret")
    with pytest.raises(FillableError, match="password"):
        make_fillable_pdf(with_password, "pw.pdf")
    with pytest.raises(FillableError, match="PDF, JPG"):
        make_fillable_pdf(b"hello", "notes.txt")


@pytest.mark.skipif(not HAS_OCR, reason="Tesseract OCR not installed")
def test_photo_of_a_form_slightly_tilted_becomes_the_same_fillable_form():
    from PIL import Image, ImageFilter

    pix = fitz.open(stream=_form_pdf(), filetype="pdf")[0].get_pixmap(dpi=150)
    img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("L").rotate(0.6, fillcolor=255).filter(ImageFilter.GaussianBlur(0.5))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    pdf, report = make_fillable_pdf(buf.getvalue(), "photo.jpg")
    assert report["scanned_pages"] == 1
    assert _labels(report, "checkbox") == EXPECTED_BOXES
    assert len(EXPECTED_TEXT & _labels(report, "text")) >= len(EXPECTED_TEXT) - 1
    page = fitz.open(stream=pdf, filetype="pdf")[0]
    assert "Insurance" in page.get_text()  # the scan is searchable now


def test_filled_form_values_are_read_back():
    pdf, _ = make_fillable_pdf(_form_pdf(), "form.pdf")
    doc = fitz.open(stream=pdf, filetype="pdf")
    for w in doc[0].widgets():
        if w.field_name == "Patient_Name":
            w.field_value = "Asha Verma"
        elif w.field_name == "Female":
            w.field_value = w.on_state()
        elif w.field_name == "Relationship":
            w.field_value = "Husband"
        else:
            continue
        w.update()
    data = extract_form_data(doc.tobytes(), "filled.pdf")
    got = {f["label"]: f["value"] for f in data["fields"]}
    assert got["Patient Name"] == "Asha Verma" and got["Female"] == "Yes" and got["Male"] == "No"
    assert got["Relationship"] == "Husband"


@pytest.fixture()
def client():
    email = f"forms-{secrets.token_hex(4)}@example.com"
    db = SessionLocal()
    try:
        db.add(User(email=email, full_name="Forms", hashed_password="x", is_verified=True))
        db.commit()
    finally:
        db.close()
    main.app.dependency_overrides[main.get_current_user] = lambda: {"email": email}
    yield TestClient(main.app)
    main.app.dependency_overrides.clear()


def test_endpoints_make_fillable_extract_and_export(client):
    r = client.post("/api/files/make-fillable", files={"file": ("Claim Form.pdf", _form_pdf(), "application/pdf")})
    assert r.status_code == 200, r.text
    assert r.content[:5] == b"%PDF-" and int(r.headers["x-fillable-fields"]) == len(EXPECTED_TEXT)
    assert "Claim_Form_fillable.pdf" in r.headers["content-disposition"]

    bad = client.post("/api/files/make-fillable", files={"file": ("x.txt", b"plain text", "text/plain")})
    assert bad.status_code == 400 and "PDF, JPG" in bad.json()["detail"]

    data = client.post("/api/files/extract-form-data", files={"file": ("f.pdf", _form_pdf(), "application/pdf")})
    assert data.status_code == 200 and "Patient Name" in data.json()["text"]

    # The export the OCR page uses (it returned "Not Found" before).
    for fmt, magic in (("doc", b"PK"), ("pdf", b"%PDF-")):
        out = client.post("/api/files/ocr-export", json={"text": "Name: ____\nDate: ____", "format": fmt, "title": "Form"})
        assert out.status_code == 200 and out.content[: len(magic)] == magic, out.text
    exact = client.post("/api/files/ocr-export", json={"text": "", "format": "pdf", "preserve_image": True,
                                                       "image_base64": base64.b64encode(_form_pdf()).decode()})
    assert exact.status_code == 200 and fitz.open(stream=exact.content, filetype="pdf").is_form_pdf


def test_ocr_table_detection_finishes_on_forms_with_tables():
    """It used to loop forever (and pin a CPU) on any form with a table of 2+ rows."""
    import threading

    from app.services.ocr_service import _detect_tables_from_words

    def word(text, left, line):
        return {"text": text, "left": left, "top": line * 20, "width": 40, "height": 12, "block_num": 1, "line_num": line}

    words = [word("x", 0, 1),
             word("Name", 10, 2), word("Asha", 200, 2),
             word("a", 10, 3), word("Verma", 200, 3),
             word("Phone", 10, 4), word("123", 200, 4)]
    result = {}
    t = threading.Thread(target=lambda: result.update(tables=_detect_tables_from_words(words)), daemon=True)
    t.start()
    t.join(5)
    assert not t.is_alive(), "table detection did not finish"
    assert result["tables"] and len(result["tables"][0]["rows"]) == 3


def _contract_pdf() -> bytes:
    """Blanks typed inside sentences and a bracket placeholder, as in real agreements."""
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    W, H = A4
    c.setFont("Helvetica", 9)
    c.drawString(70, H - 130, 'This Statement of Work is dated as of ______ and is part of the Master Services')
    c.drawString(70, H - 142, 'Agreement dated______ ("Master Services Agreement")')
    c.drawString(70, H - 222, 'registered ________________(hereinafter referred to as "Volo Health")')
    c.setFont("Helvetica-Bold", 9)
    c.drawString(70, H - 260, "SIGNED FOR AND ON BEHALF OF [Insert Name of Network Provider]")
    c.drawString(70, H - 300, "BY AND BETWEEN")
    c.save()
    return buf.getvalue()


def test_blanks_inside_sentences_and_placeholders_become_fields():
    pdf, report = make_fillable_pdf(_contract_pdf(), "contract.pdf")
    labels = {f["label"] for f in report["field_list"]}
    assert {"Agreement dated", "registered", "Insert Name of Network Provider"} <= labels
    assert any(lab.endswith("dated as of") for lab in labels)
    widgets = {w.field_name: w for w in fitz.open(stream=pdf, filetype="pdf")[0].widgets()}
    # The placeholder field starts with the placeholder text, so typing replaces it.
    assert widgets["Insert_Name_of_Network_Provider"].field_value == "[Insert Name of Network Provider]"


def test_editor_edits_are_written_into_the_pdf():
    from app.services.fillable_pdf import apply_edits

    pdf, _ = make_fillable_pdf(_contract_pdf(), "contract.pdf")
    page = fitz.open(stream=pdf, filetype="pdf")[0]
    heading = page.search_for("BY AND BETWEEN")[0]
    W, H = page.rect.width, page.rect.height
    edits = {
        "fields": {"registered": "14 MG Road, Pune", "Insert_Name_of_Network_Provider": "Apollo Clinics Pvt Ltd"},
        "items": [
            {"type": "whiteout", "page": 0, "x": (heading.x0 - 1) / W, "y": (heading.y0 - 1) / H,
             "w": (heading.width + 2) / W, "h": (heading.height + 2) / H},
            {"type": "text", "page": 0, "x": heading.x0 / W, "y": heading.y0 / H, "w": 0.05, "h": 0.01,
             "text": "BETWEEN THE PARTIES BELOW", "size": 9, "color": "#cc0000"},
            {"type": "text", "page": 0, "x": 0.1, "y": 0.6, "w": 0.3, "h": 0.03, "text": "नमस्ते", "size": 12},
            {"type": "check", "page": 0, "x": 0.5, "y": 0.5, "w": 0.02, "h": 0.015},
            {"type": "text", "page": 9, "x": 0.1, "y": 0.1, "text": "ignored: no such page"},
        ],
    }
    out = fitz.open(stream=apply_edits(pdf, edits), filetype="pdf")
    text = out[0].get_text()
    assert "BY AND BETWEEN" not in text  # white-out removes the covered words from the file
    assert "BETWEEN THE PARTIES BELOW" in text  # typed on one line stays on one line
    values = {w.field_name: w.field_value for w in out[0].widgets()}
    assert values["registered"] == "14 MG Road, Pune"
    assert values["Insert_Name_of_Network_Provider"] == "Apollo Clinics Pvt Ltd"

    locked = fitz.open(stream=apply_edits(pdf, {**edits, "flatten": True}), filetype="pdf")
    assert not list(locked[0].widgets()) and "14 MG Road, Pune" in locked[0].get_text()


def test_editor_download_endpoint(client):
    import json as _json

    pdf, _ = make_fillable_pdf(_contract_pdf(), "contract.pdf")
    r = client.post("/api/files/pdf-apply-edits", files={"file": ("doc.pdf", pdf, "application/pdf")},
                    data={"edits": _json.dumps({"fields": {"registered": "Pune"}, "items": []})})
    assert r.status_code == 200 and r.content[:5] == b"%PDF-"
    assert client.post("/api/files/pdf-apply-edits", files={"file": ("doc.pdf", pdf, "application/pdf")},
                       data={"edits": "{not json"}).status_code == 400
