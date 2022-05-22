import {yuv4mpegStream} from '../reader';
import {toArray, map} from 'rxjs';

it('reads a video', done => {
    let tested = false;
    yuv4mpegStream('/usr/local/bin/ffmpeg', `${__dirname}/resources/colors.mp4`).pipe(
        toArray(),
        map(buffers => Buffer.concat(buffers))
    ).subscribe({
        next: buffer => {
            const chunks = buffer.toString().split('\n');
            expect(chunks.length).toStrictEqual(8); // header + 6 frames + split at first frame header
            const header = chunks[0].toString();
            expect(header.slice(0, 10)).toStrictEqual('YUV4MPEG2 ');
            expect(buffer.length).toStrictEqual(header.length + 1 + 6 * (5 + 1 + 384));
            const frames = [];
            for (let i = 0; i < 6; i++) {
                const start = header.length + 1 + i * 390;
                const frameBuffer = buffer.subarray(start, start + 390)
                frames.push({
                    header: frameBuffer.subarray(0, 6).toString(),
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

            tested = true;
        },
        error: err => {
            console.error(err);
            throw err;
        },
        complete: () => {
            if (tested) {
                done();
            } else {
                throw 'completed without emitting data';
            }
        }
    })
});
