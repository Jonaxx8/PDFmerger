// Get the input elements from the HTML page
var fileInput1 = document.getElementById('fileInput1');
var fileInput2 = document.getElementById('fileInput2');
var mergeButton = document.getElementById('mergeButton');

// Add an event listener to the merge button
mergeButton.addEventListener('click', function() {
  // Load the first PDF document
  PDFJS.getDocument(fileInput1.files[0]).then(function(firstDoc) {
    // Load the second PDF document
    PDFJS.getDocument(fileInput2.files[0]).then(function(secondDoc) {
      // Get the total number of pages
      var totalPages = firstDoc.numPages + secondDoc.numPages;

      // Create a new PDF document
      var mergedDoc = new PDFDocument();

      // Loop through the pages of the first PDF document and add them to the merged document
      for (var i = 1; i <= firstDoc.numPages; i++) {
        firstDoc.getPage(i).then(function(page) {
          var canvas = document.createElement('canvas');
          var context = canvas.getContext('2d');
          var viewport = page.getViewport(1.0);
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          page.render({
            canvasContext: context,
            viewport: viewport
          }).then(function() {
            mergedDoc.addImage(canvas.toDataURL(), 'PNG', 0, 0, viewport.width, viewport.height);
            if (i == totalPages) {
              saveMergedPDF(mergedDoc);
            }
          });
        });
      }

      // Loop through the pages of the second PDF document and add them to the merged document
      for (var i = 1; i <= secondDoc.numPages; i++) {
        secondDoc.getPage(i).then(function(page) {
          var canvas = document.createElement('canvas');
          var context = canvas.getContext('2d');
          var viewport = page.getViewport(1.0);
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          page.render({
            canvasContext: context,
            viewport: viewport
          }).then(function() {
            mergedDoc.addImage(canvas.toDataURL(), 'PNG', 0, viewport.height * (i - 1), viewport.width, viewport.height);
            if (i == totalPages) {
              saveMergedPDF(mergedDoc);
            }
          });
        });
      }
    });
  });
});

// Save the merged PDF document
function saveMergedPDF(doc) {
  doc.save('merged.pdf');
}
