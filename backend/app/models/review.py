"""
Customer Reviews Model
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    
    # User info
    user_email = Column(String(255), index=True, nullable=False)
    user_name = Column(String(255))
    
    # Review content
    rating = Column(Integer, nullable=False)  # 1-5 stars
    title = Column(String(255))
    comment = Column(Text)
    
    # Review metadata
    feature_rated = Column(String(100))  # Which feature (e.g., "Excel to PPT", "P&L Builder")
    helpful_count = Column(Integer, default=0)
    verified_purchase = Column(Boolean, default=False)
    
    # Moderation
    is_approved = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    moderation_notes = Column(Text, nullable=True)
    
    # Timestamps
    created_date = Column(DateTime, default=datetime.utcnow, index=True)
    updated_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_email": self.user_email,
            "user_name": self.user_name,
            "rating": self.rating,
            "title": self.title,
            "comment": self.comment,
            "feature_rated": self.feature_rated,
            "helpful_count": self.helpful_count,
            "verified_purchase": self.verified_purchase,
            "is_approved": self.is_approved,
            "is_featured": self.is_featured,
            "created_date": self.created_date.isoformat() if self.created_date else None,
            "updated_date": self.updated_date.isoformat() if self.updated_date else None
        }
