### Performance Comparison

**Baseline**: none
**Threshold**: 10% regression

#### LogActivityChart Performance > Data aggregation (chartData useMemo)

| LogActivityChart Performance > Data aggregation (chartData useMemo) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 0.96ms | 0.20MB |
| medium (10K lines) | 9.3x | 8.93ms | 1.33MB |
| large (100K lines) | 156.1x | 150.06ms | 4.04MB |

#### LogActivityChart Performance > Time extraction (timeToMs calls)

| LogActivityChart Performance > Time extraction (timeToMs calls) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K timestamps | 1.0x | 0.83ms | 0.10MB |
| extract 10K timestamps | 10.4x | 8.61ms | 0.99MB |
| extract 100K timestamps | 174.4x | 143.99ms | 4.91MB |

#### logParser Performance > parseAllHttpRequests

| logParser Performance > parseAllHttpRequests | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.14ms | 1.48MB |
| medium (10K lines) | 10.8x | 23.24ms | 1.71MB |
| large (100K lines) | 145.8x | 312.55ms | -67.62MB |

#### logParser Performance > parseLogFile

| logParser Performance > parseLogFile | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 2.28ms | 1.50MB |
| medium (10K lines) | 10.3x | 23.34ms | 2.49MB |
| large (100K lines) | 141.0x | 321.07ms | 32.98MB |

#### LogsView Performance > Time extraction only (time-critical path)

| LogsView Performance > Time extraction only (time-critical path) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| extract 1K times | 1.0x | 0.84ms | 0.10MB |
| extract 10K times | 10.5x | 8.75ms | 0.95MB |
| extract 100K times | 172.4x | 143.98ms | 2.96MB |

#### LogsView Performance > Time range filtering

| LogsView Performance > Time range filtering | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| small (1K lines) | 1.0x | 0.88ms | 0.13MB |
| medium (10K lines) | 10.3x | 9.10ms | 1.26MB |
| large (100K lines) | 168.8x | 149.12ms | 1.82MB |

#### LogsView Performance > Timestamp conversion (isoToTime)

| LogsView Performance > Timestamp conversion (isoToTime) | Scaling | Time (ms) | Memory (MB) |
| --- | --- | --- | --- |
| convert 1K timestamps | 1.0x | 0.80ms | 0.00MB |
| convert 10K timestamps | 10.4x | 8.33ms | 0.00MB |
| convert 100K timestamps | 171.5x | 136.66ms | 0.00MB |


✅ **Report generated**
