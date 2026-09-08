@echo off
:: Bu dosyayi SAG TIKLAYIP "Yönetici olarak çalıştır" ile açın!
:: Tek seferlik kurulum scripti

echo ============================================
echo   İzin Takip Sistemi - SQL Server Kurulumu
echo ============================================
echo.

:: MSSQL17 veya MSSQL16 instance'ını bul
set REG_PATH=HKLM\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL17.SQLEXPRESS\MSSQLServer\SuperSocketNetLib\Tcp
reg query "%REG_PATH%" >nul 2>&1
if errorlevel 1 (
  set REG_PATH=HKLM\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL16.SQLEXPRESS\MSSQLServer\SuperSocketNetLib\Tcp
  reg query "%REG_PATH%" >nul 2>&1
  if errorlevel 1 (
    set REG_PATH=HKLM\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL15.SQLEXPRESS\MSSQLServer\SuperSocketNetLib\Tcp
  )
)

echo [1/4] TCP/IP protokolu aktif ediliyor...
reg add "%REG_PATH%" /v Enabled /t REG_DWORD /d 1 /f >nul 2>&1
reg add "%REG_PATH%\IPAll" /v TcpPort /t REG_SZ /d "1433" /f >nul 2>&1
reg add "%REG_PATH%\IPAll" /v TcpDynamicPorts /t REG_SZ /d "" /f >nul 2>&1
echo     OK.

echo [2/4] SQL Server Express yeniden baslatiliyor...
net stop "MSSQL$SQLEXPRESS" /y >nul 2>&1
net start "MSSQL$SQLEXPRESS" >nul 2>&1
echo     OK.

echo [3/4] SQL Server Browser baslatiliyor...
sc config SQLBrowser start= auto >nul 2>&1
net start SQLBrowser >nul 2>&1
echo     OK.

echo [4/4] Guvenlik duvari kurali ekleniyor...
netsh advfirewall firewall add rule name="SQL Server 1433" protocol=TCP dir=in localport=1433 action=allow >nul 2>&1
echo     OK.

echo.
echo ============================================
echo   KURULUM TAMAMLANDI!
echo   Simdi backend klasoründe "node server.js"
echo   komutunu çalistirabilirsiniz.
echo ============================================
echo.
pause
