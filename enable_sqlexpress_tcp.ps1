# Yönetici olarak çalıştırın!
# Bu script SQLEXPRESS için TCP/IP'yi açar ve port 1433'e ayarlar

$regPath = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL17.SQLEXPRESS\MSSQLServer\SuperSocketNetLib\Tcp"

# TCP protokolünü etkinleştir
Set-ItemProperty -Path $regPath -Name "Enabled" -Value 1 -Type DWord

# IPAll için sabit port 1433 ayarla, dinamik portu temizle
$ipAllPath = "$regPath\IPAll"
Set-ItemProperty -Path $ipAllPath -Name "TcpPort" -Value "1433" -Type String
Set-ItemProperty -Path $ipAllPath -Name "TcpDynamicPorts" -Value "" -Type String

Write-Host "TCP/IP etkinlestirildi, port 1433 ayarlandi." -ForegroundColor Green

# SQL Server Express servisini yeniden başlat
Write-Host "SQL Server Express yeniden baslatiliyor..." -ForegroundColor Yellow
Restart-Service -Name "MSSQL`$SQLEXPRESS" -Force
Write-Host "Servis yeniden baslatildi." -ForegroundColor Green

# SQL Server Browser servisini başlat (instance discovery için)
Set-Service -Name "SQLBrowser" -StartupType Automatic
Start-Service -Name "SQLBrowser" -ErrorAction SilentlyContinue
Write-Host "SQL Server Browser baslatildi." -ForegroundColor Green

Write-Host ""
Write-Host "Artik 'node server.js' calistirilabilir!" -ForegroundColor Cyan
