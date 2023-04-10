import {yuv4mpegStream} from '../reader';
import {toArray, map, lastValueFrom} from 'rxjs';
import {path as ffmpegPath} from '@ffmpeg-installer/ffmpeg';

it('reads a video', async () => {
    const buffer = await lastValueFrom(yuv4mpegStream(ffmpegPath, `${__dirname}/resources/colors.mp4`).pipe(
        toArray(),
        map(buffers => Buffer.concat(buffers))
    ))
    if (buffer.length === 0) {
        throw 'completed without emitting data';
    }
    const chunks = buffer.toString('ascii').split('\n');
    const header = chunks[0];
    expect(header.slice(0, 10)).toStrictEqual('YUV4MPEG2 ');
    expect(buffer.length).toStrictEqual(header.length + 1 + 6 * (5 + 1 + 384));
    const frames = [];
    for (let i = 0; i < 6; i++) {
        const start = header.length + 1 + i * 390;
        const frameBuffer = buffer.subarray(start, start + 390);
        frames.push({
            header: frameBuffer.subarray(0, 6).toString('ascii'),
            y: frameBuffer.subarray(6, 6 + 16*16),
            u: frameBuffer.subarray(6 + 16*16, 6 + 16*16 + 16*4),
            v: frameBuffer.subarray(6 + 16*16 + 16*4, 6 + 16*16 + 16*8)
        });
    }

    frames.forEach(frame => {
        expect(frame.header).toStrictEqual('FRAME\n');
    });

    expect(frames[0].y).toStrictEqual(Buffer.alloc(256, 0));
    expect(frames[0].u).toStrictEqual(Buffer.alloc(64, 0x80));
    expect(frames[0].v).toStrictEqual(Buffer.alloc(64, 0x80));

    expect(frames[1].y).toStrictEqual(Buffer.alloc(256, 0xff));
    expect(frames[1].u).toStrictEqual(Buffer.alloc(64, 0x80));
    expect(frames[1].v).toStrictEqual(Buffer.alloc(64, 0x80));

    expect(frames[2].v).toStrictEqual(Buffer.alloc(64, 0xf0));
    expect(frames[4].u).toStrictEqual(Buffer.alloc(64, 0xf0));
});

it('reads a MPEG-DASH chunk', async () => {
    const basename = `${__dirname}/resources/stream`;
    const input = `concat:${basename}-2.0.m4s|${basename}-2.2.m4s`;

    const buffer = await lastValueFrom(yuv4mpegStream(ffmpegPath, input, {
        seekSeconds: 1,
        vframes: 3,
        verbose: true
    }).pipe(
        toArray(),
        map(buffers => Buffer.concat(buffers))
    ))
    if (buffer.length === 0) {
        throw 'completed without emitting data';
    }

    const chunks = buffer.toString('ascii').split('\n');
    const header = chunks[0];
    expect(header.slice(0, 10)).toStrictEqual('YUV4MPEG2 ');
    const frameSize = 6 + 144 * 80 * 1.5;
    expect(buffer.length).toStrictEqual(header.length + 1 + 3 * frameSize);

    const frames = [];
    for (let i = 0; i < 3; i++) {
        const start = header.length + 1 + i * frameSize;
        const frameBuffer = buffer.subarray(start, start + frameSize);
        frames.push({
            header: frameBuffer.subarray(0, 6).toString('ascii'),
            y: frameBuffer.subarray(6, 6 + 144*80),
            u: frameBuffer.subarray(6 + 144*80, 6 + 144*80 + 144*80/4),
            v: frameBuffer.subarray(6 + 144*80 + 144*80/4, 6 + 144*80 + 144*80/2)
        });
    }

    frames.forEach(frame => {
        expect(frame.header).toStrictEqual('FRAME\n');
    });
});
