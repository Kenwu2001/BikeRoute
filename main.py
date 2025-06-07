from website import create_app
import os

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    # Remove SSL context - Render provides HTTPS automatically
    # Use 127.0.0.1 for local testing, 0.0.0.0 for Render
    host = '0.0.0.0' if os.environ.get('PORT') else '127.0.0.1'
    app.run(host=host, port=port, debug=True)