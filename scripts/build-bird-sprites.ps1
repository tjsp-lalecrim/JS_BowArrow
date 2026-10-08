$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$workspace=Split-Path $PSScriptRoot -Parent
foreach($spec in @(@{Name='vulture';W=40;H=28},@{Name='dove';W=32;H=24})) {
    $source=[Drawing.Bitmap]::new((Join-Path $workspace ('images/source-art/'+$spec.Name+'-reference.png')))
    $minX=$source.Width; $minY=$source.Height; $maxX=0; $maxY=0
    for($y=0;$y -lt $source.Height;$y++) {
        for($x=0;$x -lt $source.Width;$x++) {
            if($source.GetPixel($x,$y).A -gt 128) {
                $minX=[Math]::Min($minX,$x); $minY=[Math]::Min($minY,$y)
                $maxX=[Math]::Max($maxX,$x); $maxY=[Math]::Max($maxY,$y)
            }
        }
    }
    $result=[Drawing.Bitmap]::new($spec.W,$spec.H,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g=[Drawing.Graphics]::FromImage($result)
    $g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g.PixelOffsetMode=[Drawing.Drawing2D.PixelOffsetMode]::Half
    $g.DrawImage($source,[Drawing.Rectangle]::new(1,1,($spec.W-2),($spec.H-2)),$minX,$minY,($maxX-$minX+1),($maxY-$minY+1),[Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $result.Save((Join-Path $workspace ('images/'+$spec.Name+'.png')),[Drawing.Imaging.ImageFormat]::Png)
    $result.Dispose(); $source.Dispose()
}