"""
Unit tests for analytics service components including data processing, metrics calculation,
and report generation functionality with focus on performance and accuracy validation.

External library versions:
pytest==7.3.1
pandas==2.0.0
numpy==1.24.0
"""

# Human Tasks:
# 1. Configure MongoDB test database connection string in environment variables
# 2. Set up test database with appropriate permissions
# 3. Create necessary indexes in test collections
# 4. Verify test database isolation from production
# 5. Set up monitoring for test database performance

import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
from bson.objectid import ObjectId

# Import components to test
from ...src.services.analytics.models.analyticsModel import AnalyticsModel
from ...src.services.analytics.utils.dataProcessing import (
    process_location_data,
    calculate_fleet_metrics
)
from ...src.services.analytics.controllers.analyticsController import router

# Test data constants
TEST_VEHICLE_ID = "test_vehicle_123"
TEST_METRIC_TYPE = "vehicle_speed"
TEST_TIME_RANGE = {
    "start": datetime.utcnow() - timedelta(days=7),
    "end": datetime.utcnow()
}

class TestAnalyticsModel:
    """Test suite for AnalyticsModel class functionality with focus on data storage and retrieval performance.
    Addresses requirement: Analytics and Reporting capabilities for fleet management system."""

    @pytest.fixture(autouse=True)
    def setup_model(self, mongodb_test_client):
        """Set up test analytics model with test database connection."""
        self.analytics_model = AnalyticsModel(
            connection_uri=mongodb_test_client.uri,
            database_name="test_analytics_db"
        )
        
        # Clean up test collections before each test
        for collection in self.analytics_model._collections.values():
            collection.delete_many({})

    def test_store_metric(self):
        """Test storing fleet metrics in database with proper indexing.
        Addresses requirement: Support for 10,000+ concurrent users."""
        # Prepare test metric data
        test_metric = {
            "value": 65.5,
            "vehicle_id": TEST_VEHICLE_ID,
            "location": {"type": "Point", "coordinates": [12.34, 56.78]}
        }
        
        # Store metric with timestamp
        timestamp = datetime.utcnow()
        result_id = self.analytics_model.store_metric(
            metric_type=TEST_METRIC_TYPE,
            metric_data=test_metric,
            timestamp=timestamp
        )
        
        # Verify storage
        stored_metric = self.analytics_model._collections['metrics'].find_one(
            {"_id": result_id}
        )
        
        assert stored_metric is not None
        assert stored_metric['metric_type'] == TEST_METRIC_TYPE
        assert stored_metric['data'] == test_metric
        assert stored_metric['timestamp'] == timestamp

    def test_aggregate_metrics(self):
        """Test metrics aggregation functionality with optimized pipeline.
        Addresses requirement: Analytics and reporting capabilities."""
        # Insert test metrics
        test_metrics = [
            {
                "metric_type": TEST_METRIC_TYPE,
                "timestamp": datetime.utcnow() - timedelta(hours=i),
                "data": {"value": 60 + i, "vehicle_id": TEST_VEHICLE_ID}
            }
            for i in range(24)  # 24 hours of test data
        ]
        
        for metric in test_metrics:
            self.analytics_model._collections['metrics'].insert_one(metric)
        
        # Define aggregation pipeline
        pipeline = [
            {
                "$group": {
                    "_id": "$data.vehicle_id",
                    "avg_value": {"$avg": "$data.value"},
                    "max_value": {"$max": "$data.value"},
                    "count": {"$sum": 1}
                }
            }
        ]
        
        # Execute aggregation
        results = self.analytics_model.aggregate_metrics(
            metric_type=TEST_METRIC_TYPE,
            aggregation_pipeline=pipeline,
            time_range=TEST_TIME_RANGE
        )
        
        assert len(results) == 1
        assert results[0]['_id'] == TEST_VEHICLE_ID
        assert results[0]['count'] == 24
        assert 60 <= results[0]['avg_value'] <= 84
        assert results[0]['max_value'] == 83

    def test_get_metrics_by_vehicle(self):
        """Test retrieval of vehicle-specific metrics using compound index.
        Addresses requirement: Performance Requirements for data processing efficiency."""
        # Insert test vehicle metrics
        test_metrics = [
            {
                "metric_type": TEST_METRIC_TYPE,
                "timestamp": datetime.utcnow() - timedelta(hours=i),
                "data": {
                    "value": 65 + i,
                    "vehicle_id": TEST_VEHICLE_ID,
                    "status": "active"
                }
            }
            for i in range(48)  # 48 hours of test data
        ]
        
        for metric in test_metrics:
            self.analytics_model._collections['metrics'].insert_one(metric)
        
        # Retrieve metrics
        result_df = self.analytics_model.get_metrics_by_vehicle(
            vehicle_id=TEST_VEHICLE_ID,
            time_range=TEST_TIME_RANGE,
            metric_types=[TEST_METRIC_TYPE]
        )
        
        assert isinstance(result_df, pd.DataFrame)
        assert len(result_df) == 48
        assert 'data' in result_df.columns
        assert all(result_df['data'].apply(lambda x: x['vehicle_id'] == TEST_VEHICLE_ID))

    def test_get_fleet_performance(self):
        """Test fleet-wide performance metrics calculation.
        Addresses requirement: Analytics and reporting capabilities."""
        # Insert test fleet metrics
        vehicles = [f"vehicle_{i}" for i in range(10)]
        metrics = []
        
        for vehicle in vehicles:
            for hour in range(24):
                metrics.append({
                    "metric_type": TEST_METRIC_TYPE,
                    "timestamp": datetime.utcnow() - timedelta(hours=hour),
                    "data": {
                        "value": 60 + hour + (vehicles.index(vehicle) * 2),
                        "vehicle_id": vehicle
                    }
                })
        
        for metric in metrics:
            self.analytics_model._collections['metrics'].insert_one(metric)
        
        # Calculate fleet performance
        performance = self.analytics_model.get_fleet_performance(
            time_range=TEST_TIME_RANGE,
            metrics_to_include=[TEST_METRIC_TYPE]
        )
        
        assert TEST_METRIC_TYPE in performance
        assert all(key in performance[TEST_METRIC_TYPE] for key in 
                  ['average', 'maximum', 'minimum', 'standard_deviation', 'sample_size'])
        assert performance[TEST_METRIC_TYPE]['sample_size'] == 240  # 10 vehicles * 24 hours

class TestDataProcessing:
    """Test suite for data processing utility functions with focus on computation efficiency.
    Addresses requirement: Support for efficient processing of data for 10,000+ concurrent users."""

    def test_process_location_data(self):
        """Test location data processing functionality with vectorized operations."""
        # Create test location dataset
        test_data = pd.DataFrame({
            'vehicle_id': ['v1'] * 100 + ['v2'] * 100,
            'timestamp': pd.date_range(start='2023-01-01', periods=200, freq='5min'),
            'latitude': np.random.uniform(low=40.0, high=41.0, size=200),
            'longitude': np.random.uniform(low=-74.0, high=-73.0, size=200)
        })
        
        # Process location data
        result_df = process_location_data(
            test_data,
            calculation_options={'remove_outliers': True}
        )
        
        assert isinstance(result_df, pd.DataFrame)
        assert all(col in result_df.columns for col in 
                  ['vehicle_id', 'timestamp', 'speed', 'distance', 'acceleration'])
        assert len(result_df) <= len(test_data)  # May be less due to outlier removal
        assert result_df['speed'].dtype == 'float32'  # Verify optimized data types

    def test_calculate_fleet_metrics(self):
        """Test fleet metrics calculation with optimized computation.
        Addresses requirement: Analytics and reporting capabilities."""
        # Prepare test fleet data
        test_data = pd.DataFrame({
            'vehicle_id': np.repeat(['v1', 'v2', 'v3'], 100),
            'timestamp': pd.date_range(start='2023-01-01', periods=300, freq='1H'),
            'speed': np.random.normal(loc=60, scale=10, size=300),
            'distance': np.random.uniform(low=0, high=100, size=300),
            'fuel_consumption': np.random.uniform(low=5, high=15, size=300)
        })
        
        # Calculate fleet metrics
        result = calculate_fleet_metrics(
            test_data,
            metric_type='speed',
            aggregation_period='1D'
        )
        
        assert isinstance(result, dict)
        assert 'aggregation_period' in result
        assert 'metric_type' in result
        assert 'statistics' in result
        assert all(key in result['statistics'] for key in 
                  ['mean', 'median', 'std', 'min', 'max', 'vehicle_count'])

class TestAnalyticsController:
    """Test suite for analytics API endpoints with focus on response handling.
    Addresses requirement: RESTful API endpoints for analytics."""

    @pytest.mark.asyncio
    async def test_get_fleet_analytics(self):
        """Test fleet analytics endpoint with proper response format."""
        # Mock analytics model
        with patch('src.services.analytics.controllers.analyticsController.analytics_model') as mock_model:
            mock_model.get_fleet_performance.return_value = {
                TEST_METRIC_TYPE: {
                    'average': 65.5,
                    'maximum': 80.0,
                    'minimum': 50.0,
                    'standard_deviation': 5.2,
                    'sample_size': 1000
                }
            }
            
            # Test endpoint
            response = await router.get_fleet_analytics(
                time_range=TEST_TIME_RANGE,
                metrics=[TEST_METRIC_TYPE]
            )
            
            assert response.status_code == 200
            data = response.body
            assert 'fleet_performance' in data
            assert 'fleet_metrics' in data
            assert 'summary_statistics' in data

    @pytest.mark.asyncio
    async def test_get_vehicle_analytics(self):
        """Test vehicle analytics endpoint with proper data handling."""
        # Mock analytics model
        with patch('src.services.analytics.controllers.analyticsController.analytics_model') as mock_model:
            mock_df = pd.DataFrame({
                'timestamp': pd.date_range(start='2023-01-01', periods=24, freq='1H'),
                'speed': np.random.normal(loc=60, scale=10, size=24),
                'distance': np.random.uniform(low=0, high=100, size=24),
                'fuel_consumption': np.random.uniform(low=5, high=15, size=24)
            })
            mock_model.get_metrics_by_vehicle.return_value = mock_df
            
            # Test endpoint
            response = await router.get_vehicle_analytics(
                vehicle_id=TEST_VEHICLE_ID,
                time_range=TEST_TIME_RANGE
            )
            
            assert response.status_code == 200
            data = response.body
            assert 'vehicle_id' in data
            assert 'performance_metrics' in data
            assert 'hourly_statistics' in data

def pytest_configure(config):
    """Pytest configuration function for test environment setup."""
    # Register custom markers
    config.addinivalue_line(
        "markers",
        "performance: mark test for performance validation"
    )
    config.addinivalue_line(
        "markers",
        "integration: mark test requiring database integration"
    )