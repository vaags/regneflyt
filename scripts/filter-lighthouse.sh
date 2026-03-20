#!/bin/bash
# Filter out known non-fatal Lighthouse trace-engine errors
grep -v 'LanternError\|trace_engine\|trace-engine-result'
