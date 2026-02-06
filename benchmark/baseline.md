### Performance Comparison

**Baseline**: none
**Threshold**: 10% regression

#### LogActivityChart Performance > Data aggregation (chartData useMemo)

| LogActivityChart Performance > Data aggregation (chartData useMemo) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 0.95ms | 0.20MB |
| medium (10K lines) | 9.4x | 8.91ms | 1.36MB |
| large (100K lines) | 152.4x | 145.21ms | 3.94MB |

#### LogActivityChart Performance > Time extraction (timeToMs calls)

| LogActivityChart Performance > Time extraction (timeToMs calls) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K timestamps | 1.0x | 0.81ms | 0.10MB |
| extract 10K timestamps | 10.6x | 8.62ms | 0.98MB |
| extract 100K timestamps | 175.5x | 142.53ms | 4.75MB |

#### logParser Performance > parseAllHttpRequests

| logParser Performance > parseAllHttpRequests | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.11ms | 1.48MB |
| medium (10K lines) | 10.6x | 22.43ms | 1.89MB |
| large (100K lines) | 146.7x | 308.91ms | -67.43MB |

#### logParser Performance > parseLogFile

| logParser Performance > parseLogFile | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.21ms | 1.49MB |
| medium (10K lines) | 10.6x | 23.47ms | 2.48MB |
| large (100K lines) | 141.9x | 313.46ms | 32.86MB |

#### LogsView Performance > Time extraction only (time-critical path)

| LogsView Performance > Time extraction only (time-critical path) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K times | 1.0x | 0.80ms | 0.10MB |
| extract 10K times | 10.7x | 8.57ms | 0.98MB |
| extract 100K times | 183.6x | 147.60ms | 3.28MB |

#### LogsView Performance > Time range filtering

| LogsView Performance > Time range filtering | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 0.84ms | 0.13MB |
| medium (10K lines) | 10.7x | 9.01ms | 1.26MB |
| large (100K lines) | 171.0x | 144.31ms | 1.72MB |

#### LogsView Performance > Timestamp conversion (isoToTime)

| LogsView Performance > Timestamp conversion (isoToTime) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| convert 1K timestamps | 1.0x | 0.78ms | 0.00MB |
| convert 10K timestamps | 10.5x | 8.21ms | 0.00MB |
| convert 100K timestamps | 175.5x | 137.60ms | 0.00MB |


Report generated successfully
