"""Read-only source image analysis: register layers and trace real ink geometry."""
import json
from pathlib import Path
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
reference = cv2.imdecode(np.fromfile(ROOT / 'resource-packs/MiStudyOS_Home_4K_AssetPack/00_reference/home_reference_1672x941.png', np.uint8), cv2.IMREAD_GRAYSCALE)
character = cv2.imdecode(np.fromfile(ROOT / 'assets/lineart/01_character/character_transparent_4k.png', np.uint8), cv2.IMREAD_UNCHANGED)
character = cv2.resize(character, (768, 1024), interpolation=cv2.INTER_AREA)
alpha = character[:, :, 3].astype(float) / 255
gray = cv2.cvtColor(character[:, :, :3], cv2.COLOR_BGR2GRAY)
gray = np.uint8(gray * alpha + 250 * (1 - alpha))
sift = cv2.SIFT_create(nfeatures=6000)
key_a, desc_a = sift.detectAndCompute(gray, np.uint8(alpha > .7) * 255)
key_b, desc_b = sift.detectAndCompute(reference, None)
matches = cv2.BFMatcher().knnMatch(desc_a, desc_b, k=2)
good = [a for a, b in matches if a.distance < .72 * b.distance]
pts_a = np.float32([key_a[m.queryIdx].pt for m in good])
pts_b = np.float32([key_b[m.trainIdx].pt for m in good])
matrix, inliers = cv2.estimateAffinePartial2D(pts_a, pts_b, method=cv2.RANSAC, ransacReprojThreshold=3)
report = {'matches': len(good), 'inliers': int(inliers.sum()) if inliers is not None else 0, 'matrix_from_768': matrix.tolist() if matrix is not None else None}
(ROOT / 'artifacts').mkdir(exist_ok=True)
(ROOT / 'artifacts/art-registration.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report))

# Geometry only: no reference pixels are altered or exported as new raster art.
# The paths follow actual reference ink, rather than a guessed character outline.
char_alpha = cv2.warpAffine(np.uint8(alpha * 255), matrix, (1672, 941))
char_alpha = cv2.GaussianBlur(char_alpha, (0, 0), 4)
char_mask = np.zeros_like(reference)
char_mask[:595] = char_alpha[:595]
# Broaden the flowing hair field while retaining a soft silhouette.
char_mask = cv2.dilate(char_mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (27, 27)))
char_mask[137:288, 986:1321] = 0
binary = np.uint8((reference < 230) & (char_mask > 120)) * 255
skeleton = cv2.ximgproc.thinning(binary)
pixels = set(map(tuple, np.column_stack(np.where(skeleton > 0))))
neighbors = {}
offsets = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]
for p in pixels:
    neighbors[p] = [(p[0]+dy,p[1]+dx) for dy,dx in offsets
                    if (p[0]+dy,p[1]+dx) in pixels and
                    not (dx and dy and ((p[0]+dy,p[1]) in pixels or (p[0],p[1]+dx) in pixels))]
visited = set()
paths = []
nodes = sorted(pixels, key=lambda p: (len(neighbors[p]) != 1, p[0], p[1]))
for start in nodes:
    for nxt in neighbors[start]:
        edge = tuple(sorted((start, nxt)))
        if edge in visited:
            continue
        chain = [start, nxt]
        visited.add(edge)
        previous, current = start, nxt
        while True:
            options = [p for p in neighbors[current] if p != previous and tuple(sorted((current,p))) not in visited]
            if not options:
                break
            incoming = np.array(current)-np.array(previous)
            def continuation(p):
                outgoing = np.array(p)-np.array(current)
                return np.dot(incoming,outgoing)/(np.linalg.norm(incoming)*np.linalg.norm(outgoing))
            following = max(options,key=continuation)
            edge = tuple(sorted((current, following)))
            if edge in visited:
                break
            visited.add(edge)
            chain.append(following)
            previous, current = current, following
        if len(chain) < 14:
            continue
        points = np.float32([[x,y] for y,x in chain])
        length = float(cv2.arcLength(points, False))
        points = cv2.approxPolyDP(points, .55, False).reshape(-1,2)
        if points[0,1] > points[-1,1]:
            points = points[::-1]
        path = 'M' + 'L'.join(f'{x:g},{y:g}' for x,y in points)
        average_y = float(np.mean(points[:,1]))
        paths.append({'d':path,'length':round(length,1),'y':round(average_y,1)})
# Long flowing contours first, then face/flower details and fine hatching.
paths.sort(key=lambda p: (p['length'] < 90, p['y'] // 75, -p['length']))
total = len(paths)
for index, path in enumerate(paths):
    # Many fine strokes overlap like a time-lapse ink drawing. Each individual
    # stroke advances continuously along its true geometry.
    path['start'] = round(620 + index / total * 1700)
    path['duration'] = round(min(620, max(140, path['length'] * 1.7)))
    del path['y']
out = ROOT / 'src/data'
out.mkdir(exist_ok=True)
(out / 'mi-ink-strokes.json').write_text(json.dumps(paths, separators=(',', ':')))
print(f'Traced {len(paths)} genuine ink strokes.')

# Verify that the edited eyes align with the unchanged face. Export the affine
# registration as code data; the original generated bitmap stays untouched.
closed = cv2.imdecode(np.fromfile(ROOT / 'assets/lineart/01_character/mi_closed_eyes_reference.png', np.uint8), cv2.IMREAD_GRAYSCALE)
closed = cv2.resize(closed, (1672,941), interpolation=cv2.INTER_AREA)
mask = np.zeros_like(reference)
mask[150:345, 725:975] = 255
mask[203:247, 866:928] = 0
mask[245:285, 773:842] = 0
ka, da = sift.detectAndCompute(closed, mask)
kb, db = sift.detectAndCompute(reference, mask)
good = [a for a,b in cv2.BFMatcher().knnMatch(da,db,k=2) if a.distance < .72*b.distance]
pa = np.float32([ka[m.queryIdx].pt for m in good])
pb = np.float32([kb[m.trainIdx].pt for m in good])
blink_matrix, blink_inliers = cv2.estimateAffinePartial2D(pa,pb, method=cv2.RANSAC,ransacReprojThreshold=1.5)
blink = {'matrix': blink_matrix.tolist(), 'matches':len(good), 'inliers':int(blink_inliers.sum()), 'sourceDimensions':[1672,941]}
(out / 'mi-blink-registration.json').write_text(json.dumps(blink, indent=2))
print(json.dumps(blink))
