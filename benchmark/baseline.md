### Performance Comparison

**Baseline**: none
**Threshold**: 10% regression

#### LogActivityChart Performance > Data aggregation (chartData useMemo)

| LogActivityChart Performance > Data aggregation (chartData useMemo) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.37ms | 0.26MB |
| medium (10K lines) | 9.7x | 13.35ms | 1.68MB |
| large (100K lines) | 136.8x | 187.72ms | 4.64MB |

#### LogActivityChart Performance > Time extraction (timeToMs calls)

| LogActivityChart Performance > Time extraction (timeToMs calls) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K timestamps | 1.0x | 1.16ms | 0.10MB |
| extract 10K timestamps | 10.5x | 12.15ms | 1.00MB |
| extract 100K timestamps | 152.9x | 176.87ms | 9.52MB |

#### logParser Performance > parseAllHttpRequests

| logParser Performance > parseAllHttpRequests | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.55ms | -11.80MB |
| medium (10K lines) | 11.0x | 28.09ms | 0.71MB |
| large (100K lines) | 144.1x | 366.96ms | -59.24MB |

#### logParser Performance > parseLogFile

| logParser Performance > parseLogFile | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.62ms | 1.29MB |
| medium (10K lines) | 10.7x | 28.10ms | 0.82MB |
| large (100K lines) | 139.7x | 366.06ms | -56.28MB |

#### LogsView Performance > Time extraction only (time-critical path)

| LogsView Performance > Time extraction only (time-critical path) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K times | 1.0x | 1.17ms | 0.10MB |
| extract 10K times | 10.8x | 12.57ms | 0.94MB |
| extract 100K times | 153.3x | 179.30ms | 9.58MB |

#### LogsView Performance > Time range filtering

| LogsView Performance > Time range filtering | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.96ms | 0.64MB |
| medium (10K lines) | 11.5x | 22.69ms | 7.00MB |
| large (100K lines) | 146.5x | 287.83ms | 46.03MB |

#### LogsView Performance > Timestamp conversion (isoToTime)

| LogsView Performance > Timestamp conversion (isoToTime) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| convert 1K timestamps | 1.0x | 1.14ms | 0.00MB |
| convert 10K timestamps | 10.6x | 12.08ms | 0.00MB |
| convert 100K timestamps | 150.9x | 171.73ms | 0.00MB |


Report generated successfully
