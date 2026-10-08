# Resize the generated character into the existing 64x64 bow cell.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$workspace = Split-Path $PSScriptRoot -Parent
$source = [Drawing.Bitmap]::new((Join-Path $workspace 'images/source-art/archer-reference.png'))
$minX=$source.Width; $minY=$source.Height; $maxX=0; $maxY=0
for($y=0;$y -lt $source.Height;$y++) {
    for($x=0;$x -lt $source.Width;$x++) {
        if($source.GetPixel($x,$y).A -gt 128) {
            $minX=[Math]::Min($minX,$x); $maxX=[Math]::Max($maxX,$x)
            $minY=[Math]::Min($minY,$y); $maxY=[Math]::Max($maxY,$y)
        }
    }
}
$result = [Drawing.Bitmap]::new(64,64,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [Drawing.Graphics]::FromImage($result)
$graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::Half
# Hand meets the existing bow grip near (42,32); feet stay inside the cell.
$graphics.DrawImage($source,[Drawing.Rectangle]::new(2,15,41,47),$minX,$minY,($maxX-$minX+1),($maxY-$minY+1),[Drawing.GraphicsUnit]::Pixel)
$graphics.Dispose()
$result.Save((Join-Path $workspace 'images/archer.png'),[Drawing.Imaging.ImageFormat]::Png)
$preview = [Drawing.Bitmap]::new(384,384)
$g = [Drawing.Graphics]::FromImage($preview)
$g.Clear([Drawing.Color]::ForestGreen)
$g.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::Half
$g.DrawImage($result,0,0,384,384)
$bow = [Drawing.Bitmap]::new((Join-Path $workspace 'images/bow.png'))
$g.DrawImage($bow,0,60,384,264)
$g.Dispose()
$preview.Save((Join-Path $workspace 'images/source-art/archer-preview.png'),[Drawing.Imaging.ImageFormat]::Png)
$preview.Dispose(); $bow.Dispose(); $result.Dispose(); $source.Dispose()