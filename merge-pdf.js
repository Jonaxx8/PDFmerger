const express = require('express');
const { PDFDocument } = require('pdf-lib');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const PORT = process.env.PORT || 3030;

const app = express();
app.use(express.static("public"));
const upload = multer({ dest: 'uploads/' });


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.post('/merge', upload.array('pdf-files'), async (req, res) => {
  const files = req.files.map((file) => file.path);

  if (!files.length) {
    return res.status(400).send('No files uploaded. Go back to previous page!');
  }

  try {
    const mergedPdf = await mergePDFs(files);
    const fileName = 'merged.pdf';
    const filePath = path.join(__dirname, fileName);

    await fs.writeFile(filePath, mergedPdf);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error downloading merged PDF');
      }

      // Delete downloaded file after sending it
      fs.unlink(filePath, (err) => {
        if (err) console.error(err);
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error merging PDFs');
  }

  // Delete uploaded files after merging
  for (const file of files) {
    await fs.unlink(file);
  }
});

async function mergePDFs(files) {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const pdfBytes = await fs.readFile(file);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const pdfBytes = await mergedPdf.save();
  return pdfBytes;
}

app.listen(PORT, () => {
  console.log('Server started on http://localhost:3000');
});
