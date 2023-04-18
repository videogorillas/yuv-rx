import {YuvFrame, Gray} from './frame';

/**
 * Bilinear resize grayscale image. Target dimension is w * h.
 *
 * w * h cannot be zero.
 *
 * @param w
 *            New width.
 * @param h
 *            New height. Optional, calculated to preserve frame aspect ratio if not given.
 */
export function scaleBilinear(w: number, h?: number): (frame: YuvFrame) => YuvFrame {
    return (frame: YuvFrame) => {
        if (frame.header.width === w) {
            return frame;
        } else {
            const hh = h ?? Math.round(frame.header.height * w / frame.header.width) & ~1;
            const w2 = Math.floor(w / 2);
            const h2 = Math.floor(hh / 2);
            return {
                header: {
                    width: w,
                    height: hh,
                    fn: frame.header.fn,
                },
                colorPlanes: {
                    y: scaleGrayBilinear(w, hh, frame.colorPlanes.y as Gray),
                    u: scaleGrayBilinear(w2, h2, frame.colorPlanes.u as Gray),
                    v: scaleGrayBilinear(w2, h2, frame.colorPlanes.v as Gray),
                }
            }
        }
    };
}

function scaleGrayBilinear(w: number, h: number, gray: Gray): Gray {
    const srcPix = gray.data;
    const dst = new Gray(w, h);
    const x_ratio = (gray.width - 1) / w;
    const y_ratio = (gray.height - 1) / h;
    for (let i = 0; i < h; i++) {
        for (let j = 0; j < w; j++) {
            const x = Math.floor(x_ratio * j);
            const y = Math.floor(y_ratio * i);
            const x_diff = (x_ratio * j) - x;
            const y_diff = (y_ratio * i) - y;
            const index = y * gray.width + x;

            // range is 0 to 255 thus bitwise AND with 0xff (maybe needed?)
            const A = srcPix.readUInt8(index);
            const B = srcPix.readUInt8(index + 1);
            const C = srcPix.readUInt8(index + gray.width);
            const D = srcPix.readUInt8(index + gray.width + 1);

            // Y = A(1-w)(1-h) + B(w)(1-h) + C(h)(1-w) + Dwh
            const value = Math.floor(A * (1 - x_diff) * (1 - y_diff) + B * (x_diff) * (1 - y_diff) + C * (y_diff) * (1 - x_diff) + D * (x_diff * y_diff));

            dst.putPixel(j, i, value);
        }
    }
    return dst;
}
