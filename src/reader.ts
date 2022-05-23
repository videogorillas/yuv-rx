import {spawn} from 'child_process';
import {Observable} from 'rxjs';

export type PixFmt = 'yuv420p' | 'yuv422p'

type Y4MOptions = {
    pixFmt?: PixFmt,
    seekSeconds?: number,
    vframes?: number,
    probeSize?: number,
    analyzeDuration?: number
}

export type Y4MStreamOptions = Y4MOptions & {
    verbose?: boolean
}

function yuv4mpeg(path: string, options?: Y4MOptions): string[] {
    const params = [];
    const analyzeDuration = options?.analyzeDuration ?? 0;
    if (analyzeDuration != 0) {
        params.push('-analyzeduration', analyzeDuration.toString());
    }
    const probeSize = options?.probeSize ?? 0;
    if (probeSize != 0) {
        params.push('-probesize', probeSize.toString());
    }
    params.push('-flags2', '+showall');
    const seekseconds = options?.seekSeconds ?? 0;
    if (seekseconds > 0) {
        params.push('-ss', seekseconds.toString());
    }
    params.push('-i', path);
    const vframes = options?.vframes ?? null;
    if (vframes != null) {
        params.push('-vframes', vframes.toString());
    }
    const pixFmt = options?.pixFmt ?? 'yuv420p';
    params.push('-loglevel', 'error', '-f', 'yuv4mpegpipe', '-pix_fmt', pixFmt, '-strict', '-1', '-threads', '0', '-');
    return params;
}

export function yuv4mpegStream(ffmpeg: string, path: string, options?: Y4MStreamOptions): Observable<Buffer> {
    return new Observable<Buffer>(subscriber => {
        const args = yuv4mpeg(path, options);
        if (options?.verbose) {
            console.log('FFMpeg:', ffmpeg);
            console.log('Arguments:', args.join(' '));
        }
        let exited = false;
        const child = spawn(ffmpeg, args, {stdio: 'pipe'});
        child.on('exit', (code?: number, signal?: NodeJS.Signals) => {
            exited = true;
            if (code != null && code == 0) {
                if (child.stdout.readableEnded) {
                    subscriber.complete();
                }
            } else {
                subscriber.error(`FFMpeg exited with exit code ${code}, signal ${signal}`);
            }
        });
        child.stdout.on('end', () => {
            if (exited) {
                subscriber.complete();
            }
        });
        child.stdout.on('data', data => subscriber.next(data));
        child.stderr.on('data', err => console.error(err.toString()));
    });
}
