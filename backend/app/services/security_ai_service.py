"""
Security AI/ML Service
Uses AI and ML for fraud detection, anomaly detection, and security monitoring
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
import numpy as np

from app.database import LoginHistory, User, ApiUsage, UserActivity
from app.services.ai_service import invoke_llm

logger = logging.getLogger(__name__)


class SecurityAIService:
    """AI-powered security monitoring and fraud detection"""

    def __init__(self):
        self.suspicious_ip_threshold = 5  # Logins from >5 IPs in 24h
        self.failed_login_threshold = 5  # >5 failed logins in 1h
        self.geo_anomaly_threshold = 1000  # km - impossible travel distance

    async def detect_fraud_patterns(
        self,
        db: Session,
        user_email: Optional[str] = None,
        days: int = 7
    ) -> Dict[str, Any]:
        """
        Detect fraud patterns using ML:
        - Multiple IPs from different locations in short time
        - Unusual access patterns
        - Suspicious login times
        - Failed login spikes
        """
        try:
            cutoff = datetime.utcnow() - timedelta(days=days)
            
            # Get login history
            query = db.query(LoginHistory).filter(
                LoginHistory.created_date >= cutoff
            )
            
            if user_email:
                query = query.filter(LoginHistory.user_email == user_email)
            
            logins = query.all()
            
            if not logins:
                return {
                    "risk_score": 0,
                    "anomalies": [],
                    "recommendations": []
                }
            
            # Analyze patterns
            anomalies = []
            risk_factors = []
            
            # 1. Multiple IPs analysis
            ip_counts = {}
            for login in logins:
                if login.ip_address and login.ip_address != "127.0.0.1":
                    ip_counts[login.ip_address] = ip_counts.get(login.ip_address, 0) + 1
            
            unique_ips = len([ip for ip in ip_counts.keys() if ip != "127.0.0.1"])
            if unique_ips > self.suspicious_ip_threshold:
                anomalies.append({
                    "type": "multiple_ips",
                    "severity": "high",
                    "message": f"User logged in from {unique_ips} different IP addresses in {days} days",
                    "details": {"unique_ips": unique_ips, "threshold": self.suspicious_ip_threshold}
                })
                risk_factors.append(30)
            
            # 2. Failed login analysis
            failed_logins = [l for l in logins if l.event_type == "failed_login"]
            if len(failed_logins) > self.failed_login_threshold:
                anomalies.append({
                    "type": "failed_login_spike",
                    "severity": "medium",
                    "message": f"{len(failed_logins)} failed login attempts detected",
                    "details": {"count": len(failed_logins), "threshold": self.failed_login_threshold}
                })
                risk_factors.append(20)
            
            # 3. Geographic anomalies (impossible travel)
            geo_anomalies = self._detect_geo_anomalies(logins)
            if geo_anomalies:
                anomalies.extend(geo_anomalies)
                risk_factors.append(25)
            
            # 4. Unusual access times
            time_anomalies = self._detect_time_anomalies(logins)
            if time_anomalies:
                anomalies.extend(time_anomalies)
                risk_factors.append(15)
            
            # Calculate risk score (0-100)
            risk_score = min(100, sum(risk_factors))
            
            # Generate AI recommendations
            recommendations = await self._generate_security_recommendations(anomalies, risk_score)
            
            return {
                "risk_score": risk_score,
                "risk_level": "high" if risk_score >= 70 else "medium" if risk_score >= 40 else "low",
                "anomalies": anomalies,
                "statistics": {
                    "total_logins": len([l for l in logins if l.event_type == "login"]),
                    "failed_logins": len(failed_logins),
                    "unique_ips": unique_ips,
                    "unique_locations": len(set([l.location for l in logins if l.location]))
                },
                "recommendations": recommendations
            }
            
        except Exception as e:
            logger.error(f"Fraud detection error: {str(e)}")
            raise Exception(f"Security analysis failed: {str(e)}")

    def _detect_geo_anomalies(self, logins: List[LoginHistory]) -> List[Dict[str, Any]]:
        """Detect impossible travel (same user in different locations too quickly)"""
        anomalies = []
        
        # Group by user_email
        user_logins = {}
        for login in logins:
            if login.user_email and login.location and login.event_type == "login":
                if login.user_email not in user_logins:
                    user_logins[login.user_email] = []
                user_logins[login.user_email].append({
                    "location": login.location,
                    "time": login.created_date,
                    "ip": login.ip_address
                })
        
        # Check for rapid location changes
        for email, user_logs in user_logins.items():
            if len(user_logs) < 2:
                continue
            
            # Sort by time
            user_logs.sort(key=lambda x: x["time"])
            
            for i in range(1, len(user_logs)):
                prev = user_logs[i-1]
                curr = user_logs[i]
                
                time_diff = (curr["time"] - prev["time"]).total_seconds() / 3600  # hours
                
                # If locations are different and time is < 2 hours, flag
                if prev["location"] != curr["location"] and time_diff < 2:
                    anomalies.append({
                        "type": "impossible_travel",
                        "severity": "high",
                        "message": f"User {email} logged in from {prev['location']} and {curr['location']} within {time_diff:.1f} hours",
                        "details": {
                            "from": prev["location"],
                            "to": curr["location"],
                            "time_hours": round(time_diff, 2)
                        }
                    })
        
        return anomalies

    def _detect_time_anomalies(self, logins: List[LoginHistory]) -> List[Dict[str, Any]]:
        """Detect unusual access times (e.g., 3 AM logins from new IP)"""
        anomalies = []
        
        for login in logins:
            if login.event_type == "login" and login.created_date:
                hour = login.created_date.hour
                # Flag logins between 2 AM and 5 AM as potentially suspicious
                if 2 <= hour <= 5:
                    anomalies.append({
                        "type": "unusual_access_time",
                        "severity": "low",
                        "message": f"Login at unusual time: {hour}:00",
                        "details": {"hour": hour, "ip": login.ip_address}
                    })
        
        return anomalies[:5]  # Limit to top 5

    async def _generate_security_recommendations(
        self,
        anomalies: List[Dict[str, Any]],
        risk_score: int
    ) -> List[str]:
        """Use AI to generate security recommendations"""
        try:
            if not anomalies:
                return ["No security issues detected. Continue monitoring."]
            
            anomaly_summary = "\n".join([
                f"- {a['type']}: {a['message']} (severity: {a['severity']})"
                for a in anomalies[:5]
            ])
            
            prompt = f"""
            Security Risk Analysis:
            Risk Score: {risk_score}/100
            
            Detected Anomalies:
            {anomaly_summary}
            
            Provide 3-5 actionable security recommendations to address these issues.
            Focus on immediate actions and preventive measures.
            
            Respond with JSON:
            {{
                "recommendations": ["recommendation1", "recommendation2", "recommendation3"]
            }}
            """
            
            response = await invoke_llm(
                prompt=prompt,
                response_schema={"type": "json_object"},
                max_tokens=500
            )
            
            return response.get("recommendations", [
                "Review login history for suspicious activity",
                "Consider enabling 2FA for high-risk accounts",
                "Monitor IP addresses for unusual patterns"
            ])
            
        except Exception as e:
            logger.warning(f"AI recommendation generation failed: {str(e)}")
            return [
                "Review login history for suspicious activity",
                "Consider enabling 2FA for high-risk accounts",
                "Monitor IP addresses for unusual patterns"
            ]

    async def analyze_access_patterns(
        self,
        db: Session,
        user_email: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """Analyze user access patterns using ML"""
        try:
            cutoff = datetime.utcnow() - timedelta(days=days)
            
            logins = db.query(LoginHistory).filter(
                and_(
                    LoginHistory.user_email == user_email,
                    LoginHistory.event_type == "login",
                    LoginHistory.created_date >= cutoff
                )
            ).order_by(LoginHistory.created_date).all()
            
            if not logins:
                return {
                    "pattern": "no_data",
                    "confidence": 0,
                    "insights": []
                }
            
            # Extract features
            hours = [l.created_date.hour for l in logins]
            days_of_week = [l.created_date.weekday() for l in logins]
            locations = [l.location for l in logins if l.location]
            
            # Pattern analysis
            most_common_hour = max(set(hours), key=hours.count) if hours else None
            most_common_day = max(set(days_of_week), key=days_of_week.count) if days_of_week else None
            unique_locations = len(set(locations))
            
            # Generate AI insights
            pattern_summary = f"""
            User: {user_email}
            Total logins: {len(logins)}
            Most common hour: {most_common_hour}:00
            Most common day: {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][most_common_day] if most_common_day is not None else 'N/A'}
            Unique locations: {unique_locations}
            """
            
            prompt = f"""
            Analyze this user's access pattern and provide insights:
            {pattern_summary}
            
            Identify:
            1. Normal vs unusual patterns
            2. Security concerns
            3. Behavioral insights
            
            Respond with JSON:
            {{
                "pattern_type": "regular|irregular|suspicious",
                "confidence": 0-100,
                "insights": ["insight1", "insight2", "insight3"],
                "security_notes": ["note1", "note2"]
            }}
            """
            
            ai_analysis = await invoke_llm(
                prompt=prompt,
                response_schema={"type": "json_object"},
                max_tokens=400
            )
            
            return {
                "pattern": ai_analysis.get("pattern_type", "regular"),
                "confidence": ai_analysis.get("confidence", 50),
                "statistics": {
                    "total_logins": len(logins),
                    "most_common_hour": most_common_hour,
                    "most_common_day": most_common_day,
                    "unique_locations": unique_locations
                },
                "insights": ai_analysis.get("insights", []),
                "security_notes": ai_analysis.get("security_notes", [])
            }
            
        except Exception as e:
            logger.error(f"Access pattern analysis error: {str(e)}")
            raise Exception(f"Pattern analysis failed: {str(e)}")

    def detect_api_abuse(
        self,
        db: Session,
        api_key_id: Optional[int] = None,
        hours: int = 24
    ) -> Dict[str, Any]:
        """Detect API abuse patterns (rate limit violations, unusual usage)"""
        try:
            cutoff = datetime.utcnow() - timedelta(hours=hours)
            
            query = db.query(ApiUsage).filter(
                ApiUsage.created_date >= cutoff
            )
            
            if api_key_id:
                query = query.filter(ApiUsage.api_key_id == api_key_id)
            
            usage = query.all()
            
            if not usage:
                return {
                    "abuse_detected": False,
                    "risk_score": 0,
                    "anomalies": []
                }
            
            # Analyze usage patterns
            anomalies = []
            
            # 1. Rate limit violations (check if requests/minute exceeds threshold)
            requests_by_minute = {}
            for u in usage:
                minute_key = u.created_date.replace(second=0, microsecond=0)
                requests_by_minute[minute_key] = requests_by_minute.get(minute_key, 0) + 1
            
            max_per_minute = max(requests_by_minute.values()) if requests_by_minute else 0
            if max_per_minute > 100:  # Threshold
                anomalies.append({
                    "type": "rate_limit_violation",
                    "severity": "high",
                    "message": f"Peak requests: {max_per_minute}/minute",
                    "details": {"peak": max_per_minute, "threshold": 100}
                })
            
            # 2. Error rate analysis
            errors = [u for u in usage if u.status_code >= 400]
            error_rate = len(errors) / len(usage) if usage else 0
            if error_rate > 0.1:  # >10% error rate
                anomalies.append({
                    "type": "high_error_rate",
                    "severity": "medium",
                    "message": f"Error rate: {error_rate*100:.1f}%",
                    "details": {"error_rate": error_rate, "total_errors": len(errors)}
                })
            
            # 3. Unusual endpoint usage
            endpoint_counts = {}
            for u in usage:
                endpoint_counts[u.endpoint] = endpoint_counts.get(u.endpoint, 0) + 1
            
            # Flag if one endpoint dominates (>80% of requests)
            if endpoint_counts:
                max_endpoint = max(endpoint_counts.items(), key=lambda x: x[1])
                if max_endpoint[1] / len(usage) > 0.8:
                    anomalies.append({
                        "type": "endpoint_abuse",
                        "severity": "medium",
                        "message": f"Single endpoint {max_endpoint[0]} accounts for {max_endpoint[1]/len(usage)*100:.1f}% of requests",
                        "details": {"endpoint": max_endpoint[0], "percentage": max_endpoint[1]/len(usage)*100}
                    })
            
            risk_score = min(100, len(anomalies) * 30)
            
            return {
                "abuse_detected": len(anomalies) > 0,
                "risk_score": risk_score,
                "anomalies": anomalies,
                "statistics": {
                    "total_requests": len(usage),
                    "error_rate": error_rate,
                    "peak_per_minute": max_per_minute
                }
            }
            
        except Exception as e:
            logger.error(f"API abuse detection error: {str(e)}")
            raise Exception(f"Abuse detection failed: {str(e)}")
