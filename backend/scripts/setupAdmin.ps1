$ErrorActionPreference = 'Stop'
$adminEmail = Read-Host 'Admin email (Enter for adminsafeher@gmail.com)'
if ([string]::IsNullOrWhiteSpace($adminEmail)) { $adminEmail = 'adminsafeher@gmail.com' }
$adminSecret = Read-Host 'Choose admin password (at least 12 characters)' -AsSecureString
$adminConfirmation = Read-Host 'Confirm admin password' -AsSecureString
$firstPointer = [IntPtr]::Zero
$secondPointer = [IntPtr]::Zero
try {
    $firstPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminSecret)
    $secondPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminConfirmation)
    $firstValue = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($firstPointer)
    $secondValue = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secondPointer)
    if ($firstValue -cne $secondValue) { throw 'Passwords do not match. Run the command again.' }
    @{ email = $adminEmail.Trim(); password = $firstValue } | ConvertTo-Json -Compress | & node (Join-Path $PSScriptRoot 'setupAdmin.js')
    if ($LASTEXITCODE -ne 0) { throw 'Admin setup failed. No password was printed.' }
} finally {
    if ($firstPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($firstPointer) }
    if ($secondPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secondPointer) }
    $firstValue = $null
    $secondValue = $null
    $adminSecret.Dispose()
    $adminConfirmation.Dispose()
}
