import {FrameHeader, YuvFrame} from './frame';
import {Observable} from 'rxjs';
import {FfmpegLogHandler, logHandlerFn} from './log-handler';
import {spawn} from 'child_process';

const DEFAULT_TIMESCALE = 24;
const DEFAULT_FRAME_DURATION = 1;

export type YuvWriterOptions = {
    ffmpeg?: string,
    ffmpegLogHandler?: FfmpegLogHandler,
};

export type Y4MOutputOptions = {
    timescale?: number,
    frameDuration?: number,
    overwrite?: boolean,
};

function ffmpegArgs(outputFile: string, opts?: Y4MOutputOptions): string[] {
    const args = [
        '-r', `${opts?.timescale ?? DEFAULT_TIMESCALE}/${opts?.frameDuration ?? 1}`,
        '-f', 'yuv4mpegpipe',
        '-i', 'pipe:0',
        '-loglevel', 'error',
    ];
    if (opts?.overwrite) {
        args.push('-y');
    }
    args.push(outputFile);
    return args;
}

function y4mHeader(frameHeader: FrameHeader, timescale: number, frameDuration: number): Buffer {
    return Buffer.from(`YUV4MPEG2 W${frameHeader.width} H${frameHeader.height} F${timescale}:${frameDuration} Ip A1:1 C420mpeg2 XYSCSS=420MPEG2\n`, 'ascii');
}

function frameToBuffer(frame: YuvFrame): Buffer {
    return Buffer.concat([Buffer.from('FRAME\n', 'ascii'), frame.colorPlanes.y.data, frame.colorPlanes.u.data, frame.colorPlanes.v.data]);
}

export class YuvWriter {
    constructor(
        private readonly options: YuvWriterOptions = {},
    ) {
    }

    public async write(frames: Observable<YuvFrame>, outputFile: string, options?: Y4MOutputOptions): Promise<number> {
        const opts = {
            timescale: DEFAULT_TIMESCALE,
            frameDuration: DEFAULT_FRAME_DURATION,
            ...this.options,
            ...(options ?? {}),
        };
        const ffmpeg = opts.ffmpeg ?? 'ffmpeg';
        const handleFfmpegLog = logHandlerFn(opts?.ffmpegLogHandler ?? 'none');
        return new Promise((resolve, reject) => {
            let framesWritten = 0;
            let headerWritten = false;

            const child = spawn(ffmpeg, ffmpegArgs(outputFile, options), {stdio: 'pipe'});
            child.on('exit', (code?: number) => {
                if (code !== 0) {
                    reject(new Error(`FFMpeg exited with code ${code}`));
                } else {
                    resolve(framesWritten);
                }
            });

            child.stdin.on('error', err => reject(err));
            child.stdout.on('data', handleFfmpegLog);
            child.stderr.on('data', handleFfmpegLog);

            frames.subscribe({
                next: frame => {
                    if (!headerWritten) {
                        child.stdin.write(y4mHeader(frame.header, opts.timescale, opts.frameDuration));
                        headerWritten = true;
                    }
                    child.stdin.write(frameToBuffer(frame));
                    framesWritten++;
                },
                error: err => reject(err),
                complete: () => child.stdin.end(),
            });
        });
    }
}
