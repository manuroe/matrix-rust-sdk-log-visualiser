### Performance Comparison

**Baseline**: none
**Threshold**: 10% regression

#### LogActivityChart Performance > Data aggregation (chartData useMemo)

| LogActivityChart Performance > Data aggregation (chartData useMemo) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.34ms | 0.26MB |
| medium (10K lines) | 9.8x | 13.19ms | 1.64MB |
| large (100K lines) | 138.7x | 186.44ms | 4.53MB |

#### LogActivityChart Performance > Time extraction (timeToMs calls)

| LogActivityChart Performance > Time extraction (timeToMs calls) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K timestamps | 1.0x | 1.14ms | 0.10MB |
| extract 10K timestamps | 10.8x | 12.27ms | 1.00MB |
| extract 100K timestamps | 152.3x | 173.30ms | 9.57MB |

#### logParser Performance > parseAllHttpRequests

| logParser Performance > parseAllHttpRequests | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.54ms | -12.00MB |
| medium (10K lines) | 10.7x | 27.20ms | 0.61MB |
| large (100K lines) | 138.7x | 352.37ms | -59.33MB |

#### logParser Performance > parseLogFile

| logParser Performance > parseLogFile | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.59ms | 1.55MB |
| medium (10K lines) | 10.8x | 28.04ms | 0.81MB |
| large (100K lines) | 139.3x | 360.47ms | -53.45MB |

#### LogsView Performance > Time extraction only (time-critical path)

| LogsView Performance > Time extraction only (time-critical path) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K times | 1.0x | 1.16ms | 0.10MB |
| extract 10K times | 11.2x | 12.94ms | 1.00MB |
| extract 100K times | 153.9x | 178.29ms | 1.53MB |

#### LogsView Performance > Time range filtering

| LogsView Performance > Time range filtering | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.00ms | 0.63MB |
| medium (10K lines) | 11.2x | 22.42ms | -0.36MB |
| large (100K lines) | 142.2x | 283.91ms | 43.20MB |

#### LogsView Performance > Timestamp conversion (isoToTime)

| LogsView Performance > Timestamp conversion (isoToTime) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| convert 1K timestamps | 1.0x | 1.14ms | 0.00MB |
| convert 10K timestamps | 10.6x | 12.07ms | 0.00MB |
| convert 100K timestamps | 150.4x | 171.01ms | 0.23MB |


Report generated successfully
