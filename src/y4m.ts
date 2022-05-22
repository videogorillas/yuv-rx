import {Frame, parseRational, Rational} from './frame';

export type Interlacing = 'Progressive' | 'TopFieldFirst' | 'BottomFieldFirst' | 'Mixed';

function interlacingFromChar(char: string): Interlacing {
    switch (char) {
    case 't':
        return 'TopFieldFirst';
    case 'b':
        return 'BottomFieldFirst';
    case 'm':
        return 'Mixed';
    case 'p':
    default:
        return 'Progressive';
    }
}

/*
    C420jpeg: 4:2:0 with biaxially-displaced chroma planes
    C420paldv; 4:2:0 with vertically-displaced chroma planes
    C420mpeg2; 4:2:0 with coincident chroma planes
    C420: 4:2:0 with coincident chroma planes
    C422: 4:2:2
    C444: 4:4:4
 */
export type Colorspace = 'C420jpeg' | 'C420paldv' | 'C420mpeg2' | 'C420' | 'C422' | 'C444';

export class Y4MFrameHeader {
    public readonly timeValue: number;
    public readonly ndftc: string;
    public readonly videoMediaTimeValue: number;
}

export class Y4MFrame {
    public readonly fn: number;
    public readonly yuv: Frame;
    public timescale: number;
    public pts: number;
    public duration: number;

    constructor(fn: number, yuv: Frame) {
        this.fn = fn;
        this.yuv = yuv;
    }
}

type TSRegExpMatchResult = RegExpExecArray & {
    groups: {
        ts: string
    }
}

export class Y4MHeader {

    public width: number;
    public height: number;
    public frameRate: Rational;
    interlacing: Interlacing = 'Progressive';
    aspectRatio: Rational = {numerator: 1, denominator: 1};
    colorspace: Colorspace = 'C420mpeg2';
    comment?: string;
    timeScale = -1;
    videoMediaTimeScale?: number;

    public chromaWidth(): number {
        if (this.colorspace == 'C444' || this.colorspace == 'C422') {
            return this.width;
        } else {
            return Math.ceil(this.width / 2);
        }
    }

    public chromaHeight(): number {
        if (this.colorspace == 'C444') {
            return this.height;
        } else {
            return Math.ceil(this.height / 2);
        }
    }

    public chromaSize(): number {
        return this.chromaWidth() * this.chromaHeight();
    }

    public lumaSize(): number {
        return this.width * this.height;
    }

    public getFrameSize(): number {
        return this.lumaSize() + this.chromaSize() * 2;
    }

    static readonly timeScaleRegex: RegExp = /TS=(?<ts>\d+)/;
    static readonly videoMediaTimeScaleRegex: RegExp = /VMTS=(?<ts>\d+)/;

    public static fromString(line: string): Y4MHeader {
        if ('YUV4MPEG2 ' != line.substring(0, 10)) {
            throw new Error('Wrong yuv4mpeg header.');
        }
        const split: string[] = line.substring(10).split(' ');
        const header = new Y4MHeader();
        for (const s of split) {
            const key = s.charAt(0);
            const value = s.substring(1);
            switch (key) {
            case 'W':
                header.width = parseInt(value);
                break;
            case 'H':
                header.height = parseInt(value);
                break;
            case 'F':
                header.frameRate = parseRational(value);
                header.timeScale = header.frameRate.numerator;
                header.videoMediaTimeScale = header.timeScale;
                break;
            case 'I':
                header.interlacing = interlacingFromChar(s.charAt(1));
                break;
            case 'A':
                header.aspectRatio = parseRational(value);
                break;
            case 'C':
                header.colorspace = s as Colorspace;
                break;
            case 'X':
                header.comment = value;
                const vmtsMatch = Y4MHeader.videoMediaTimeScaleRegex.exec(line);
                if (vmtsMatch != null) {
                    header.videoMediaTimeScale = parseInt((vmtsMatch as TSRegExpMatchResult).groups.ts);
                } else {
                    const tsMatch = Y4MHeader.timeScaleRegex.exec(line);
                    if (tsMatch != null) {
                        header.timeScale = parseInt((tsMatch as TSRegExpMatchResult).groups.ts);
                    }
                }
                break;
            }
        }

        return header;
    }

    public toString(): string {
        return `YUV4MPEG2 W${this.width} H${this.height} F${this.frameRate.numerator}:${this.frameRate.denominator} Ip A${this.aspectRatio.numerator}:${this.aspectRatio.denominator} ${this.colorspace} XYSCSS=420MPEG2`;
    }
}
