### Performance Comparison

**Baseline**: none
**Threshold**: 10% regression

#### LogActivityChart Performance > Data aggregation (chartData useMemo)

| LogActivityChart Performance > Data aggregation (chartData useMemo) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.35ms | 0.26MB |
| medium (10K lines) | 9.7x | 13.09ms | 1.75MB |
| large (100K lines) | 136.0x | 183.31ms | 4.54MB |

#### LogActivityChart Performance > Time extraction (timeToMs calls)

| LogActivityChart Performance > Time extraction (timeToMs calls) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K timestamps | 1.0x | 1.13ms | 0.10MB |
| extract 10K timestamps | 10.8x | 12.17ms | 1.00MB |
| extract 100K timestamps | 158.4x | 178.59ms | 9.58MB |

#### logParser Performance > parseAllHttpRequests

| logParser Performance > parseAllHttpRequests | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.52ms | -12.06MB |
| medium (10K lines) | 10.9x | 27.58ms | 0.59MB |
| large (100K lines) | 142.0x | 358.48ms | -59.38MB |

#### logParser Performance > parseLogFile

| logParser Performance > parseLogFile | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.60ms | 1.55MB |
| medium (10K lines) | 10.8x | 28.00ms | 0.68MB |
| large (100K lines) | 138.0x | 358.45ms | -55.44MB |

#### LogsView Performance > Time extraction only (time-critical path)

| LogsView Performance > Time extraction only (time-critical path) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K times | 1.0x | 1.17ms | 0.10MB |
| extract 10K times | 11.2x | 13.11ms | 0.94MB |
| extract 100K times | 149.1x | 173.83ms | 9.53MB |

#### LogsView Performance > Time range filtering

| LogsView Performance > Time range filtering | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.95ms | 0.63MB |
| medium (10K lines) | 11.5x | 22.40ms | 6.90MB |
| large (100K lines) | 155.4x | 302.90ms | 45.87MB |

#### LogsView Performance > Timestamp conversion (isoToTime)

| LogsView Performance > Timestamp conversion (isoToTime) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| convert 1K timestamps | 1.0x | 1.13ms | 0.00MB |
| convert 10K timestamps | 10.5x | 11.83ms | 0.00MB |
| convert 100K timestamps | 149.6x | 168.76ms | 0.01MB |


Report generated successfully
