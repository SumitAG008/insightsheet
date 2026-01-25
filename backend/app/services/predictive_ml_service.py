"""
Predictive ML Service
Uses ML for forecasting, trend analysis, and predictive insights
"""
import logging
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from app.services.ai_service import invoke_llm

logger = logging.getLogger(__name__)


class PredictiveMLService:
    """ML-powered predictive analytics and forecasting"""

    def __init__(self):
        self.min_data_points = 10  # Minimum data points for forecasting

    async def forecast_time_series(
        self,
        data: List[Dict[str, Any]],
        date_column: str,
        value_column: str,
        periods: int = 12,
        method: str = "linear"
    ) -> Dict[str, Any]:
        """
        Forecast time series data using ML
        Methods: linear, exponential, moving_average, ai_based
        """
        try:
            if not data or len(data) < self.min_data_points:
                raise Exception(f"Need at least {self.min_data_points} data points for forecasting")
            
            # Convert to DataFrame
            df = pd.DataFrame(data)
            
            # Ensure date column is datetime
            df[date_column] = pd.to_datetime(df[date_column])
            df = df.sort_values(date_column)
            
            # Extract values
            dates = df[date_column].values
            values = pd.to_numeric(df[value_column], errors='coerce').values
            
            # Remove NaN
            mask = ~np.isnan(values)
            dates = dates[mask]
            values = values[mask]
            
            if len(values) < self.min_data_points:
                raise Exception(f"Need at least {self.min_data_points} valid data points")
            
            # Generate forecast based on method
            if method == "linear":
                forecast = self._linear_forecast(values, periods)
            elif method == "exponential":
                forecast = self._exponential_forecast(values, periods)
            elif method == "moving_average":
                forecast = self._moving_average_forecast(values, periods)
            else:
                # AI-based forecasting
                forecast = await self._ai_forecast(dates, values, periods)
            
            # Generate future dates
            last_date = pd.to_datetime(dates[-1])
            future_dates = pd.date_range(
                start=last_date + timedelta(days=1),
                periods=periods,
                freq='D'
            )
            
            # Calculate confidence intervals (simple approach)
            std_dev = np.std(values)
            upper_bound = [f + 1.96 * std_dev for f in forecast]
            lower_bound = [f - 1.96 * std_dev for f in forecast]
            
            # Generate AI insights
            insights = await self._generate_forecast_insights(values, forecast, method)
            
            return {
                "method": method,
                "forecast": [
                    {
                        "date": date.isoformat(),
                        "value": round(float(f), 2),
                        "upper_bound": round(float(u), 2),
                        "lower_bound": round(float(l), 2)
                    }
                    for date, f, u, l in zip(future_dates, forecast, upper_bound, lower_bound)
                ],
                "statistics": {
                    "historical_mean": float(np.mean(values)),
                    "historical_std": float(std_dev),
                    "trend": "increasing" if forecast[-1] > forecast[0] else "decreasing" if forecast[-1] < forecast[0] else "stable",
                    "forecast_mean": float(np.mean(forecast))
                },
                "insights": insights
            }
            
        except Exception as e:
            logger.error(f"Forecast error: {str(e)}")
            raise Exception(f"Forecasting failed: {str(e)}")

    def _linear_forecast(self, values: np.ndarray, periods: int) -> List[float]:
        """Simple linear regression forecast"""
        x = np.arange(len(values))
        coeffs = np.polyfit(x, values, 1)
        
        # Extend x for forecast
        future_x = np.arange(len(values), len(values) + periods)
        forecast = np.polyval(coeffs, future_x)
        
        return forecast.tolist()

    def _exponential_forecast(self, values: np.ndarray, periods: int) -> List[float]:
        """Exponential smoothing forecast"""
        alpha = 0.3  # Smoothing factor
        forecast = []
        last_value = values[-1]
        
        # Calculate trend
        if len(values) >= 2:
            trend = (values[-1] - values[-2]) / len(values)
        else:
            trend = 0
        
        for i in range(periods):
            last_value = alpha * last_value + (1 - alpha) * (last_value + trend)
            forecast.append(float(last_value))
        
        return forecast

    def _moving_average_forecast(self, values: np.ndarray, periods: int) -> List[float]:
        """Moving average forecast"""
        window = min(5, len(values) // 2)
        ma = np.convolve(values, np.ones(window)/window, mode='valid')
        last_ma = ma[-1]
        
        # Simple extension
        forecast = [float(last_ma)] * periods
        return forecast

    async def _ai_forecast(
        self,
        dates: np.ndarray,
        values: np.ndarray,
        periods: int
    ) -> List[float]:
        """AI-based forecasting using LLM for pattern recognition"""
        try:
            # Prepare data summary
            data_summary = {
                "count": len(values),
                "mean": float(np.mean(values)),
                "std": float(np.std(values)),
                "min": float(np.min(values)),
                "max": float(np.max(values)),
                "trend": "increasing" if values[-1] > values[0] else "decreasing",
                "recent_values": values[-5:].tolist() if len(values) >= 5 else values.tolist()
            }
            
            prompt = f"""
            Time Series Forecasting:
            
            Historical Data Summary:
            {data_summary}
            
            Forecast the next {periods} values using pattern recognition.
            Consider trends, seasonality, and recent patterns.
            
            Respond with JSON:
            {{
                "forecast": [value1, value2, value3, ...],
                "reasoning": "Brief explanation of forecast logic"
            }}
            """
            
            response = await invoke_llm(
                prompt=prompt,
                response_schema={"type": "json_object"},
                max_tokens=400
            )
            
            forecast = response.get("forecast", [])
            if len(forecast) != periods:
                # Fallback to linear if AI forecast is wrong length
                return self._linear_forecast(values, periods)
            
            return [float(f) for f in forecast]
            
        except Exception as e:
            logger.warning(f"AI forecast failed, using linear: {str(e)}")
            return self._linear_forecast(values, periods)

    async def _generate_forecast_insights(
        self,
        historical: np.ndarray,
        forecast: List[float],
        method: str
    ) -> List[str]:
        """Generate AI insights about the forecast"""
        try:
            trend = "increasing" if forecast[-1] > forecast[0] else "decreasing" if forecast[-1] < forecast[0] else "stable"
            change_pct = ((forecast[-1] - historical[-1]) / historical[-1] * 100) if historical[-1] != 0 else 0
            
            prompt = f"""
            Forecast Analysis:
            - Method: {method}
            - Historical mean: {np.mean(historical):.2f}
            - Forecast mean: {np.mean(forecast):.2f}
            - Trend: {trend}
            - Expected change: {change_pct:.1f}%
            
            Provide 3-4 actionable insights about this forecast.
            
            Respond with JSON:
            {{
                "insights": ["insight1", "insight2", "insight3"]
            }}
            """
            
            response = await invoke_llm(
                prompt=prompt,
                response_schema={"type": "json_object"},
                max_tokens=300
            )
            
            return response.get("insights", [
                f"Forecast shows {trend} trend",
                f"Expected change: {change_pct:.1f}%",
                "Monitor actual vs predicted for accuracy"
            ])
            
        except Exception as e:
            logger.warning(f"Insight generation failed: {str(e)}")
            return [
                "Forecast generated successfully",
                "Monitor actual values for accuracy",
                "Adjust forecast method if needed"
            ]

    async def detect_trends(
        self,
        data: List[Dict[str, Any]],
        date_column: str,
        value_column: str
    ) -> Dict[str, Any]:
        """Detect trends and patterns in time series data"""
        try:
            df = pd.DataFrame(data)
            df[date_column] = pd.to_datetime(df[date_column])
            df = df.sort_values(date_column)
            
            values = pd.to_numeric(df[value_column], errors='coerce').values
            values = values[~np.isnan(values)]
            
            if len(values) < 3:
                raise Exception("Need at least 3 data points for trend detection")
            
            # Calculate trend
            x = np.arange(len(values))
            slope, intercept = np.polyfit(x, values, 1)
            
            # Detect seasonality (simple approach)
            if len(values) >= 7:
                # Check for weekly pattern
                weekly_avg = [np.mean(values[i::7]) for i in range(min(7, len(values)))]
                seasonality = "weekly" if np.std(weekly_avg) > np.std(values) * 0.3 else "none"
            else:
                seasonality = "insufficient_data"
            
            # Generate AI analysis
            prompt = f"""
            Trend Analysis:
            - Data points: {len(values)}
            - Trend slope: {slope:.4f} ({'increasing' if slope > 0 else 'decreasing' if slope < 0 else 'stable'})
            - Mean: {np.mean(values):.2f}
            - Std: {np.std(values):.2f}
            - Seasonality: {seasonality}
            
            Provide insights about trends, patterns, and recommendations.
            
            Respond with JSON:
            {{
                "trend": "strong_increase|moderate_increase|stable|moderate_decrease|strong_decrease",
                "confidence": 0-100,
                "patterns": ["pattern1", "pattern2"],
                "recommendations": ["rec1", "rec2"]
            }}
            """
            
            analysis = await invoke_llm(
                prompt=prompt,
                response_schema={"type": "json_object"},
                max_tokens=400
            )
            
            return {
                "trend": analysis.get("trend", "stable"),
                "confidence": analysis.get("confidence", 70),
                "slope": float(slope),
                "seasonality": seasonality,
                "statistics": {
                    "mean": float(np.mean(values)),
                    "std": float(np.std(values)),
                    "min": float(np.min(values)),
                    "max": float(np.max(values))
                },
                "patterns": analysis.get("patterns", []),
                "recommendations": analysis.get("recommendations", [])
            }
            
        except Exception as e:
            logger.error(f"Trend detection error: {str(e)}")
            raise Exception(f"Trend detection failed: {str(e)}")

    async def predict_anomalies(
        self,
        data: List[Dict[str, Any]],
        value_column: str
    ) -> Dict[str, Any]:
        """Predict anomalies using statistical methods + AI"""
        try:
            df = pd.DataFrame(data)
            values = pd.to_numeric(df[value_column], errors='coerce').values
            values = values[~np.isnan(values)]
            
            if len(values) < 10:
                raise Exception("Need at least 10 data points for anomaly detection")
            
            # IQR method
            q1, q3 = np.percentile(values, [25, 75])
            iqr = q3 - q1
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            
            anomalies = []
            for i, val in enumerate(values):
                if val < lower_bound or val > upper_bound:
                    anomalies.append({
                        "index": i,
                        "value": float(val),
                        "deviation": float((val - np.mean(values)) / np.std(values)) if np.std(values) > 0 else 0
                    })
            
            # Generate AI insights
            if anomalies:
                prompt = f"""
                Anomaly Detection Results:
                - Total data points: {len(values)}
                - Anomalies detected: {len(anomalies)}
                - Anomaly rate: {len(anomalies)/len(values)*100:.1f}%
                - Sample anomalies: {anomalies[:3]}
                
                Provide insights about these anomalies and recommendations.
                
                Respond with JSON:
                {{
                    "severity": "high|medium|low",
                    "insights": ["insight1", "insight2"],
                    "recommendations": ["rec1", "rec2"]
                }}
                """
                
                ai_analysis = await invoke_llm(
                    prompt=prompt,
                    response_schema={"type": "json_object"},
                    max_tokens=300
                )
            else:
                ai_analysis = {
                    "severity": "low",
                    "insights": ["No significant anomalies detected"],
                    "recommendations": ["Continue monitoring"]
                }
            
            return {
                "anomalies_detected": len(anomalies),
                "anomaly_rate": len(anomalies) / len(values) * 100,
                "anomalies": anomalies[:10],  # Limit to top 10
                "bounds": {
                    "lower": float(lower_bound),
                    "upper": float(upper_bound)
                },
                "severity": ai_analysis.get("severity", "low"),
                "insights": ai_analysis.get("insights", []),
                "recommendations": ai_analysis.get("recommendations", [])
            }
            
        except Exception as e:
            logger.error(f"Anomaly prediction error: {str(e)}")
            raise Exception(f"Anomaly detection failed: {str(e)}")
