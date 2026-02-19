### Performance Comparison

**Baseline**: none
**Threshold**: 10% regression

#### LogActivityChart Performance > Data aggregation (chartData useMemo)

| LogActivityChart Performance > Data aggregation (chartData useMemo) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.36ms | 0.26MB |
| medium (10K lines) | 9.8x | 13.24ms | 1.75MB |
| large (100K lines) | 143.2x | 194.17ms | 4.58MB |

#### LogActivityChart Performance > Time extraction (timeToMs calls)

| LogActivityChart Performance > Time extraction (timeToMs calls) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K timestamps | 1.0x | 1.14ms | 0.10MB |
| extract 10K timestamps | 10.9x | 12.46ms | 0.98MB |
| extract 100K timestamps | 154.6x | 176.41ms | 9.54MB |

#### logParser Performance > parseAllHttpRequests

| logParser Performance > parseAllHttpRequests | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.54ms | -11.94MB |
| medium (10K lines) | 10.9x | 27.65ms | 0.62MB |
| large (100K lines) | 143.7x | 365.29ms | -59.28MB |

#### logParser Performance > parseLogFile

| logParser Performance > parseLogFile | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.60ms | 1.50MB |
| medium (10K lines) | 11.3x | 29.21ms | 0.77MB |
| large (100K lines) | 139.6x | 362.20ms | -56.42MB |

#### LogsView Performance > Time extraction only (time-critical path)

| LogsView Performance > Time extraction only (time-critical path) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K times | 1.0x | 1.15ms | 0.10MB |
| extract 10K times | 10.9x | 12.60ms | 0.94MB |
| extract 100K times | 153.4x | 176.59ms | 9.59MB |

#### LogsView Performance > Time range filtering

| LogsView Performance > Time range filtering | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.97ms | 0.74MB |
| medium (10K lines) | 11.4x | 22.46ms | 6.97MB |
| large (100K lines) | 157.8x | 311.30ms | 45.77MB |

#### LogsView Performance > Timestamp conversion (isoToTime)

| LogsView Performance > Timestamp conversion (isoToTime) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| convert 1K timestamps | 1.0x | 1.13ms | 0.00MB |
| convert 10K timestamps | 10.4x | 11.85ms | 0.00MB |
| convert 100K timestamps | 148.3x | 168.19ms | 0.01MB |


Report generated successfully
