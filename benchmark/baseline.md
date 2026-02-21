### Performance Comparison

**Baseline**: none
**Threshold**: 10% regression

#### LogActivityChart Performance > Data aggregation (chartData useMemo)

| LogActivityChart Performance > Data aggregation (chartData useMemo) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.36ms | 0.26MB |
| medium (10K lines) | 9.8x | 13.36ms | 1.69MB |
| large (100K lines) | 134.2x | 182.79ms | 4.49MB |

#### LogActivityChart Performance > Time extraction (timeToMs calls)

| LogActivityChart Performance > Time extraction (timeToMs calls) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K timestamps | 1.0x | 1.17ms | 0.10MB |
| extract 10K timestamps | 10.5x | 12.29ms | 1.01MB |
| extract 100K timestamps | 150.9x | 175.99ms | 9.52MB |

#### logParser Performance > parseAllHttpRequests

| logParser Performance > parseAllHttpRequests | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.54ms | -11.89MB |
| medium (10K lines) | 10.9x | 27.73ms | 0.57MB |
| large (100K lines) | 140.2x | 355.85ms | -59.24MB |

#### logParser Performance > parseLogFile

| logParser Performance > parseLogFile | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.62ms | 1.55MB |
| medium (10K lines) | 11.0x | 28.88ms | 0.70MB |
| large (100K lines) | 139.2x | 365.36ms | -55.33MB |

#### LogsView Performance > Time extraction only (time-critical path)

| LogsView Performance > Time extraction only (time-critical path) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K times | 1.0x | 1.14ms | -1.50MB |
| extract 10K times | 11.2x | 12.78ms | 0.98MB |
| extract 100K times | 157.9x | 180.35ms | 3.95MB |

#### LogsView Performance > Time range filtering

| LogsView Performance > Time range filtering | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.98ms | 0.72MB |
| medium (10K lines) | 11.3x | 22.44ms | 6.95MB |
| large (100K lines) | 146.0x | 289.04ms | 45.69MB |

#### LogsView Performance > Timestamp conversion (isoToTime)

| LogsView Performance > Timestamp conversion (isoToTime) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| convert 1K timestamps | 1.0x | 1.12ms | 0.00MB |
| convert 10K timestamps | 10.7x | 11.91ms | 0.00MB |
| convert 100K timestamps | 154.5x | 172.50ms | 0.00MB |


Report generated successfully
