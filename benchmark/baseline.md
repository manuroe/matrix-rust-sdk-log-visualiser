### Performance Comparison

**Baseline**: none
**Threshold**: 10% regression

#### LogActivityChart Performance > Data aggregation (chartData useMemo)

| LogActivityChart Performance > Data aggregation (chartData useMemo) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 0.95ms | 0.20MB |
| medium (10K lines) | 9.3x | 8.81ms | 1.30MB |
| large (100K lines) | 155.6x | 147.12ms | 4.01MB |

#### LogActivityChart Performance > Time extraction (timeToMs calls)

| LogActivityChart Performance > Time extraction (timeToMs calls) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K timestamps | 1.0x | 0.81ms | 0.10MB |
| extract 10K timestamps | 10.7x | 8.66ms | 1.00MB |
| extract 100K timestamps | 174.6x | 140.87ms | 4.86MB |

#### logParser Performance > parseAllHttpRequests

| logParser Performance > parseAllHttpRequests | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.17ms | 1.48MB |
| medium (10K lines) | 11.2x | 24.25ms | 1.80MB |
| large (100K lines) | 149.4x | 323.91ms | -67.62MB |

#### logParser Performance > parseLogFile

| logParser Performance > parseLogFile | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.25ms | 1.49MB |
| medium (10K lines) | 11.1x | 24.83ms | 2.49MB |
| large (100K lines) | 148.5x | 333.45ms | 32.86MB |

#### LogsView Performance > Time extraction only (time-critical path)

| LogsView Performance > Time extraction only (time-critical path) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K times | 1.0x | 0.85ms | 0.10MB |
| extract 10K times | 10.1x | 8.53ms | 0.93MB |
| extract 100K times | 167.4x | 141.65ms | 2.99MB |

#### LogsView Performance > Time range filtering

| LogsView Performance > Time range filtering | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 0.82ms | 0.13MB |
| medium (10K lines) | 10.7x | 8.74ms | 1.26MB |
| large (100K lines) | 175.4x | 143.69ms | 1.80MB |

#### LogsView Performance > Timestamp conversion (isoToTime)

| LogsView Performance > Timestamp conversion (isoToTime) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| convert 1K timestamps | 1.0x | 0.80ms | 0.00MB |
| convert 10K timestamps | 10.0x | 8.01ms | 0.00MB |
| convert 100K timestamps | 169.8x | 136.36ms | 0.00MB |


✅ **Report generated**
