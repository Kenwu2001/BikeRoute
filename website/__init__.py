from flask import Flask
import os

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'asdcxz')
    
    from .views import views
    from .login import login
    
    app.register_blueprint(views, url_prefix='/')
    app.register_blueprint(login, url_prefix='/login')
    
    return app
