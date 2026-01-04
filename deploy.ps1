# Deploy to Production - v2601.4

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AM Manager v2601.4 Deployment" -ForegroundColor Cyan
Write-Host "  Multi-Language Support" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Install dependencies
Write-Host "[1/6] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error installing dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 2: Generate Prisma Client
Write-Host "[2/6] Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error generating Prisma client" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Prisma Client generated" -ForegroundColor Green
Write-Host ""

# Step 3: Run database migration
Write-Host "[3/6] Running database migration..." -ForegroundColor Yellow
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error running migration" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Database migrated" -ForegroundColor Green
Write-Host ""

# Step 4: Build application
Write-Host "[4/6] Building application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error building application" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Application built" -ForegroundColor Green
Write-Host ""

# Step 5: Git commit
Write-Host "[5/6] Committing changes..." -ForegroundColor Yellow
git add .
git commit -m "feat: Add multi-language support (v2601.4) - 6 languages + timezone preferences + password recovery fix"
Write-Host "✓ Changes committed" -ForegroundColor Green
Write-Host ""

# Step 6: Push to repository
Write-Host "[6/6] Pushing to repository..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error pushing to repository" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Pushed to repository" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Vercel will automatically deploy the changes"
Write-Host "2. Monitor the deployment at https://vercel.com"
Write-Host "3. Test the application after deployment"
Write-Host ""
