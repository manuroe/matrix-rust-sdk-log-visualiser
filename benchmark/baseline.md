### Performance Comparison

**Baseline**: none
**Threshold**: 10% regression

#### LogActivityChart Performance > Data aggregation (chartData useMemo)

| LogActivityChart Performance > Data aggregation (chartData useMemo) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.33ms | 0.26MB |
| medium (10K lines) | 9.8x | 13.06ms | 1.74MB |
| large (100K lines) | 144.2x | 191.88ms | 4.85MB |

#### LogActivityChart Performance > Time extraction (timeToMs calls)

| LogActivityChart Performance > Time extraction (timeToMs calls) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K timestamps | 1.0x | 1.14ms | 0.10MB |
| extract 10K timestamps | 10.8x | 12.24ms | 0.99MB |
| extract 100K timestamps | 154.2x | 175.07ms | 9.72MB |

#### logParser Performance > parseAllHttpRequests

| logParser Performance > parseAllHttpRequests | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.58ms | -11.99MB |
| medium (10K lines) | 10.9x | 28.06ms | 0.63MB |
| large (100K lines) | 137.6x | 354.65ms | -59.48MB |

#### logParser Performance > parseLogFile

| logParser Performance > parseLogFile | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.66ms | 1.55MB |
| medium (10K lines) | 10.9x | 29.01ms | 0.72MB |
| large (100K lines) | 136.2x | 362.26ms | -55.54MB |

#### LogsView Performance > Time extraction only (time-critical path)

| LogsView Performance > Time extraction only (time-critical path) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K times | 1.0x | 1.13ms | 0.10MB |
| extract 10K times | 11.2x | 12.72ms | 0.95MB |
| extract 100K times | 155.9x | 176.86ms | 9.49MB |

#### LogsView Performance > Time range filtering

| LogsView Performance > Time range filtering | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.94ms | 0.63MB |
| medium (10K lines) | 11.3x | 21.94ms | 7.01MB |
| large (100K lines) | 146.1x | 283.62ms | 45.74MB |

#### LogsView Performance > Timestamp conversion (isoToTime)

| LogsView Performance > Timestamp conversion (isoToTime) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| convert 1K timestamps | 1.0x | 1.12ms | 0.00MB |
| convert 10K timestamps | 10.7x | 12.01ms | 0.00MB |
| convert 100K timestamps | 150.6x | 168.60ms | 0.01MB |


Report generated successfully
