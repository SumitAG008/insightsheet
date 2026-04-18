import os
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Set up to avoid relative import issues
load_dotenv(".env")
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("No DATABASE_URL")
    exit(1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed_db():
    from app.database import (
        EsgProject, EsgReportingPeriod, EsgSite, 
        EsgFramework, EsgFrameworkRequirement, 
        EsgMetricDefinition, EsgMetricValue,
        EsgEvidenceDocument, EsgMetricEvidenceLink, EsgTask
    )
    db = SessionLocal()
    try:
        user_email = "sumitagaria@gmail.com"
        print("Starting Global Enterprise ESG Seeding...")
        
        # 1. Project Creation
        project_name = "Global_Pharma_Corp"
        project = db.query(EsgProject).filter(EsgProject.name == project_name).first()
        if not project:
            print(f"Creating Enterprise Project {project_name}")
            project = EsgProject(name=project_name, user_email=user_email, description="Enterprise Global Pharmaceutical Partner")
            db.add(project)
            db.commit()
            db.refresh(project)
        project_id = project.id

        # Clear existing data for this project to start fresh
        print("Clearing existing mock data for project...")
        db.query(EsgTask).filter(EsgTask.project_id == project_id).delete()
        db.query(EsgMetricEvidenceLink).filter(EsgMetricEvidenceLink.project_id == project_id).delete()
        db.query(EsgEvidenceDocument).filter(EsgEvidenceDocument.project_id == project_id).delete()
        db.query(EsgMetricValue).filter(EsgMetricValue.project_id == project_id).delete()
        db.query(EsgMetricDefinition).filter(EsgMetricDefinition.project_id == project_id).delete()
        db.query(EsgFrameworkRequirement).filter(EsgFrameworkRequirement.project_id == project_id).delete()
        db.query(EsgFramework).filter(EsgFramework.project_id == project_id).delete()
        db.query(EsgSite).filter(EsgSite.project_id == project_id).delete()
        db.query(EsgReportingPeriod).filter(EsgReportingPeriod.project_id == project_id).delete()
        db.commit()

        # 2. Geographically Routed Sites
        print("Creating Geographic Sites...")
        sites = [
            EsgSite(project_id=project_id, user_email=user_email, name="New York HQ", country="US", region="North America"),
            EsgSite(project_id=project_id, user_email=user_email, name="Berlin Manufacturing", country="Germany", region="EU"),
            EsgSite(project_id=project_id, user_email=user_email, name="Singapore R&D", country="Singapore", region="APAC"),
        ]
        db.add_all(sites)
        db.commit()
        for s in sites:
            db.refresh(s)

        # 3. Global Frameworks
        print("Creating Compliance Frameworks...")
        frameworks = [
            EsgFramework(project_id=project_id, user_email=user_email, key="csrd", name="Corporate Sustainability Reporting Directive (EU)"),
            EsgFramework(project_id=project_id, user_email=user_email, key="sasb", name="Sustainability Accounting Standards Board"),
            EsgFramework(project_id=project_id, user_email=user_email, key="tcfd", name="Task Force on Climate-Related Financial Disclosures")
        ]
        db.add_all(frameworks)
        db.commit()

        # 4. Framework Requirements
        print("Creating Audit Requirements...")
        reqs = [
            EsgFrameworkRequirement(project_id=project_id, user_email=user_email, framework_key="csrd", code="E1-1", title="Transition Plan for Climate Change Mitigation", evidence_required=True),
            EsgFrameworkRequirement(project_id=project_id, user_email=user_email, framework_key="csrd", code="E1-6", title="Gross Scopes 1, 2, 3 and Total GHG Emissions", evidence_required=True),
            EsgFrameworkRequirement(project_id=project_id, user_email=user_email, framework_key="sasb", code="HC-BP-130a.1", title="Energy Management in Manufacturing", evidence_required=True),
            EsgFrameworkRequirement(project_id=project_id, user_email=user_email, framework_key="tcfd", code="Metrics-A", title="Scope 1 & 2 Emissions", evidence_required=True)
        ]
        db.add_all(reqs)
        db.commit()

        # 5. Metric Definitions
        print("Creating Metric Definitions...")
        defs = [
            EsgMetricDefinition(project_id=project_id, user_email=user_email, key="ghg_scope1", name="Scope 1 Emissions", category="Environment", unit="tCO2e", granularity="site"),
            EsgMetricDefinition(project_id=project_id, user_email=user_email, key="ghg_scope2", name="Scope 2 Emissions", category="Environment", unit="tCO2e", granularity="site"),
            EsgMetricDefinition(project_id=project_id, user_email=user_email, key="ghg_scope3", name="Scope 3 Emissions", category="Environment", unit="tCO2e", granularity="org"),
            EsgMetricDefinition(project_id=project_id, user_email=user_email, key="water_usage", name="Water Consumption", category="Environment", unit="Cubic Meters", granularity="site"),
            EsgMetricDefinition(project_id=project_id, user_email=user_email, key="gender_diversity", name="Women in Leadership", category="Social", unit="Percentage", granularity="org")
        ]
        db.add_all(defs)
        db.commit()
        for d in defs:
            db.refresh(d)

        # 6. Reporting Periods (24 months of data)
        print("Generating 24 Months of Historical Data...")
        base_date = datetime.utcnow() - timedelta(days=730)
        
        all_metrics = []
        base_emissions = {"New York HQ": 1500, "Berlin Manufacturing": 8000, "Singapore R&D": 1200}
        
        for i in range(24):
            p_date = base_date + timedelta(days=30*i)
            period = EsgReportingPeriod(
                project_id=project_id,
                user_email=user_email,
                name=f"{p_date.strftime('%B %Y')}",
                framework="Global Consolidated",
                start_date=p_date,
                end_date=p_date + timedelta(days=30)
            )
            db.add(period)
            db.commit()
            db.refresh(period)
            
            # Decay factor indicating they are improving over time (compliance)
            decay = 1.0 - (i * 0.015) 
            
            # Org-level Scope 3
            s3_val = 25000 * decay + random.randint(-500, 500)
            all_metrics.append(EsgMetricValue(user_email=user_email, project_id=project_id, period_id=period.id, metric_definition_id=defs[2].id, value=s3_val, status="approved"))
            
            # Org-level Diversity
            div_val = 30.0 + (i * 0.5) + random.uniform(-1.0, 1.0)
            all_metrics.append(EsgMetricValue(user_email=user_email, project_id=project_id, period_id=period.id, metric_definition_id=defs[4].id, value=div_val, status="approved"))

            # Site-level metrics
            for site in sites:
                base_e = base_emissions[site.name] * decay
                s1_val = base_e * 0.4 + random.randint(-100, 100)
                s2_val = base_e * 0.6 + random.randint(-100, 100)
                water_val = (base_e * 2.5) + random.randint(-500, 500)
                
                all_metrics.append(EsgMetricValue(user_email=user_email, project_id=project_id, period_id=period.id, site_id=site.id, metric_definition_id=defs[0].id, value=s1_val, status="approved"))
                all_metrics.append(EsgMetricValue(user_email=user_email, project_id=project_id, period_id=period.id, site_id=site.id, metric_definition_id=defs[1].id, value=s2_val, status="approved"))
                all_metrics.append(EsgMetricValue(user_email=user_email, project_id=project_id, period_id=period.id, site_id=site.id, metric_definition_id=defs[3].id, value=water_val, status="approved"))

        db.add_all(all_metrics)
        db.commit()
        
        # 7. Mock Evidence Documents & Links for latest period
        latest_period = db.query(EsgReportingPeriod).filter(EsgReportingPeriod.project_id == project_id).order_by(EsgReportingPeriod.start_date.desc()).first()
        print(f"Creating Audit Evidence Links for {latest_period.name}...")
        
        doc1 = EsgEvidenceDocument(project_id=project_id, period_id=latest_period.id, user_email=user_email, filename="Utility_Bills_Berlin_Q4.pdf", storage_path="/mock/path/utility.pdf", doc_type="Utility Bill", extracted_text="Energy usage: 4800 MWh", status="processed")
        doc2 = EsgEvidenceDocument(project_id=project_id, period_id=latest_period.id, user_email=user_email, filename="Supplier_Emissions_Audit.pdf", storage_path="/mock/path/supplier.pdf", doc_type="Audit Report", extracted_text="Scope 3 Total: 15400 tCO2e", status="processed")
        db.add_all([doc1, doc2])
        db.commit()
        db.refresh(doc1)
        db.refresh(doc2)
        
        # Link them to latest metrics
        latest_metrics = db.query(EsgMetricValue).filter(EsgMetricValue.period_id == latest_period.id).all()
        links = []
        for m in latest_metrics:
            if m.metric_definition_id == defs[1].id: # Scope 2
                links.append(EsgMetricEvidenceLink(user_email=user_email, project_id=project_id, period_id=latest_period.id, metric_value_id=m.id, evidence_document_id=doc1.id, excerpt="Energy usage: 4800 MWh", page_ref="Pg 2"))
            elif m.metric_definition_id == defs[2].id: # Scope 3
                links.append(EsgMetricEvidenceLink(user_email=user_email, project_id=project_id, period_id=latest_period.id, metric_value_id=m.id, evidence_document_id=doc2.id, excerpt="Scope 3 Total: 15400 tCO2e", page_ref="Pg 14"))
        db.add_all(links)
        db.commit()

        print("✅ Success: Enterprise Global ESG Data Seeded Successfully!")
        print(f"Created {len(all_metrics)} metric data points across {len(sites)} geographic sites and mapped to 3 global frameworks.")

    except Exception as e:
        print(f"Error seeding DB: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
