### Performance Comparison

**Baseline**: none
**Threshold**: 10% regression

#### LogActivityChart Performance > Data aggregation (chartData useMemo)

| LogActivityChart Performance > Data aggregation (chartData useMemo) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.35ms | 0.26MB |
| medium (10K lines) | 9.7x | 13.08ms | 1.74MB |
| large (100K lines) | 137.3x | 185.09ms | 4.50MB |

#### LogActivityChart Performance > Time extraction (timeToMs calls)

| LogActivityChart Performance > Time extraction (timeToMs calls) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K timestamps | 1.0x | 1.15ms | 0.10MB |
| extract 10K timestamps | 10.6x | 12.21ms | 0.94MB |
| extract 100K timestamps | 153.4x | 176.64ms | 9.52MB |

#### logParser Performance > parseAllHttpRequests

| logParser Performance > parseAllHttpRequests | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.54ms | -11.74MB |
| medium (10K lines) | 10.8x | 27.47ms | 0.69MB |
| large (100K lines) | 139.1x | 353.84ms | -59.38MB |

#### logParser Performance > parseLogFile

| logParser Performance > parseLogFile | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.62ms | 1.53MB |
| medium (10K lines) | 10.8x | 28.31ms | 0.87MB |
| large (100K lines) | 137.2x | 359.36ms | -56.13MB |

#### LogsView Performance > Time extraction only (time-critical path)

| LogsView Performance > Time extraction only (time-critical path) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K times | 1.0x | 1.13ms | 0.10MB |
| extract 10K times | 10.9x | 12.38ms | 0.94MB |
| extract 100K times | 153.7x | 173.80ms | 9.54MB |

#### LogsView Performance > Time range filtering

| LogsView Performance > Time range filtering | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.94ms | 0.64MB |
| medium (10K lines) | 11.5x | 22.32ms | 7.00MB |
| large (100K lines) | 144.2x | 279.80ms | 45.73MB |

#### LogsView Performance > Timestamp conversion (isoToTime)

| LogsView Performance > Timestamp conversion (isoToTime) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| convert 1K timestamps | 1.0x | 1.11ms | 0.00MB |
| convert 10K timestamps | 10.6x | 11.85ms | 0.00MB |
| convert 100K timestamps | 151.0x | 168.26ms | 0.01MB |


Report generated successfully
