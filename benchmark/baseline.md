### Performance Comparison

**Baseline**: none
**Threshold**: 10% regression

#### LogActivityChart Performance > Data aggregation (chartData useMemo)

| LogActivityChart Performance > Data aggregation (chartData useMemo) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 0.88ms | 0.20MB |
| medium (10K lines) | 9.4x | 8.24ms | 1.29MB |
| large (100K lines) | 163.8x | 143.56ms | 4.06MB |

#### LogActivityChart Performance > Time extraction (timeToMs calls)

| LogActivityChart Performance > Time extraction (timeToMs calls) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K timestamps | 1.0x | 0.75ms | 0.10MB |
| extract 10K timestamps | 11.0x | 8.31ms | 1.03MB |
| extract 100K timestamps | 188.3x | 142.01ms | 4.88MB |

#### logParser Performance > parseAllHttpRequests

| logParser Performance > parseAllHttpRequests | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.08ms | 1.48MB |
| medium (10K lines) | 11.5x | 23.83ms | 1.66MB |
| large (100K lines) | 156.1x | 324.11ms | -67.48MB |

#### logParser Performance > parseLogFile

| logParser Performance > parseLogFile | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.18ms | 1.49MB |
| medium (10K lines) | 10.5x | 22.83ms | 2.35MB |
| large (100K lines) | 149.9x | 326.10ms | 32.66MB |

#### LogsView Performance > Time extraction only (time-critical path)

| LogsView Performance > Time extraction only (time-critical path) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K times | 1.0x | 0.73ms | 0.10MB |
| extract 10K times | 10.6x | 7.77ms | 0.96MB |
| extract 100K times | 187.1x | 137.06ms | 3.07MB |

#### LogsView Performance > Time range filtering

| LogsView Performance > Time range filtering | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 0.76ms | 0.13MB |
| medium (10K lines) | 11.1x | 8.44ms | 1.26MB |
| large (100K lines) | 192.0x | 145.81ms | 1.79MB |

#### LogsView Performance > Timestamp conversion (isoToTime)

| LogsView Performance > Timestamp conversion (isoToTime) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| convert 1K timestamps | 1.0x | 0.72ms | 0.00MB |
| convert 10K timestamps | 10.4x | 7.47ms | 0.00MB |
| convert 100K timestamps | 183.6x | 131.41ms | 0.00MB |


Report generated successfully
