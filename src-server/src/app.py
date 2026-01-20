from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
from .routes import (
    workspaces_bp, tasks_bp, providers_bp, llm_api_bp, llm_models_bp, agents_bp, toolset_bp
)

class App(Flask):
    def __init__(self):
        super().__init__(__name__)
        CORS(self, resources={r"/*": {"origins": "*"}})
        self._init_routes()

    def _init_routes(self):
        @self.errorhandler(HTTPException)
        def handle_http_exception(e):
            return jsonify({
                "error": e.description
            }), e.code

        self.register_blueprint(workspaces_bp, url_prefix="/api/workspaces")
        self.register_blueprint(agents_bp, url_prefix="/api/agents")
        self.register_blueprint(providers_bp, url_prefix="/api/providers")
        self.register_blueprint(llm_models_bp, url_prefix="/api/llm_models")
        self.register_blueprint(llm_api_bp, url_prefix="/api/llm")
        self.register_blueprint(tasks_bp, url_prefix="/api/tasks")
        self.register_blueprint(toolset_bp, url_prefix="/api/toolsets")
