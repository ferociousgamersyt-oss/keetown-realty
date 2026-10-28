#!/bin/bash
# Shows your Keetown admin OTP until an SMS provider is connected.
# 1) Run this script and leave it open.  2) On the website, choose "Partner / team login", enter your admin mobile, press Send OTP.
# 3) The 6-digit code appears here. Only someone logged in to the Keetown Cloudflare account can see it.
export PATH="$HOME/.local/node/bin:$PATH"
echo "Waiting for your OTP… (press Ctrl+C to stop)"
wrangler pages deployment tail --project-name keetown-realty --format pretty 2>/dev/null | grep --line-buffered "staff OTP"
