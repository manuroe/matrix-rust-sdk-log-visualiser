### Performance Comparison

**Baseline**: none
**Threshold**: 10% regression

#### LogActivityChart Performance > Data aggregation (chartData useMemo)

| LogActivityChart Performance > Data aggregation (chartData useMemo) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.32ms | 0.26MB |
| medium (10K lines) | 9.8x | 12.94ms | 1.78MB |
| large (100K lines) | 134.4x | 177.94ms | 4.56MB |

#### LogActivityChart Performance > Time extraction (timeToMs calls)

| LogActivityChart Performance > Time extraction (timeToMs calls) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K timestamps | 1.0x | 1.16ms | 0.10MB |
| extract 10K timestamps | 10.5x | 12.22ms | 0.94MB |
| extract 100K timestamps | 149.2x | 173.54ms | 9.57MB |

#### logParser Performance > parseAllHttpRequests

| logParser Performance > parseAllHttpRequests | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.52ms | -12.00MB |
| medium (10K lines) | 10.8x | 27.08ms | 0.65MB |
| large (100K lines) | 138.3x | 347.94ms | -59.13MB |

#### logParser Performance > parseLogFile

| logParser Performance > parseLogFile | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.60ms | 1.55MB |
| medium (10K lines) | 10.8x | 28.05ms | 0.73MB |
| large (100K lines) | 137.1x | 356.48ms | -55.57MB |

#### LogsView Performance > Time extraction only (time-critical path)

| LogsView Performance > Time extraction only (time-critical path) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K times | 1.0x | 1.13ms | 0.10MB |
| extract 10K times | 11.1x | 12.57ms | 0.94MB |
| extract 100K times | 160.0x | 181.21ms | 9.52MB |

#### LogsView Performance > Time range filtering

| LogsView Performance > Time range filtering | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.97ms | 0.63MB |
| medium (10K lines) | 11.3x | 22.24ms | 6.90MB |
| large (100K lines) | 142.3x | 279.93ms | 46.90MB |

#### LogsView Performance > Timestamp conversion (isoToTime)

| LogsView Performance > Timestamp conversion (isoToTime) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| convert 1K timestamps | 1.0x | 1.11ms | 0.00MB |
| convert 10K timestamps | 10.6x | 11.69ms | 0.00MB |
| convert 100K timestamps | 152.2x | 168.64ms | 0.00MB |


Report generated successfully
