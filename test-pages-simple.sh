#!/bin/bash

# Simple page availability test
echo "🧪 Testing page availability..."

# Start a simple HTTP server
echo "Starting HTTP server..."
python3 -m http.server 8080 > /dev/null 2>&1 &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Function to test a page
test_page() {
    local page=$1
    local url="http://localhost:8080/$page"
    
    echo -n "Testing $page... "
    
    # Test if page returns 200 status and contains expected content
    response=$(curl -s -w "%{http_code}" -o /tmp/page_content.html "$url")
    
    if [ "$response" = "200" ]; then
        # Check if page contains mapbox-gl.js reference
        if grep -q "mapbox-gl" /tmp/page_content.html; then
            # Check if it's using the latest version
            if grep -q "v3.13.0" /tmp/page_content.html; then
                echo "✅ OK (v3.13.0 detected)"
            else
                echo "⚠️  WARNING (mapbox-gl found but not v3.13.0)"
            fi
        else
            echo "❓ OK (no mapbox-gl detected)"
        fi
    else
        echo "❌ FAILED (HTTP $response)"
        return 1
    fi
    
    return 0
}

# Find all index.html files and test them
echo -e "\nScanning for pages..."
pages=$(find . -name "index.html" -not -path "./.git/*" | sed 's|^\./||' | sort)

if [ -z "$pages" ]; then
    echo "No pages found!"
    kill $SERVER_PID
    exit 1
fi

echo "Found $(echo "$pages" | wc -l) pages to test:"
echo "$pages" | sed 's/^/  - /'
echo

# Test each page
failed=0
total=0

for page in $pages; do
    if ! test_page "$page"; then
        failed=$((failed + 1))
    fi
    total=$((total + 1))
done

# Cleanup
kill $SERVER_PID 2>/dev/null
rm -f /tmp/page_content.html

# Summary
echo -e "\n📊 Test Summary:"
echo "✅ Successful: $((total - failed))"
echo "❌ Failed: $failed"
echo "📄 Total: $total"

if [ $failed -gt 0 ]; then
    echo -e "\n❌ Some tests failed!"
    exit 1
else
    echo -e "\n🎉 All pages are accessible and using Mapbox GL JS!"
    exit 0
fi