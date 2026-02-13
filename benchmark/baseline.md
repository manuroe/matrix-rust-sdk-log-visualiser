### Performance Comparison

**Baseline**: none
**Threshold**: 10% regression

#### LogActivityChart Performance > Data aggregation (chartData useMemo)

| LogActivityChart Performance > Data aggregation (chartData useMemo) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.34ms | 0.26MB |
| medium (10K lines) | 9.7x | 12.99ms | 1.68MB |
| large (100K lines) | 139.4x | 186.81ms | 4.74MB |

#### LogActivityChart Performance > Time extraction (timeToMs calls)

| LogActivityChart Performance > Time extraction (timeToMs calls) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K timestamps | 1.0x | 1.21ms | 0.10MB |
| extract 10K timestamps | 9.9x | 12.03ms | 0.94MB |
| extract 100K timestamps | 143.8x | 174.00ms | 9.58MB |

#### logParser Performance > parseAllHttpRequests

| logParser Performance > parseAllHttpRequests | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.50ms | -11.84MB |
| medium (10K lines) | 10.8x | 27.01ms | 0.64MB |
| large (100K lines) | 140.5x | 351.01ms | -59.55MB |

#### logParser Performance > parseLogFile

| logParser Performance > parseLogFile | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.58ms | 1.29MB |
| medium (10K lines) | 10.9x | 28.17ms | 0.89MB |
| large (100K lines) | 138.5x | 358.08ms | -55.64MB |

#### LogsView Performance > Time extraction only (time-critical path)

| LogsView Performance > Time extraction only (time-critical path) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K times | 1.0x | 1.15ms | 0.10MB |
| extract 10K times | 11.2x | 12.85ms | 1.06MB |
| extract 100K times | 169.7x | 195.03ms | 9.55MB |

#### LogsView Performance > Time range filtering

| LogsView Performance > Time range filtering | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.96ms | 0.74MB |
| medium (10K lines) | 11.5x | 22.52ms | 7.05MB |
| large (100K lines) | 145.4x | 284.72ms | 45.75MB |

#### LogsView Performance > Timestamp conversion (isoToTime)

| LogsView Performance > Timestamp conversion (isoToTime) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| convert 1K timestamps | 1.0x | 1.13ms | 0.00MB |
| convert 10K timestamps | 11.1x | 12.51ms | 0.00MB |
| convert 100K timestamps | 153.5x | 172.84ms | 0.05MB |


Report generated successfully
