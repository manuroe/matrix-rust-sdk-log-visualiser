### Performance Comparison

**Baseline**: none
**Threshold**: 10% regression

#### LogActivityChart Performance > Data aggregation (chartData useMemo)

| LogActivityChart Performance > Data aggregation (chartData useMemo) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.34ms | 0.26MB |
| medium (10K lines) | 10.1x | 13.58ms | 1.83MB |
| large (100K lines) | 144.4x | 194.02ms | 4.54MB |

#### LogActivityChart Performance > Time extraction (timeToMs calls)

| LogActivityChart Performance > Time extraction (timeToMs calls) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K timestamps | 1.0x | 1.14ms | 0.10MB |
| extract 10K timestamps | 11.0x | 12.59ms | 0.99MB |
| extract 100K timestamps | 158.3x | 181.18ms | 9.57MB |

#### logParser Performance > parseAllHttpRequests

| logParser Performance > parseAllHttpRequests | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.58ms | -11.83MB |
| medium (10K lines) | 11.2x | 28.92ms | 0.67MB |
| large (100K lines) | 143.0x | 369.37ms | -57.84MB |

#### logParser Performance > parseLogFile

| logParser Performance > parseLogFile | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.66ms | 1.38MB |
| medium (10K lines) | 11.1x | 29.48ms | 1.91MB |
| large (100K lines) | 140.7x | 374.35ms | -52.63MB |

#### LogsView Performance > Time extraction only (time-critical path)

| LogsView Performance > Time extraction only (time-critical path) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K times | 1.0x | 1.18ms | 0.10MB |
| extract 10K times | 11.0x | 12.98ms | 0.94MB |
| extract 100K times | 156.3x | 184.15ms | 9.55MB |

#### LogsView Performance > Time range filtering

| LogsView Performance > Time range filtering | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.99ms | 0.71MB |
| medium (10K lines) | 11.4x | 22.73ms | 7.02MB |
| large (100K lines) | 161.6x | 322.30ms | 46.46MB |

#### LogsView Performance > Timestamp conversion (isoToTime)

| LogsView Performance > Timestamp conversion (isoToTime) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| convert 1K timestamps | 1.0x | 1.14ms | 0.00MB |
| convert 10K timestamps | 10.7x | 12.13ms | 0.00MB |
| convert 100K timestamps | 152.8x | 173.93ms | 0.00MB |


Report generated successfully
