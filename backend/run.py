from flask import Flask

app = Flask(__name__)


@app.route("/")
def home():
    return {
        "message": "HostelHub backend is running!"
    }


@app.route("/api/health")
def health():
    return {
        "status": "success",
        "message": "HostelHub API is healthy"
    }


if __name__ == "__main__":
    app.run(debug=True, port=5000)