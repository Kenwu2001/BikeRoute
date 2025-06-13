from flask import Flask
import os

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'asdcxz')
    
    from .views import views
    
    app.register_blueprint(views, url_prefix='/')
    
    # Add error handlers
    @app.errorhandler(404)
    def not_found(error):
        return "Page not found", 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return "Internal server error", 500
    
    return app
