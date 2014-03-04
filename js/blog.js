angular.module('blog', ['ngCookies'])

.controller('BaseCtrl', ['$scope', function($scope) {

}])

.controller('SyntaxToggleCtrl', ['$scope', '$cookies', function($scope, $cookies) {
  $scope.style = $cookies.codestyle || 'solarizedlight';
  $scope.select = function(style) {
    $cookies.codestyle = $scope.style = style;
    document.getElementById('syntax-css').setAttribute('href', '/css/' + style + '.css');
  };
  $scope.select($scope.style);
}]);
