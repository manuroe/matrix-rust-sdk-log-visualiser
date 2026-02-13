### Performance Comparison

**Baseline**: none
**Threshold**: 10% regression

#### LogActivityChart Performance > Data aggregation (chartData useMemo)

| LogActivityChart Performance > Data aggregation (chartData useMemo) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.34ms | 0.26MB |
| medium (10K lines) | 9.7x | 12.95ms | 1.73MB |
| large (100K lines) | 139.8x | 186.74ms | 4.54MB |

#### LogActivityChart Performance > Time extraction (timeToMs calls)

| LogActivityChart Performance > Time extraction (timeToMs calls) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K timestamps | 1.0x | 1.16ms | 0.10MB |
| extract 10K timestamps | 10.6x | 12.28ms | 0.94MB |
| extract 100K timestamps | 152.8x | 177.22ms | 9.73MB |

#### logParser Performance > parseAllHttpRequests

| logParser Performance > parseAllHttpRequests | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.60ms | -12.07MB |
| medium (10K lines) | 11.0x | 28.51ms | 0.60MB |
| large (100K lines) | 140.1x | 364.01ms | -59.25MB |

#### logParser Performance > parseLogFile

| logParser Performance > parseLogFile | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.66ms | 1.52MB |
| medium (10K lines) | 10.8x | 28.75ms | 0.85MB |
| large (100K lines) | 138.0x | 366.70ms | -55.69MB |

#### LogsView Performance > Time extraction only (time-critical path)

| LogsView Performance > Time extraction only (time-critical path) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K times | 1.0x | 1.17ms | 0.10MB |
| extract 10K times | 10.7x | 12.56ms | 0.94MB |
| extract 100K times | 151.3x | 177.73ms | 9.57MB |

#### LogsView Performance > Time range filtering

| LogsView Performance > Time range filtering | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.91ms | 0.63MB |
| medium (10K lines) | 11.5x | 22.01ms | 6.97MB |
| large (100K lines) | 161.5x | 309.20ms | 45.79MB |

#### LogsView Performance > Timestamp conversion (isoToTime)

| LogsView Performance > Timestamp conversion (isoToTime) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| convert 1K timestamps | 1.0x | 1.11ms | 0.00MB |
| convert 10K timestamps | 10.5x | 11.70ms | 0.00MB |
| convert 100K timestamps | 151.4x | 168.23ms | 0.01MB |


Report generated successfully
