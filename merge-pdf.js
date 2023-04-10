const express = require('express');
const { PDFDocument } = require('pdf-lib');
const multer = require('multer');
const fs = require('fs').promises;
const tmp = require('tmp');
const path = require('path');
const PORT = process.env.PORT || 3030;

const app = express();
app.use(express.static("public"));
app.use(express.json());
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const tmpDir = tmp.dirSync({ mode: '755', prefix: 'pdf-' });
      cb(null, tmpDir.name);
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(pdf)$/)) {
      return cb(new Error('Please upload only PDF files.'));
    }
    cb(null, true);
  }
});

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

app.post('/delete-pages', upload.single('pdf-file'), async (req, res) => {
  const file = req.file.path;
  const pagesToDelete = req.body.pagesToDelete.split(',').map(Number);

  if (!pagesToDelete || !pagesToDelete.length) {
    return res.status(400).send('No pages selected for deletion');
  }

  try {
    const modifiedPdf = await deletePagesFromPDF(file, pagesToDelete);
    const fileName = 'modified.pdf';
    const filePath = path.join(__dirname, fileName);

    await fs.writeFile(filePath, modifiedPdf);
    await fs.unlink(file);
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error downloading modified PDF');
      }

      fs.unlink(filePath, (err) => {
        if (err) console.error(err);
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting pages from PDF');
  }
});


app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
async function mergePDFs(files) {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const pdfBytes = await fs.readFile(file);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}


async function deletePagesFromPDF(pdfPath, pagesToDelete) {
  const pdfDoc = await PDFDocument.load(await fs.readFile(pdfPath));
  const deletedPages = [];

  for (let i = pagesToDelete.length - 1; i >= 0; i--) {
    const pageNum = pagesToDelete[i];
    const index = pageNum - 1;
    const page = pdfDoc.getPages()[index];
    if (page) {
      pdfDoc.removePage(index);
      deletedPages.push(index + 1);
    }
  }
  const modifiedPdf = await pdfDoc.save();
  console.log(`Deleted pages ${deletedPages.join(', ')}`);
  return modifiedPdf;
}


module.exports = {
  deletePagesFromPDF
};

