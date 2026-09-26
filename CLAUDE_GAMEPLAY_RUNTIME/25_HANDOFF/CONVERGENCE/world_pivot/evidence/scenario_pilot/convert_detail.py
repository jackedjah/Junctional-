"""Scenario pilot → MAHWORLD detail map (luminance only; the colour law holds by construction).
R = detail value (high-passed luminance, mean 0.5) · G,B = tangent-plane normal x,y from the height (0.5 = flat) · A = roughness variation (0.5 = none)."""
import sys, numpy as np
from PIL import Image, ImageFilter
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB'); a = np.asarray(im).astype(np.float64) / 255.0
L = a @ np.array([0.2126, 0.7152, 0.0722])
def blur(x, s):   # circular (FFT) gaussian: the tile is seamless, so the blur wraps and cannot break it
    n, m = x.shape; fy = np.fft.fftfreq(n)[:, None]; fx = np.fft.fftfreq(m)[None, :]
    return np.real(np.fft.ifft2(np.fft.fft2(x) * np.exp(-2 * (np.pi ** 2) * (s ** 2) * (fx ** 2 + fy ** 2))))
low = blur(L, 56); hp = L - low                       # remove the broad tone: the procedural geology owns macro value
d = hp / (4.0 * hp.std()); R = np.clip(0.5 + d, 0, 1)   # ±2σ fills the range
H = blur(L, 1.2); H = (H - H.min()) / (H.max() - H.min())
gx = (np.roll(H, -1, 1) - np.roll(H, 1, 1)) * 0.5; gy = (np.roll(H, -1, 0) - np.roll(H, 1, 0)) * 0.5
k = 6.0; nx, ny, nz = -gx * k, gy * k, np.ones_like(H); ln = np.sqrt(nx * nx + ny * ny + nz * nz); nx /= ln; ny /= ln
G = 0.5 + 0.5 * nx; B = 0.5 + 0.5 * ny
A = np.clip(0.5 - (R - 0.5) * 0.6, 0, 1)              # crevices (dark) are rougher, polished lit grain slightly smoother
rgba = np.stack([R, G, B, A], axis=2)
img = Image.fromarray(np.uint8(np.round(rgba * 255)), 'RGBA'); img.save(out)
img.resize((512, 512), Image.LANCZOS).save(out.replace('.png', '_512.png'))
print('R mean %.3f std %.3f · normal |xy| mean %.3f · A mean %.3f' % (R.mean(), R.std(), np.sqrt((G - .5) ** 2 + (B - .5) ** 2).mean() * 2, A.mean()))
# seam proof on the derived map
wrapLR = np.abs(R[:, -1] - R[:, 0]).mean(); innerLR = np.mean([np.abs(R[:, i] - R[:, i + 1]).mean() for i in range(100, 900, 50)])
wrapTB = np.abs(R[-1] - R[0]).mean(); innerTB = np.mean([np.abs(R[i] - R[i + 1]).mean() for i in range(100, 900, 50)])
print('derived seam: LR %.4f vs %.4f · TB %.4f vs %.4f' % (wrapLR, innerLR, wrapTB, innerTB))
