let allRequests = [];
let filteredRequests = [];
let expandedRows = new Set();

// Regex patterns for parsing log lines (ported from Python)
const RESP_RE = /send\{request_id="(?<id>[^"]+)"\s+method=(?<method>\S+)\s+uri="(?<uri>[^"]+\/sync[^"]*)"\s+request_size="(?<req_size>[^"]+)"\s+status=(?<status>\S+)\s+response_size="(?<resp_size>[^"]+)"\s+request_duration=(?<duration_val>[0-9.]+)(?<duration_unit>ms|s)/;
const SEND_RE = /send\{request_id="(?<id>[^"]+)"\s+method=(?<method>\S+)\s+uri="(?<uri>[^"]+\/sync[^"]*)"\s+request_size="(?<req_size>[^"]+)"(?![^}]*(?:status=|response_size=|request_duration=))/;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupDropZone();
    setupEventListeners();
});

function setupDropZone() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    // Click to browse
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });
}

function setupEventListeners() {
    document.getElementById('conn-filter').addEventListener('change', filterRequests);
    document.getElementById('hide-pending').addEventListener('change', filterRequests);
    document.getElementById('export-csv').addEventListener('click', exportCSV);
    document.getElementById('load-new-file').addEventListener('click', () => {
        document.getElementById('app').classList.add('hidden');
        document.getElementById('drop-zone').classList.remove('hidden');
        allRequests = [];
        filteredRequests = [];
        expandedRows.clear();
    });
}

function handleFile(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const logContent = e.target.result;
            parseLogFile(logContent);
            
            // Hide drop zone, show app
            document.getElementById('drop-zone').classList.add('hidden');
            document.getElementById('app').classList.remove('hidden');
            
            populateConnIdFilter();
            filterRequests();
        } catch (error) {
            console.error('Error parsing log file:', error);
            alert('Error parsing log file. Please make sure it\'s a valid Matrix SDK log file.');
        }
    };
    
    reader.onerror = () => {
        alert('Error reading file. Please try again.');
    };
    
    reader.readAsText(file, 'UTF-8');
}

function parseLogFile(logContent) {
    const lines = logContent.split('\n');
    const records = new Map();
    
    for (const line of lines) {
        // Early filter for performance
        if (!line.includes('/sync') || !line.includes('request_id=')) {
            continue;
        }
        
        // Extract timestamp (position 11+, format: HH:MM:SS.microseconds)
        const timeMatch = line.slice(11).match(/(\d{2}:\d{2}:\d{2}\.\d+)Z/);
        const timeStr = timeMatch ? timeMatch[1] : null;
        
        // Extract conn_id
        const connMatch = line.match(/conn_id="([^"]+)"/);
        const connId = connMatch ? connMatch[1] : '';
        
        // Try to match response pattern first
        const respMatch = line.match(RESP_RE);
        if (respMatch) {
            const requestId = respMatch.groups.id;
            const durationVal = parseFloat(respMatch.groups.duration_val);
            const durationUnit = respMatch.groups.duration_unit;
            const durationMs = Math.round(durationVal * (durationUnit === 's' ? 1000.0 : 1.0));
            
            if (!records.has(requestId)) {
                records.set(requestId, {});
            }
            
            const rec = records.get(requestId);
            rec.request_id = requestId;
            rec.response_time = rec.response_time || timeStr;
            rec.method = rec.method || respMatch.groups.method;
            rec.uri = rec.uri || respMatch.groups.uri;
            rec.conn_id = rec.conn_id || connId;
            rec.status = rec.status || respMatch.groups.status;
            rec.response_size = rec.response_size || respMatch.groups.resp_size;
            rec.request_size = rec.request_size || respMatch.groups.req_size;
            rec.request_duration_ms = rec.request_duration_ms || durationMs;
            rec.response_line = line;
            continue;
        }
        
        // Try to match send pattern
        const sendMatch = line.match(SEND_RE);
        if (sendMatch) {
            const requestId = sendMatch.groups.id;
            
            if (!records.has(requestId)) {
                records.set(requestId, {});
            }
            
            const rec = records.get(requestId);
            rec.request_id = requestId;
            rec.request_time = rec.request_time || timeStr;
            rec.method = rec.method || sendMatch.groups.method;
            rec.uri = rec.uri || sendMatch.groups.uri;
            rec.conn_id = rec.conn_id || connId;
            rec.request_size = rec.request_size || sendMatch.groups.req_size;
            rec.send_line = line;
        }
    }
    
    // Filter and convert to array
    allRequests = Array.from(records.values()).filter(rec => 
        rec.uri && rec.uri.includes('/sync') && (rec.send_line || rec.response_line)
    );
    
    // Fill in missing fields with empty strings
    allRequests.forEach(rec => {
        rec.request_time = rec.request_time || '';
        rec.response_time = rec.response_time || '';
        rec.method = rec.method || '';
        rec.uri = rec.uri || '';
        rec.conn_id = rec.conn_id || '';
        rec.status = rec.status || '';
        rec.request_size = rec.request_size || '';
        rec.response_size = rec.response_size || '';
        rec.request_duration_ms = rec.request_duration_ms || '';
        rec.send_line = rec.send_line || '';
        rec.response_line = rec.response_line || '';
    });
}

function populateConnIdFilter() {
    const connIds = [...new Set(allRequests
        .map(r => r.conn_id)
        .filter(c => c))];

    const select = document.getElementById('conn-filter');
    select.innerHTML = '';
    connIds.forEach(connId => {
        const option = document.createElement('option');
        option.value = connId;
        option.textContent = connId;
        select.appendChild(option);
    });

    const defaultConn = connIds.includes('room-list') ? 'room-list' : (connIds[0] || '');
    select.value = defaultConn;
}

function filterRequests() {
    const connFilter = document.getElementById('conn-filter').value;
    const hidePending = document.getElementById('hide-pending').checked;
    const totalForConn = allRequests.filter(r => !connFilter || r.conn_id === connFilter).length;
    filteredRequests = allRequests.filter(r => 
        (!connFilter || r.conn_id === connFilter) && (!hidePending || r.status)
    );
    renderTimeline(totalForConn);
}

function renderTimeline(totalForConn) {
    const container = document.getElementById('timeline-content');
    const totalCountEl = document.getElementById('total-count');
    if (typeof totalForConn === 'number') {
        totalCountEl.textContent = totalForConn;
    } else {
        totalCountEl.textContent = allRequests.length;
    }
    document.getElementById('shown-count').textContent = filteredRequests.length;

    if (filteredRequests.length === 0) {
        container.innerHTML = '<div class="no-data">No sync requests found in log file</div>';
        return;
    }

    // Calculate timeline scale
    const times = filteredRequests
        .map(r => r.request_time)
        .filter(t => t)
        .map(timeToMs);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const totalDuration = Math.max(1, maxTime - minTime);

    container.innerHTML = filteredRequests.map((req, idx) => {
        const reqTime = timeToMs(req.request_time);
        const respTime = timeToMs(req.response_time);
        const hasPending = !req.response_time;
        const isPending = !req.status;

        const relStart = ((reqTime - minTime) / totalDuration) * 100;
        const relDuration = req.request_duration_ms 
            ? Math.min(100, (parseFloat(req.request_duration_ms) / totalDuration) * 100) 
            : 2;

        const status = req.status ? req.status : 'Pending';
        const statusClass = isPending ? 'pending' : (req.status === '200' ? 'success' : 'error');

        const rowId = `row-${req.request_id}`;
        const detailsId = `details-${req.request_id}`;

        return `
            <div class="request-row ${expandedRows.has(req.request_id) ? 'expanded' : ''} ${isPending ? 'pending' : ''}" 
                 onclick="toggleDetails('${req.request_id}', '${detailsId}')" 
                 id="${rowId}">
                <div class="request-id">${escapeHtml(req.request_id)}</div>
                <div class="time">${escapeHtml(req.request_time)}</div>
                <div class="status ${statusClass}">${escapeHtml(status)}</div>
                <div class="size">${escapeHtml(req.request_size) || '-'}</div>
                <div class="size">${escapeHtml(req.response_size) || '-'}</div>
                <div class="waterfall">
                    <div class="waterfall-bar ${isPending ? 'pending' : ''}" 
                         style="left: ${relStart}%; width: ${Math.max(relDuration, 2)}%; min-width: 40px;"
                         title="${req.request_duration_ms || '...'}ms">
                        ${req.request_duration_ms ? req.request_duration_ms + 'ms' : '...'}
                    </div>
                </div>
            </div>
            <div class="details-row" id="${detailsId}">
                <div class="details-content">
                    <div class="detail-section">
                        <h4>Request Details</h4>
                        <div class="detail-item">
                            <span class="detail-label">Request ID</span>
                            <span class="detail-value">${escapeHtml(req.request_id)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Method</span>
                            <span class="detail-value">${escapeHtml(req.method)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Request Time</span>
                            <span class="detail-value">${escapeHtml(req.request_time)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Request Size</span>
                            <span class="detail-value">${escapeHtml(req.request_size)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Stream</span>
                            <span class="detail-value">${escapeHtml(req.conn_id)}</span>
                        </div>
                    </div>
                    <div class="detail-section">
                        <h4>Response Details</h4>
                        <div class="detail-item">
                            <span class="detail-label">Status</span>
                            <span class="detail-value">${escapeHtml(req.status || 'Pending')}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Response Time</span>
                            <span class="detail-value">${escapeHtml(req.response_time) || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Response Size</span>
                            <span class="detail-value">${escapeHtml(req.response_size) || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Duration</span>
                            <span class="detail-value">${req.request_duration_ms ? req.request_duration_ms + 'ms' : '-'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function timeToMs(timeStr) {
    if (!timeStr) return 0;
    const [h, m, s] = timeStr.split(':').map(parseFloat);
    return h * 3600000 + m * 60000 + s * 1000;
}

function toggleDetails(requestId, detailsId) {
    if (expandedRows.has(requestId)) {
        expandedRows.delete(requestId);
    } else {
        expandedRows.add(requestId);
    }
    renderTimeline();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function exportCSV() {
    if (allRequests.length === 0) {
        alert('No data to export');
        return;
    }
    
    // CSV headers (same as Python script output)
    const headers = [
        'request_id',
        'request_time',
        'response_time',
        'method',
        'uri',
        'conn_id',
        'status',
        'request_size',
        'response_size',
        'request_duration_ms',
        'send_line',
        'response_line'
    ];
    
    // Build CSV content
    let csv = headers.join(',') + '\n';
    
    allRequests.forEach(req => {
        const row = headers.map(h => {
            const value = req[h] || '';
            // Escape quotes and wrap in quotes if contains comma or newline
            if (value.includes(',') || value.includes('\n') || value.includes('"')) {
                return '"' + value.replace(/"/g, '""') + '"';
            }
            return value;
        });
        csv += row.join(',') + '\n';
    });
    
    // Create download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'sync_requests.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
