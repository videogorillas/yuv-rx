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
    getData(): Buffer;
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

    public getData(): Buffer {
        return this.data.subarray();
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
            const data = this.getData();
            if (r.x + r.width > this.width || r.y + r.height > this.height) {
                throw new Error(`image: ${this.width}x${this.height} subimage: ${r.x}:${r.y} ${r.width}x${r.height}`);
            }
            let offset = r.y * this.width + r.x;
            for (let i = 0; i < r.height; i++) {
                dest.fill(data.subarray(offset, offset + r.width), i * r.width, (i + 1) * r.width);
                offset += this.width;
            }
            return new Gray(r.width, r.height, dest);
        }
    }
}
