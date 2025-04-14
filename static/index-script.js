// Single Page Apps for GitHub Pages
// MIT License
// Modified version based on https://github.com/rafgraph/spa-github-pages
(function() {
  // Check if we've been redirected from the 404 page
  if (sessionStorage.getItem('redirect') === 'true') {
    sessionStorage.removeItem('redirect');
    var redirectPath = sessionStorage.getItem('redirectPath');
    sessionStorage.removeItem('redirectPath');
    if (redirectPath) {
      history.replaceState(null, null, '/' + redirectPath);
    }
  }

  // Handle redirect from 404 page with query parameters
  var location = window.location;
  if (location.search) {
    var params = {};
    location.search.slice(1).split('&').forEach(function(param) {
      var parts = param.split('=');
      params[parts[0]] = parts[1];
    });
    
    if (params.p) {
      var route = params.p;
      var query = params.q ? ('?' + params.q) : '';
      var hash = location.hash;
      history.replaceState(null, null, route + query + hash);
    }
  }
})();