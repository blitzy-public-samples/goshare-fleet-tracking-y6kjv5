"""
FastAPI router module for analytics API endpoints in the fleet tracking system.
Handles analytics requests and coordinates with controllers for data processing and reporting.

External library versions:
fastapi==0.95.0
"""

from datetime import datetime
from typing import Dict, List, Any
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse

# Import analytics controller functions
from ..controllers.analyticsController import (
    get_fleet_analytics,
    get_vehicle_analytics,
    get_delivery_analytics,
    generate_analytics_report
)

# Initialize router with prefix and tags
# Requirement: API Design - RESTful API endpoints for analytics and reporting
router = APIRouter(prefix='/api/v1/analytics', tags=['analytics'])

# Human tasks required:
# 1. Ensure authentication middleware is properly configured
# 2. Configure rate limiting for high concurrency support
# 3. Set up monitoring for performance tracking
# 4. Configure caching layer if needed for sub-second response times

@router.get('/fleet')
@requires_auth
async def get_fleet_metrics(
    time_range: Dict[str, datetime],
    metrics: List[str]
) -> JSONResponse:
    """
    Endpoint to retrieve fleet-wide analytics metrics with optimized performance.
    
    Requirement: Analytics and Reporting - Analytics and reporting capabilities for fleet management system
    Requirement: Performance Requirements - Support for 10,000+ concurrent users with sub-second response times
    """
    try:
        # Validate request parameters
        if not time_range or 'start_time' not in time_range or 'end_time' not in time_range:
            raise HTTPException(
                status_code=400,
                detail="Invalid time range parameters"
            )
        
        # Call controller function with validated parameters
        analytics_data = await get_fleet_analytics(time_range, metrics)
        
        # Process and format response
        response = {
            "status": "success",
            "data": analytics_data,
            "metadata": {
                "time_range": {
                    "start": time_range['start_time'].isoformat(),
                    "end": time_range['end_time'].isoformat()
                },
                "metrics_requested": metrics
            }
        }
        
        return JSONResponse(content=response)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing fleet analytics: {str(e)}"
        )

@router.get('/vehicle/{vehicle_id}')
@requires_auth
async def get_vehicle_metrics(
    vehicle_id: str,
    time_range: Dict[str, datetime]
) -> JSONResponse:
    """
    Endpoint to retrieve vehicle-specific analytics with detailed metrics.
    
    Requirement: Analytics and Reporting - Vehicle-specific performance analytics
    """
    try:
        # Validate vehicle ID and time range
        if not vehicle_id:
            raise HTTPException(
                status_code=400,
                detail="Vehicle ID is required"
            )
        
        # Call controller function for vehicle analytics
        vehicle_data = await get_vehicle_analytics(vehicle_id, time_range)
        
        # Format response with vehicle metrics
        response = {
            "status": "success",
            "data": vehicle_data,
            "metadata": {
                "vehicle_id": vehicle_id,
                "time_range": {
                    "start": time_range['start_time'].isoformat(),
                    "end": time_range['end_time'].isoformat()
                }
            }
        }
        
        return JSONResponse(content=response)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing vehicle analytics: {str(e)}"
        )

@router.get('/delivery')
@requires_auth
async def get_delivery_metrics(
    time_range: Dict[str, datetime],
    filters: Dict[str, Any]
) -> JSONResponse:
    """
    Endpoint to retrieve delivery performance analytics with efficiency analysis.
    
    Requirement: Analytics and Reporting - Delivery performance analytics
    """
    try:
        # Validate request parameters and filters
        if not time_range or not filters:
            raise HTTPException(
                status_code=400,
                detail="Invalid request parameters"
            )
        
        # Call controller function for delivery analytics
        delivery_data = await get_delivery_analytics(time_range, filters)
        
        # Format response with delivery metrics
        response = {
            "status": "success",
            "data": delivery_data,
            "metadata": {
                "time_range": {
                    "start": time_range['start_time'].isoformat(),
                    "end": time_range['end_time'].isoformat()
                },
                "applied_filters": filters
            }
        }
        
        return JSONResponse(content=response)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing delivery analytics: {str(e)}"
        )

@router.post('/report')
@requires_auth
async def generate_report(
    report_type: str,
    parameters: Dict[str, Any]
) -> JSONResponse:
    """
    Endpoint to generate custom analytics reports with comprehensive analysis.
    
    Requirement: Analytics and Reporting - Comprehensive reporting capabilities
    """
    try:
        # Validate report type and configuration
        valid_report_types = ['fleet', 'vehicle', 'delivery', 'efficiency']
        if report_type not in valid_report_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid report type. Must be one of: {valid_report_types}"
            )
        
        # Call controller function to generate report
        report_data = await generate_analytics_report(report_type, parameters)
        
        # Format response with complete report
        response = {
            "status": "success",
            "data": report_data,
            "metadata": {
                "report_type": report_type,
                "generated_at": datetime.utcnow().isoformat(),
                "parameters": parameters
            }
        }
        
        return JSONResponse(content=response)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating analytics report: {str(e)}"
        )