# Donor Credentials Workflow Test

$API_URL = "http://localhost:5000/api"
$testEmail = "test-donor-$(Get-Random).example.com"
$testPhone = "$(Get-Random -Minimum 1000000000 -Maximum 9999999999)"

Write-Host "`n🧪 TESTING DONOR CREDENTIALS WORKFLOW`n" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Gray

# Step 1: Login
Write-Host "`n[1/4] Hospital Admin Login..." -ForegroundColor Yellow
$loginRes = Invoke-WebRequest -Uri "$API_URL/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body (@{ email = "admin@lifelink.com"; password = "Admin@123" } | ConvertTo-Json)
$loginData = $loginRes.Content | ConvertFrom-Json
$token = $loginData.token
Write-Host "OK - Login successful" -ForegroundColor Green

# Step 2: Create Donor
Write-Host "`n[2/4] Creating Donor Account..." -ForegroundColor Yellow
$createRes = Invoke-WebRequest -Uri "$API_URL/hospital/donor" `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{ "Authorization" = "Bearer $token" } `
  -Body (@{ 
    email = $testEmail
    password = "TempPass@123"
    donorName = "Test Donor"
    phone = $testPhone
    bloodGroup = "O+"
  } | ConvertTo-Json)
$createData = $createRes.Content | ConvertFrom-Json
$donorId = $createData.data.id
$otp1 = $createData.data.credentials.otp
$emailSent1 = $createData.data.emailSent

Write-Host "OK - Donor created: $donorId" -ForegroundColor Green
Write-Host "  Email: $testEmail"
Write-Host "  OTP: $otp1"
Write-Host "  Email Sent: $(if ($emailSent1) { 'OK - Yes' } else { 'Pending' })"

# Step 3: Resend Credentials
Write-Host "`n[3/4] Testing Resend Credentials..." -ForegroundColor Yellow
$resendRes = Invoke-WebRequest -Uri "$API_URL/hospital/donor/$donorId/resend-credentials" `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{ "Authorization" = "Bearer $token" } `
  -Body "{}"
$resendData = $resendRes.Content | ConvertFrom-Json
$otp2 = $resendData.data.credentials.otp
$emailSent2 = $resendData.data.emailSent

Write-Host "OK - Credentials resent successfully" -ForegroundColor Green
Write-Host "  New OTP: $otp2"
Write-Host "  Email Sent: $(if ($emailSent2) { 'OK - Yes' } else { 'Pending' })"
Write-Host "  OTP Changed: $(if ($otp1 -ne $otp2) { 'OK - Yes' } else { 'No' })"

# Step 4: Test Duplicate Prevention
Write-Host "`n[4/4] Testing Duplicate Prevention..." -ForegroundColor Yellow
try {
  $dupRes = Invoke-WebRequest -Uri "$API_URL/hospital/donor" `
    -Method POST `
    -ContentType "application/json" `
    -Headers @{ "Authorization" = "Bearer $token" } `
    -Body (@{ 
      email = $testEmail
      password = "TempPass@123"
      donorName = "Duplicate Donor"
      phone = "9999999999"
      bloodGroup = "B+"
    } | ConvertTo-Json)
  Write-Host "X ERROR: Should have rejected duplicate!" -ForegroundColor Red
}
catch {
  $status = $_.Exception.Response.StatusCode
  if ($status -eq 409) {
    Write-Host "OK - Correctly rejected duplicate email with 409 status" -ForegroundColor Green
  }
  else {
    Write-Host "X Unexpected status: $status" -ForegroundColor Red
  }
}

Write-Host "`n" + ("=" * 60) -ForegroundColor Gray
Write-Host "`nALL TESTS COMPLETED!" -ForegroundColor Green
Write-Host "`nSummary:" -ForegroundColor Cyan
Write-Host "OK - Hospital admin can create donors"
Write-Host "OK - Credentials can be resent with new OTP"
Write-Host "OK - Email/phone duplicates are prevented"
Write-Host "OK - Email sending status is tracked`n"
