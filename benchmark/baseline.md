### Performance Comparison

**Baseline**: none
**Threshold**: 10% regression

#### LogActivityChart Performance > Data aggregation (chartData useMemo)

| LogActivityChart Performance > Data aggregation (chartData useMemo) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.35ms | 0.26MB |
| medium (10K lines) | 9.8x | 13.21ms | 1.78MB |
| large (100K lines) | 138.5x | 187.51ms | 4.66MB |

#### LogActivityChart Performance > Time extraction (timeToMs calls)

| LogActivityChart Performance > Time extraction (timeToMs calls) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K timestamps | 1.0x | 1.12ms | 0.10MB |
| extract 10K timestamps | 11.1x | 12.45ms | 0.94MB |
| extract 100K timestamps | 158.9x | 177.94ms | 9.54MB |

#### logParser Performance > parseAllHttpRequests

| logParser Performance > parseAllHttpRequests | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.54ms | -11.92MB |
| medium (10K lines) | 11.3x | 28.73ms | 0.63MB |
| large (100K lines) | 141.9x | 360.67ms | -59.15MB |

#### logParser Performance > parseLogFile

| logParser Performance > parseLogFile | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.67ms | 1.30MB |
| medium (10K lines) | 10.8x | 28.92ms | 0.78MB |
| large (100K lines) | 137.2x | 365.72ms | -56.13MB |

#### LogsView Performance > Time extraction only (time-critical path)

| LogsView Performance > Time extraction only (time-critical path) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K times | 1.0x | 1.16ms | 0.10MB |
| extract 10K times | 11.1x | 12.90ms | 0.95MB |
| extract 100K times | 155.6x | 181.22ms | 9.56MB |

#### LogsView Performance > Time range filtering

| LogsView Performance > Time range filtering | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.97ms | 0.84MB |
| medium (10K lines) | 11.6x | 22.80ms | 6.84MB |
| large (100K lines) | 145.9x | 287.64ms | 45.89MB |

#### LogsView Performance > Timestamp conversion (isoToTime)

| LogsView Performance > Timestamp conversion (isoToTime) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| convert 1K timestamps | 1.0x | 1.12ms | 0.00MB |
| convert 10K timestamps | 10.6x | 11.79ms | 0.00MB |
| convert 100K timestamps | 151.1x | 168.79ms | 0.01MB |


Report generated successfully
