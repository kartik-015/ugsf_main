"use client"
import { useState } from 'react'
import { Document, Page } from 'react-pdf/dist/esm/entry.webpack'
import { pdfjs } from 'react-pdf'
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`

export default function PDFViewer({ url }) {
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [pdfError, setPdfError] = useState(false)
  return (
    <div className="w-full h-full min-h-[70vh] flex flex-col items-center justify-center bg-gray-900">
      {!pdfError ? (
        <Document file={url} onLoadSuccess={({ numPages }) => setNumPages(numPages)} loading={<div className="text-gray-400">Loading PDF...</div>} error={() => setPdfError(true)}>
          <Page pageNumber={pageNumber} width={600} />
        </Document>
      ) : (
        <object data={url} type="application/pdf" className="w-full h-full min-h-[70vh] border-0">
          <p className="text-center text-red-400 mt-10">Unable to display PDF. <a href={url} target="_blank" rel="noopener noreferrer" className="underline text-indigo-400">Open in new tab</a></p>
        </object>
      )}
      {numPages && numPages > 1 && !pdfError && (
        <div className="flex gap-2 mt-2">
          <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber === 1} className="px-2 py-1 rounded bg-gray-800 text-white disabled:opacity-40">Prev</button>
          <span className="text-gray-300">Page {pageNumber} of {numPages}</span>
          <button onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber === numPages} className="px-2 py-1 rounded bg-gray-800 text-white disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  )
}
