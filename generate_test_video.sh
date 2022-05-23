#!/bin/bash
mkdir tmp
convert -size 16x16 xc:#000000 tmp/f00.png
convert -size 16x16 xc:#ffffff tmp/f01.png
convert -size 16x16 xc:#ff0000 tmp/f02.png
convert -size 16x16 xc:#00ff00 tmp/f03.png
convert -size 16x16 xc:#0000ff tmp/f04.png
convert -size 16x16 xc:#421984 tmp/f05.png
ffmpeg -framerate 24 -i tmp/f%02d.png -pix_fmt yuv420p -c:v libx264 -intra colors.mp4
rm -rf tmp

