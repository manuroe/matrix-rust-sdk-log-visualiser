### Performance Comparison

**Baseline**: none
**Threshold**: 10% regression

#### LogActivityChart Performance > Data aggregation (chartData useMemo)

| LogActivityChart Performance > Data aggregation (chartData useMemo) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.34ms | 0.26MB |
| medium (10K lines) | 9.8x | 13.08ms | 1.61MB |
| large (100K lines) | 140.2x | 187.43ms | 4.55MB |

#### LogActivityChart Performance > Time extraction (timeToMs calls)

| LogActivityChart Performance > Time extraction (timeToMs calls) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K timestamps | 1.0x | 1.15ms | 0.10MB |
| extract 10K timestamps | 10.9x | 12.58ms | 1.00MB |
| extract 100K timestamps | 152.6x | 175.89ms | 9.49MB |

#### logParser Performance > parseAllHttpRequests

| logParser Performance > parseAllHttpRequests | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.53ms | -11.84MB |
| medium (10K lines) | 10.8x | 27.31ms | 0.60MB |
| large (100K lines) | 142.7x | 361.22ms | -59.21MB |

#### logParser Performance > parseLogFile

| logParser Performance > parseLogFile | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.61ms | 1.54MB |
| medium (10K lines) | 11.0x | 28.59ms | 0.71MB |
| large (100K lines) | 140.2x | 365.67ms | -55.73MB |

#### LogsView Performance > Time extraction only (time-critical path)

| LogsView Performance > Time extraction only (time-critical path) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K times | 1.0x | 1.16ms | 0.10MB |
| extract 10K times | 11.3x | 13.06ms | 0.94MB |
| extract 100K times | 154.8x | 178.97ms | 9.52MB |

#### LogsView Performance > Time range filtering

| LogsView Performance > Time range filtering | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.95ms | 0.64MB |
| medium (10K lines) | 11.7x | 22.77ms | 6.82MB |
| large (100K lines) | 145.3x | 283.79ms | 45.72MB |

#### LogsView Performance > Timestamp conversion (isoToTime)

| LogsView Performance > Timestamp conversion (isoToTime) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| convert 1K timestamps | 1.0x | 1.13ms | 0.00MB |
| convert 10K timestamps | 10.6x | 11.98ms | 0.00MB |
| convert 100K timestamps | 149.9x | 169.47ms | 0.01MB |


Report generated successfully
