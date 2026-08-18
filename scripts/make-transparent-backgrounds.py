import os
import sys
from collections import deque
from PIL import Image

BASE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'images')

THRESHOLD = 30


def is_background(pixel):
    """Treat light/white-ish pixels as background."""
    if len(pixel) == 4 and pixel[3] == 0:
        return True
    r, g, b = pixel[:3]
    return max(r, g, b) - min(r, g, b) <= THRESHOLD and r >= 240 and g >= 240 and b >= 240


def flood_fill_transparent(img):
    """Make background pixels transparent using flood-fill from image edges."""
    pixels = img.load()
    width, height = img.size
    visited = set()
    queue = deque()

    # Seed from all edge pixels
    for x in range(width):
        for y in [0, height - 1]:
            if (x, y) not in visited and is_background(pixels[x, y]):
                queue.append((x, y))
                visited.add((x, y))
    for y in range(height):
        for x in [0, width - 1]:
            if (x, y) not in visited and is_background(pixels[x, y]):
                queue.append((x, y))
                visited.add((x, y))

    while queue:
        x, y = queue.popleft()
        pixels[x, y] = (255, 255, 255, 0)
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in visited:
                if is_background(pixels[nx, ny]):
                    visited.add((nx, ny))
                    queue.append((nx, ny))


def process_image(path):
    try:
        with Image.open(path) as img:
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            flood_fill_transparent(img)
            root, ext = os.path.splitext(path)
            out_path = root + '.png'
            img.save(out_path, 'PNG')
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
