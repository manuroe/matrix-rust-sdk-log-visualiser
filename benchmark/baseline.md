### Performance Comparison

**Baseline**: none
**Threshold**: 10% regression

#### LogActivityChart Performance > Data aggregation (chartData useMemo)

| LogActivityChart Performance > Data aggregation (chartData useMemo) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.32ms | 0.26MB |
| medium (10K lines) | 9.7x | 12.78ms | 1.71MB |
| large (100K lines) | 139.5x | 183.98ms | 4.68MB |

#### LogActivityChart Performance > Time extraction (timeToMs calls)

| LogActivityChart Performance > Time extraction (timeToMs calls) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K timestamps | 1.0x | 1.11ms | 0.10MB |
| extract 10K timestamps | 10.8x | 11.97ms | 1.01MB |
| extract 100K timestamps | 158.2x | 175.83ms | 9.57MB |

#### logParser Performance > parseAllHttpRequests

| logParser Performance > parseAllHttpRequests | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.50ms | -11.93MB |
| medium (10K lines) | 10.8x | 26.94ms | 0.68MB |
| large (100K lines) | 139.3x | 347.78ms | -59.33MB |

#### logParser Performance > parseLogFile

| logParser Performance > parseLogFile | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.58ms | 1.30MB |
| medium (10K lines) | 10.8x | 27.87ms | 0.78MB |
| large (100K lines) | 139.1x | 359.48ms | -56.46MB |

#### LogsView Performance > Time extraction only (time-critical path)

| LogsView Performance > Time extraction only (time-critical path) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K times | 1.0x | 1.15ms | 0.10MB |
| extract 10K times | 10.9x | 12.51ms | 1.01MB |
| extract 100K times | 151.8x | 174.45ms | 9.60MB |

#### LogsView Performance > Time range filtering

| LogsView Performance > Time range filtering | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.91ms | 0.70MB |
| medium (10K lines) | 11.0x | 21.05ms | 7.01MB |
| large (100K lines) | 147.4x | 281.64ms | 45.92MB |

#### LogsView Performance > Timestamp conversion (isoToTime)

| LogsView Performance > Timestamp conversion (isoToTime) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| convert 1K timestamps | 1.0x | 1.13ms | 0.00MB |
| convert 10K timestamps | 10.3x | 11.65ms | 0.00MB |
| convert 100K timestamps | 145.7x | 164.93ms | 0.01MB |


Report generated successfully
