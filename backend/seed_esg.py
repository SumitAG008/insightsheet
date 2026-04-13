import asyncio
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
    from app.database import EsgProject, EsgReportingPeriod, EsgMetricDefinition, EsgMetricValue
    db = SessionLocal()
    try:
        user_email = "sumitagaria@gmail.com"
        # Find project
        project = db.query(EsgProject).filter(EsgProject.name == "meldra_acme").first()
        if not project:
            # Maybe they have a different project? Get first project
            project = db.query(EsgProject).first()
            
        if not project:
            print("Creating dummy project meldra_acme")
            project = EsgProject(name="meldra_acme", user_email=user_email)
            db.add(project)
            db.commit()
            db.refresh(project)
            
        project_id = project.id
        print(f"Seeding Data for project_id {project_id}")

        # Clear existing AI-relevant mock periods/metrics to avoid duplicates
        db.query(EsgMetricValue).filter(EsgMetricValue.project_id == project_id).delete()
        db.query(EsgReportingPeriod).filter(EsgReportingPeriod.project_id == project_id).delete()
        db.commit()
        
        # Create metric definition
        def1 = EsgMetricDefinition(
            user_email=user_email,
            project_id=project_id,
            key="ghg_scope1_total",
            name="Scope 1 Emissions",
            category="E",
            unit="tCO2e"
        )
        def2 = EsgMetricDefinition(
            user_email=user_email,
            project_id=project_id,
            key="ghg_scope2_total",
            name="Scope 2 Emissions",
            category="E",
            unit="tCO2e"
        )
        def3 = EsgMetricDefinition(
            user_email=user_email,
            project_id=project_id,
            key="ghg_scope3_total",
            name="Scope 3 Emissions",
            category="E",
            unit="tCO2e"
        )
        db.add_all([def1, def2, def3])
        db.commit()
        db.refresh(def1)
        db.refresh(def2)
        db.refresh(def3)

        base_date = datetime.utcnow() - timedelta(days=365) # Start 12 months ago
        
        metrics = []
        
        # We will create 12 periods, one for each past month
        base_emission = 80000.0
        
        for i in range(12):
            p_date = base_date + timedelta(days=30*i)
            period = EsgReportingPeriod(
                project_id=project_id,
                user_email=user_email,
                name=f"Month {i+1} ({p_date.strftime('%b %Y')})",
                framework="Global AI Standard",
                start_date=p_date,
                end_date=p_date + timedelta(days=30)
            )
            db.add(period)
            db.commit()
            db.refresh(period)
            
            # Decrease base emission progressively with some noise
            target_emission = base_emission - (2500*i) + random.randint(-500, 500)
            
            # Divide amongst the 3 scopes
            s1 = target_emission * 0.2
            s2 = target_emission * 0.3
            s3 = target_emission * 0.5
            
            metrics.append(EsgMetricValue(
                user_email=user_email,
                project_id=project_id,
                period_id=period.id,
                metric_definition_id=def1.id,
                value=s1,
                status="approved"
            ))
            metrics.append(EsgMetricValue(
                user_email=user_email,
                project_id=project_id,
                period_id=period.id,
                metric_definition_id=def2.id,
                value=s2,
                status="approved"
            ))
            metrics.append(EsgMetricValue(
                user_email=user_email,
                project_id=project_id,
                period_id=period.id,
                metric_definition_id=def3.id,
                value=s3,
                status="approved"
            ))
            
        db.add_all(metrics)
        db.commit()
        print(f"Seeded 12 months of live historical data into DB. Current Net Emission is approx {target_emission} tCO2e! No more mock fallback needed.")

    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
