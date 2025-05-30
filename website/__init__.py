from flask import Flask

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'asdcxz'  # 建議未來改為使用環境變數讀取

    # 匯入 blueprint 模組
    from .views import views
    from .login import login
    from .navigation import navigation

    # 註冊 blueprint
    app.register_blueprint(views, url_prefix='/')         # 首頁
    app.register_blueprint(login, url_prefix='/login')    # 登入頁
    app.register_blueprint(navigation, url_prefix='/navigation')    # 導航頁（/navigate）

    return app
