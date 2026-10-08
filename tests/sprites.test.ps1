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
