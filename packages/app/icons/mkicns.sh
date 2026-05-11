sips -z 819 819 sessionry-1024x1024.png --out sessionry-out.png
sips --padToHeightWidth 1024 1024 sessionry-out.png --out sessionry-1024x1024-padded.png

# Create iconset directory
mkdir -p build.iconset

# Generate icons for each resolution
sips -z 16 16 sessionry-1024x1024-padded.png --out build.iconset/icon_16x16.png
sips -z 32 32 sessionry-1024x1024-padded.png --out build.iconset/icon_16x16@2x.png
sips -z 32 32 sessionry-1024x1024-padded.png --out build.iconset/icon_32x32.png
sips -z 64 64 sessionry-1024x1024-padded.png --out build.iconset/icon_32x32@2x.png
sips -z 128 128 sessionry-1024x1024-padded.png --out build.iconset/icon_128x128.png
sips -z 256 256 sessionry-1024x1024-padded.png --out build.iconset/icon_128x128@2x.png
sips -z 256 256 sessionry-1024x1024-padded.png --out build.iconset/icon_256x256.png
sips -z 512 512 sessionry-1024x1024-padded.png --out build.iconset/icon_256x256@2x.png
sips -z 512 512 sessionry-1024x1024-padded.png --out build.iconset/icon_512x512.png
cp sessionry-1024x1024-padded.png build.iconset/icon_512x512@2x.png

# Generate .icns file
iconutil -c icns build.iconset --output sessionry.icns

rm -rf sessionry-out.png
rm -rf build.iconset