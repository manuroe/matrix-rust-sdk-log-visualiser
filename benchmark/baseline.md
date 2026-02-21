### Performance Comparison

**Baseline**: none
**Threshold**: 10% regression

#### LogActivityChart Performance > Data aggregation (chartData useMemo)

| LogActivityChart Performance > Data aggregation (chartData useMemo) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.32ms | 0.26MB |
| medium (10K lines) | 9.8x | 12.97ms | 1.74MB |
| large (100K lines) | 141.2x | 186.71ms | 4.68MB |

#### LogActivityChart Performance > Time extraction (timeToMs calls)

| LogActivityChart Performance > Time extraction (timeToMs calls) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K timestamps | 1.0x | 1.12ms | 0.10MB |
| extract 10K timestamps | 10.8x | 12.05ms | 1.03MB |
| extract 100K timestamps | 156.6x | 175.29ms | 9.75MB |

#### logParser Performance > parseAllHttpRequests

| logParser Performance > parseAllHttpRequests | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.53ms | -11.98MB |
| medium (10K lines) | 10.9x | 27.63ms | 0.62MB |
| large (100K lines) | 137.7x | 348.71ms | -59.24MB |

#### logParser Performance > parseLogFile

| logParser Performance > parseLogFile | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.59ms | 1.30MB |
| medium (10K lines) | 10.9x | 28.13ms | 0.93MB |
| large (100K lines) | 138.3x | 357.69ms | -58.82MB |

#### LogsView Performance > Time extraction only (time-critical path)

| LogsView Performance > Time extraction only (time-critical path) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K times | 1.0x | 1.13ms | 0.10MB |
| extract 10K times | 11.0x | 12.46ms | 1.13MB |
| extract 100K times | 153.7x | 174.20ms | 9.54MB |

#### LogsView Performance > Time range filtering

| LogsView Performance > Time range filtering | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 1.94ms | 0.79MB |
| medium (10K lines) | 11.3x | 21.84ms | 6.89MB |
| large (100K lines) | 142.0x | 275.61ms | 46.23MB |

#### LogsView Performance > Timestamp conversion (isoToTime)

| LogsView Performance > Timestamp conversion (isoToTime) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| convert 1K timestamps | 1.0x | 1.10ms | 0.00MB |
| convert 10K timestamps | 10.5x | 11.56ms | 0.00MB |
| convert 100K timestamps | 151.7x | 166.93ms | 0.03MB |


Report generated successfully
