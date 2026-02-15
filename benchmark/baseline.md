### Performance Comparison

**Baseline**: none
**Threshold**: 10% regression

#### LogActivityChart Performance > Data aggregation (chartData useMemo)

| LogActivityChart Performance > Data aggregation (chartData useMemo) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.32ms | 0.26MB |
| medium (10K lines) | 9.8x | 12.89ms | 1.78MB |
| large (100K lines) | 141.8x | 187.39ms | 4.67MB |

#### LogActivityChart Performance > Time extraction (timeToMs calls)

| LogActivityChart Performance > Time extraction (timeToMs calls) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K timestamps | 1.0x | 1.13ms | 0.10MB |
| extract 10K timestamps | 10.7x | 12.11ms | 0.94MB |
| extract 100K timestamps | 155.8x | 175.61ms | 9.52MB |

#### logParser Performance > parseAllHttpRequests

| logParser Performance > parseAllHttpRequests | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.50ms | -11.94MB |
| medium (10K lines) | 10.8x | 27.12ms | 0.83MB |
| large (100K lines) | 138.8x | 347.61ms | -59.27MB |

#### logParser Performance > parseLogFile

| logParser Performance > parseLogFile | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.60ms | 1.29MB |
| medium (10K lines) | 10.7x | 27.88ms | 0.78MB |
| large (100K lines) | 137.5x | 358.24ms | -56.31MB |

#### LogsView Performance > Time extraction only (time-critical path)

| LogsView Performance > Time extraction only (time-critical path) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K times | 1.0x | 1.16ms | 0.10MB |
| extract 10K times | 11.0x | 12.78ms | 0.91MB |
| extract 100K times | 149.1x | 173.00ms | 9.59MB |

#### LogsView Performance > Time range filtering

| LogsView Performance > Time range filtering | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.93ms | 0.64MB |
| medium (10K lines) | 12.1x | 23.40ms | 7.13MB |
| large (100K lines) | 148.6x | 286.29ms | 46.04MB |

#### LogsView Performance > Timestamp conversion (isoToTime)

| LogsView Performance > Timestamp conversion (isoToTime) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| convert 1K timestamps | 1.0x | 1.13ms | 0.00MB |
| convert 10K timestamps | 10.5x | 11.78ms | 0.00MB |
| convert 100K timestamps | 148.8x | 167.56ms | 0.01MB |


Report generated successfully
