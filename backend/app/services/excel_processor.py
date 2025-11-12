"""
Excel Processing Service - Python Backend
Handles large Excel files that exceed browser processing limits

Features:
- Large file processing (>50MB)
- Multi-sheet workbook parsing
- Advanced Excel operations
- Immediate deletion after processing (zero storage)
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
import tempfile
import os
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class ExcelProcessor:
    """Process large Excel files with Python for better performance"""

    MAX_FILE_SIZE_FREE = 5 * 1024 * 1024  # 5 MB
    MAX_FILE_SIZE_PRO = 50 * 1024 * 1024  # 50 MB
    MAX_FILE_SIZE_ENTERPRISE = 500 * 1024 * 1024  # 500 MB

    @staticmethod
    def parse_excel_file(file_path: str, sheet_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Parse Excel file and return structured data

        Args:
            file_path: Path to Excel file (temporary)
            sheet_name: Specific sheet to parse (None = all sheets)

        Returns:
            Dict with sheet data
        """
        try:
            # Read Excel file
            if sheet_name:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
                sheets = {sheet_name: df}
            else:
                # Read all sheets
                excel_file = pd.ExcelFile(file_path)
                sheets = {
                    sheet: pd.read_excel(file_path, sheet_name=sheet)
                    for sheet in excel_file.sheet_names
                }

            # Convert to JSON-serializable format
            result = {}
            for sheet_name, df in sheets.items():
                # Handle NaN values
                df = df.fillna('')

                result[sheet_name] = {
                    'headers': df.columns.tolist(),
                    'rows': df.to_dict('records'),
                    'rowCount': len(df),
                    'columnCount': len(df.columns)
                }

            return {
                'success': True,
                'sheets': result,
                'sheetCount': len(result),
                'processedAt': datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Error parsing Excel file: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
        finally:
            # Delete temp file immediately
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Deleted temp file: {file_path}")

    @staticmethod
    def reconcile_datasets(
        source_data: List[Dict],
        target_data: List[Dict],
        source_key: str,
        target_key: str,
        compare_columns: List[str]
    ) -> Dict[str, Any]:
        """
        Reconcile two datasets using pandas (faster for large datasets)

        Args:
            source_data: Source dataset
            target_data: Target dataset
            source_key: Key column in source
            target_key: Key column in target
            compare_columns: Columns to compare

        Returns:
            Reconciliation results
        """
        try:
            # Convert to DataFrames
            source_df = pd.DataFrame(source_data)
            target_df = pd.DataFrame(target_data)

            # Merge datasets
            merged = pd.merge(
                source_df,
                target_df,
                left_on=source_key,
                right_on=target_key,
                how='outer',
                indicator=True,
                suffixes=('_source', '_target')
            )

            # Categorize results
            matched = merged[merged['_merge'] == 'both'].copy()
            missing = merged[merged['_merge'] == 'left_only'].copy()
            extra = merged[merged['_merge'] == 'right_only'].copy()

            # Find mismatches in compare columns
            mismatched = []
            for _, row in matched.iterrows():
                discrepancies = []
                for col in compare_columns:
                    source_col = f"{col}_source"
                    target_col = f"{col}_target"

                    if source_col in row and target_col in row:
                        if str(row[source_col]) != str(row[target_col]):
                            discrepancies.append({
                                'column': col,
                                'sourceValue': row[source_col],
                                'targetValue': row[target_col]
                            })

                if discrepancies:
                    mismatched.append({
                        'keyValue': row[source_key],
                        'discrepancies': discrepancies
                    })

            # Remove mismatched from matched
            matched_keys = set(row[source_key] for row in mismatched)
            truly_matched = matched[~matched[source_key].isin(matched_keys)]

            return {
                'success': True,
                'summary': {
                    'totalSource': len(source_df),
                    'totalTarget': len(target_df),
                    'matchedCount': len(truly_matched),
                    'mismatchedCount': len(mismatched),
                    'missingCount': len(missing),
                    'extraCount': len(extra)
                },
                'matched': truly_matched[source_key].tolist()[:100],  # Limit to 100 for response size
                'mismatched': mismatched[:100],
                'missing': missing[source_key].fillna('').tolist()[:100],
                'extra': extra[target_key].fillna('').tolist()[:100],
                'processedAt': datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Error reconciling datasets: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    @staticmethod
    def calculate_financial_metrics(
        entries: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate financial metrics using numpy for precision

        Args:
            entries: Journal entries

        Returns:
            Financial metrics
        """
        try:
            df = pd.DataFrame(entries)

            # Calculate trial balance
            accounts = df.groupby('account').agg({
                'debit': 'sum',
                'credit': 'sum'
            }).to_dict('index')

            # Calculate totals
            total_debit = df['debit'].sum()
            total_credit = df['credit'].sum()

            # Calculate NPV if cash flows provided
            npv = None
            irr = None
            if 'amount' in df.columns and 'date' in df.columns:
                cash_flows = df.sort_values('date')['amount'].values
                if len(cash_flows) > 1:
                    # NPV with 10% discount rate
                    npv = float(np.npv(0.1, cash_flows))
                    # IRR
                    try:
                        irr = float(np.irr(cash_flows))
                    except:
                        irr = None

            return {
                'success': True,
                'accounts': accounts,
                'totalDebit': float(total_debit),
                'totalCredit': float(total_credit),
                'isBalanced': abs(total_debit - total_credit) < 0.01,
                'npv': npv,
                'irr': irr,
                'processedAt': datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Error calculating financial metrics: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    @staticmethod
    def calculate_project_metrics(
        tasks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate Earned Value Management metrics

        Args:
            tasks: Project tasks

        Returns:
            EVM metrics
        """
        try:
            df = pd.DataFrame(tasks)

            # Calculate EVM metrics
            total_budget = df['budget'].sum()
            total_actual = df.get('actualCost', df['budget'] * 0).sum()
            total_earned = (df['budget'] * df['progress'] / 100).sum()

            # Performance indices
            cpi = total_earned / total_actual if total_actual > 0 else 0
            spi = total_earned / total_budget if total_budget > 0 else 0

            # Forecasts
            eac = total_budget / cpi if cpi > 0 else total_budget
            etc = eac - total_actual
            vac = total_budget - eac

            # Schedule forecasts
            total_duration = df['duration'].sum()
            time_elapsed = total_duration * (total_earned / total_budget) if total_budget > 0 else 0
            estimated_time = total_duration / spi if spi > 0 else total_duration

            return {
                'success': True,
                'metrics': {
                    'plannedValue': float(total_budget),
                    'earnedValue': float(total_earned),
                    'actualCost': float(total_actual),
                    'costPerformanceIndex': float(cpi),
                    'schedulePerformanceIndex': float(spi),
                    'estimateAtCompletion': float(eac),
                    'estimateToComplete': float(etc),
                    'varianceAtCompletion': float(vac),
                    'costVariance': float(total_earned - total_actual),
                    'scheduleVariance': float(total_earned - total_budget),
                    'estimatedDuration': float(estimated_time),
                    'timeElapsed': float(time_elapsed)
                },
                'processedAt': datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Error calculating project metrics: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }


class FileUploadValidator:
    """Validate file uploads based on subscription tier"""

    @staticmethod
    def validate_file_size(file_size: int, subscription_tier: str) -> Dict[str, Any]:
        """
        Validate if file size is allowed for subscription tier

        Args:
            file_size: File size in bytes
            subscription_tier: 'free', 'pro', or 'enterprise'

        Returns:
            Validation result
        """
        limits = {
            'free': ExcelProcessor.MAX_FILE_SIZE_FREE,
            'pro': ExcelProcessor.MAX_FILE_SIZE_PRO,
            'enterprise': ExcelProcessor.MAX_FILE_SIZE_ENTERPRISE
        }

        max_size = limits.get(subscription_tier, limits['free'])

        if file_size > max_size:
            return {
                'valid': False,
                'error': f'File size ({file_size / 1024 / 1024:.2f} MB) exceeds limit for {subscription_tier} tier ({max_size / 1024 / 1024:.0f} MB)',
                'maxSize': max_size,
                'currentTier': subscription_tier,
                'upgradeRequired': subscription_tier != 'enterprise'
            }

        return {
            'valid': True,
            'maxSize': max_size,
            'currentTier': subscription_tier
        }

    @staticmethod
    def get_processing_method(file_size: int, subscription_tier: str) -> str:
        """
        Determine processing method based on file size and tier

        Args:
            file_size: File size in bytes
            subscription_tier: Subscription tier

        Returns:
            'browser' or 'backend'
        """
        # Free tier always uses browser
        if subscription_tier == 'free':
            return 'browser'

        # Pro/Enterprise can use backend for files > 5MB
        if file_size > ExcelProcessor.MAX_FILE_SIZE_FREE:
            return 'backend'

        return 'browser'
