# Derive consistent palettes from ImageGen references, preserving every original alpha pixel.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$workspace = Split-Path $PSScriptRoot -Parent
function Get-Luminance($color) { return 0.2126*$color.R + 0.7152*$color.G + 0.0722*$color.B }
function Get-Palette($path, $kind) {
    $image = New-Object System.Drawing.Bitmap($path)
    $colors = @{}
    for ($y=0; $y -lt $image.Height; $y+=4) {
        for ($x=0; $x -lt $image.Width; $x+=4) {
            $c=$image.GetPixel($x,$y)
            if ($c.A -lt 200) { continue }
            $accept = switch ($kind) {
                'red' { $c.R -gt 1.25*$c.G -and $c.R -gt 1.25*$c.B }
                'gold' { $c.R -gt 1.05*$c.G -and $c.G -gt 1.3*$c.B }
                'steel' { [Math]::Max($c.R,[Math]::Max($c.G,$c.B)) - [Math]::Min($c.R,[Math]::Min($c.G,$c.B)) -lt 25 -and $c.R -gt 35 }
            }
            if ($accept) { $colors[$c.ToArgb()]=$c }
        }
    }
    $image.Dispose()
    $sorted = @($colors.Values | Sort-Object { Get-Luminance $_ })
    if ($sorted.Count -lt 4) { throw "Insufficient $kind colors in $path" }
    return @(0.08,0.25,0.45,0.65,0.85,0.98 | ForEach-Object { $sorted[[int](($_)*($sorted.Count-1))] })
}
$palettes = @{
    gold = Get-Palette (Join-Path $workspace 'images/source-art/bow-reference.png') 'gold'
    red = Get-Palette (Join-Path $workspace 'images/source-art/balloon-reference.png') 'red'
    steel = Get-Palette (Join-Path $workspace 'images/source-art/arrow-reference.png') 'steel'
}
foreach ($file in Get-ChildItem (Join-Path $workspace 'images/originals') -Filter *.png) {
    $original = New-Object System.Drawing.Bitmap($file.FullName)
    $result = New-Object System.Drawing.Bitmap($original.Width,$original.Height,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $groups = @{ gold=@{}; red=@{}; steel=@{} }
    for ($y=0; $y -lt $original.Height; $y++) {
        for ($x=0; $x -lt $original.Width; $x++) {
            $c=$original.GetPixel($x,$y)
            if ($c.A -eq 0) { continue }
            $kind = if ($file.Name -like 'baloon*' -and $c.R -gt 1.15*$c.G) { 'red' } elseif ($file.Name -like 'bow*' -and $c.G -gt 1.3*$c.B -and $c.R -gt 1.05*$c.B) { 'gold' } else { 'steel' }
            $groups[$kind][$c.ToArgb()]=$c
        }
    }
    $mapping=@{}
    foreach ($kind in @('gold','red','steel')) {
        $sorted=@($groups[$kind].Values | Sort-Object { Get-Luminance $_ })
        for ($i=0;$i -lt $sorted.Count;$i++) {
            $index=if ($sorted.Count -eq 1) { 3 } else { [int][Math]::Round(5*$i/($sorted.Count-1)) }
            $mapping[$sorted[$i].ToArgb()]=$palettes[$kind][$index]
        }
    }
    for ($y=0; $y -lt $original.Height; $y++) {
        for ($x=0; $x -lt $original.Width; $x++) {
            $c=$original.GetPixel($x,$y)
            if ($c.A -gt 0) {
                $replacement=$mapping[$c.ToArgb()]
                $result.SetPixel($x,$y,[System.Drawing.Color]::FromArgb($c.A,$replacement.R,$replacement.G,$replacement.B))
            } else { $result.SetPixel($x,$y,$c) }
        }
    }
    $destination=Join-Path $workspace ('images/'+$file.Name)
    $result.Save($destination,[System.Drawing.Imaging.ImageFormat]::Png)
    $original.Dispose(); $result.Dispose()
    Write-Output ('Refined '+$file.Name)
}
