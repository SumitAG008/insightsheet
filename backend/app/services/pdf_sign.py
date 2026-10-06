"""
Digitally sign a PDF with the user's own certificate (.pfx / .p12), in memory.

The certificate and its password are used for this one request and never stored or logged. The
signature is a standard PDF signature (PAdES-style CMS, SHA-256), so Adobe Reader and other readers
show who signed and whether the document changed afterwards. Signing is the last step: any later
change to the file breaks the signature, as it should.

Certificates kept on a USB token (most Indian Class 3 DSCs) cannot leave the token, so those are
signed in Adobe Reader or the token's own software, using the empty signature field meldra adds.
"""
import io
import logging
from typing import Any, Dict, Optional

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

MAX_CERT_BYTES = 100 * 1024


class SigningError(ValueError):
    """A problem the user can fix (wrong password, not a certificate, PDF cannot be signed)."""


def _load_signer(pfx: bytes, password: str):
    from asn1crypto import keys, x509
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.serialization import pkcs12
    from pyhanko.sign import signers
    from pyhanko_certvalidator.registry import SimpleCertificateStore

    if not pfx or len(pfx) > MAX_CERT_BYTES:
        raise SigningError("Choose your certificate file (.pfx or .p12).")
    try:
        key, cert, extra = pkcs12.load_key_and_certificates(pfx, (password or "").encode("utf-8") or None)
    except Exception:
        key = cert = None
    if key is None or cert is None:
        raise SigningError("The certificate could not be opened. Check the password and that the file is a .pfx or .p12 certificate with its private key.")
    der = serialization.Encoding.DER
    signing_key = keys.PrivateKeyInfo.load(key.private_bytes(der, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
    signing_cert = x509.Certificate.load(cert.public_bytes(der))
    chain = [x509.Certificate.load(c.public_bytes(der)) for c in (extra or [])]
    return signers.SimpleSigner(signing_cert=signing_cert, signing_key=signing_key,
                                cert_registry=SimpleCertificateStore.from_certs([signing_cert, *chain]))


def _empty_signature_fields(pdf_bytes: bytes) -> Dict[str, int]:
    """Names of unsigned signature fields and their pages."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        found: Dict[str, int] = {}
        for page in doc:
            for w in page.widgets() or []:
                if w.field_type == fitz.PDF_WIDGET_TYPE_SIGNATURE and w.field_name and doc.xref_get_key(w.xref, "V")[0] == "null":
                    found.setdefault(w.field_name, page.number)
        return found
    finally:
        doc.close()


def _box_on_page(pdf_bytes: bytes, place: Dict[str, Any]):
    """Editor placement (page index and 0..1 fractions from the top left) -> (page, PDF box)."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        pno = int(place.get("page", 0))
        if not 0 <= pno < len(doc):
            raise SigningError("The signature position is not on a page of this document.")
        page = doc[pno]
        shown = page.rect
        f = lambda k: min(1.0, max(0.0, float(place.get(k, 0))))  # noqa: E731
        r = fitz.Rect(f("x") * shown.width, f("y") * shown.height,
                      (f("x") + f("w")) * shown.width, (f("y") + f("h")) * shown.height)
        if page.rotation:
            r = r * page.derotation_matrix
        r = (r * ~page.transformation_matrix).normalize()
        if r.width < 20 or r.height < 10:
            raise SigningError("The signature box is too small.")
        return pno, (int(r.x0), int(r.y0), int(r.x1), int(r.y1))
    finally:
        doc.close()


def sign_pdf_with_certificate(
    pdf_bytes: bytes,
    pfx: bytes,
    password: str,
    field_name: Optional[str] = None,
    place: Optional[Dict[str, Any]] = None,
    reason: str = "",
    location: str = "",
    invisible: bool = False,
) -> bytes:
    """
    Sign into the named empty signature field, else a new visible box at `place`, else the first empty
    field (unless `invisible`), else an invisible signature (shown in the reader's signature panel).
    """
    from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
    from pyhanko.sign import fields, signers

    signer = _load_signer(pfx, password)
    try:
        empty = _empty_signature_fields(pdf_bytes)
    except Exception:
        raise SigningError("This PDF could not be read for signing.")

    spec = None
    if field_name and field_name in empty:
        name = field_name
    elif place:
        name = "meldra_signature"
        while name in empty:
            name += "_1"
        pno, box = _box_on_page(pdf_bytes, place)
        spec = fields.SigFieldSpec(sig_field_name=name, on_page=pno, box=box)
    elif empty and not invisible:
        name = next(iter(empty))
    else:
        name = "meldra_signature"
        spec = fields.SigFieldSpec(sig_field_name=name)

    meta = signers.PdfSignatureMetadata(
        field_name=name,
        reason=(reason or "").strip()[:200] or None,
        location=(location or "").strip()[:200] or None,
        md_algorithm="sha256",
    )
    try:
        writer = IncrementalPdfFileWriter(io.BytesIO(pdf_bytes), strict=False)
        out = signers.sign_pdf(writer, meta, signer=signer, new_field_spec=spec)
    except SigningError:
        raise
    except Exception as e:
        logger.warning("PDF signing failed: %s", type(e).__name__)
        raise SigningError("This PDF could not be signed. If it is password-protected or already locked by a signature, open it in meldra's editor and download it first.")
    return out.getvalue()
