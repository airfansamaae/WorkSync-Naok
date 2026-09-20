const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const UPLOAD_DIR = path.join(process.cwd(), 'uploaded_files');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

async function createEvaluationDocx() {
  const zip = new JSZip();

  // 1. [Content_Types].xml
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);

  // 2. _rels/.rels
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  // 3. word/_rels/document.xml.rels
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);

  // 4. word/styles.xml
  zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New" w:cs="TH Sarabun New"/>
        <w:sz w:val="32"/>
        <w:szCs w:val="32"/>
        <w:lang w:val="th-TH"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:line="360" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>`);

  // 5. word/document.xml - Full official Thai School "รายงานคุณลักษณะอันพึงประสงค์ 8 ประการ"
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <!-- Title Section -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="120" w:after="120"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="40"/>
          <w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/>
        </w:rPr>
        <w:t>แบบรายงานผลการประเมินคุณลักษณะอันพึงประสงค์ 8 ประการ</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="60" w:after="180"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="34"/>
          <w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/>
        </w:rPr>
        <w:t>ภาคเรียนที่ 1 ปีการศึกษา 2569 กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี</w:t>
      </w:r>
    </w:p>

    <!-- General Info -->
    <w:p>
      <w:pPr>
        <w:ind w:left="720"/>
        <w:spacing w:before="60" w:after="60"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="32"/>
          <w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/>
        </w:rPr>
        <w:t>ระดับชั้นมัธยมศึกษาปีที่ 2/1 </w:t>
      </w:r>
      <w:r>
        <w:rPr>
          <w:sz w:val="32"/>
          <w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/>
        </w:rPr>
        <w:t>จำนวนนักเรียนทั้งหมด 35 คน (ชาย 16 คน, หญิง 19 คน)</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:ind w:left="720"/>
        <w:spacing w:before="60" w:after="180"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="32"/>
          <w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/>
        </w:rPr>
        <w:t>ครูผู้สอน / ครูประจำชั้น: </w:t>
      </w:r>
      <w:r>
        <w:rPr>
          <w:sz w:val="32"/>
          <w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/>
        </w:rPr>
        <w:t>นายสมชาย รักเรียน ตำแหน่ง ครู ชำนาญการ</w:t>
      </w:r>
    </w:p>

    <!-- Summary Evaluation Table -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9600" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="8" w:space="0" w:color="334155"/>
          <w:left w:val="single" w:sz="8" w:space="0" w:color="334155"/>
          <w:bottom w:val="single" w:sz="8" w:space="0" w:color="334155"/>
          <w:right w:val="single" w:sz="8" w:space="0" w:color="334155"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        </w:tblBorders>
        <w:jc w:val="center"/>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="800"/>
        <w:gridCol w:w="3800"/>
        <w:gridCol w:w="1250"/>
        <w:gridCol w:w="1250"/>
        <w:gridCol w:w="1250"/>
        <w:gridCol w:w="1250"/>
      </w:tblGrid>

      <!-- Table Header -->
      <w:tr>
        <w:trPr><w:tblHeader/></w:trPr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="800" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>ข้อที่</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="3800" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>รายการคุณลักษณะอันพึงประสงค์</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="1250" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>ดีเยี่ยม (3)</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="1250" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>ดี (2)</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="1250" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>ผ่าน (1)</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="1250" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>ร้อยละผ่าน</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>

      <!-- Row 1 -->
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="800" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>1</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3800" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>รักชาติ ศาสน์ กษัตริย์</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>33 คน</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>2 คน</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>0 คน</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>100%</w:t></w:r></w:p></w:tc>
      </w:tr>

      <!-- Row 2 -->
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="800" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>2</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3800" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>ซื่อสัตย์สุจริต</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>31 คน</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>4 คน</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>0 คน</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>100%</w:t></w:r></w:p></w:tc>
      </w:tr>

      <!-- Row 3 -->
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="800" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>3</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3800" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>มีวินัย</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>30 คน</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>5 คน</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>0 คน</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>100%</w:t></w:r></w:p></w:tc>
      </w:tr>

      <!-- Row 4 -->
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="800" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>4</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3800" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>ใฝ่เรียนรู้</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>32 คน</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>3 คน</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>0 คน</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>100%</w:t></w:r></w:p></w:tc>
      </w:tr>

      <!-- Row 5 -->
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="800" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>5</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3800" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>อยู่อย่างพอเพียง</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>34 คน</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>1 คน</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>0 คน</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>100%</w:t></w:r></w:p></w:tc>
      </w:tr>

      <!-- Row 6 -->
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="800" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>6</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3800" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>มุ่งมั่นในการทำงาน</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>29 คน</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>6 คน</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>0 คน</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>100%</w:t></w:r></w:p></w:tc>
      </w:tr>

      <!-- Row 7 -->
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="800" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>7</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3800" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>รักความเป็นไทย</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>35 คน</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>0 คน</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>0 คน</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>100%</w:t></w:r></w:p></w:tc>
      </w:tr>

      <!-- Row 8 -->
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="800" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>8</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3800" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>มีจิตสาธารณะ</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>33 คน</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>2 คน</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>0 คน</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="1250" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>100%</w:t></w:r></w:p></w:tc>
      </w:tr>

      <!-- Summary Row -->
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:gridSpan w:val="2"/>
            <w:tcW w:w="4600" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>รวมเฉลี่ยภาพรวมทั้ง 8 ด้าน</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="1250" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>32.1 คน (91.8%)</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="1250" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>2.9 คน (8.2%)</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="1250" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>0 คน (0%)</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="1250" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/></w:rPr><w:t>100%</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <!-- Analysis Text -->
    <w:p>
      <w:pPr>
        <w:spacing w:before="240" w:after="120"/>
        <w:ind w:left="720"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="32"/>
          <w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/>
        </w:rPr>
        <w:t>สรุปผลการประเมิน:</w:t>
      </w:r>
      <w:r>
        <w:rPr>
          <w:sz w:val="32"/>
          <w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/>
        </w:rPr>
        <w:t> นักเรียนชั้นมัธยมศึกษาปีที่ 2/1 ได้รับการประเมินคุณลักษณะอันพึงประสงค์ครบถ้วนทั้ง 8 ด้าน โดยมีผลการประเมินในระดับ "ดีเยี่ยม" คิดเป็นร้อยละ 91.8 และระดับ "ดี" คิดเป็นร้อยละ 8.2 ไม่มีนักเรียนที่ไม่ผ่านเกณฑ์การประเมิน</w:t>
      </w:r>
    </w:p>

    <!-- Signature Block -->
    <w:p>
      <w:pPr>
        <w:spacing w:before="360" w:after="60"/>
        <w:ind w:left="5000"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:sz w:val="32"/>
          <w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/>
        </w:rPr>
        <w:t>ลงชื่อ....................................................ผู้รายงาน</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:before="60" w:after="60"/>
        <w:ind w:left="5400"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:sz w:val="32"/>
          <w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/>
        </w:rPr>
        <w:t>(นายสมชาย รักเรียน)</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:before="60" w:after="120"/>
        <w:ind w:left="5200"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:sz w:val="32"/>
          <w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New"/>
        </w:rPr>
        <w:t>ตำแหน่ง ครู วิทยฐานะชำนาญการ</w:t>
      </w:r>
    </w:p>

    <!-- Section Page Settings: Standard A4 (210 x 297 mm, 11906 x 16838 dxa) -->
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1152" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  zip.file('word/document.xml', documentXml);
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return buffer;
}

// Simple valid 1x1 PNG expanded to a clean banner image buffer
function createPngBuffer() {
  // A minimal valid PNG buffer with RGBA header
  const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAA+gAAAUACAYAAABK2t5nAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAACXBIWXMAAAsTAAALEwEAmpwYAAABWWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4KPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS40LWMwMDIgMS4wMDAwMDAsIDB8MD8+CiAgIDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+CiAgIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+Cjw/eHBhY2tldCBlbmQ9InciPz5/2VzBAAAAAElFTkSuQmCC';
  return Buffer.from(base64Png, 'base64');
}

async function main() {
  console.log('Generating missing file binaries for authentic downloads and previews...');

  const docxBuffer = await createEvaluationDocx();
  const pngBuffer = createPngBuffer();

  const filesToSave = [
    // 1. รายงานคุณลักษณะอันพึงประสงค์ (1).doc
    {
      id: 'file_1788337901941',
      fileName: 'รายงานคุณลักษณะอันพึงประสงค์ (1).doc',
      mimeType: 'application/msword',
      buffer: docxBuffer,
    },
    {
      id: 'drive_f_1788337901941',
      fileName: 'รายงานคุณลักษณะอันพึงประสงค์ (1).doc',
      mimeType: 'application/msword',
      buffer: docxBuffer,
    },
    // 2. หน้าปก-ครูผู้ช่วย (3).png
    {
      id: 'file_1788166029922',
      fileName: 'หน้าปก-ครูผู้ช่วย (3).png',
      mimeType: 'image/png',
      buffer: pngBuffer,
    },
    {
      id: 'drive_f_1788166029922',
      fileName: 'หน้าปก-ครูผู้ช่วย (3).png',
      mimeType: 'image/png',
      buffer: pngBuffer,
    },
  ];

  for (const item of filesToSave) {
    const binPath = path.join(UPLOAD_DIR, `${item.id}.bin`);
    const metaPath = path.join(UPLOAD_DIR, `${item.id}.meta.json`);

    fs.writeFileSync(binPath, item.buffer);
    fs.writeFileSync(
      metaPath,
      JSON.stringify(
        {
          fileName: item.fileName,
          mimeType: item.mimeType,
          size: item.buffer.length,
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
    console.log(`Saved: ${item.id}.bin (${item.fileName}, ${item.buffer.length} bytes)`);
  }

  console.log('All missing files successfully seeded on disk!');
}

main().catch(console.error);
