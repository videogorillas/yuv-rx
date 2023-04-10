import {path as ffmpegPath} from '@ffmpeg-installer/ffmpeg';
import {YuvParser} from '../parser';
import {lastValueFrom, map, toArray} from 'rxjs';
import {toRGB, toRGBInterleaved} from '../color';

function buffersDiff(b1: Buffer, b2: Buffer, ignoreThreshold?: number) {
    const threshold = ignoreThreshold ?? 0;
    if (b1.length != b2.length) {
        throw `Buffer lengths do not match: ${b1.length}, ${b2.length}`;
    }
    const diffs = [];
    for (let i = 0; i < b1.length; i++) {
        if (Math.abs(b1[i] - b2[i]) > threshold) {
            diffs.push({
                position: i,
                value1: b1[i],
                value2: b2[i]
            });
        }
    }
    return diffs;
}

it('converts yuv to rgb', async () => {
    const frames = await lastValueFrom(new YuvParser({
        ffmpeg: ffmpegPath
    }).read(`${__dirname}/resources/colors.mp4`).pipe(
        map(toRGB),
        toArray()
    ));
    expect(frames.length).toStrictEqual(6);
    expect(buffersDiff(Buffer.alloc(256, 0), frames[0].colorPlanes.r.data, 1)).toStrictEqual([]);
    expect(buffersDiff(Buffer.alloc(256, 0), frames[0].colorPlanes.g.data, 1)).toStrictEqual([]);
    expect(buffersDiff(Buffer.alloc(256, 0), frames[0].colorPlanes.b.data, 1)).toStrictEqual([]);

    expect(buffersDiff(Buffer.alloc(256, 0xff), frames[1].colorPlanes.r.data, 1)).toStrictEqual([]);
    expect(buffersDiff(Buffer.alloc(256, 0xff), frames[1].colorPlanes.g.data, 1)).toStrictEqual([]);
    expect(buffersDiff(Buffer.alloc(256, 0xff), frames[1].colorPlanes.b.data, 1)).toStrictEqual([]);

    expect(buffersDiff(Buffer.alloc(256, 0xff), frames[2].colorPlanes.r.data, 1)).toStrictEqual([]);
    expect(buffersDiff(Buffer.alloc(256, 0), frames[2].colorPlanes.g.data, 1)).toStrictEqual([]);
    expect(buffersDiff(Buffer.alloc(256, 0), frames[2].colorPlanes.b.data, 1)).toStrictEqual([]);

    expect(buffersDiff(Buffer.alloc(256, 0), frames[3].colorPlanes.r.data, 1)).toStrictEqual([]);
    expect(buffersDiff(Buffer.alloc(256, 0xff), frames[3].colorPlanes.g.data, 1)).toStrictEqual([]);
    expect(buffersDiff(Buffer.alloc(256, 0), frames[3].colorPlanes.b.data, 1)).toStrictEqual([]);

    expect(buffersDiff(Buffer.alloc(256, 0), frames[4].colorPlanes.r.data, 1)).toStrictEqual([]);
    expect(buffersDiff(Buffer.alloc(256, 0), frames[4].colorPlanes.g.data, 1)).toStrictEqual([]);
    expect(buffersDiff(Buffer.alloc(256, 0xff), frames[4].colorPlanes.b.data, 1)).toStrictEqual([]);

    expect(buffersDiff(Buffer.alloc(256, 0x42), frames[5].colorPlanes.r.data, 1)).toStrictEqual([]);
    expect(buffersDiff(Buffer.alloc(256, 0x19), frames[5].colorPlanes.g.data, 1)).toStrictEqual([]);
    expect(buffersDiff(Buffer.alloc(256, 0x84), frames[5].colorPlanes.b.data, 1)).toStrictEqual([]);
});

it('converts yuv to interleaved rgb', async () => {
    const frames = await lastValueFrom(new YuvParser({
        ffmpeg: ffmpegPath
    }).read(`${__dirname}/resources/colors.mp4`).pipe(
        map(toRGBInterleaved),
        toArray()
    ));
    expect(frames.length).toStrictEqual(6);
    expect(buffersDiff(Buffer.alloc(256 * 3, Buffer.from([0, 0, 0])), frames[0].colorPlanes.rgb.data, 1)).toStrictEqual([]);
    expect(buffersDiff(Buffer.alloc(256 * 3, Buffer.from([0xff, 0xff, 0xff])), frames[1].colorPlanes.rgb.data, 1)).toStrictEqual([]);
    expect(buffersDiff(Buffer.alloc(256 * 3, Buffer.from([0xff, 0, 0])), frames[2].colorPlanes.rgb.data, 1)).toStrictEqual([]);
    expect(buffersDiff(Buffer.alloc(256 * 3, Buffer.from([0, 0xff, 0])), frames[3].colorPlanes.rgb.data, 1)).toStrictEqual([]);
    expect(buffersDiff(Buffer.alloc(256 * 3, Buffer.from([0, 0, 0xff])), frames[4].colorPlanes.rgb.data, 1)).toStrictEqual([]);
    expect(buffersDiff(Buffer.alloc(256 * 3, Buffer.from([0x42, 0x19, 0x84])), frames[5].colorPlanes.rgb.data, 1)).toStrictEqual([]);
});
