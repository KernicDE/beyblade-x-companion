import os
import sys
from PIL import Image

BASE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'images')

def process_image(path):
    try:
        with Image.open(path) as img:
            # Convert to RGBA if needed
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            # Create white background
            white = Image.new('RGBA', img.size, (255, 255, 255, 255))
            # Paste image on white background using alpha channel
            white.paste(img, (0, 0), img)
            # Convert to RGB and save as PNG
            rgb = white.convert('RGB')
            # Determine output path: keep same directory, ensure .png extension
            root, ext = os.path.splitext(path)
            out_path = root + '.png'
            rgb.save(out_path, 'PNG')
            # Remove original if it was webp with png extension or different ext
            if path != out_path and os.path.exists(path):
                os.remove(path)
            return out_path
    except Exception as e:
        print(f"Error processing {path}: {e}")
        return None

def main():
    categories = ['blades', 'ratchets', 'bits', 'beys', 'launchers', 'assist-blades']
    for cat in categories:
        cat_dir = os.path.join(BASE_DIR, cat)
        if not os.path.isdir(cat_dir):
            continue
        for filename in os.listdir(cat_dir):
            if filename.lower().endswith(('.png', '.webp', '.jpg', '.jpeg')):
                path = os.path.join(cat_dir, filename)
                out = process_image(path)
                if out:
                    print(f"Processed: {out}")

if __name__ == '__main__':
    main()
