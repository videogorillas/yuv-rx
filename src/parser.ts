import {Y4MStreamOptions, yuv4mpegStream} from './reader';
import {Observable} from 'rxjs';
import {Gray, YuvFrame} from './frame';
import {Y4MHeader} from './y4m';

export type YuvParserOptions = Y4MStreamOptions & {
    ffmpeg?: string
}

function parseFrame(data: Buffer, header: Y4MHeader, frameHeader: string, fn: number): YuvFrame {
    if (!frameHeader.startsWith('FRAME')) {
        throw 'Invalid frame header';
    }
    const luma = header.lumaSize();
    const chroma = header.chromaSize();
    return {
        header: {
            fn: fn
        },
        colorPlanes: {
            y: new Gray(header.width, header.height, data.subarray(0, luma)),
            u: new Gray(header.chromaWidth(), header.chromaHeight(), data.subarray(luma, luma + chroma)),
            v: new Gray(header.chromaWidth(), header.chromaHeight(), data.subarray(luma + chroma))
        }
    };
}

export class YuvParser {
    private readonly options: YuvParserOptions;

    constructor(options?: YuvParserOptions) {
        this.options = options ?? {};
    }


    public read(path: string): Observable<YuvFrame> {
        return new Observable<YuvFrame>(subscriber => {
            let buffer = Buffer.allocUnsafe(0);
            let header: Y4MHeader = null;
            let frameHeader: string = null;
            let fn = 0;
            yuv4mpegStream(this.options.ffmpeg ?? 'ffmpeg', path, this.options).subscribe({
                next: data => {
                    buffer = Buffer.concat([buffer, data]);
                    let idx = -1;
                    while ((idx = buffer.indexOf('\n', 0, 'ascii')) != -1) {
                        const chunk = buffer.subarray(0, idx);
                        buffer = buffer.subarray(idx + 1);
                        if (header == null) {
                            const headerString = chunk.toString('ascii');
                            if (this.options.verbose) {
                                console.log(`Video header: ${headerString}`);
                            }
                            header = Y4MHeader.fromString(headerString);
                        } else if (frameHeader == null) {
                            frameHeader = chunk.toString('ascii');
                            if (this.options.verbose) {
                                console.log(`Frame ${fn} header: ${frameHeader}`);
                            }
                        } else {
                            const frameData = chunk.subarray(0, header.getFrameSize());
                            subscriber.next(parseFrame(frameData, header, frameHeader, fn));
                            fn += 1;
                            frameHeader = chunk.subarray(header.getFrameSize()).toString('ascii');
                            if (this.options.verbose) {
                                console.log(`Frame ${fn} header: ${frameHeader}`);
                            }
                        }
                    }
                },
                error: subscriber.error,
                complete: () => {
                    if (buffer.length == header.getFrameSize()) {
                        subscriber.next(parseFrame(buffer, header, frameHeader, fn));
                        subscriber.complete();
                    } else {
                        subscriber.error(`Incorrect size of last frame (${buffer.length}), expected ${header.getFrameSize()}`);
                    }
                }
            });
        });
    }
}
