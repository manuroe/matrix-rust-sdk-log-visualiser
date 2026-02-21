### Performance Comparison

**Baseline**: none
**Threshold**: 10% regression

#### LogActivityChart Performance > Data aggregation (chartData useMemo)

| LogActivityChart Performance > Data aggregation (chartData useMemo) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.33ms | 0.26MB |
| medium (10K lines) | 9.8x | 12.98ms | 1.75MB |
| large (100K lines) | 140.6x | 186.41ms | 4.74MB |

#### LogActivityChart Performance > Time extraction (timeToMs calls)

| LogActivityChart Performance > Time extraction (timeToMs calls) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K timestamps | 1.0x | 1.13ms | 0.10MB |
| extract 10K timestamps | 10.7x | 12.13ms | 0.94MB |
| extract 100K timestamps | 156.7x | 177.28ms | 9.52MB |

#### logParser Performance > parseAllHttpRequests

| logParser Performance > parseAllHttpRequests | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.52ms | -11.95MB |
| medium (10K lines) | 10.9x | 27.54ms | 0.66MB |
| large (100K lines) | 141.0x | 355.67ms | -59.16MB |

#### logParser Performance > parseLogFile

| logParser Performance > parseLogFile | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.61ms | 1.40MB |
| medium (10K lines) | 10.9x | 28.58ms | 1.11MB |
| large (100K lines) | 138.0x | 360.84ms | -55.43MB |

#### LogsView Performance > Time extraction only (time-critical path)

| LogsView Performance > Time extraction only (time-critical path) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K times | 1.0x | 1.16ms | -1.60MB |
| extract 10K times | 11.0x | 12.83ms | 0.94MB |
| extract 100K times | 151.8x | 176.77ms | 4.12MB |

#### LogsView Performance > Time range filtering

| LogsView Performance > Time range filtering | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.96ms | 0.63MB |
| medium (10K lines) | 11.8x | 23.24ms | 6.87MB |
| large (100K lines) | 143.1x | 281.11ms | 45.74MB |

#### LogsView Performance > Timestamp conversion (isoToTime)

| LogsView Performance > Timestamp conversion (isoToTime) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| convert 1K timestamps | 1.0x | 1.16ms | 0.00MB |
| convert 10K timestamps | 10.3x | 11.95ms | 0.00MB |
| convert 100K timestamps | 148.1x | 171.21ms | 0.00MB |


Report generated successfully
