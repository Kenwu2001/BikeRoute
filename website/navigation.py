from flask import Blueprint, render_template

navigation = Blueprint('navigation', __name__)

@navigation.route('/')
def bike_navigation():
    return render_template("navigation.html")
