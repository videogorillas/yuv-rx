# yuv-rx
JavaScript library for reading videos as Rx Observables of decoded frames

Example usage: reading a frame at 0:42, converting to RGB, and encoding it as a base64 encoded PNG image with `sharp`

```typescript
import {Observable, from, take, map, concatMap} from 'rxjs';
import {toRGBInterleaved, YuvParser} from 'yuv-rx';
const sharp = require('sharp');

const yuvParser = new YuvParser({
    ffmpeg: '/usr/local/bin/ffmpeg', // optional path, defaults to 'ffmpeg'
    verbose: true
});
yuvParser.read('input.mp4', {
    videoStream: 1,  // select second video stream of input file
    seekSeconds: 42, // skip 42 seconds without decoding
    vframes: 1       // only decode 1 frame
}).pipe(
    take(1),
    map(toRGBInterleaved),
    concatMap(frame => {
        return from(sharp(frame.colorPlanes.rgb.data, {
            raw: {
                width: frame.header.width,
                height: frame.header.height,
                channels: 3,
                premultiplied: false
            }
        }).png().toBuffer().then(b => b.toString('base64')));
    })
).subscribe({
    next: base64frame => console.log(base64frame)
});
```

© VideoGorillas LLC 2022
