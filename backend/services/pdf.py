import os
import fitz  # PyMuPDF
import logging
from typing import List

logger = logging.getLogger(__name__)

class PDFService:
    @staticmethod
    def extract_images_from_pdf(pdf_path: str, output_dir: str, base_filename: str) -> List[str]:
        """
        Extracts images from a PDF sequentially.
        Returns a list of paths to the extracted images.
        """
        image_paths = []
        try:
            doc = fitz.open(pdf_path)
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                # Render page to an image (pixmap)
                # zoom factor 2.0 gives ~144 DPI which is good enough for OCR
                zoom = 2.0
                mat = fitz.Matrix(zoom, zoom)
                pix = page.get_pixmap(matrix=mat, alpha=False)
                
                image_filename = f"{base_filename}_page_{page_num + 1}.png"
                image_path = os.path.join(output_dir, image_filename)
                
                # Save image
                pix.save(image_path)
                image_paths.append(image_path)
                
                # Free memory
                pix = None
                
            doc.close()
        except Exception as e:
            logger.error(f"Failed to process PDF {pdf_path}: {e}")
            raise
            
        return image_paths
