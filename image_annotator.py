import io
from PIL import Image, ImageDraw, ImageFont

def annotate_image(image_bytes: bytes, bbox_coords: list, label: str = "") -> bytes:
    """
    Annotates an image with a bounding box and an optional label.
    bbox_coords should be a tuple/list: (y_min, x_min, y_max, x_max)
    Coordinates should be relative floats between 0 and 1, or 0 to 1000.
    """
    try:
        # Load the image
        img = Image.open(io.BytesIO(image_bytes))
        # Ensure image is in RGB mode
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        draw = ImageDraw.Draw(img)
        width, height = img.size
        
        y_min, x_min, y_max, x_max = bbox_coords
        
        # If coordinates are 0-1000 scale (Gemini default), convert to 0-1
        if max(bbox_coords) > 1:
            y_min /= 1000.0
            x_min /= 1000.0
            y_max /= 1000.0
            x_max /= 1000.0
            
        # Convert to absolute pixels
        abs_x_min = int(x_min * width)
        abs_y_min = int(y_min * height)
        abs_x_max = int(x_max * width)
        abs_y_max = int(y_max * height)
        
        # Draw bounding box (thick red rectangle)
        line_width = max(3, int(min(width, height) * 0.005))
        draw.rectangle(
            [(abs_x_min, abs_y_min), (abs_x_max, abs_y_max)],
            outline="red",
            width=line_width
        )
        
        # Optional: Add label
        if label:
            # We try to load a default font. If it fails, default is used.
            # Calculate a reasonable font size based on image dimensions
            try:
                # Use default PIL font, unfortunately it's very small. 
                # We can scale it or rely on basic text. 
                # For basic implementation, we just use default.
                font = ImageFont.load_default()
                text_bbox = draw.textbbox((0, 0), label, font=font)
                text_w = text_bbox[2] - text_bbox[0]
                text_h = text_bbox[3] - text_bbox[1]
                
                # Draw text background box
                draw.rectangle(
                    [(abs_x_min, max(0, abs_y_min - text_h - 4)),
                     (abs_x_min + text_w + 4, abs_y_min)],
                    fill="red"
                )
                # Draw text
                draw.text((abs_x_min + 2, max(0, abs_y_min - text_h - 4)), label, fill="white", font=font)
            except Exception as e:
                pass
                
        # Save to bytes
        out_bytes = io.BytesIO()
        img.save(out_bytes, format='JPEG', quality=85)
        return out_bytes.getvalue()
        
    except Exception as e:
        print(f"Error annotating image: {e}")
        return image_bytes
