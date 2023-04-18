import {path as ffmpegPath} from '@ffmpeg-installer/ffmpeg';
import {YuvParser} from '../parser';
import {lastValueFrom, map, skip, take} from 'rxjs';
import {scaleBilinear} from '../operators';

it('downscales with bilinear interpolation', async () => {
    const basename = `${__dirname}/resources/stream`;
    const input = `concat:${basename}-2.0.m4s|${basename}-2.2.m4s`;

    const frame = await lastValueFrom(new YuvParser({
        ffmpeg: ffmpegPath
    }).read(input).pipe(
        skip(5),
        take(1),
        map(scaleBilinear(72)),
    ));
    expect(frame.header.width).toStrictEqual(72);
    expect(frame.header.height).toStrictEqual(40);
    expect(frame.colorPlanes.y.data[42*42]).toStrictEqual(50);
    expect(frame.colorPlanes.u.data[42*42/4]).toStrictEqual(130);
    expect(frame.colorPlanes.v.data[42*42/4]).toStrictEqual(123);
});
