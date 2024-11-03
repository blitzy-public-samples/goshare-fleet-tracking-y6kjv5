# Human Tasks:
# 1. Configure MongoDB connection string in environment variables
# 2. Set up MongoDB database with appropriate permissions
# 3. Create necessary indexes in MongoDB collections
# 4. Verify MongoDB cluster configuration for high availability
# 5. Set up monitoring for database performance metrics

# External library versions:
# pymongo==4.4.0
# pandas==2.0.0
# numpy==1.24.0

from datetime import datetime
from typing import Dict, List, Optional
import pandas as pd
import numpy as np
from pymongo import MongoClient, ASCENDING, DESCENDING, GEOSPHERE
from pymongo.database import Database
from pymongo.collection import Collection
from pymongo.errors import PyMongoError
from bson.objectid import ObjectId

# Global constants for collection names and index configurations
COLLECTION_NAMES = {
    'METRICS': 'fleet_metrics',
    'EVENTS': 'fleet_events',
    'AGGREGATIONS': 'fleet_aggregations'
}

INDEX_CONFIGS = {
    'METRICS_TIME_IDX': {'timestamp': -1},
    'EVENTS_GEO_IDX': {'location': '2dsphere'},
    'VEHICLE_TIME_IDX': {'vehicle_id': 1, 'timestamp': -1}
}

class AnalyticsModel:
    """Core analytics model class handling data storage and retrieval for fleet analytics
    with support for high-concurrency operations and efficient data aggregation."""
    
    def __init__(self, connection_uri: str, database_name: str):
        """Initialize MongoDB connection with optimal settings for analytics workload.
        
        Args:
            connection_uri (str): MongoDB connection string
            database_name (str): Target database name
        """
        # Initialize MongoDB client with optimal write concern and connection pool settings
        # Addresses requirement: Support for 10,000+ concurrent users
        self._client = MongoClient(
            connection_uri,
            maxPoolSize=100,
            minPoolSize=10,
            maxIdleTimeMS=30000,
            waitQueueTimeoutMS=2000,
            retryWrites=True,
            w='majority'
        )
        
        # Set up database reference with read preference configuration
        self._db: Database = self._client[database_name]
        
        # Initialize collections dictionary
        self._collections: Dict[str, Collection] = {
            'metrics': self._db[COLLECTION_NAMES['METRICS']],
            'events': self._db[COLLECTION_NAMES['EVENTS']],
            'aggregations': self._db[COLLECTION_NAMES['AGGREGATIONS']]
        }
        
        # Create indexes for optimal query performance
        self._setup_indexes()
        
        # Verify database connectivity
        self._verify_connection()

    def _setup_indexes(self) -> None:
        """Set up necessary indexes for efficient querying."""
        try:
            # Create time-based index for metrics collection
            self._collections['metrics'].create_index(
                [('timestamp', DESCENDING)],
                background=True
            )
            
            # Create compound index for vehicle-specific queries
            self._collections['metrics'].create_index(
                [('vehicle_id', ASCENDING), ('timestamp', DESCENDING)],
                background=True
            )
            
            # Create geospatial index for location-based queries
            self._collections['events'].create_index(
                [('location', GEOSPHERE)],
                background=True
            )
        except PyMongoError as e:
            raise Exception(f"Failed to create indexes: {str(e)}")

    def _verify_connection(self) -> None:
        """Verify database connectivity and collection existence."""
        try:
            self._db.command('ping')
        except PyMongoError as e:
            raise Exception(f"Database connection failed: {str(e)}")

    def store_metric(self, metric_type: str, metric_data: Dict, timestamp: Optional[datetime] = None) -> ObjectId:
        """Store a fleet metric data point with automatic indexing.
        
        Args:
            metric_type (str): Type of metric being stored
            metric_data (Dict): Metric data to store
            timestamp (datetime, optional): Timestamp for the metric
            
        Returns:
            ObjectId: ID of stored document
        """
        # Addresses requirement: Analytics and reporting capabilities
        try:
            # Validate metric data
            if not isinstance(metric_data, dict):
                raise ValueError("Metric data must be a dictionary")
            
            # Add timestamp if not provided
            if timestamp is None:
                timestamp = datetime.utcnow()
            
            document = {
                'metric_type': metric_type,
                'timestamp': timestamp,
                'data': metric_data
            }
            
            # Insert with write concern majority for data consistency
            result = self._collections['metrics'].insert_one(
                document,
                write_concern={'w': 'majority'}
            )
            
            return result.inserted_id
        except PyMongoError as e:
            raise Exception(f"Failed to store metric: {str(e)}")

    def store_event(self, event_type: str, event_data: Dict, location: Dict) -> ObjectId:
        """Store a fleet event with geospatial data.
        
        Args:
            event_type (str): Type of event
            event_data (Dict): Event details
            location (Dict): GeoJSON location data
            
        Returns:
            ObjectId: ID of stored event
        """
        # Addresses requirement: MongoDB for location and event data with geospatial indexing
        try:
            # Validate location format
            if not isinstance(location, dict) or 'type' not in location or 'coordinates' not in location:
                raise ValueError("Location must be in GeoJSON format")
            
            document = {
                'event_type': event_type,
                'timestamp': datetime.utcnow(),
                'location': location,
                'data': event_data
            }
            
            result = self._collections['events'].insert_one(
                document,
                write_concern={'w': 'majority'}
            )
            
            return result.inserted_id
        except PyMongoError as e:
            raise Exception(f"Failed to store event: {str(e)}")

    def aggregate_metrics(self, metric_type: str, aggregation_pipeline: List[Dict], time_range: Dict) -> List[Dict]:
        """Aggregate metrics using MongoDB's aggregation pipeline.
        
        Args:
            metric_type (str): Type of metrics to aggregate
            aggregation_pipeline (List[Dict]): MongoDB aggregation pipeline
            time_range (Dict): Time range filter
            
        Returns:
            List[Dict]: Aggregated results
        """
        try:
            # Add time range filter to pipeline
            time_filter = {
                '$match': {
                    'timestamp': {
                        '$gte': time_range.get('start'),
                        '$lte': time_range.get('end')
                    },
                    'metric_type': metric_type
                }
            }
            
            pipeline = [time_filter] + aggregation_pipeline
            
            # Execute aggregation with disk use allowed for large datasets
            return list(self._collections['metrics'].aggregate(
                pipeline,
                allowDiskUse=True,
                batchSize=1000
            ))
        except PyMongoError as e:
            raise Exception(f"Aggregation failed: {str(e)}")

    def get_metrics_by_vehicle(self, vehicle_id: str, time_range: Dict, metric_types: List[str]) -> pd.DataFrame:
        """Retrieve metrics for a specific vehicle.
        
        Args:
            vehicle_id (str): Vehicle identifier
            time_range (Dict): Time range filter
            metric_types (List[str]): Types of metrics to retrieve
            
        Returns:
            DataFrame: Vehicle metrics as pandas DataFrame
        """
        try:
            # Build query using compound index
            query = {
                'vehicle_id': vehicle_id,
                'timestamp': {
                    '$gte': time_range.get('start'),
                    '$lte': time_range.get('end')
                }
            }
            
            if metric_types:
                query['metric_type'] = {'$in': metric_types}
            
            # Retrieve data with batch processing
            cursor = self._collections['metrics'].find(
                query,
                batch_size=1000
            ).sort('timestamp', ASCENDING)
            
            # Convert to DataFrame with optimized memory usage
            df = pd.DataFrame(list(cursor))
            
            if df.empty:
                return pd.DataFrame()
            
            # Optimize DataFrame memory usage
            for col in df.select_dtypes(include=['object']).columns:
                df[col] = pd.to_numeric(df[col], errors='ignore')
            
            return df
        except PyMongoError as e:
            raise Exception(f"Failed to retrieve vehicle metrics: {str(e)}")

    def get_fleet_performance(self, time_range: Dict, metrics_to_include: List[str]) -> Dict:
        """Calculate overall fleet performance metrics.
        
        Args:
            time_range (Dict): Time range for analysis
            metrics_to_include (List[str]): Metrics to include in analysis
            
        Returns:
            Dict: Fleet performance metrics
        """
        try:
            # Aggregate metrics across fleet
            pipeline = [
                {
                    '$match': {
                        'timestamp': {
                            '$gte': time_range.get('start'),
                            '$lte': time_range.get('end')
                        },
                        'metric_type': {'$in': metrics_to_include}
                    }
                },
                {
                    '$group': {
                        '_id': '$metric_type',
                        'avg_value': {'$avg': '$data.value'},
                        'max_value': {'$max': '$data.value'},
                        'min_value': {'$min': '$data.value'},
                        'std_dev': {'$stdDevPop': '$data.value'},
                        'count': {'$sum': 1}
                    }
                }
            ]
            
            results = list(self._collections['metrics'].aggregate(pipeline))
            
            # Process results using numpy for statistical calculations
            performance_data = {}
            for result in results:
                metric_type = result['_id']
                performance_data[metric_type] = {
                    'average': np.round(result['avg_value'], 2),
                    'maximum': result['max_value'],
                    'minimum': result['min_value'],
                    'standard_deviation': np.round(result['std_dev'], 2),
                    'sample_size': result['count']
                }
            
            return performance_data
        except PyMongoError as e:
            raise Exception(f"Failed to calculate fleet performance: {str(e)}")