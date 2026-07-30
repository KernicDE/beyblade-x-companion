#!/usr/bin/env python3
"""
Removes the white background from all catalog PNGs via flood fill from the
image borders. Only near-white pixels connected to the border become
transparent, so white parts of the objects themselves (e.g. the white
launcher body) are preserved.
"""
import os
import sys
from collections import deque

from PIL import Image

BASE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'images')
THRESHOLD = 242  # RGB channels >= this count as "near-white background"


def is_near_white(pixel):
    r, g, b = pixel[0], pixel[1], pixel[2]
    return r >= THRESHOLD and g >= THRESHOLD and b >= THRESHOLD


def make_transparent(path):
    with Image.open(path) as img:
        img = img.convert('RGBA')
        width, height = img.size
        pixels = img.load()

        visited = bytearray(width * height)
        queue = deque()

        # Seed the flood fill with near-white border pixels.
        for x in range(width):
            for y in (0, height - 1):
                if is_near_white(pixels[x, y]):
                    queue.append((x, y))
        for y in range(height):
            for x in (0, width - 1):
                if is_near_white(pixels[x, y]):
                    queue.append((x, y))

        while queue:
            x, y = queue.popleft()
            idx = y * width + x
            if visited[idx]:
                continue
            visited[idx] = 1
            if not is_near_white(pixels[x, y]):
                continue
            r, g, b, _ = pixels[x, y]
            pixels[x, y] = (r, g, b, 0)
            if x > 0:
                queue.append((x - 1, y))
            if x < width - 1:
                queue.append((x + 1, y))
            if y > 0:
                queue.append((x, y - 1))
            if y < height - 1:
                queue.append((x, y + 1))

        removed = sum(visited)
        img.save(path, 'PNG', optimize=True)
        return removed


def main():
    total = 0
    for root, _dirs, files in os.walk(BASE_DIR):
        for name in sorted(files):
            if not name.lower().endswith('.png'):
                continue
            path = os.path.join(root, name)
            removed = make_transparent(path)
            total += 1
            print(f'{os.path.relpath(path, BASE_DIR)}: {removed} px transparent')
    print(f'\nDone: {total} images processed.')


if __name__ == '__main__':
    sys.exit(main())
