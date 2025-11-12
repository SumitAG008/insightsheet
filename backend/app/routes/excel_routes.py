"""
Excel Processing API Routes
Handles large file processing for Pro/Enterprise users

Zero Storage Policy:
- Files stored in memory only during processing
- Immediately deleted after response
- No persistence to disk beyond temp file during processing
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import List, Optional
import tempfile
import os
from pydantic import BaseModel

from app.services.excel_processor import ExcelProcessor, FileUploadValidator
from app.utils.auth import get_current_user, get_user_subscription

router = APIRouter(prefix="/api/excel", tags=["excel"])


class ReconciliationRequest(BaseModel):
    source_data: List[dict]
    target_data: List[dict]
    source_key: str
    target_key: str
    compare_columns: List[str]


class FinancialMetricsRequest(BaseModel):
    entries: List[dict]


class ProjectMetricsRequest(BaseModel):
    tasks: List[dict]


@router.post("/parse")
async def parse_excel_file(
    file: UploadFile = File(...),
    sheet_name: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Parse large Excel file using Python backend

    Subscription Requirements:
    - Free: Not available (browser-only)
    - Pro: Files up to 50MB
    - Enterprise: Files up to 500MB

    Privacy: File is deleted immediately after processing
    """
    try:
        # Get user subscription
        subscription = await get_user_subscription(current_user['email'])

        # Read file size
        file_content = await file.read()
        file_size = len(file_content)

        # Validate file size for subscription tier
        validation = FileUploadValidator.validate_file_size(
            file_size,
            subscription['tier']
        )

        if not validation['valid']:
            raise HTTPException(
                status_code=403,
                detail=validation
            )

        # Create temp file (will be deleted in parse_excel_file)
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp_file:
            tmp_file.write(file_content)
            tmp_path = tmp_file.name

        # Process file (temp file deleted inside this function)
        result = ExcelProcessor.parse_excel_file(tmp_path, sheet_name)

        # Log usage
        await log_backend_processing(
            current_user['email'],
            'excel_parse',
            file_size
        )

        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception as e:
        # Clean up temp file if error occurs
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)

        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reconcile")
async def reconcile_datasets(
    request: ReconciliationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Reconcile large datasets using Python backend

    Subscription Requirements:
    - Free: Not available for datasets >5000 rows
    - Pro: Datasets up to 100,000 rows
    - Enterprise: Unlimited

    Privacy: Data processed in memory only, not stored
    """
    try:
        # Get subscription
        subscription = await get_user_subscription(current_user['email'])

        # Check dataset size limits
        source_size = len(request.source_data)
        target_size = len(request.target_data)
        total_size = source_size + target_size

        limits = {
            'free': 5000,
            'pro': 100000,
            'enterprise': float('inf')
        }

        max_rows = limits.get(subscription['tier'], limits['free'])

        if total_size > max_rows:
            raise HTTPException(
                status_code=403,
                detail={
                    'error': f'Dataset size ({total_size} rows) exceeds limit for {subscription["tier"]} tier',
                    'maxRows': max_rows,
                    'upgradeRequired': subscription['tier'] != 'enterprise'
                }
            )

        # Process reconciliation
        result = ExcelProcessor.reconcile_datasets(
            request.source_data,
            request.target_data,
            request.source_key,
            request.target_key,
            request.compare_columns
        )

        # Log usage
        await log_backend_processing(
            current_user['email'],
            'reconciliation',
            total_size
        )

        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/financial-metrics")
async def calculate_financial_metrics(
    request: FinancialMetricsRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Calculate financial metrics with Python (higher precision)

    Subscription Requirements:
    - All tiers (precision benefit for all users)

    Privacy: Data processed in memory only
    """
    try:
        result = ExcelProcessor.calculate_financial_metrics(request.entries)

        await log_backend_processing(
            current_user['email'],
            'financial_metrics',
            len(request.entries)
        )

        return JSONResponse(content=result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/project-metrics")
async def calculate_project_metrics(
    request: ProjectMetricsRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Calculate Earned Value Management metrics

    Subscription Requirements:
    - All tiers

    Privacy: Data processed in memory only
    """
    try:
        result = ExcelProcessor.calculate_project_metrics(request.tasks)

        await log_backend_processing(
            current_user['email'],
            'project_metrics',
            len(request.tasks)
        )

        return JSONResponse(content=result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/processing-info")
async def get_processing_info(
    file_size: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Get information about processing method for file size

    Returns whether browser or backend processing should be used
    """
    try:
        subscription = await get_user_subscription(current_user['email'])

        processing_method = FileUploadValidator.get_processing_method(
            file_size,
            subscription['tier']
        )

        validation = FileUploadValidator.validate_file_size(
            file_size,
            subscription['tier']
        )

        return JSONResponse(content={
            'processingMethod': processing_method,
            'subscriptionTier': subscription['tier'],
            'validation': validation,
            'limits': {
                'free': ExcelProcessor.MAX_FILE_SIZE_FREE,
                'pro': ExcelProcessor.MAX_FILE_SIZE_PRO,
                'enterprise': ExcelProcessor.MAX_FILE_SIZE_ENTERPRISE
            }
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def log_backend_processing(
    user_email: str,
    operation_type: str,
    data_size: int
):
    """Log backend processing usage for analytics (metadata only)"""
    try:
        # Log to analytics (metadata only, no actual data)
        from app.database import db

        await db.backend_usage.insert_one({
            'user_email': user_email,
            'operation_type': operation_type,
            'data_size': data_size,
            'timestamp': datetime.utcnow(),
            'processing_method': 'backend'
        })
    except Exception as e:
        # Don't fail request if logging fails
        print(f"Failed to log usage: {e}")
