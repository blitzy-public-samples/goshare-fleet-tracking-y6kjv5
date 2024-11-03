"""
Main entry point for the Analytics microservice that initializes and configures the FastAPI application.
Implements high-performance analytics processing with support for 10,000+ concurrent users.

External library versions:
fastapi==0.95.0
uvicorn==0.21.0
python-json-logger==2.0.7
"""

# Human Tasks:
# 1. Configure MongoDB connection string in environment variables (MONGODB_URI)
# 2. Configure database name in environment variables (DB_NAME)
# 3. Set up logging directory with proper permissions
# 4. Configure CORS allowed origins in environment variables
# 5. Set up monitoring for API performance metrics
# 6. Configure rate limiting based on expected load

import os
import logging
from logging.handlers import RotatingFileHandler
from pythonjsonlogger import jsonlogger
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# Import required components
from .models.analyticsModel import AnalyticsModel
from .routes.analyticsRoutes import router
from .utils.dataProcessing import process_location_data, calculate_fleet_metrics

# Initialize FastAPI application with OpenAPI documentation
app = FastAPI(
    title='Fleet Analytics Service',
    version='1.0.0',
    docs_url='/api/v1/analytics/docs',
    redoc_url='/api/v1/analytics/redoc'
)

# Initialize logger
logger = logging.getLogger(__name__)

def configure_logging():
    """
    Configures logging with JSON formatting and rotation.
    Addresses requirement: System monitoring and logging
    """
    log_handler = RotatingFileHandler(
        filename='logs/analytics_service.log',
        maxBytes=10485760,  # 10MB
        backupCount=5
    )
    
    # Configure JSON formatter for structured logging
    formatter = jsonlogger.JsonFormatter(
        '%(asctime)s %(name)s %(levelname)s %(message)s',
        timestamp=True
    )
    log_handler.setFormatter(formatter)
    
    # Set logging level from environment with default to INFO
    log_level = os.getenv('LOG_LEVEL', 'INFO')
    logger.setLevel(log_level)
    
    # Add handler to logger
    logger.addHandler(log_handler)
    
    # Add performance logging
    logging.getLogger('uvicorn.access').handlers = [log_handler]

def configure_middleware():
    """
    Configures FastAPI middleware for high-performance request handling.
    Addresses requirement: Support for 10,000+ concurrent users
    """
    # Configure CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=os.getenv('CORS_ORIGINS', '*').split(','),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"]
    )
    
    # Add custom middleware for request tracking
    @app.middleware("http")
    async def add_request_id(request, call_next):
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        with logger.contextvars.bind(request_id=request_id):
            response = await call_next(request)
            response.headers['X-Request-ID'] = request_id
            return response
    
    # Add response compression middleware
    app.add_middleware(
        GZipMiddleware,
        minimum_size=1000
    )
    
    # Add cache control headers middleware
    @app.middleware("http")
    async def add_cache_control(request, call_next):
        response = await call_next(request)
        if request.method in ["GET", "HEAD"]:
            response.headers["Cache-Control"] = "public, max-age=30"
        return response

def configure_routes():
    """
    Registers analytics API routes with performance optimization.
    Addresses requirement: Analytics and reporting capabilities
    """
    # Include analytics router with prefix
    app.include_router(
        router,
        prefix="/api/v1/analytics",
        tags=["analytics"]
    )
    
    # Add health check endpoint
    @app.get("/health")
    async def health_check():
        try:
            # Verify database connection
            analytics_model.verify_connection()
            return JSONResponse(
                content={"status": "healthy", "service": "analytics"},
                status_code=200
            )
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return JSONResponse(
                content={"status": "unhealthy", "service": "analytics"},
                status_code=503
            )

@app.on_event("startup")
async def startup_handler():
    """
    Handles application startup tasks with proper initialization.
    Addresses requirement: High-performance analytics processing
    """
    try:
        # Configure logging
        configure_logging()
        logger.info("Starting Analytics Service")
        
        # Initialize analytics model with MongoDB connection
        global analytics_model
        analytics_model = AnalyticsModel(
            os.getenv('MONGODB_URI'),
            os.getenv('DB_NAME')
        )
        
        # Verify database connection and indexes
        analytics_model.verify_connection()
        logger.info("Database connection established")
        
        # Initialize cache connections if needed
        # cache.initialize()
        
        # Set up background task workers for data processing
        # worker_pool.initialize()
        
        logger.info("Analytics Service started successfully")
        
    except Exception as e:
        logger.error(f"Startup failed: {str(e)}")
        raise RuntimeError(f"Failed to start Analytics Service: {str(e)}")

@app.on_event("shutdown")
async def shutdown_handler():
    """
    Handles graceful shutdown of application resources.
    """
    try:
        logger.info("Shutting down Analytics Service")
        
        # Close database connections
        if analytics_model:
            analytics_model._client.close()
        
        # Shutdown background workers
        # await worker_pool.shutdown()
        
        # Close cache connections
        # await cache.close()
        
        # Flush pending logs
        for handler in logger.handlers:
            handler.flush()
            handler.close()
            
        logger.info("Analytics Service shutdown complete")
        
    except Exception as e:
        logger.error(f"Error during shutdown: {str(e)}")
        raise RuntimeError(f"Failed to shutdown Analytics Service: {str(e)}")

# Error handling for uncaught exceptions
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled errors"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "Internal server error",
            "detail": str(exc) if os.getenv('DEBUG') == 'true' else None
        }
    )

# Start application with uvicorn if running directly
if __name__ == "__main__":
    # Get port from environment or use default
    port = int(os.getenv('PORT', 8000))
    
    # Configure uvicorn with performance optimizations
    uvicorn.run(
        "analytics.index:app",
        host="0.0.0.0",
        port=port,
        workers=int(os.getenv('WORKERS', 4)),
        loop="uvloop",
        http="httptools",
        log_level=os.getenv('LOG_LEVEL', 'info').lower(),
        access_log=True,
        proxy_headers=True,
        forwarded_allow_ips="*"
    )