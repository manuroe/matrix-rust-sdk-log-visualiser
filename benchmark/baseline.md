### Performance Comparison

**Baseline**: none
**Threshold**: 10% regression

#### LogActivityChart Performance > Data aggregation (chartData useMemo)

| LogActivityChart Performance > Data aggregation (chartData useMemo) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 0.97ms | 0.20MB |
| medium (10K lines) | 9.4x | 9.15ms | 1.28MB |
| large (100K lines) | 148.7x | 144.50ms | 4.13MB |

#### LogActivityChart Performance > Time extraction (timeToMs calls)

| LogActivityChart Performance > Time extraction (timeToMs calls) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K timestamps | 1.0x | 0.81ms | 0.13MB |
| extract 10K timestamps | 10.6x | 8.60ms | 0.98MB |
| extract 100K timestamps | 175.8x | 142.49ms | 4.78MB |

#### logParser Performance > parseAllHttpRequests

| logParser Performance > parseAllHttpRequests | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.15ms | 1.54MB |
| medium (10K lines) | 10.8x | 23.16ms | 1.64MB |
| large (100K lines) | 144.4x | 309.97ms | -67.52MB |

#### logParser Performance > parseLogFile

| logParser Performance > parseLogFile | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.24ms | 1.49MB |
| medium (10K lines) | 10.4x | 23.33ms | 2.46MB |
| large (100K lines) | 142.5x | 318.79ms | 32.89MB |

#### LogsView Performance > Time extraction only (time-critical path)

| LogsView Performance > Time extraction only (time-critical path) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K times | 1.0x | 0.81ms | 0.10MB |
| extract 10K times | 10.7x | 8.67ms | 0.93MB |
| extract 100K times | 178.2x | 144.52ms | 2.93MB |

#### LogsView Performance > Time range filtering

| LogsView Performance > Time range filtering | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 0.81ms | 0.13MB |
| medium (10K lines) | 10.6x | 8.61ms | 1.23MB |
| large (100K lines) | 176.2x | 143.25ms | 1.80MB |

#### LogsView Performance > Timestamp conversion (isoToTime)

| LogsView Performance > Timestamp conversion (isoToTime) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| convert 1K timestamps | 1.0x | 0.79ms | 0.00MB |
| convert 10K timestamps | 10.1x | 7.95ms | 0.00MB |
| convert 100K timestamps | 195.0x | 153.76ms | 0.00MB |


✅ **Report generated**
