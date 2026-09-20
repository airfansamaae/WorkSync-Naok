import JSZip from 'jszip';

export interface DocxParsedRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  fontSizePt?: number;
}

export interface DocxParsedParagraph {
  type: 'paragraph';
  align: 'left' | 'center' | 'right' | 'justify';
  runs: DocxParsedRun[];
  imageSrc?: string | null;
  isPageBreak?: boolean;
  isIndented?: boolean;
}

export interface DocxParsedTableCell {
  text: string;
  runs: DocxParsedRun[];
  align?: 'left' | 'center' | 'right' | 'justify';
  bgColor?: string;
  bold?: boolean;
  fontSizePt?: number;
  colSpan?: number;
  rowSpan?: number;
}

export interface DocxParsedTableRow {
  cells: DocxParsedTableCell[];
  isHeader?: boolean;
}

export interface DocxParsedTable {
  type: 'table';
  rows: (string[] | DocxParsedTableCell[])[];
  tableRows?: DocxParsedTableRow[];
  borderColors?: {
    outer?: string;
    inner?: string;
  };
}

export interface DocxParsedImage {
  type: 'image';
  dataUrl: string;
  alt?: string;
}

export type DocxElement = DocxParsedParagraph | DocxParsedTable | DocxParsedImage;

export interface DocxParsedPage {
  pageNumber: number;
  elements: DocxElement[];
}

export interface DocxParseResult {
  pages: DocxParsedPage[];
  totalPages: number;
  rawText: string;
}

/**
 * Parses any DOCX file (Uint8Array, ArrayBuffer, or base64 Data URL)
 * directly into authentic structured A4 pages.
 * 100% deterministic, never hangs, never spins indefinitely.
 */
export async function parseDocxBinary(
  input: Uint8Array | ArrayBuffer | string
): Promise<DocxParseResult> {
  try {
    let data: Uint8Array | ArrayBuffer;
    if (typeof input === 'string') {
      let b64 = input;
      if (input.includes(';base64,')) {
        b64 = input.split(';base64,')[1];
      }
      const raw = atob(b64.trim());
      const u8 = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) {
        u8[i] = raw.charCodeAt(i);
      }
      data = u8;
    } else {
      data = input;
    }

    let zip: JSZip | null = null;
    try {
      zip = await JSZip.loadAsync(data);
    } catch {
      zip = null;
    }

    const docXmlFile = zip ? zip.file('word/document.xml') : null;
    if (!docXmlFile) {
      // Fallback: Check if file is HTML disguised as .doc (common in school MIS exports) or RTF or plain text
      return parseNonDocxDocument(data);
    }

    const xml = await docXmlFile.async('text');

    // Extract embedded media images
    const mediaMap: Record<string, string> = {};
    const relsFile = zip.file('word/_rels/document.xml.rels');
    if (relsFile) {
      try {
        const relsXml = await relsFile.async('text');
        const relRegex = /<Relationship\s+[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g;
        let rMatch: RegExpExecArray | null;
        while ((rMatch = relRegex.exec(relsXml)) !== null) {
          const id = rMatch[1];
          let target = rMatch[2];
          if (!target.startsWith('media/') && !target.startsWith('word/media/')) {
            target = 'media/' + target.replace(/^(\.\.\/)+/, '');
          }
          const zipPath = target.startsWith('word/') ? target : 'word/' + target;
          const mFile = zip.file(zipPath);
          if (mFile) {
            const mB64 = await mFile.async('base64');
            const ext = zipPath.split('.').pop() || 'png';
            mediaMap[id] = `data:image/${ext};base64,${mB64}`;
          }
        }
      } catch (e) {
        console.warn('Could not parse rels:', e);
      }
    }

    // Clean comments
    const cleanXml = xml.replace(/<!--[\s\S]*?-->/g, '');
    const bodyMatch = cleanXml.match(/<w:body(?:\s+[^>]*)?>([\s\S]*?)<\/w:body>/);
    if (!bodyMatch) {
      return { pages: [], totalPages: 0, rawText: '' };
    }
    const bodyXml = bodyMatch[1];

    const elements: DocxElement[] = [];
    let rawText = '';

    // Regex to scan body elements (w:p and w:tbl) in natural document order
    const elemRegex = /<(w:p|w:tbl)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>/g;
    let match: RegExpExecArray | null;

    while ((match = elemRegex.exec(bodyXml)) !== null) {
      const tag = match[1];
      const content = match[2];

      if (tag === 'w:p') {
        const isBreak = /<w:br\s+[^>]*w:type="page"/.test(content) || /<w:lastRenderedPageBreak\s*\/>/.test(content);
        const jcMatch = content.match(/<w:jc\s+[^>]*w:val="([^"]+)"/);
        let align: 'left' | 'center' | 'right' | 'justify' = 'left';
        if (jcMatch) {
          if (jcMatch[1] === 'center') align = 'center';
          else if (jcMatch[1] === 'right') align = 'right';
          else if (jcMatch[1] === 'both') align = 'justify';
        }
        const isIndented = /<w:ind\s+[^>]*(?:w:firstLine|w:left)="([1-9]\d*)"/.test(content);

        // Image check
        let imageSrc: string | null = null;
        const imgMatch = content.match(/r:embed="([^"]+)"/);
        if (imgMatch && mediaMap[imgMatch[1]]) {
          imageSrc = mediaMap[imgMatch[1]];
        }

        const runs: DocxParsedRun[] = [];
        const runRegex = /<w:r(?:\s+[^>]*)?>([\s\S]*?)<\/w:r>/g;
        let rMatch: RegExpExecArray | null;

        while ((rMatch = runRegex.exec(content)) !== null) {
          const rContent = rMatch[1];
          const isBold = /<w:b(?:\s*\/|\s+[^>]*\/)?>/.test(rContent);
          const isItalic = /<w:i(?:\s*\/|\s+[^>]*\/)?>/.test(rContent);
          const isUnderline = /<w:u(?:\s*\/|\s+[^>]*\/)?>/.test(rContent);
          const colorMatch = rContent.match(/<w:color\s+[^>]*w:val="([^"]+)"/);
          const szMatch = rContent.match(/<w:sz\s+[^>]*w:val="([^"]+)"/);
          const fontSizePt = szMatch ? Math.round(parseInt(szMatch[1], 10) / 2) : 16;

          const tMatch = rContent.match(/<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/);
          if (tMatch) {
            const text = tMatch[1]
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&apos;/g, "'");
            runs.push({
              text,
              bold: isBold,
              italic: isItalic,
              underline: isUnderline,
              color: colorMatch ? `#${colorMatch[1]}` : undefined,
              fontSizePt
            });
            rawText += text + ' ';
          }
        }

        if (runs.length > 0 || isBreak || imageSrc) {
          elements.push({
            type: 'paragraph',
            align,
            runs,
            imageSrc,
            isPageBreak: isBreak,
            isIndented
          });
          rawText += '\n';
        }
      } else if (tag === 'w:tbl') {
        const rows: string[][] = [];
        const tableRows: DocxParsedTableRow[] = [];

        // Parse table borders
        let outerBorderColor = '#475569';
        let innerBorderColor = '#94A3B8';
        const borderTopMatch = content.match(/<w:top\s+[^>]*w:color="([^"]+)"/);
        if (borderTopMatch && borderTopMatch[1] && borderTopMatch[1].toLowerCase() !== 'auto') {
          outerBorderColor = `#${borderTopMatch[1]}`;
        }
        const insideHMatch = content.match(/<w:insideH\s+[^>]*w:color="([^"]+)"/);
        if (insideHMatch && insideHMatch[1] && insideHMatch[1].toLowerCase() !== 'auto') {
          innerBorderColor = `#${insideHMatch[1]}`;
        }

        const trRegex = /<w:tr(?:\s+[^>]*)?>([\s\S]*?)<\/w:tr>/g;
        let trMatch: RegExpExecArray | null;

        while ((trMatch = trRegex.exec(content)) !== null) {
          const trContent = trMatch[1];
          const isHeaderRow = /<w:tblHeader\s*\/>/.test(trContent) || tableRows.length === 0;
          const parsedCells: DocxParsedTableCell[] = [];
          const stringCells: string[] = [];

          const tcRegex = /<w:tc(?:\s+[^>]*)?>([\s\S]*?)<\/w:tc>/g;
          let tcMatch: RegExpExecArray | null;

          while ((tcMatch = tcRegex.exec(trContent)) !== null) {
            const tcContent = tcMatch[1];

            // Background color from w:tcPr -> w:shd
            let bgColor: string | undefined;
            const shdMatch = tcContent.match(/<w:shd\s+[^>]*w:fill="([^"]+)"/);
            if (shdMatch && shdMatch[1]) {
              const fillVal = shdMatch[1].trim();
              if (fillVal.toLowerCase() !== 'auto' && fillVal.toLowerCase() !== 'clear' && fillVal.toLowerCase() !== 'none') {
                bgColor = fillVal.startsWith('#') ? fillVal : `#${fillVal}`;
              }
            }

            // ColSpan from w:gridSpan
            let colSpan: number | undefined;
            const gridSpanMatch = tcContent.match(/<w:gridSpan\s+[^>]*w:val="(\d+)"/);
            if (gridSpanMatch) {
              colSpan = parseInt(gridSpanMatch[1], 10);
            }

            // Cell paragraph alignment
            let cellAlign: 'left' | 'center' | 'right' | 'justify' | undefined;
            const jcMatch = tcContent.match(/<w:jc\s+[^>]*w:val="([^"]+)"/);
            if (jcMatch) {
              const val = jcMatch[1];
              if (val === 'center') cellAlign = 'center';
              else if (val === 'right') cellAlign = 'right';
              else if (val === 'both') cellAlign = 'justify';
              else cellAlign = 'left';
            }

            // Extract runs from cell
            const cellRuns: DocxParsedRun[] = [];
            const runRegex = /<w:r(?:\s+[^>]*)?>([\s\S]*?)<\/w:r>/g;
            let rMatch: RegExpExecArray | null;
            let cellText = '';
            let hasBold = false;
            let maxFontSize = isHeaderRow ? 14 : 13;

            while ((rMatch = runRegex.exec(tcContent)) !== null) {
              const rContent = rMatch[1];
              const isBold = /<w:b(?:\s*\/|\s+[^>]*\/)?>/.test(rContent);
              if (isBold) hasBold = true;
              const isItalic = /<w:i(?:\s*\/|\s+[^>]*\/)?>/.test(rContent);
              const isUnderline = /<w:u(?:\s*\/|\s+[^>]*\/)?>/.test(rContent);
              const colorMatch = rContent.match(/<w:color\s+[^>]*w:val="([^"]+)"/);
              const szMatch = rContent.match(/<w:sz\s+[^>]*w:val="([^"]+)"/);
              const fontSizePt = szMatch ? Math.round(parseInt(szMatch[1], 10) / 2) : undefined;
              if (fontSizePt && fontSizePt > maxFontSize) maxFontSize = fontSizePt;

              const tMatch = rContent.match(/<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/);
              if (tMatch) {
                const text = tMatch[1]
                  .replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/&quot;/g, '"')
                  .replace(/&apos;/g, "'");
                cellRuns.push({
                  text,
                  bold: isBold,
                  italic: isItalic,
                  underline: isUnderline,
                  color: colorMatch ? `#${colorMatch[1]}` : undefined,
                  fontSizePt
                });
                cellText += text;
              }
            }

            // Fallback if no <w:r> found but text exists
            if (!cellText) {
              cellText = tcContent
                .replace(/<w:p(?:\s+[^>]*)?>/g, '\n')
                .replace(/<[^>]+>/g, '')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&apos;/g, "'")
                .trim();
            }

            parsedCells.push({
              text: cellText,
              runs: cellRuns.length > 0 ? cellRuns : [{ text: cellText, bold: hasBold || isHeaderRow, fontSizePt: maxFontSize }],
              align: cellAlign || (isHeaderRow ? 'center' : 'left'),
              bgColor,
              bold: hasBold || isHeaderRow,
              fontSizePt: maxFontSize,
              colSpan
            });

            stringCells.push(cellText);
            rawText += cellText + '\t';
          }

          if (parsedCells.length > 0) {
            tableRows.push({
              cells: parsedCells,
              isHeader: isHeaderRow
            });
            rows.push(stringCells);
            rawText += '\n';
          }
        }

        if (tableRows.length > 0) {
          elements.push({
            type: 'table',
            rows,
            tableRows,
            borderColors: {
              outer: outerBorderColor,
              inner: innerBorderColor
            }
          });
        }
      }
    }

    // Paginate into realistic A4 pages
    // Standard A4 paper in TH Sarabun 16pt accommodates ~28-35 lines per page.
    // Explicit page breaks (<w:br w:type="page"/> or <w:lastRenderedPageBreak/>) take precedence.
    const pages: DocxParsedPage[] = [];
    let currentPage: DocxParsedPage = { pageNumber: 1, elements: [] };
    let currentCostOnPage = 0;
    const maxCostPerPage = 28;

    for (const el of elements) {
      const isBreak = el.type === 'paragraph' && el.isPageBreak;
      if (isBreak && currentPage.elements.length > 0) {
        pages.push(currentPage);
        currentPage = { pageNumber: pages.length + 1, elements: [] };
        currentCostOnPage = 0;
      }

      currentPage.elements.push(el);
      
      let cost = 1;
      if (el.type === 'table') {
        cost = Math.max(3, Math.min(el.rows ? el.rows.length : 3, 20));
      } else if (el.type === 'paragraph') {
        const textLen = el.runs.reduce((acc, r) => acc + (r.text?.length || 0), 0);
        if (textLen === 0) {
          cost = 0.5; // blank line takes small vertical space
        } else {
          cost = Math.max(1, Math.ceil(textLen / 90)); // ~90 chars per TH Sarabun A4 line
        }
      }

      currentCostOnPage += cost;

      if (currentCostOnPage >= maxCostPerPage) {
        pages.push(currentPage);
        currentPage = { pageNumber: pages.length + 1, elements: [] };
        currentCostOnPage = 0;
      }
    }

    if (currentPage.elements.length > 0 || pages.length === 0) {
      pages.push(currentPage);
    }

    return {
      pages,
      totalPages: pages.length,
      rawText: rawText.trim()
    };
  } catch (err) {
    console.warn('Error in docx binary parse, attempting non-docx fallback:', err);
    try {
      let u8: Uint8Array;
      if (typeof input === 'string') {
        const b64 = input.includes(';base64,') ? input.split(';base64,')[1] : input;
        const raw = atob(b64.trim());
        u8 = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
      } else if (input instanceof Uint8Array) {
        u8 = input;
      } else {
        u8 = new Uint8Array(input);
      }
      return parseNonDocxDocument(u8);
    } catch (fbErr) {
      console.error('Non-docx fallback failed:', fbErr);
      return { pages: [], totalPages: 0, rawText: '' };
    }
  }
}

/**
 * Fallback parser for files with .doc extension or non-zip formats
 * such as HTML disguised as .doc (common in school MIS/OBEC/SGS exports),
 * RTF, or text documents with embedded tables.
 * Strictly guards against decoding binary data (PDF, OLE2, archives) into phantom pages.
 */
export function parseNonDocxDocument(data: Uint8Array | ArrayBuffer): DocxParseResult {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (!bytes || bytes.length === 0) {
    return { pages: [], totalPages: 0, rawText: '' };
  }

  // 1. Binary Detection: Check magic numbers
  // PDF: %PDF (0x25 0x50 0x44 0x46)
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return { pages: [], totalPages: 0, rawText: '' };
  }

  // ZIP / DOCX / XLSX: PK\x03\x04
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return { pages: [], totalPages: 0, rawText: '' };
  }

  // OLE2 Compound File (legacy .doc, .xls, .ppt): \xD0\xCF\x11\xE0
  const isOleDoc = bytes.length >= 4 && bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0;

  // Check proportion of non-printable control characters in sample (first 1000 bytes)
  const sampleSize = Math.min(bytes.length, 1000);
  let controlChars = 0;
  for (let c = 0; c < sampleSize; c++) {
    const b = bytes[c];
    if (b < 32 && b !== 9 && b !== 10 && b !== 13) {
      controlChars++;
    }
  }

  // If more than 8% control characters, this is raw binary data, NOT text or HTML!
  if (controlChars / sampleSize > 0.08) {
    // If it's an OLE2 .doc file, attempt to extract readable Thai / English text strings
    if (isOleDoc) {
      const extractedParagraphs: string[] = [];
      let currentRun = '';
      for (let i = 0; i < bytes.length - 1; i++) {
        // Look for 2-byte UTF-16LE characters or 1-byte Thai (0xA1-0xFB) / ASCII (0x20-0x7E)
        const b0 = bytes[i];
        const b1 = bytes[i + 1];

        // UTF-16LE Thai (0x0E00-0x0E7F)
        if (b1 === 0x0E && b0 >= 0x01 && b0 <= 0x5B) {
          currentRun += String.fromCharCode(0x0E00 + b0);
          i++;
        } else if (b1 === 0x00 && b0 >= 32 && b0 <= 126) {
          // UTF-16LE ASCII
          currentRun += String.fromCharCode(b0);
          i++;
        } else if (b0 >= 32 && b0 <= 126) {
          // ASCII
          currentRun += String.fromCharCode(b0);
        } else if (b0 === 10 || b0 === 13) {
          if (currentRun.trim().length >= 3) {
            extractedParagraphs.push(currentRun.trim());
          }
          currentRun = '';
        } else {
          if (currentRun.trim().length >= 4) {
            extractedParagraphs.push(currentRun.trim());
          }
          currentRun = '';
        }
      }
      if (currentRun.trim().length >= 4) {
        extractedParagraphs.push(currentRun.trim());
      }

      // Filter meaningful paragraphs (filter out binary fragments)
      const cleanLines = extractedParagraphs.filter((p) => p.length >= 3 && /[a-zA-Zก-๙]/.test(p));
      if (cleanLines.length > 0) {
        const pages: DocxParsedPage[] = [];
        let curPage: DocxParsedPage = { pageNumber: 1, elements: [] };
        let count = 0;
        const maxLinesPerPage = 28;

        for (const line of cleanLines.slice(0, 150)) {
          curPage.elements.push({
            type: 'paragraph',
            align: 'left',
            runs: [{ text: line, bold: false, fontSizePt: 16 }],
            isIndented: false
          });
          count++;
          if (count >= maxLinesPerPage) {
            pages.push(curPage);
            curPage = { pageNumber: pages.length + 1, elements: [] };
            count = 0;
          }
        }
        if (curPage.elements.length > 0) pages.push(curPage);

        return {
          pages,
          totalPages: pages.length,
          rawText: cleanLines.join('\n')
        };
      }
    }

    // Pure binary: return empty result so viewer shows clean raw download card instead of hundreds of garbage pages
    return { pages: [], totalPages: 0, rawText: '' };
  }

  // Attempt decoding as UTF-8 first, fallback to Windows-874 / TIS-620 if available
  let text = '';
  try {
    text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    text = '';
  }

  // If text contains Thai encoded in Windows-874 / TIS-620 or replacement chars
  if (!text || text.includes('\uFFFD')) {
    try {
      const thaiDecoder = new TextDecoder('windows-874', { fatal: false });
      const thaiText = thaiDecoder.decode(bytes);
      if (thaiText && !thaiText.includes('\uFFFD')) {
        text = thaiText;
      }
    } catch {
      // ignore
    }
  }

  const elements: DocxElement[] = [];
  let rawText = '';

  // 1. Check if the document is HTML format disguised as .doc
  const lowerText = text.toLowerCase();
  if (typeof DOMParser !== 'undefined' && (lowerText.includes('<table') || lowerText.includes('<html') || lowerText.includes('<!doctype'))) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      
      const body = doc.body;
      if (body) {
        // Find top-level or structural nodes
        const nodes = Array.from(body.children);
        if (nodes.length > 0) {
          for (const node of nodes) {
            const tagName = node.tagName.toLowerCase();

            if (tagName === 'table') {
              const tableRows: DocxParsedTableRow[] = [];
              const stringRows: string[][] = [];
              const trElements = Array.from(node.querySelectorAll('tr'));

              trElements.forEach((tr, rIdx) => {
                const isHeader = rIdx === 0 || tr.querySelector('th') !== null;
                const cellElements = Array.from(tr.children).filter(
                  c => c.tagName.toLowerCase() === 'td' || c.tagName.toLowerCase() === 'th'
                );

                const parsedCells: DocxParsedTableCell[] = [];
                const strCells: string[] = [];

                cellElements.forEach((cellEl) => {
                  const cellHtml = cellEl as HTMLElement;
                  const cellText = (cellHtml.innerText || cellHtml.textContent || '').trim();
                  const colSpan = cellHtml.getAttribute('colspan') ? parseInt(cellHtml.getAttribute('colspan')!, 10) : undefined;
                  const rowSpan = cellHtml.getAttribute('rowspan') ? parseInt(cellHtml.getAttribute('rowspan')!, 10) : undefined;
                  const alignAttr = cellHtml.getAttribute('align') || cellHtml.style.textAlign;
                  let align: 'left' | 'center' | 'right' | 'justify' = isHeader ? 'center' : 'left';
                  if (alignAttr === 'center') align = 'center';
                  else if (alignAttr === 'right') align = 'right';

                  const isBold = isHeader || cellHtml.style.fontWeight === 'bold' || cellHtml.querySelector('b, strong') !== null;
                  const bgColor = cellHtml.style.backgroundColor || (cellHtml.getAttribute('bgcolor') || (isHeader ? '#F1F5F9' : undefined));

                  parsedCells.push({
                    text: cellText,
                    runs: [{ text: cellText, bold: isBold, fontSizePt: isHeader ? 14 : 13 }],
                    align,
                    bgColor: bgColor ? bgColor : undefined,
                    bold: isBold,
                    fontSizePt: isHeader ? 14 : 13,
                    colSpan: colSpan && colSpan > 1 ? colSpan : undefined,
                    rowSpan: rowSpan && rowSpan > 1 ? rowSpan : undefined
                  });
                  strCells.push(cellText);
                });

                if (parsedCells.length > 0) {
                  tableRows.push({ isHeader, cells: parsedCells });
                  stringRows.push(strCells);
                }
              });

              if (tableRows.length > 0) {
                elements.push({
                  type: 'table',
                  rows: stringRows,
                  tableRows,
                  borderColors: { outer: '#475569', inner: '#94A3B8' }
                });
              }
            } else {
              // Paragraph, header, or container
              const pText = (node.textContent || '').trim();
              if (pText) {
                const alignAttr = node.getAttribute('align') || (node as HTMLElement).style?.textAlign;
                let align: 'left' | 'center' | 'right' | 'justify' = 'left';
                if (alignAttr === 'center') align = 'center';
                else if (alignAttr === 'right') align = 'right';

                const isHeading = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName);
                const isBold = isHeading || (node as HTMLElement).style?.fontWeight === 'bold' || node.querySelector('b, strong') !== null;

                elements.push({
                  type: 'paragraph',
                  align,
                  runs: [{
                    text: pText,
                    bold: isBold,
                    fontSizePt: isHeading ? 18 : 16
                  }],
                  isIndented: false
                });
                rawText += pText + '\n';
              }
            }
          }
        }
      }
    } catch (htmlErr) {
      console.warn('HTML parse error:', htmlErr);
    }
  }

  // 2. If no elements found from HTML, check for plain text lines or tables
  if (elements.length === 0 && text) {
    const rawLines = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n');

    let i = 0;
    while (i < rawLines.length) {
      const line = rawLines[i].trim();
      if (!line) {
        i++;
        continue;
      }

      // Check table row (pipe or tab delimited)
      if (line.startsWith('|') || (line.includes('|') && line.split('|').length >= 3) || line.includes('\t')) {
        const stringRows: string[][] = [];
        const structuredRows: DocxParsedTableRow[] = [];

        while (i < rawLines.length) {
          const curLine = rawLines[i].trim();
          if (!curLine) break;
          if (/^\|?(\s*:?-+:?\s*\|)+\s*$/.test(curLine)) {
            i++;
            continue;
          }
          if (curLine.includes('|') || curLine.includes('\t')) {
            const cells = curLine.includes('|')
              ? curLine.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - (curLine.endsWith('|') ? 1 : 0) ? true : c.length > 0)
              : curLine.split('\t').map(c => c.trim());

            if (cells.length > 0) {
              const isHeader = structuredRows.length === 0;
              stringRows.push(cells);
              structuredRows.push({
                isHeader,
                cells: cells.map((c, cIdx) => ({
                  text: c,
                  align: isHeader ? 'center' : cIdx === 0 ? 'left' : 'left',
                  bgColor: isHeader ? '#F1F5F9' : undefined,
                  bold: isHeader || (cIdx === 0 && !isHeader),
                  fontSizePt: isHeader ? 14 : 13,
                  runs: [{ text: c, bold: isHeader || (cIdx === 0 && !isHeader) }]
                }))
              });
            }
            i++;
          } else {
            break;
          }
        }

        if (stringRows.length > 0) {
          elements.push({
            type: 'table',
            rows: stringRows,
            tableRows: structuredRows,
            borderColors: { outer: '#475569', inner: '#94A3B8' }
          });
        }
        continue;
      }

      // Standard paragraph
      const isTitle = line.startsWith('โครงสร้าง') || line.startsWith('รายงาน') || line.startsWith('แบบบันทึก') || line.startsWith('แบบประเมิน');
      const isHeading = /^\d+\./.test(line) || line.startsWith('เรื่อง:') || line.startsWith('เรื่อง ') || line.startsWith('หน่วยที่');

      elements.push({
        type: 'paragraph',
        align: isTitle ? 'center' : 'left',
        runs: [{
          text: line,
          bold: isTitle || isHeading,
          fontSizePt: isTitle ? 18 : isHeading ? 16 : 16
        }],
        isIndented: !isTitle && !isHeading && (rawLines[i].startsWith('\t') || rawLines[i].startsWith('    '))
      });
      rawText += line + '\n';
      i++;
    }
  }

  // 3. Paginate into realistic A4 pages (~28-30 lines per page)
  const pages: DocxParsedPage[] = [];
  let curPage: DocxParsedPage = { pageNumber: 1, elements: [] };
  let itemsCount = 0;
  const maxPerPage = 28;

  for (const el of elements) {
    curPage.elements.push(el);
    itemsCount += el.type === 'table' ? Math.max(3, Math.min(el.rows ? el.rows.length : 3, 20)) : 1;

    if (itemsCount >= maxPerPage) {
      pages.push(curPage);
      curPage = { pageNumber: pages.length + 1, elements: [] };
      itemsCount = 0;
    }
  }

  if (curPage.elements.length > 0 || pages.length === 0) {
    pages.push(curPage);
  }

  return {
    pages,
    totalPages: pages.length,
    rawText: rawText.trim()
  };
}
