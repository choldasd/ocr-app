import os
import gc
import logging
import pytesseract
from paddleocr import PaddleOCR
from .preprocessing import PreprocessingService

logger = logging.getLogger(__name__)

class OCRService:
    def __init__(self, languages: str = "en,hi,mr"):
        self.languages = languages.split(",")
        logger.info(f"Initializing PaddleOCR with languages: {self.languages}")
        # Initialize PaddleOCR
        # Minimal features to save RAM
        try:
            self.paddle = PaddleOCR(
                use_angle_cls=False,
                lang=self.languages[0], # Primary language
                use_gpu=False,
                show_log=False,
                enable_mkldnn=True,  # Usually good for CPU inference
                cpu_threads=1,       # 1 worker to save RAM
                det=True, rec=True, cls=False
            )
            self.paddle_available = True
        except Exception as e:
            logger.error(f"Failed to initialize PaddleOCR: {e}")
            self.paddle_available = False

    def extract_text(self, image_path: str) -> dict:
        """
        Extracts text from image.
        Uses PaddleOCR primarily. Falls back to Tesseract.
        """
        try:
            # 1. Preprocess
            processed_img = PreprocessingService.process_image(image_path)
            
            # 2. Try PaddleOCR
            if self.paddle_available:
                try:
                    result = self.paddle.ocr(processed_img, cls=False)
                    text_parts = []
                    confidence_sum = 0.0
                    count = 0
                    
                    if result and result[0]:
                        for line in result[0]:
                            box, (text, conf) = line
                            text_parts.append(text)
                            confidence_sum += float(conf)
                            count += 1
                    
                    if count > 0:
                        final_text = "\n".join(text_parts)
                        avg_conf = confidence_sum / count
                        
                        # Explicit garbage collection for RAM
                        del processed_img
                        gc.collect()
                        
                        return {
                            "text": final_text,
                            "confidence": round(avg_conf, 2),
                            "engine": "PaddleOCR"
                        }
                except Exception as e:
                    logger.warning(f"PaddleOCR failed: {e}. Falling back to Tesseract.")
            
            # 3. Fallback to Tesseract
            logger.info("Using Tesseract fallback")
            # Tesseract uses eng+hin+mar format for lang
            tess_langs = "+".join([l[:3] for l in self.languages]) # approximate lang codes (eng, hin, mar)
            
            custom_config = r'--oem 3 --psm 3'
            data = pytesseract.image_to_data(processed_img, lang="eng+hin+mar", config=custom_config, output_type=pytesseract.Output.DICT)
            
            text_parts = []
            conf_sum = 0
            count = 0
            
            for i in range(len(data['text'])):
                if int(data['conf'][i]) > -1 and data['text'][i].strip() != '':
                    text_parts.append(data['text'][i])
                    conf_sum += int(data['conf'][i])
                    count += 1
                    
            final_text = " ".join(text_parts)
            avg_conf = (conf_sum / count / 100.0) if count > 0 else 0.0
            
            # Explicit garbage collection for RAM
            del processed_img
            gc.collect()

            return {
                "text": final_text,
                "confidence": round(avg_conf, 2),
                "engine": "Tesseract"
            }
            
        except Exception as e:
            logger.error(f"OCR Extraction failed completely: {e}")
            return {
                "text": "",
                "confidence": 0.0,
                "engine": "Failed"
            }

# Singleton instance
ocr_service = None

def get_ocr_service(languages="en,hi,mr"):
    global ocr_service
    if ocr_service is None:
        ocr_service = OCRService(languages=languages)
    return ocr_service
