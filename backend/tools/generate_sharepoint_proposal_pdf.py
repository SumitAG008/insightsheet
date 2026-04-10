from __future__ import annotations

from datetime import date
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, PageBreak
from reportlab.lib.units import cm


def _p(text: str) -> str:
    return (text or "").replace("\n", "<br/>")


def build_pdf(out_path: Path) -> None:
    styles = getSampleStyleSheet()
    title = styles["Title"]
    h2 = styles["Heading2"]
    body = styles["BodyText"]

    doc = SimpleDocTemplate(
        str(out_path),
        pagesize=A4,
        leftMargin=2.0 * cm,
        rightMargin=2.0 * cm,
        topMargin=2.0 * cm,
        bottomMargin=2.0 * cm,
        title="SharePoint Intranet + Migration Proposal",
        author="Meldra",
    )

    today = date.today().isoformat()

    story = []
    story.append(Paragraph("Proposal: SharePoint Intranet + Network Drive Migration", title))
    story.append(Spacer(1, 8))
    story.append(Paragraph(_p(f"Prepared for: Edwina D.<br/>Date: {today}<br/>Delivery window: 2 weeks"), body))
    story.append(Spacer(1, 14))

    story.append(Paragraph("1. Executive summary", h2))
    story.append(Paragraph(_p(
        "We will deliver a lightweight, modern SharePoint intranet and migrate agreed content from your legacy network drive "
        "into SharePoint document libraries with metadata, naming conventions, and basic governance. The solution will be low maintenance "
        "and include training for content administrators and user walkthrough materials (written and/or recorded)."
    ), body))
    story.append(Spacer(1, 10))

    story.append(Paragraph("2. Scope of work", h2))
    story.append(Paragraph(_p(
        "A) SharePoint intranet build (SharePoint Online)<br/>"
        "- Home page: announcements/news, quick links, and key documents<br/>"
        "- Core areas: Staff updates, Policies & Procedures, Documents/Knowledge base, Calendar/Events, Announcements<br/>"
        "- Information architecture: navigation, page templates, and content structure<br/>"
        "- Permissions: set up agreed user groups and page/library access<br/><br/>"
        "B) Document libraries + governance foundations<br/>"
        "- Create document libraries aligned to departments or functions<br/>"
        "- Define metadata columns (e.g., Document Type, Department, Status, Owner, Review Date)<br/>"
        "- Configure views, sorting/filtering, and naming conventions<br/>"
        "- Basic governance pack: content ownership, publishing guidance, and change control basics<br/><br/>"
        "C) Migration (from network drive to SharePoint)<br/>"
        "- Migration strategy and mapping (folders to libraries, permissions, metadata approach)<br/>"
        "- Execute migration for agreed scope<br/>"
        "- Validation: spot checks + issue log + fixes<br/><br/>"
        "D) Training + handover<br/>"
        "- 1–2 admin training sessions (content editors/admins)<br/>"
        "- User walkthrough: short guide + recording (Teams/Loom style)"
    ), body))
    story.append(Spacer(1, 10))

    story.append(Paragraph("3. Assumptions (for fixed price)", h2))
    story.append(Paragraph(_p(
        "- Microsoft 365 tenant and SharePoint Online licensing already in place for staff<br/>"
        "- Intranet branding is lightweight (logo + colours); no custom SPFx development unless agreed<br/>"
        "- Migration scope is limited to agreed folders/GB and excludes complex legacy permissions re-engineering unless specified<br/>"
        "- Client provides a single point of contact for content decisions and approvals<br/>"
        "- Access to the network drive is provided securely for migration execution"
    ), body))
    story.append(Spacer(1, 10))

    story.append(Paragraph("4. Delivery plan (2-week outline)", h2))
    story.append(Paragraph(_p(
        "Week 1<br/>"
        "- Discovery + confirmation of pages, navigation, permissions, and migration scope<br/>"
        "- Build intranet skeleton + page templates + initial libraries/metadata<br/>"
        "- Draft governance/naming conventions<br/><br/>"
        "Week 2<br/>"
        "- Execute migration for agreed scope<br/>"
        "- Configure final views/permissions and polish UI<br/>"
        "- Validation spot checks + fixes<br/>"
        "- Training sessions + handover materials"
    ), body))
    story.append(Spacer(1, 10))

    story.append(Paragraph("5. Acceptance criteria", h2))
    story.append(Paragraph(_p(
        "Project will be considered complete when:<br/>"
        "- Intranet site is live and accessible to agreed user groups<br/>"
        "- Document libraries and metadata/views are implemented as agreed<br/>"
        "- Migration is completed for the agreed content scope and validated via spot checks<br/>"
        "- Training delivered and recordings/materials shared"
    ), body))

    story.append(PageBreak())

    story.append(Paragraph("6. Pricing & payment schedule (example)", h2))
    story.append(Paragraph(_p(
        "Fixed-fee packages (select based on confirmed scope):<br/>"
        "- Starter: £4,500 – £7,500<br/>"
        "- Standard (recommended): £7,500 – £12,500<br/>"
        "- Plus: £12,500 – £18,000<br/><br/>"
        "Payment schedule (typical): 50% upfront, 40% after migration completion, 10% on handover."
    ), body))
    story.append(Spacer(1, 10))

    story.append(Paragraph("7. Risks & mitigations", h2))
    story.append(Paragraph(_p(
        "- Unknown content volume/quality: confirm scope and run a small pilot migration first<br/>"
        "- Permissions complexity: standardise groups and simplify access where possible<br/>"
        "- Stakeholder availability: schedule approvals and training early in Week 1"
    ), body))
    story.append(Spacer(1, 10))

    story.append(Paragraph("8. Next steps", h2))
    story.append(Paragraph(_p(
        "1) Confirm content volume + in-scope folders and user groups<br/>"
        "2) Confirm required intranet sections/pages<br/>"
        "3) Schedule a 20–30 minute scoping call<br/>"
        "4) Finalise fixed price and start date"
    ), body))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    doc.build(story)


if __name__ == "__main__":
    out = Path(__file__).resolve().parents[2] / "proposal_outputs" / "SharePoint-Intranet-Proposal-Edwina.pdf"
    build_pdf(out)
    print(str(out))
