import os

# Get Google API key from environment variable
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')

if not GOOGLE_API_KEY:
    print("Warning: GOOGLE_API_KEY environment variable not set")
