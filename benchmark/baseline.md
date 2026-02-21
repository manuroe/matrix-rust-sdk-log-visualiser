### Performance Comparison

**Baseline**: none
**Threshold**: 10% regression

#### LogActivityChart Performance > Data aggregation (chartData useMemo)

| LogActivityChart Performance > Data aggregation (chartData useMemo) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.37ms | 0.26MB |
| medium (10K lines) | 9.7x | 13.33ms | 1.82MB |
| large (100K lines) | 140.9x | 192.70ms | 4.64MB |

#### LogActivityChart Performance > Time extraction (timeToMs calls)

| LogActivityChart Performance > Time extraction (timeToMs calls) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K timestamps | 1.0x | 1.15ms | 0.10MB |
| extract 10K timestamps | 10.9x | 12.59ms | 0.97MB |
| extract 100K timestamps | 155.8x | 179.48ms | 9.52MB |

#### logParser Performance > parseAllHttpRequests

| logParser Performance > parseAllHttpRequests | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.42ms | -11.95MB |
| medium (10K lines) | 11.1x | 26.88ms | 0.73MB |
| large (100K lines) | 141.9x | 344.12ms | -59.11MB |

#### logParser Performance > parseLogFile

| logParser Performance > parseLogFile | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.49ms | 1.30MB |
| medium (10K lines) | 11.2x | 28.02ms | 0.97MB |
| large (100K lines) | 144.6x | 360.22ms | -56.05MB |

#### LogsView Performance > Time extraction only (time-critical path)

| LogsView Performance > Time extraction only (time-critical path) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K times | 1.0x | 1.14ms | 0.11MB |
| extract 10K times | 11.2x | 12.74ms | 1.01MB |
| extract 100K times | 156.9x | 178.36ms | 9.57MB |

#### LogsView Performance > Time range filtering

| LogsView Performance > Time range filtering | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.99ms | 0.74MB |
| medium (10K lines) | 11.1x | 22.07ms | 6.81MB |
| large (100K lines) | 143.6x | 285.49ms | 46.01MB |

#### LogsView Performance > Timestamp conversion (isoToTime)

| LogsView Performance > Timestamp conversion (isoToTime) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| convert 1K timestamps | 1.0x | 1.15ms | 0.00MB |
| convert 10K timestamps | 10.2x | 11.79ms | 0.00MB |
| convert 100K timestamps | 146.4x | 168.78ms | 0.01MB |


Report generated successfully
