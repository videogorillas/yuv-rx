import {Frame, Gray, InterleavedPlane, InterleavedRgbaFrame, InterleavedRgbFrame, RgbFrame, YuvFrame} from './frame';

function clip(n: number, low: number, high: number): number {
    return n < low ? low : (n > high ? high : n);
}

function clipByte(n: number): number {
    return clip(n, 0 , 255);
}

/*
 Inspired by jcodec implementation
 */
function yuvToRgb(yData: Buffer, yOffset: number, uData: Buffer, uOffset: number, vData: Buffer, vOffset: number, rData: Buffer, rOffset: number, gData: Buffer, gOffset: number, bData: Buffer, bOffset: number) {
    const c = yData[yOffset] - 16;
    const u = uData[uOffset] - 128;
    const v = vData[vOffset] - 128;
    const r = (298 * c + 409 * v + 128) >> 8;
    const g = (298 * c - 100 * u - 208 * v + 128) >> 8;
    const b = (298 * c + 516 * u + 128) >> 8;
    rData[rOffset] = clipByte(r);
    gData[gOffset] = clipByte(g);
    bData[bOffset] = clipByte(b);
}

function yuv420pToRgb<RGB extends Frame>(src: YuvFrame, dst: RGB, conversion: (src: YuvFrame, dst: RGB, offLuma: number, offChroma: number) => void) {

    let offLuma = 0, offChroma = 0;
    const stride = dst.header.width;
    for (let i = 0; i < (dst.header.height >> 1); i++) {
        for (let k = 0; k < (dst.header.width >> 1); k++) {
            const j = k << 1;
            conversion(src, dst, offLuma + j, offChroma);
            conversion(src, dst, offLuma + j + 1, offChroma);
            conversion(src, dst, offLuma + j + stride, offChroma);
            conversion(src, dst, offLuma + j + stride + 1, offChroma);
            ++offChroma;
        }
        if ((dst.header.width & 0x1) != 0) {
            const j = dst.header.width - 1;
            conversion(src, dst, offLuma + j, offChroma);
            conversion(src, dst, offLuma + j + stride, offChroma);
            ++offChroma;
        }

        offLuma += 2 * stride;
    }
    if ((dst.header.height & 0x1) != 0) {
        for (let k = 0; k < (dst.header.width >> 1); k++) {
            const j = k << 1;
            conversion(src, dst, offLuma + j, offChroma);
            conversion(src, dst, offLuma + j + 1, offChroma);
            ++offChroma;
        }
        if ((dst.header.width & 0x1) != 0) {
            const j = dst.header.width - 1;
            conversion(src, dst, offLuma + j, offChroma);
            ++offChroma;
        }
    }
}

export function toRGB(yuv: YuvFrame): RgbFrame {
    const w = yuv.header.width;
    const h = yuv.header.height;
    const rgb = {
        header: yuv.header,
        colorPlanes: {
            r: new Gray(w, h),
            g: new Gray(w, h),
            b: new Gray(w, h)
        }
    };
    yuv420pToRgb(yuv, rgb, (src, dst, offLuma, offChroma) => {
        yuvToRgb(src.colorPlanes.y.data, offLuma, src.colorPlanes.u.data, offChroma, src.colorPlanes.v.data, offChroma,
            dst.colorPlanes.r.data, offLuma, dst.colorPlanes.g.data, offLuma, dst.colorPlanes.b.data, offLuma);
    });
    return rgb;
}

export function toRGBInterleaved(yuv: YuvFrame): InterleavedRgbFrame {
    const w = yuv.header.width;
    const h = yuv.header.height;
    const rgb = {
        header: yuv.header,
        colorPlanes: {
            rgb: new InterleavedPlane(w, h, ['r', 'g', 'b']),
        }
    };
    yuv420pToRgb(yuv, rgb, (src, dst, offLuma, offChroma) => {
        yuvToRgb(src.colorPlanes.y.data, offLuma, src.colorPlanes.u.data, offChroma, src.colorPlanes.v.data, offChroma,
            dst.colorPlanes.rgb.data, offLuma * 3, dst.colorPlanes.rgb.data, offLuma * 3 + 1, dst.colorPlanes.rgb.data, offLuma * 3 + 2);
    });
    return rgb;
}

export function toRGBAInterleaved(yuv: YuvFrame): InterleavedRgbaFrame {
    const w = yuv.header.width;
    const h = yuv.header.height;
    const rgba = {
        header: yuv.header,
        colorPlanes: {
            rgba: new InterleavedPlane(w, h, ['r', 'g', 'b', 'a']),
        }
    };
    yuv420pToRgb(yuv, rgba, (src, dst, offLuma, offChroma) => {
        yuvToRgb(src.colorPlanes.y.data, offLuma, src.colorPlanes.u.data, offChroma, src.colorPlanes.v.data, offChroma,
            dst.colorPlanes.rgba.data, offLuma * 4, dst.colorPlanes.rgba.data, offLuma * 4 + 1, dst.colorPlanes.rgba.data, offLuma * 4 + 2);
        dst.colorPlanes.rgba.data[offLuma * 4 + 3] = 0xff;

    });
    return rgba;
}
