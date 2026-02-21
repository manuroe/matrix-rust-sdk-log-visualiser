### Performance Comparison

**Baseline**: none
**Threshold**: 10% regression

#### LogActivityChart Performance > Data aggregation (chartData useMemo)

| LogActivityChart Performance > Data aggregation (chartData useMemo) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.35ms | 0.26MB |
| medium (10K lines) | 9.8x | 13.19ms | 1.66MB |
| large (100K lines) | 135.6x | 183.13ms | 4.71MB |

#### LogActivityChart Performance > Time extraction (timeToMs calls)

| LogActivityChart Performance > Time extraction (timeToMs calls) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K timestamps | 1.0x | 1.12ms | 0.10MB |
| extract 10K timestamps | 10.9x | 12.23ms | 0.94MB |
| extract 100K timestamps | 153.7x | 172.51ms | 9.66MB |

#### logParser Performance > parseAllHttpRequests

| logParser Performance > parseAllHttpRequests | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.53ms | -11.97MB |
| medium (10K lines) | 10.8x | 27.39ms | 0.64MB |
| large (100K lines) | 139.1x | 351.58ms | -59.35MB |

#### logParser Performance > parseLogFile

| logParser Performance > parseLogFile | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.61ms | 1.55MB |
| medium (10K lines) | 10.8x | 28.29ms | 0.84MB |
| large (100K lines) | 139.6x | 364.12ms | -60.61MB |

#### LogsView Performance > Time extraction only (time-critical path)

| LogsView Performance > Time extraction only (time-critical path) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K times | 1.0x | 1.18ms | 0.10MB |
| extract 10K times | 11.1x | 13.00ms | 1.01MB |
| extract 100K times | 147.8x | 173.73ms | 9.58MB |

#### LogsView Performance > Time range filtering

| LogsView Performance > Time range filtering | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.96ms | 0.64MB |
| medium (10K lines) | 11.6x | 22.69ms | 7.03MB |
| large (100K lines) | 144.6x | 282.74ms | 46.65MB |

#### LogsView Performance > Timestamp conversion (isoToTime)

| LogsView Performance > Timestamp conversion (isoToTime) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| convert 1K timestamps | 1.0x | 1.17ms | 0.00MB |
| convert 10K timestamps | 10.3x | 12.04ms | 0.00MB |
| convert 100K timestamps | 146.2x | 170.70ms | 0.18MB |


Report generated successfully
