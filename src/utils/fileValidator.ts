/**
 * File validation utilities for text and gzip files
 */

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const WARN_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const GZIP_MAGIC_NUMBER_0 = 0x1f;
const GZIP_MAGIC_NUMBER_1 = 0x8b;

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings: string[];
  encoding?: string;
}

/**
 * Detects BOM (Byte Order Mark) and returns encoding, or undefined if none found
 */
function detectBOM(bytes: Uint8Array): string | undefined {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return 'utf-8-bom';
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return 'utf-16-le';
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return 'utf-16-be';
  }
  return undefined;
}

/**
 * Strips BOM from bytes and returns the remainder
 */
function stripBOM(bytes: Uint8Array): Uint8Array {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return bytes.slice(3); // UTF-8 BOM
  }
  if (bytes.length >= 2 && (bytes[0] === 0xff || bytes[0] === 0xfe)) {
    return bytes.slice(2); // UTF-16 BOM
  }
  return bytes;
}

/**
 * Validates UTF-8 encoding with strict or lenient mode
 */
function validateUTF8(bytes: Uint8Array, strict: boolean = true): { valid: boolean; error?: Error } {
  try {
    new TextDecoder('utf-8', { fatal: strict }).decode(bytes);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error as Error };
  }
}

/**
 * Detects null bytes (strong indicator of binary data)
 */
function hasNullBytes(bytes: Uint8Array): boolean {
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x00) {
      return true;
    }
  }
  return false;
}

/**
 * Validates gzip file header (magic number check)
 */
export function isValidGzipHeader(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === GZIP_MAGIC_NUMBER_0 && bytes[1] === GZIP_MAGIC_NUMBER_1;
}

/**
 * Validates that a byte sequence is valid text (UTF-8 or ISO-8859-1 as fallback)
 */
export function isValidTextContent(bytes: Uint8Array): ValidationResult {
  const warnings: string[] = [];

  // Check for null bytes (strong binary indicator)
  if (hasNullBytes(bytes)) {
    return {
      isValid: false,
      error: 'Contains binary data (null bytes detected)',
      warnings,
    };
  }

  // Detect BOM
  const bomEncoding = detectBOM(bytes);
  const bytesToValidate = stripBOM(bytes);

  // Strict UTF-8 validation
  const utf8Validation = validateUTF8(bytesToValidate, true);
  if (utf8Validation.valid) {
    return {
      isValid: true,
      warnings,
      encoding: bomEncoding || 'utf-8',
    };
  }

  // Lenient UTF-8 validation (allows invalid sequences)
  const lenientValidation = validateUTF8(bytesToValidate, false);
  if (lenientValidation.valid) {
    warnings.push('File contains invalid UTF-8 sequences (will be decoded with lossy conversion)');
    return {
      isValid: true,
      warnings,
      encoding: bomEncoding || 'utf-8',
    };
  }

  // Try ISO-8859-1 as fallback
  try {
    // ISO-8859-1 can decode any byte sequence (0x00-0xFF all valid)
    new TextDecoder('iso-8859-1').decode(bytesToValidate);
    warnings.push('File is encoded in ISO-8859-1, not UTF-8 (will be re-encoded as UTF-8)');
    return {
      isValid: true,
      warnings,
      encoding: 'iso-8859-1',
    };
  } catch {
    // Fallback failed (shouldn't happen for ISO-8859-1)
    return {
      isValid: false,
      error: 'File contains invalid text encoding (not UTF-8 or ISO-8859-1)',
      warnings,
    };
  }
}

/**
 * Decodes bytes using detected encoding with fallback
 */
export function decodeTextBytes(bytes: Uint8Array, encoding?: string): string {
  // Strip BOM
  const bytesToDecode = stripBOM(bytes);

  if (encoding === 'iso-8859-1') {
    return new TextDecoder('iso-8859-1').decode(bytesToDecode);
  }

  // Default to UTF-8 with lenient mode to avoid decode errors
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytesToDecode);
  } catch {
    // Fallback to lenient UTF-8
    return new TextDecoder('utf-8', { fatal: false }).decode(bytesToDecode);
  }
}

/**
 * Validates plain text file content
 */
export async function validateTextFile(file: File): Promise<ValidationResult> {
  const warnings: string[] = [];

  // Check file size
  if (file.size === 0) {
    return { isValid: true, warnings, encoding: 'utf-8' }; // Empty files are ok
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 500MB.`,
      warnings,
    };
  }

  if (file.size > WARN_FILE_SIZE) {
    warnings.push(
      `Large file (${(file.size / 1024 / 1024).toFixed(1)}MB). Processing may take a moment.`
    );
  }

  // Read first 1KB to validate encoding
  const headerBlob = file.slice(0, 1024);
  const headerBuffer = await readBlob(headerBlob);
  const headerUint8 = new Uint8Array(headerBuffer);

  return isValidTextContent(headerUint8);
}

/**
 * Validates gzip file: checks magic number and samples decompressed content
 */
export async function validateGzipFile(
  file: File,
  decompressSync: (data: Uint8Array) => Uint8Array
): Promise<ValidationResult> {
  const warnings: string[] = [];

  // Check file size
  if (file.size === 0) {
    return {
      isValid: false,
      error: 'Gzip file is empty',
      warnings,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 500MB.`,
      warnings,
    };
  }

  if (file.size > WARN_FILE_SIZE) {
    warnings.push(
      `Large file (${(file.size / 1024 / 1024).toFixed(1)}MB). Processing may take a moment.`
    );
  }

  // Read entire gzip file to check header and decompress
  const fileBuffer = await readBlob(file);
  const compressedUint8 = new Uint8Array(fileBuffer);

  // Validate gzip header (magic number)
  if (!isValidGzipHeader(compressedUint8)) {
    return {
      isValid: false,
      error: 'Not a valid gzip file (invalid header)',
      warnings,
    };
  }

  // Try to decompress
  let decompressedUint8: Uint8Array;
  try {
    decompressedUint8 = decompressSync(compressedUint8);
  } catch (error) {
    return {
      isValid: false,
      error: `Failed to decompress gzip file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      warnings,
    };
  }

  // Validate decompressed content (sample first 1KB)
  const sampleSize = Math.min(1024, decompressedUint8.length);
  const sample = decompressedUint8.slice(0, sampleSize);
  const contentValidation = isValidTextContent(sample);

  // Combine warnings
  return {
    ...contentValidation,
    warnings: [...warnings, ...contentValidation.warnings],
  };
}

/**
 * Helper: Read blob as ArrayBuffer
 */
function readBlob(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (result instanceof ArrayBuffer) {
        resolve(result);
      } else {
        reject(new Error('Failed to read blob as ArrayBuffer'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(blob);
  });
}
