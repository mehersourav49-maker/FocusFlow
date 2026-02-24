// Centralized runtime config for local and deployed environments.
(function () {
  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1";

  window.APP_CONFIG = {
    API_BASE: isLocal ? "http://localhost:5000" : "",
  };
})();

