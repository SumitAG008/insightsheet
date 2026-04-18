import io
import fitz  # PyMuPDF

def merge_pdfs(pdf_bytes_list: list[bytes]) -> bytes:
    """Merge a list of PDF file bytes into a single PDF."""
    if not pdf_bytes_list:
        raise ValueError("No PDFs provided to merge.")
    
    result_doc = fitz.open()
    for pdf_bytes in pdf_bytes_list:
        doc = fitz.open("pdf", pdf_bytes)
        result_doc.insert_pdf(doc)
        doc.close()
    
    out_bytes = result_doc.write()
    result_doc.close()
    return out_bytes

def split_pdf(pdf_bytes: bytes, page_ranges: str) -> bytes:
    """
    Split/Extract pages from a PDF.
    page_ranges: a string like "1,3,5-7" (1-indexed)
    """
    if not pdf_bytes:
        raise ValueError("No PDF provided.")
    if not page_ranges:
        return pdf_bytes
        
    doc = fitz.open("pdf", pdf_bytes)
    result_doc = fitz.open()
    
    pages_to_keep = set()
    parts = page_ranges.split(",")
    for part in parts:
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            start_str, end_str = part.split("-", 1)
            try:
                start = int(start_str.strip())
                end = int(end_str.strip())
                for p in range(start, end + 1):
                    pages_to_keep.add(p)
            except ValueError:
                pass
        else:
            try:
                p = int(part)
                pages_to_keep.add(p)
            except ValueError:
                pass
                
    if not pages_to_keep:
        raise ValueError("Invalid page ranges provided.")
        
    sorted_pages = sorted(list(pages_to_keep))
    for p in sorted_pages:
        # fitz is 0-indexed, user input is 1-indexed
        p_index = p - 1
        if 0 <= p_index < len(doc):
            result_doc.insert_pdf(doc, from_page=p_index, to_page=p_index)
            
    out_bytes = result_doc.write()
    result_doc.close()
    doc.close()
    return out_bytes
