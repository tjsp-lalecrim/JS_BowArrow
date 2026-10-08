# Normalize generated transparent art into small sprites with fixed animation anchors.
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$workspace=Split-Path $PSScriptRoot -Parent
$specs=@(
    @{ Input='bubble-generated.png'; Output='bubble.png'; Canvas=32; Width=28; Height=28; Bubble=$true },
    @{ Input='butterfly-open-generated.png'; Output='butterfly_01.png'; Canvas=18; Width=16; Height=14; Bubble=$false },
    @{ Input='butterfly-closed-generated.png'; Output='butterfly_02.png'; Canvas=18; Width=10; Height=14; Bubble=$false }
)
foreach ($spec in $specs) {
    $source=New-Object System.Drawing.Bitmap((Join-Path $workspace ('images/source-art/'+$spec.Input)))
    $minX=$source.Width; $minY=$source.Height; $maxX=-1; $maxY=-1
    for($y=0;$y -lt $source.Height;$y++) {
        for($x=0;$x -lt $source.Width;$x++) {
            if($source.GetPixel($x,$y).A -gt 200) {
                $minX=[Math]::Min($minX,$x); $minY=[Math]::Min($minY,$y)
                $maxX=[Math]::Max($maxX,$x); $maxY=[Math]::Max($maxY,$y)
            }
        }
    }
    if($maxX -lt $minX) { throw ('Empty source: '+$spec.Input) }
    $result=New-Object System.Drawing.Bitmap($spec.Canvas,$spec.Canvas,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics=[System.Drawing.Graphics]::FromImage($result)
    $graphics.CompositingMode=[System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $dest=New-Object System.Drawing.Rectangle(([int](($spec.Canvas-$spec.Width)/2)),2,$spec.Width,$spec.Height)
    $graphics.DrawImage($source,$dest,$minX,$minY,($maxX-$minX+1),($maxY-$minY+1),[System.Drawing.GraphicsUnit]::Pixel)
    $graphics.Dispose()
    if($spec.Bubble) {
        # Trim stray generated pixels to the collision circle and keep the bubble interior clear.
        for($y=0;$y -lt 32;$y++) {
            for($x=0;$x -lt 32;$x++) {
                $distance=[Math]::Sqrt([Math]::Pow($x+0.5-16,2)+[Math]::Pow($y+0.5-16,2))
                if($distance -gt 14 -or $distance -lt 10) { $result.SetPixel($x,$y,[System.Drawing.Color]::Transparent) }
            }
        }
    }
    $result.Save((Join-Path $workspace ('images/'+$spec.Output)),[System.Drawing.Imaging.ImageFormat]::Png)
    $source.Dispose(); $result.Dispose()
    Write-Output ('Built '+$spec.Output)
}
