### Performance Comparison

**Baseline**: none
**Threshold**: 10% regression

#### LogActivityChart Performance > Data aggregation (chartData useMemo)

| LogActivityChart Performance > Data aggregation (chartData useMemo) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.32ms | 0.26MB |
| medium (10K lines) | 9.8x | 13.03ms | 1.71MB |
| large (100K lines) | 144.7x | 191.58ms | 4.67MB |

#### LogActivityChart Performance > Time extraction (timeToMs calls)

| LogActivityChart Performance > Time extraction (timeToMs calls) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K timestamps | 1.0x | 1.11ms | 0.10MB |
| extract 10K timestamps | 10.9x | 12.12ms | 1.00MB |
| extract 100K timestamps | 157.6x | 175.66ms | 9.61MB |

#### logParser Performance > parseAllHttpRequests

| logParser Performance > parseAllHttpRequests | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.53ms | -11.75MB |
| medium (10K lines) | 11.1x | 27.95ms | 0.78MB |
| large (100K lines) | 144.0x | 363.80ms | -59.45MB |

#### logParser Performance > parseLogFile

| logParser Performance > parseLogFile | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.62ms | 1.30MB |
| medium (10K lines) | 10.7x | 28.15ms | 0.77MB |
| large (100K lines) | 139.5x | 365.78ms | -60.74MB |

#### LogsView Performance > Time extraction only (time-critical path)

| LogsView Performance > Time extraction only (time-critical path) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K times | 1.0x | 1.19ms | 0.10MB |
| extract 10K times | 10.7x | 12.69ms | 0.97MB |
| extract 100K times | 150.4x | 178.47ms | 9.55MB |

#### LogsView Performance > Time range filtering

| LogsView Performance > Time range filtering | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.02ms | 0.67MB |
| medium (10K lines) | 11.2x | 22.68ms | 7.11MB |
| large (100K lines) | 141.4x | 285.92ms | 46.55MB |

#### LogsView Performance > Timestamp conversion (isoToTime)

| LogsView Performance > Timestamp conversion (isoToTime) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| convert 1K timestamps | 1.0x | 1.14ms | 0.00MB |
| convert 10K timestamps | 10.6x | 12.17ms | 0.00MB |
| convert 100K timestamps | 151.1x | 172.83ms | 0.04MB |


Report generated successfully
