import {Y4MStreamOptions, yuv4mpegStreamForCustomInput, yuv4mpegStreamForPath} from './reader';
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
            fn: fn,
            width: header.width,
            height: header.height
        },
        colorPlanes: {
            y: new Gray(header.width, header.height, data.subarray(0, luma)),
            u: new Gray(header.chromaWidth(), header.chromaHeight(), data.subarray(luma, luma + chroma)),
            v: new Gray(header.chromaWidth(), header.chromaHeight(), data.subarray(luma + chroma))
        }
    };
}

type Y4MParserState = 'reading header' | 'reading frame header' | 'reading frame';

export class YuvParser {
    private readonly options: YuvParserOptions;

    constructor(options?: YuvParserOptions) {
        this.options = options ?? {};
    }

    private parseHeader(chunk: Buffer): Y4MHeader {
        const headerString = chunk.toString('ascii');
        if (this.options.verbose) {
            console.log(`Video header: ${headerString} (${chunk})`);
        }
        return  Y4MHeader.fromString(headerString);
    }

    private nextChunk(buffer: Buffer, state: Y4MParserState, frameSize?: number): Buffer | null {
        switch(state) {
        case 'reading header':
        case 'reading frame header':
            const idx = buffer.indexOf('\n', 0, 'ascii');
            return idx != -1 ? buffer.subarray(0, idx + 1) : null;
        case 'reading frame':
            if (frameSize == null) {
                throw new Error('Illegal Y4M parser state: frame size should be known by now');
            } else {
                return buffer.length >= frameSize ? buffer.subarray(0, frameSize) : null;
            }
        }
    }

    private nextState(state: Y4MParserState): Y4MParserState {
        switch(state) {
        case 'reading header':
            return 'reading frame header';
        case 'reading frame header':
            return 'reading frame';
        case 'reading frame':
            return 'reading frame header';
        }
    }

    public readCustom(ffmpegArgs: string[], options?: Y4MStreamOptions): Observable<YuvFrame> {
        return this.readFromStream(() => yuv4mpegStreamForCustomInput(
            this.options.ffmpeg ?? 'ffmpeg',
            ffmpegArgs,
            {...this.options, ...(options ?? {})},
        ));

    }

    public read(path: string, options?: Y4MStreamOptions): Observable<YuvFrame> {
        return this.readFromStream(() => yuv4mpegStreamForPath(
            this.options.ffmpeg ?? 'ffmpeg',
            path,
            {...this.options, ...(options ?? {})},
        ));
    }

    private readFromStream(createStream: () => Observable<Buffer>): Observable<YuvFrame> {
        return new Observable<YuvFrame>(subscriber => {
            let state: Y4MParserState = 'reading header';
            let buffer = Buffer.allocUnsafe(0);
            let header: Y4MHeader = null;
            let frameHeader: string = null;
            let fn = 0;
            createStream().subscribe({
                next: data => {
                    buffer = Buffer.concat([buffer, data]);
                    let chunk = null;

                    while ((chunk = this.nextChunk(buffer, state, header?.getFrameSize())) != null) {
                        buffer = buffer.subarray(chunk.length);
                        switch (state) {
                        case 'reading header':
                            header = this.parseHeader(chunk.subarray(0, -1));
                            break;
                        case 'reading frame header':
                            frameHeader = chunk.subarray(0, -1).toString('ascii');
                            if (this.options.verbose) {
                                console.log(`Frame ${fn} header: ${frameHeader}`);
                            }
                            break;
                        case 'reading frame':
                            subscriber.next(parseFrame(chunk, header, frameHeader, fn));
                            fn += 1;
                            break;
                        }
                        state = this.nextState(state);
                    }
                },
                error: subscriber.error,
                complete: () => {
                    if (buffer.length != 0) {
                        subscriber.error(new Error(`Unparsed ${buffer.length} bytes in the end of the stream`));
                    } else if (state == 'reading frame') {
                        subscriber.error(new Error('Parser finished while expecting frame data'));
                    } else {
                        subscriber.complete();
                    }
                }
            });
        });
    }
}
