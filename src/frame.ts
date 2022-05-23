export type Rational = { readonly numerator: number, readonly denominator: number };

function _parseRational(str: string, separator: string): Rational | null {
    const parts = str.split(separator);
    if (parts.length == 2) {
        return {
            numerator: parseInt(parts[0]),
            denominator: parseInt(parts[1])
        };
    } else {
        return null;
    }
}

export function parseRational(str: string): Rational {
    return _parseRational(str, ':') ?? _parseRational(str, ':') ?? (() => {throw `${str} is not a valid rational number`;})();
}

export type Rectangle = {
    x: number,
    y: number,
    width: number,
    height: number
}

export type Dimension = {
    width: number,
    height: number
}

export interface ColorPlane {
    getWidth(): number;
    getHeight(): number;
    getBounds(): Rectangle;
    readonly data: Buffer;
    getDimension(): Dimension;
}

export class Gray implements ColorPlane {

    public readonly width: number;
    public readonly height: number;
    public readonly data: Buffer;

    constructor(width: number, height: number, data?: Buffer) {
        this.data = data?.subarray() ?? Buffer.allocUnsafe(width * height);
        if (width * height > this.data.length) {
            throw new Error(`Invalid buffer size ${this.data.length} for dimensions ${width}x${height}`);
        }
        this.width = width;
        this.height = height;
    }

    public getPixel(x: number, y: number): number {
        return this.data.readUInt8(y * this.width + x);
    }

    public putPixel(x: number, y: number, pix: number): void {
        this.data.writeUint8(pix, y * this.width + x);
    }

    public getWidth(): number {
        return this.width;
    }

    public getHeight(): number {
        return this.height;
    }

    public getBounds(): Rectangle {
        return {x: 0, y: 0, width: this.width, height: this.height};
    }

    public getDimension(): Dimension {
        return {width: this.width, height: this.height};
    }

    public getSubimage(r: Rectangle, dest?: Buffer): Gray {
        if (r == this.getBounds()) {
            return this;
        } else {
            dest = dest ?? Buffer.allocUnsafe(r.width * r.height);
            if (dest.length < r.width * r.height) {
                throw new Error(`buffer capacity (${dest.length}) < requested image size (${r.width * r.height})`);
            }
            if (r.x + r.width > this.width || r.y + r.height > this.height) {
                throw new Error(`image: ${this.width}x${this.height} subimage: ${r.x}:${r.y} ${r.width}x${r.height}`);
            }
            let offset = r.y * this.width + r.x;
            for (let i = 0; i < r.height; i++) {
                dest.fill(this.data.subarray(offset, offset + r.width), i * r.width, (i + 1) * r.width);
                offset += this.width;
            }
            return new Gray(r.width, r.height, dest);
        }
    }
}

export class InterleavedPlane implements ColorPlane {
    public readonly width: number;
    public readonly height: number;
    public readonly data: Buffer;
    public readonly colorComponents: string[];
    private readonly stride: number;

    constructor(width: number, height: number, colorComponents: string[], data?: Buffer) {
        this.data = data?.subarray() ?? Buffer.allocUnsafe(width * height * colorComponents.length);
        if (width * height * colorComponents.length > this.data.length) {
            throw new Error(`Invalid buffer size ${this.data.length} for dimensions ${width}x${height} and ${colorComponents.length} color components`);
        }
        this.width = width;
        this.height = height;
        this.colorComponents = colorComponents;
        this.stride = width * colorComponents.length;
    }

    private colorComponentIdx(colorComponent: string) {
        const idx = this.colorComponents.indexOf(colorComponent);
        if (idx == -1) {
            throw `Color component ${colorComponent} not found. Existing components: ${this.colorComponents}`;
        } else {
            return idx;
        }
    }

    public getPixel(x: number, y: number, colorComponent: string): number {
        const componentIdx = this.colorComponentIdx(colorComponent);
        return this.data.readUInt8(y * this.stride + x * this.colorComponents.length + componentIdx);
    }

    public putPixel(x: number, y: number, colorComponent: string, pix: number): void {
        const componentIdx = this.colorComponentIdx(colorComponent);
        this.data.writeUint8(pix, y * this.stride + x * this.colorComponents.length + componentIdx);
    }

    public getWidth(): number {
        return this.width;
    }

    public getHeight(): number {
        return this.height;
    }

    public getBounds(): Rectangle {
        return {x: 0, y: 0, width: this.width, height: this.height};
    }

    public getDimension(): Dimension {
        return {width: this.width, height: this.height};
    }

    public getSubimage(r: Rectangle, dest?: Buffer): InterleavedPlane {
        if (r == this.getBounds()) {
            return this;
        } else {
            const comps = this.colorComponents.length;
            dest = dest ?? Buffer.allocUnsafe(r.width * r.height * comps);
            if (dest.length < r.width * r.height * comps) {
                throw new Error(`buffer capacity (${dest.length}) < requested image size (${r.width * r.height * comps})`);
            }
            if (r.x + r.width > this.width || r.y + r.height > this.height) {
                throw new Error(`image: ${this.width}x${this.height} subimage: ${r.x}:${r.y} ${r.width}x${r.height}`);
            }
            let offset = r.y * this.stride + r.x * comps;
            for (let i = 0; i < r.height; i++) {
                dest.fill(this.data.subarray(offset, offset + r.width * comps), i * r.width * comps, (i + 1) * r.width * comps);
                offset += this.stride;
            }
            return new InterleavedPlane(r.width, r.height, this.colorComponents, dest);
        }
    }
}

export interface FrameHeader {
    width: number,
    height: number,
    fn: number
}

export interface Frame {
    header: FrameHeader,
    colorPlanes: {[key: string]: ColorPlane}
}

export interface YuvFrame extends Frame {
    colorPlanes: {
        y: ColorPlane,
        u: ColorPlane,
        v: ColorPlane
    }
}

export interface RgbFrame extends Frame {
    colorPlanes: {
        r: ColorPlane,
        g: ColorPlane,
        b: ColorPlane
    }
}

export interface InterleavedRgbFrame extends Frame {
    colorPlanes: {
        rgb: ColorPlane
    }
}
