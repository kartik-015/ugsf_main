#!/bin/bash
# Pre-Deployment Security Check Script
# Run this before deploying to Vercel to ensure no secrets or sensitive files are exposed

echo "🔒 Pre-Deployment Security Verification"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0
WARNINGS=0

# Check 1: .env file exists and should not be in git
echo "✓ Checking .env file security..."
if [ -f ".env" ]; then
    if grep -q "\.env$" .gitignore; then
        echo -e "${GREEN}✓ .env properly ignored in git${NC}"
    else
        echo -e "${RED}✗ WARNING: .env might be tracked by git${NC}"
        git check-ignore .env || echo -e "${RED}  Add '.env' to .gitignore!${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠ No .env file found (expected for Vercel)${NC}"
fi
echo ""

# Check 2: .env.example exists but has no values
echo "✓ Checking .env.example template..."
if [ -f ".env.example" ]; then
    if grep -q "=" .env.example; then
        if ! grep '=.*[a-zA-Z0-9]' .env.example 2>/dev/null | grep -v "^#"; then
            echo -e "${GREEN}✓ .env.example has no sensitive values${NC}"
        else
            echo -e "${RED}✗ CRITICAL: .env.example contains actual values!${NC}"
            ((FAILED++))
        fi
    fi
else
    echo -e "${YELLOW}⚠ .env.example not found${NC}"
fi
echo ""

# Check 3: No credentials in code files
echo "✓ Scanning for hardcoded credentials..."
CREDENTIALS_FOUND=0
for file in $(find src lib -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" 2>/dev/null); do
    if grep -iE "(password|secret|token|key)\s*[:=]\s*['\"].*['\"]" "$file" 2>/dev/null | grep -v "mustChangePassword" | grep -v "messagePassword"; then
        echo -e "${RED}✗ Found hardcoded credential in $file${NC}"
        ((CREDENTIALS_FOUND++))
    fi
done

if [ $CREDENTIALS_FOUND -eq 0 ]; then
    echo -e "${GREEN}✓ No hardcoded credentials found${NC}"
else
    echo -e "${RED}✗ CRITICAL: $CREDENTIALS_FOUND files contain hardcoded values${NC}"
    ((FAILED++))
fi
echo ""

# Check 4: .gitignore includes sensitive patterns
echo "✓ Checking .gitignore..."
REQUIRED_PATTERNS=(".env" "credentials" "real data" "*.md")
for pattern in "${REQUIRED_PATTERNS[@]}"; do
    if grep -q "$(echo "$pattern" | sed 's/\*/\\*/g')" .gitignore; then
        echo -e "${GREEN}✓ Pattern '$pattern' in .gitignore${NC}"
    else
        echo -e "${YELLOW}⚠ Pattern '$pattern' not in .gitignore${NC}"
        ((WARNINGS++))
    fi
done
echo ""

# Check 5: .vercelignore exists
echo "✓ Checking .vercelignore..."
if [ -f ".vercelignore" ]; then
    IGNORE_COUNT=$(wc -l < .vercelignore)
    echo -e "${GREEN}✓ .vercelignore exists ($IGNORE_COUNT rules)${NC}"
    
    # Verify key patterns are excluded
    if grep -q "^\*\.md" .vercelignore; then
        echo -e "${GREEN}✓ Markdown files excluded${NC}"
    else
        echo -e "${YELLOW}⚠ Markdown files not explicitly excluded${NC}"
        ((WARNINGS++))
    fi
    
    if grep -q "^scripts/" .vercelignore; then
        echo -e "${GREEN}✓ Scripts folder excluded${NC}"
    else
        echo -e "${YELLOW}⚠ Scripts folder not excluded${NC}"
        ((WARNINGS++))
    fi
    
    if grep -q "real.*data" .vercelignore; then
        echo -e "${GREEN}✓ Real data excluded${NC}"
    else
        echo -e "${YELLOW}⚠ Real data not excluded${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}✗ .vercelignore not found${NC}"
    ((FAILED++))
fi
echo ""

# Check 6: Production build succeeds
echo "✓ Testing production build..."
if npm run build > /dev/null 2>&1; then
    BUILD_SIZE=$(du -sh .next 2>/dev/null | cut -f1)
    echo -e "${GREEN}✓ Build successful (size: $BUILD_SIZE)${NC}"
else
    echo -e "${RED}✗ Build failed - fix errors before deploying${NC}"
    npm run build
    ((FAILED++))
fi
echo ""

# Check 7: No console.log or debug statements
echo "✓ Scanning for debug statements..."
DEBUG_FOUND=0
for file in $(find src lib -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" 2>/dev/null); do
    if grep -E "(console\.(log|debug)|debugger)" "$file" 2>/dev/null; then
        echo -e "${YELLOW}⚠ Found debug statement in $file${NC}"
        ((DEBUG_FOUND++))
    fi
done

if [ $DEBUG_FOUND -eq 0 ]; then
    echo -e "${GREEN}✓ No debug statements found${NC}"
else
    echo -e "${YELLOW}⚠ Found $DEBUG_FOUND debug statements (remove before prod)${NC}"
    ((WARNINGS++))
fi
echo ""

# Check 8: vercel.json exists with security config
echo "✓ Checking vercel.json..."
if [ -f "vercel.json" ]; then
    if grep -q "X-Content-Type-Options" vercel.json; then
        echo -e "${GREEN}✓ vercel.json includes security headers${NC}"
    else
        echo -e "${YELLOW}⚠ vercel.json missing security headers${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠ vercel.json not found${NC}"
fi
echo ""

# Check 9: No .vercel folder in git
echo "✓ Checking .vercel folder..."
if grep -q "\.vercel" .gitignore; then
    echo -e "${GREEN}✓ .vercel properly ignored${NC}"
else
    echo -e "${YELLOW}⚠ .vercel not ignored (should add to .gitignore)${NC}"
    ((WARNINGS++))
fi
echo ""

# Check 10: Node version compatibility
echo "✓ Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
    echo -e "${GREEN}✓ Node.js version compatible (v$NODE_VERSION)${NC}"
else
    echo -e "${YELLOW}⚠ Node.js version might have compatibility issues${NC}"
    ((WARNINGS++))
fi
echo ""

# Summary
echo "========================================"
echo "🔒 Security Check Summary"
echo "========================================"

if [ $FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL CHECKS PASSED - Ready for Vercel deployment!${NC}"
    exit 0
elif [ $FAILED -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warnings found - Review before deploying${NC}"
    exit 0
else
    echo -e "${RED}✗ $FAILED critical issues found - DO NOT DEPLOY${NC}"
    echo -e "${YELLOW}⚠ $WARNINGS additional warnings${NC}"
    exit 1
fi
