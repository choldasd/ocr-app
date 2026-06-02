import cv2
import numpy as np
import logging

logger = logging.getLogger(__name__)

class PreprocessingService:
    @staticmethod
    def process_image(image_path: str, max_width: int = 1600) -> np.ndarray:
        """
        Reads an image and applies preprocessing suitable for OCR:
        - Resize if too large
        - Convert to grayscale
        - Denoise
        - Adaptive thresholding
        - Deskew (basic)
        """
        logger.info(f"Preprocessing image: {image_path}")
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Could not read image at {image_path}")

        # 1. Resize if necessary to save memory and speed up processing
        h, w = image.shape[:2]
        if w > max_width:
            ratio = max_width / float(w)
            new_h = int(h * ratio)
            image = cv2.resize(image, (max_width, new_h), interpolation=cv2.INTER_AREA)

        # 2. Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # 3. Denoise (Gaussian Blur)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)

        # 4. Adaptive Thresholding (Binarization)
        # For PaddleOCR, keeping some grayscale information is sometimes better than pure binary,
        # but thresholding helps Tesseract. We'll return a slightly cleaned up grayscale image.
        # Alternatively, we just pass the denoised image to OCR engines as they do internal binarization.
        
        # We will apply deskewing
        deskewed = PreprocessingService.deskew(blurred)
        
        return deskewed

    @staticmethod
    def deskew(image: np.ndarray) -> np.ndarray:
        # Simple deskew using minAreaRect
        coords = np.column_stack(np.where(image > 0))
        angle = cv2.minAreaRect(coords)[-1]
        
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle

        # Limit angle to avoid extreme rotations on noise
        if abs(angle) > 15:
             return image

        (h, w) = image.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        return rotated
