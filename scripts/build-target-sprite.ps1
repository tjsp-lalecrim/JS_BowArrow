# Normalize generated artwork to the game's 80x80 target cell.
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$workspace=Split-Path $PSScriptRoot -Parent
$source=[Drawing.Bitmap]::new((Join-Path $workspace 'images/source-art/target-angled-reference.png'))
$minX=$source.Width; $minY=$source.Height; $maxX=0; $maxY=0
for($y=0;$y -lt $source.Height;$y++) {
    for($x=0;$x -lt $source.Width;$x++) {
        if($source.GetPixel($x,$y).A -gt 128) {
            $minX=[Math]::Min($minX,$x); $minY=[Math]::Min($minY,$y)
            $maxX=[Math]::Max($maxX,$x); $maxY=[Math]::Max($maxY,$y)
        }
    }
}
$result=[Drawing.Bitmap]::new(80,80,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g=[Drawing.Graphics]::FromImage($result)
$g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.PixelOffsetMode=[Drawing.Drawing2D.PixelOffsetMode]::Half
$g.DrawImage($source,[Drawing.Rectangle]::new(20,0,40,80),$minX,$minY,($maxX-$minX+1),($maxY-$minY+1),[Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
# Match the tilted elliptical silhouette, leaving the transparent corners intact.
for($y=0;$y -lt 80;$y++) {
    for($x=0;$x -lt 80;$x++) {
        if([Math]::Pow(($x+0.5-40)/20,2)+[Math]::Pow(($y+0.5-40)/40,2) -gt 1) {
            $result.SetPixel($x,$y,[Drawing.Color]::Transparent)
        }
    }
}
$result.Save((Join-Path $workspace 'images/target.png'),[Drawing.Imaging.ImageFormat]::Png)
$result.Dispose(); $source.Dispose()