import asyncio
import datetime
import sys

from app.services.predictive_ml_service import PredictiveMLService

async def main():
    try:
        ml_service = PredictiveMLService()
        
        base_val = 50000.0
        synthetic_series = []
        for i in range(12):
             synth_date = datetime.datetime.utcnow() - datetime.timedelta(days=30*(12-i))
             synth_val = base_val + (base_val * 0.05 * (12-i)) 
             synthetic_series.append({"date": synth_date.isoformat(), "emission": synth_val})
             
        print("Data generated. running forecast...")
        forecast = await ml_service.forecast_time_series(synthetic_series, "date", "emission", periods=12, method="linear")
        print(forecast)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
