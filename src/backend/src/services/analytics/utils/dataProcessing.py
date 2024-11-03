"""
Fleet tracking data processing and analytics utility module.
Provides high-performance data transformation, aggregation, and statistical analysis functions.

External library versions:
numpy==1.24.0
pandas==2.0.0
scipy==1.10.0
"""

import numpy as np
import pandas as pd
from scipy import stats
from datetime import datetime
from typing import Dict, List, Union, Optional
from .analyticsModel import AnalyticsModel

# Global metric types for standardized analytics
METRIC_TYPES = {
    'SPEED': 'vehicle_speed',
    'DISTANCE': 'distance_covered',
    'FUEL': 'fuel_consumption',
    'IDLE_TIME': 'idle_time',
    'DELIVERY_TIME': 'delivery_time'
}

# Standard aggregation periods for time-series analysis
AGGREGATION_PERIODS = {
    'HOURLY': '1H',
    'DAILY': '1D',
    'WEEKLY': '1W',
    'MONTHLY': '1M'
}

def process_location_data(location_data: pd.DataFrame, calculation_options: Dict) -> pd.DataFrame:
    """
    Process raw location data to calculate derived metrics using vectorized operations.
    Addresses requirement: Support for efficient processing of data for 10,000+ concurrent users
    
    Args:
        location_data (DataFrame): Raw location data with timestamps and coordinates
        calculation_options (Dict): Options for metric calculations
    
    Returns:
        DataFrame: Processed location metrics with optimized memory usage
    """
    try:
        # Sort data by timestamp for accurate calculations
        location_data = location_data.sort_values('timestamp')
        
        # Calculate time differences using vectorized operations
        location_data['time_diff'] = location_data.groupby('vehicle_id')['timestamp'].diff().dt.total_seconds()
        
        # Calculate distances using numpy's optimized operations
        coords = location_data[['latitude', 'longitude']].values
        distances = np.zeros(len(location_data))
        mask = location_data['vehicle_id'].shift() == location_data['vehicle_id']
        distances[mask] = np.sqrt(
            np.sum((coords[1:] - coords[:-1])**2, axis=1)
        ) * 111.32  # Convert to kilometers
        
        # Calculate speeds using vectorized operations
        location_data['speed'] = np.where(
            location_data['time_diff'] > 0,
            distances / location_data['time_diff'] * 3600,  # Convert to km/h
            0
        )
        
        # Remove outliers using scipy's statistical methods
        if calculation_options.get('remove_outliers', True):
            z_scores = np.abs(stats.zscore(location_data['speed']))
            location_data = location_data[z_scores < 3]
        
        # Calculate additional metrics
        location_data['distance'] = distances
        location_data['acceleration'] = location_data.groupby('vehicle_id')['speed'].diff() / \
                                     location_data['time_diff']
        
        # Optimize memory usage
        for col in location_data.select_dtypes(include=['float64']).columns:
            location_data[col] = location_data[col].astype('float32')
            
        return location_data[['vehicle_id', 'timestamp', 'speed', 'distance', 'acceleration']]
        
    except Exception as e:
        raise ValueError(f"Error processing location data: {str(e)}")

def calculate_fleet_metrics(fleet_data: pd.DataFrame, metric_type: str, 
                          aggregation_period: str) -> Dict:
    """
    Calculate aggregate fleet performance metrics using optimized computation methods.
    Addresses requirement: Analytics and reporting capabilities for fleet management system
    
    Args:
        fleet_data (DataFrame): Fleet operational data
        metric_type (str): Type of metric to calculate
        aggregation_period (str): Time period for aggregation
    
    Returns:
        Dict: Aggregated fleet metrics with statistical summaries
    """
    try:
        # Validate inputs
        if metric_type not in METRIC_TYPES.values():
            raise ValueError(f"Invalid metric type: {metric_type}")
        if aggregation_period not in AGGREGATION_PERIODS.values():
            raise ValueError(f"Invalid aggregation period: {aggregation_period}")
            
        # Group data by specified period using efficient pandas operations
        grouped = fleet_data.groupby([
            pd.Grouper(key='timestamp', freq=aggregation_period),
            'vehicle_id'
        ])[metric_type]
        
        # Calculate statistical aggregations using numpy methods
        metrics = {
            'mean': grouped.mean().groupby(level=0).mean(),
            'median': grouped.median().groupby(level=0).median(),
            'std': grouped.std().groupby(level=0).mean(),
            'min': grouped.min().groupby(level=0).min(),
            'max': grouped.max().groupby(level=0).max(),
            'vehicle_count': grouped.count().groupby(level=0).count()
        }
        
        return {
            'aggregation_period': aggregation_period,
            'metric_type': metric_type,
            'statistics': {k: v.to_dict() for k, v in metrics.items()}
        }
        
    except Exception as e:
        raise ValueError(f"Error calculating fleet metrics: {str(e)}")

def analyze_delivery_efficiency(delivery_data: pd.DataFrame, 
                              efficiency_parameters: Dict) -> Dict:
    """
    Analyze delivery efficiency metrics and patterns using advanced statistical methods.
    Addresses requirement: Analytics and reporting capabilities
    
    Args:
        delivery_data (DataFrame): Delivery performance data
        efficiency_parameters (Dict): Parameters for efficiency analysis
    
    Returns:
        Dict: Efficiency analysis results with optimization recommendations
    """
    try:
        # Calculate delivery time statistics
        delivery_stats = {
            'avg_delivery_time': delivery_data['delivery_time'].mean(),
            'std_delivery_time': delivery_data['delivery_time'].std(),
            'on_time_percentage': (
                delivery_data['actual_time'] <= delivery_data['planned_time']
            ).mean() * 100
        }
        
        # Analyze route efficiency
        route_efficiency = {
            'avg_distance_per_delivery': delivery_data['distance'].mean(),
            'avg_stops_per_route': delivery_data.groupby('route_id')['stop_count'].mean(),
            'distance_utilization': (
                delivery_data['actual_distance'] / delivery_data['planned_distance']
            ).mean() * 100
        }
        
        # Calculate efficiency scores using normalized metrics
        scores = pd.DataFrame({
            'delivery_time_score': stats.zscore(delivery_data['delivery_time']),
            'distance_score': stats.zscore(delivery_data['distance']),
            'fuel_efficiency_score': stats.zscore(delivery_data['fuel_consumption'])
        })
        
        overall_efficiency = np.mean([
            delivery_stats['on_time_percentage'] / 100,
            route_efficiency['distance_utilization'] / 100,
            (1 - abs(scores.mean()))
        ])
        
        return {
            'delivery_statistics': delivery_stats,
            'route_efficiency': route_efficiency,
            'overall_efficiency_score': round(overall_efficiency * 100, 2),
            'recommendations': _generate_efficiency_recommendations(
                delivery_stats, route_efficiency, efficiency_parameters
            )
        }
        
    except Exception as e:
        raise ValueError(f"Error analyzing delivery efficiency: {str(e)}")

def detect_anomalies(operational_data: pd.DataFrame, threshold: float) -> pd.DataFrame:
    """
    Detect anomalies in fleet operation metrics using statistical methods.
    Addresses requirement: Support for efficient processing of data
    
    Args:
        operational_data (DataFrame): Fleet operational metrics
        threshold (float): Z-score threshold for anomaly detection
    
    Returns:
        DataFrame: Identified anomalies with confidence scores
    """
    try:
        # Calculate z-scores for numerical columns using vectorized operations
        numeric_cols = operational_data.select_dtypes(include=[np.number]).columns
        z_scores = pd.DataFrame()
        
        for col in numeric_cols:
            z_scores[col] = np.abs(stats.zscore(operational_data[col]))
        
        # Identify anomalies using optimized boolean indexing
        anomalies = operational_data[
            (z_scores > threshold).any(axis=1)
        ].copy()
        
        # Calculate confidence scores for anomalies
        anomalies['confidence_score'] = z_scores[
            (z_scores > threshold).any(axis=1)
        ].max(axis=1)
        
        # Add anomaly categories
        anomalies['anomaly_type'] = _categorize_anomalies(z_scores, threshold)
        
        return anomalies
        
    except Exception as e:
        raise ValueError(f"Error detecting anomalies: {str(e)}")

def generate_performance_report(metrics_data: Dict, report_type: str) -> Dict:
    """
    Generate comprehensive performance analysis report with visualizations.
    Addresses requirement: Analytics and reporting capabilities
    
    Args:
        metrics_data (Dict): Performance metrics data
        report_type (str): Type of report to generate
    
    Returns:
        Dict: Formatted performance report with statistical analysis
    """
    try:
        # Convert metrics to DataFrame for efficient processing
        df = pd.DataFrame(metrics_data)
        
        # Calculate KPIs using numpy statistical functions
        kpis = {
            'operational_efficiency': np.mean([
                df['on_time_delivery_rate'].mean(),
                df['fuel_efficiency'].mean(),
                df['vehicle_utilization'].mean()
            ]),
            'delivery_performance': {
                'on_time_rate': df['on_time_delivery_rate'].mean(),
                'avg_delay': df['delivery_delay'].mean(),
                'delivery_success_rate': df['delivery_success_rate'].mean()
            },
            'resource_utilization': {
                'vehicle_utilization': df['vehicle_utilization'].mean(),
                'driver_productivity': df['driver_productivity'].mean(),
                'fuel_efficiency': df['fuel_efficiency'].mean()
            }
        }
        
        # Generate statistical summaries
        summaries = {
            'daily_metrics': df.groupby('date').agg({
                'deliveries': 'sum',
                'distance': 'sum',
                'fuel_consumption': 'sum',
                'on_time_delivery_rate': 'mean'
            }).to_dict(),
            'trend_analysis': _calculate_trends(df),
            'performance_indicators': kpis
        }
        
        return {
            'report_type': report_type,
            'generated_at': datetime.utcnow().isoformat(),
            'summary': summaries,
            'recommendations': _generate_performance_recommendations(kpis)
        }
        
    except Exception as e:
        raise ValueError(f"Error generating performance report: {str(e)}")

def _calculate_trends(data: pd.DataFrame) -> Dict:
    """Calculate performance trends using rolling statistics."""
    return {
        'delivery_trend': stats.linregress(
            range(len(data)), data['deliveries']
        )._asdict(),
        'efficiency_trend': stats.linregress(
            range(len(data)), data['fuel_efficiency']
        )._asdict()
    }

def _generate_efficiency_recommendations(
    delivery_stats: Dict, route_efficiency: Dict, parameters: Dict) -> List[str]:
    """Generate optimization recommendations based on efficiency analysis."""
    recommendations = []
    
    if delivery_stats['on_time_percentage'] < parameters.get('target_on_time', 95):
        recommendations.append(
            "Improve on-time delivery performance through better route optimization"
        )
    
    if route_efficiency['distance_utilization'] < parameters.get('target_utilization', 90):
        recommendations.append(
            "Optimize route planning to reduce excess distance traveled"
        )
    
    return recommendations

def _categorize_anomalies(z_scores: pd.DataFrame, threshold: float) -> pd.Series:
    """Categorize anomalies based on their statistical properties."""
    categories = []
    for _, row in z_scores.iterrows():
        if (row > threshold).any():
            affected_metrics = row[row > threshold].index.tolist()
            categories.append(f"Anomaly in: {', '.join(affected_metrics)}")
        else:
            categories.append("Normal")
    return pd.Series(categories)

def _generate_performance_recommendations(kpis: Dict) -> List[str]:
    """Generate performance improvement recommendations based on KPIs."""
    recommendations = []
    
    if kpis['operational_efficiency'] < 0.85:
        recommendations.append(
            "Focus on improving overall operational efficiency through better resource allocation"
        )
    
    if kpis['delivery_performance']['on_time_rate'] < 0.95:
        recommendations.append(
            "Enhance delivery planning and route optimization to improve on-time performance"
        )
    
    return recommendations