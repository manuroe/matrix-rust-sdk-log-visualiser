### Performance Comparison

**Baseline**: none
**Threshold**: 10% regression

#### LogActivityChart Performance > Data aggregation (chartData useMemo)

| LogActivityChart Performance > Data aggregation (chartData useMemo) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.03ms | 0.20MB |
| medium (10K lines) | 9.1x | 9.35ms | 1.24MB |
| large (100K lines) | 144.8x | 148.47ms | 4.14MB |

#### LogActivityChart Performance > Time extraction (timeToMs calls)

| LogActivityChart Performance > Time extraction (timeToMs calls) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K timestamps | 1.0x | 0.82ms | 0.10MB |
| extract 10K timestamps | 10.7x | 8.75ms | 0.95MB |
| extract 100K timestamps | 173.3x | 142.47ms | 4.91MB |

#### logParser Performance > parseAllHttpRequests

| logParser Performance > parseAllHttpRequests | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.11ms | 1.48MB |
| medium (10K lines) | 11.0x | 23.16ms | 1.64MB |
| large (100K lines) | 149.7x | 316.26ms | -67.47MB |

#### logParser Performance > parseLogFile

| logParser Performance > parseLogFile | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.24ms | 1.50MB |
| medium (10K lines) | 10.7x | 24.00ms | 2.47MB |
| large (100K lines) | 145.4x | 325.56ms | 32.81MB |

#### LogsView Performance > Time extraction only (time-critical path)

| LogsView Performance > Time extraction only (time-critical path) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K times | 1.0x | 0.82ms | 0.10MB |
| extract 10K times | 10.7x | 8.80ms | 0.96MB |
| extract 100K times | 177.6x | 146.11ms | 9.56MB |

#### LogsView Performance > Time range filtering

| LogsView Performance > Time range filtering | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 0.82ms | 0.13MB |
| medium (10K lines) | 10.9x | 8.96ms | 1.26MB |
| large (100K lines) | 178.9x | 147.15ms | 1.80MB |

#### LogsView Performance > Timestamp conversion (isoToTime)

| LogsView Performance > Timestamp conversion (isoToTime) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| convert 1K timestamps | 1.0x | 0.80ms | 0.00MB |
| convert 10K timestamps | 10.1x | 8.13ms | 0.00MB |
| convert 100K timestamps | 191.0x | 153.05ms | 0.00MB |


Report generated successfully
