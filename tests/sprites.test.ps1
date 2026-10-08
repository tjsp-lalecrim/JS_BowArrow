$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$workspace = Split-Path $PSScriptRoot -Parent
$count=0
foreach ($file in Get-ChildItem (Join-Path $workspace 'images/originals') -Filter *.png) {
    $before=New-Object System.Drawing.Bitmap($file.FullName)
    $after=New-Object System.Drawing.Bitmap((Join-Path $workspace ('images/'+$file.Name)))
    if ($before.Width -ne $after.Width -or $before.Height -ne $after.Height) { throw ('Dimensions changed: '+$file.Name) }
    $changed=0
    for ($y=0;$y -lt $before.Height;$y++) {
        for ($x=0;$x -lt $before.Width;$x++) {
            $a=$before.GetPixel($x,$y);$b=$after.GetPixel($x,$y)
            if ($a.A -ne $b.A) { throw ('Alpha changed: '+$file.Name+' at '+$x+','+$y) }
            if ($a.ToArgb() -ne $b.ToArgb()) { $changed++ }
        }
    }
    if ($changed -eq 0) { throw ('No visual refinement: '+$file.Name) }
    Write-Output ('PASS '+$file.Name+': '+$after.Width+'x'+$after.Height+', identical alpha mask, '+$changed+' refined pixels')
    $before.Dispose();$after.Dispose();$count++
}
if ($count -ne 13) { throw 'Expected 13 sprite pairs.' }
foreach ($spec in @(@{Name='fireball.png';Size=40;Height=24},@{Name='target.png';Size=80},@{Name='slime.png';Size=32;Height=24},@{Name='archer.png';Size=64},@{Name='bubble.png';Size=32},@{Name='butterfly_01.png';Size=18},@{Name='butterfly_02.png';Size=18})) {
    $image=New-Object System.Drawing.Bitmap((Join-Path $workspace ('images/'+$spec.Name)))
    $expectedHeight=if($spec.Height) { $spec.Height } else { $spec.Size }; if($image.Width -ne $spec.Size -or $image.Height -ne $expectedHeight) { throw ('Invalid size: '+$spec.Name) }
    $visible=0
    for($y=0;$y -lt $image.Height;$y++) {
        for($x=0;$x -lt $image.Width;$x++) {
            $alpha=$image.GetPixel($x,$y).A
            if($alpha -gt 0) { $visible++ }
            if($spec.Name -eq 'bubble.png') {
                $distance=[Math]::Sqrt([Math]::Pow($x+0.5-16,2)+[Math]::Pow($y+0.5-16,2))
                if(($distance -gt 14 -or $distance -lt 10) -and $alpha -gt 0) { throw 'Bubble alpha does not match collision circle.' }
            }
        }
    }
    if($visible -lt 20) { throw ('Empty sprite: '+$spec.Name) }
    if($image.GetPixel(0,0).A -ne 0 -or $image.GetPixel($image.Width-1,$image.Height-1).A -ne 0) { throw ('Opaque corner: '+$spec.Name) }
    Write-Output ('PASS '+$spec.Name+': dimensions and transparency')
    $image.Dispose()
}
