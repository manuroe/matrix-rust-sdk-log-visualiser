### Performance Comparison

**Baseline**: none
**Threshold**: 10% regression

#### LogActivityChart Performance > Data aggregation (chartData useMemo)

| LogActivityChart Performance > Data aggregation (chartData useMemo) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 0.96ms | 0.20MB |
| medium (10K lines) | 9.2x | 8.91ms | 1.26MB |
| large (100K lines) | 154.7x | 149.11ms | 4.00MB |

#### LogActivityChart Performance > Time extraction (timeToMs calls)

| LogActivityChart Performance > Time extraction (timeToMs calls) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K timestamps | 1.0x | 0.84ms | 0.10MB |
| extract 10K timestamps | 10.4x | 8.69ms | 0.94MB |
| extract 100K timestamps | 169.8x | 142.38ms | 4.86MB |

#### logParser Performance > parseAllHttpRequests

| logParser Performance > parseAllHttpRequests | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.15ms | 1.48MB |
| medium (10K lines) | 10.8x | 23.26ms | 1.65MB |
| large (100K lines) | 149.0x | 320.15ms | -67.46MB |

#### logParser Performance > parseLogFile

| logParser Performance > parseLogFile | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.23ms | 1.50MB |
| medium (10K lines) | 11.0x | 24.57ms | 2.48MB |
| large (100K lines) | 147.7x | 328.91ms | 32.86MB |

#### LogsView Performance > Time extraction only (time-critical path)

| LogsView Performance > Time extraction only (time-critical path) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K times | 1.0x | 0.81ms | 0.10MB |
| extract 10K times | 11.2x | 9.05ms | 0.95MB |
| extract 100K times | 200.5x | 161.63ms | 3.08MB |

#### LogsView Performance > Time range filtering

| LogsView Performance > Time range filtering | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 0.82ms | 0.13MB |
| medium (10K lines) | 10.6x | 8.63ms | 1.26MB |
| large (100K lines) | 183.2x | 149.61ms | 1.80MB |

#### LogsView Performance > Timestamp conversion (isoToTime)

| LogsView Performance > Timestamp conversion (isoToTime) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| convert 1K timestamps | 1.0x | 0.77ms | 0.00MB |
| convert 10K timestamps | 10.4x | 8.02ms | 0.00MB |
| convert 100K timestamps | 176.8x | 136.77ms | 0.00MB |


✅ **Report generated**
