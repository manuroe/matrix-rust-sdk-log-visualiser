### Performance Comparison

**Baseline**: none
**Threshold**: 10% regression

#### LogActivityChart Performance > Data aggregation (chartData useMemo)

| LogActivityChart Performance > Data aggregation (chartData useMemo) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.33ms | 0.26MB |
| medium (10K lines) | 9.7x | 12.87ms | 1.66MB |
| large (100K lines) | 137.5x | 182.21ms | 4.69MB |

#### LogActivityChart Performance > Time extraction (timeToMs calls)

| LogActivityChart Performance > Time extraction (timeToMs calls) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K timestamps | 1.0x | 1.12ms | 0.10MB |
| extract 10K timestamps | 10.7x | 12.05ms | 1.03MB |
| extract 100K timestamps | 156.7x | 175.99ms | 9.66MB |

#### logParser Performance > parseAllHttpRequests

| logParser Performance > parseAllHttpRequests | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.49ms | -11.88MB |
| medium (10K lines) | 11.1x | 27.69ms | 0.58MB |
| large (100K lines) | 142.0x | 354.22ms | -59.36MB |

#### logParser Performance > parseLogFile

| logParser Performance > parseLogFile | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.62ms | 1.55MB |
| medium (10K lines) | 10.9x | 28.64ms | 0.74MB |
| large (100K lines) | 137.6x | 360.79ms | -55.00MB |

#### LogsView Performance > Time extraction only (time-critical path)

| LogsView Performance > Time extraction only (time-critical path) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K times | 1.0x | 1.15ms | 0.10MB |
| extract 10K times | 10.9x | 12.54ms | 0.98MB |
| extract 100K times | 151.9x | 174.28ms | 9.54MB |

#### LogsView Performance > Time range filtering

| LogsView Performance > Time range filtering | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.97ms | 0.75MB |
| medium (10K lines) | 11.0x | 21.75ms | 0.72MB |
| large (100K lines) | 143.4x | 283.01ms | 43.97MB |

#### LogsView Performance > Timestamp conversion (isoToTime)

| LogsView Performance > Timestamp conversion (isoToTime) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| convert 1K timestamps | 1.0x | 1.11ms | 0.00MB |
| convert 10K timestamps | 10.5x | 11.75ms | 0.00MB |
| convert 100K timestamps | 152.1x | 169.52ms | 0.01MB |


Report generated successfully
