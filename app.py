from flask import Flask
from flask_socketio import SocketIO, send, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'l33th4x0r'

socketio = SocketIO(app, cors_allowed_origins="*")

@socketio.on('new_order')
def handle_new_order(json):
    emit('new_order', json, broadcast=True)


if __name__ == '__main__':
    socketio.run(app)


